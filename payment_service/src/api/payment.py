import hashlib
import httpx
import os  # <-- Обязательно возвращаем import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

# Убедись, что здесь НЕТ строки "from src.config import settings" или подобной!

from src.core.rabbitmq import publish_payment_success
from src.core.database import get_db
from src.schemas.payment import PaymentCreate, PaymentResponse
from src.models.payment import PaymentStatus
from src.crud import payment as crud_payment

router = APIRouter(prefix="/payments", tags=["Оплата (Т-Банк)"])

# Читаем доступы напрямую из .env файла этого микросервиса
TINKOFF_TERMINAL_KEY = os.getenv("TINKOFF_TERMINAL_KEY")
TINKOFF_PASSWORD = os.getenv("TINKOFF_PASSWORD")
TINKOFF_API_URL = os.getenv("TINKOFF_API_URL", "https://securepay.tinkoff.ru/v2")



def generate_tinkoff_token(payload: dict) -> str:
    """
    Генерация подписи (Token) для Т-Банка.
    Т-Банк требует, чтобы вложенные объекты (Receipt, DATA) не участвовали в подписи.
    """
    data = payload.copy()
    keys_to_remove = ["Token", "Receipt", "DATA"]
    for key in keys_to_remove:
        data.pop(key, None)
        
    data["Password"] = TINKOFF_PASSWORD
    sorted_keys = sorted(data.keys())
    concatenated_values = "".join(str(data[k]) for k in sorted_keys)
    
    return hashlib.sha256(concatenated_values.encode('utf-8')).hexdigest()

@router.post("/create", response_model=PaymentResponse)
async def create_payment_link(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Создать платеж и получить ссылку на оплату от Т-Банка с чеком ФЗ-54"""
    payment = await crud_payment.create_payment(db, payment_in)
    
    # Защита: проверяем, что ID платежа существует (в БД должен быть сделан commit/flush)
    if not payment.id:
        raise HTTPException(status_code=500, detail="Ошибка БД: платежу не присвоен ID")

    amount_in_kopecks = int(payment.amount * 100)
    
    # Формируем список товаров для чека
    receipt_items = []
    
    if getattr(payment_in, "items", None):
        for item in payment_in.items:
            item_price_kopecks = int(item.price * 100)
            receipt_items.append({
                "Name": item.name[:128], # Т-Банк ограничивает длину названия до 128 символов
                "Price": item_price_kopecks,
                "Quantity": float(item.quantity),
                "Amount": item_price_kopecks * item.quantity,
                "PaymentMethod": "full_prepayment",
                "PaymentObject": "service" if "Доставка" in item.name else "commodity",
                "Tax": "none"
            })
    else:
        # Резервный вариант, если фронтенд не прислал детализацию товаров
        receipt_items.append({
            "Name": f"Заказ №{payment_in.order_id}",
            "Price": amount_in_kopecks,
            "Quantity": 1.00,
            "Amount": amount_in_kopecks,
            "PaymentMethod": "full_prepayment",
            "PaymentObject": "commodity",
            "Tax": "none"
        })

    payload = {
        "TerminalKey": TINKOFF_TERMINAL_KEY,
        "Amount": amount_in_kopecks,
        "OrderId": str(payment.id), 
        "Description": f"Оплата заказа №{payment_in.order_id}",
        "Receipt": {
            # Подставляем реальный email клиента для чека
            "Email": payment_in.customer_email,
            "Taxation": "usn_income",        # Система налогообложения (usn_income, usn_income_outcome, osn, patent)
            "Items": receipt_items
        }
    }
    
    payload["Token"] = generate_tinkoff_token(payload)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{TINKOFF_API_URL}/Init", json=payload)
        response_data = response.json()
        
    if not response_data.get("Success"):
        # Выводим полные детали ответа банка для отладки
        error_msg = response_data.get('Message', 'Unknown error')
        error_details = response_data.get('Details', '')
        raise HTTPException(
            status_code=400, 
            detail=f"Ошибка Т-Банка: {error_msg}. Детали: {error_details}"
        )
        
    payment_url = response_data.get("PaymentURL")
    bank_payment_id = str(response_data.get("PaymentId"))
    
    payment = await crud_payment.update_payment_status(
        db, payment, PaymentStatus.PENDING, bank_payment_id
    )
    
    response_out = PaymentResponse.model_validate(payment)
    response_out.payment_url = payment_url
    
    return response_out


@router.post("/webhook")
async def tinkoff_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Эндпоинт для приема вебхуков от Т-Банка (Нотификации).
    """
    payload = await request.json()
    
    # 1. Проверяем подпись (токен) от банка для безопасности
    received_token = payload.get("Token")
    expected_token = generate_tinkoff_token(payload)
    
    if received_token != expected_token:
        # Если токены не совпали, значит кто-то пытается подделать вебхук
        return {"status": "error", "message": "Invalid token"}
    
    # 2. Получаем ID платежа в нашей системе (мы передавали его как OrderId)
    payment_id = int(payload.get("OrderId"))
    bank_status = payload.get("Status")
    
    payment = await crud_payment.get_payment(db, payment_id)
    if not payment:
        return {"status": "ok"} # Возвращаем OK банку, чтобы он перестал слать запросы, даже если не нашли
        
    # 3. Маппинг статусов Т-Банка в наши статусы
    new_status = PaymentStatus.PENDING
    if bank_status == "CONFIRMED":
        new_status = PaymentStatus.SUCCEEDED
    elif bank_status in ["REJECTED", "CANCELED", "DEADLINE_EXPIRED"]:
        new_status = PaymentStatus.FAILED
    elif bank_status == "REFUNDED":
        new_status = PaymentStatus.CANCELED
        
    # 4. Обновляем статус в базе
    if payment.status != new_status:
        updated_payment = await crud_payment.update_payment_status(db, payment, new_status)
        
        if updated_payment.status == PaymentStatus.SUCCEEDED:
            # Отправляем асинхронный сигнал в RabbitMQ
            # Передаем именно order_id (ID заказа из Order Service), а не ID платежа
            await publish_payment_success(payment.order_id)
            print(f"Платеж {payment_id} успешно оплачен! Отправляем сигнал в RabbitMQ...")
            print(f"Сигнал payment.success для заказа {payment.order_id} отправлен в RabbitMQ!")
            
    # Банк всегда ждет в ответ строку "OK"
    return "OK"