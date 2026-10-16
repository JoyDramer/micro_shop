import asyncio
import json
import aio_pika

from src.core.config import settings
from sqlalchemy.ext.asyncio import async_sessionmaker
from src.core.database import engine

async_session_maker = async_sessionmaker(engine, expire_on_commit=False) 
from src.crud import orders as crud_orders
from src.services.twenty_crm import crm_client

# Импортируем наш клиент Почты России
from src.services.pochta_client import pochta_client

# Берем URL из настроек, чтобы не хардкодить
RABBITMQ_URL = settings.RABBITMQ_URL

EXCHANGE_NAME = "shop_events"
QUEUE_NAME = "order_payment_updates_queue" 
ROUTING_KEY = "payment.success"

async def process_message(message: aio_pika.IncomingMessage):
    """Слушатель успешных оплат. Обновляет статус заказа и оформляет доставку."""
    async with message.process():
        body = json.loads(message.body.decode())
        order_id = body.get('order_id')

        print("\n" + "="*40)
        print(f"📥 [ВОРКЕР ЗАКАЗОВ] Получен сигнал на оплату заказа №{order_id}")

        async with async_session_maker() as db:
            order = await crud_orders.get_order(db, order_id)
            
            if order:
                # 1. Обновляем статус заказа на PAID
                await crud_orders.update_order_status(db, order, new_status="оплачен")
                print(f"✅ Статус заказа №{order_id} официально изменен на PAID.")
                
                # 2. Оформляем доставку, если провайдер — Почта России
                if order.delivery_provider == "russian_post":
                    print(f"🚚 Оформляем накладную Почты России...")
                    
                    # Собираем ФИО (с учетом возможного отсутствия отчества)
                    middle = f" {order.middle_name}" if order.middle_name else ""
                    full_name = f"{order.last_name} {order.first_name}{middle}".strip()
                    
                    # Безопасно получаем телефон, если он добавлен в модель
                    phone = getattr(order, 'phone', None)
                    
                    tracking = await pochta_client.create_shipment(
                        order_id=order.id,
                        full_name=full_name,
                        address=order.address,
                        postal_code=order.postal_code,
                        phone=phone, # <-- Передаем телефон для Почты России
                        weight_grams=1000 
                    )
                    
                    if tracking:
                        order.tracking_number = tracking
                        await db.commit()
                        print(f"✅ Трек-номер сохранен в БД: {tracking}")
                        
                        # <-- Раскомментировали и обновили отправку трека в CRM
                        await crm_client.update_order_tracking(site_order_id=order.id, tracking_number=tracking)
                
                # 3. Синхронизируем новый статус с CRM
                await crm_client.update_order_status(site_order_id=order_id, new_status="OPLACHEN")
                
                print(f"📦 Заказ передан в сборку!")
            else:
                print(f"❌ Критическая ошибка: Заказ №{order_id} не найден в базе!")
        print("="*40 + "\n")

async def main():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME, 
        aio_pika.ExchangeType.TOPIC, 
        durable=True
    )
    
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await queue.bind(exchange, routing_key=ROUTING_KEY)
    
    print(f"🚀 [*] Воркер оплат запущен. Ждем события '{ROUTING_KEY}'...")
    
    await queue.consume(process_message)
    
    try:
        await asyncio.Future()
    finally:
        await connection.close()

if __name__ == "__main__":
    asyncio.run(main())