import asyncio
import json
import aio_pika

from src.core.config import settings
from src.services.email import send_email_notification

EXCHANGE_NAME = "shop_events"
QUEUE_NAME = "email_notifications_queue"

FRONTEND_BASE_URL = getattr(settings, "FRONTEND_URL", "https://xn--80apbahcjkbhv3b3d.xn--p1ai")

async def process_message(message: aio_pika.IncomingMessage):
    """Эта функция вызывается каждый раз, когда в RabbitMQ падает новое сообщение"""
    
    async with message.process():
        body_str = message.body.decode()
        routing_key = message.routing_key
        
        print(f"\n🔔 [ВОРКЕР] Получено событие: {routing_key}")
        
        try:
            data = json.loads(body_str)
        except json.JSONDecodeError:
            print("❌ Ошибка: получено невалидное сообщение")
            return

        # 1. Если создан новый заказ
        if routing_key == "order.created":
            order_id = data.get("order_id")
            customer_email = data.get("email", settings.SMTP_USER) 
            
            subject = f"Заказ №{order_id} принят!"
            text = f"Здравствуйте!\n\nВаш заказ №{order_id} успешно оформлен и ожидает оплаты.\nСпасибо, что выбрали нас!"
            
            await send_email_notification(customer_email, subject, text)
            
        # 2. Если заказ успешно оплачен
        elif routing_key == "payment.success":
            order_id = data.get("order_id")
            customer_email = data.get("email", settings.SMTP_USER)
            
            subject = f"Оплата заказа №{order_id} получена!"
            text = f"Отличные новости!\n\nМы получили оплату по заказу №{order_id}. Начинаем собирать посылку!"
            
            await send_email_notification(customer_email, subject, text)

        # 3. Запрос на сброс пароля
        elif routing_key == "user.password_reset":
            customer_email = data.get("email")
            token = data.get("token")
            
            subject = "Сброс пароля в интернет-магазине"
            reset_link = f"{FRONTEND_BASE_URL}/reset-password?token={token}"
            text = (
                f"Здравствуйте!\n\n"
                f"Кто-то запросил сброс пароля для вашего аккаунта.\n"
                f"Для установки нового пароля перейдите по ссылке:\n{reset_link}\n\n"
                f"Ссылка действительна 30 минут."
            )
            
            await send_email_notification(customer_email, subject, text)

        # 4. Успешная регистрация
        elif routing_key == "user.registered":
            customer_email = data.get("email")
            
            subject = "Добро пожаловать в наш магазин!"
            text = f"Здравствуйте, {customer_email}!\n\nСпасибо за регистрацию. Теперь вы можете отслеживать свои заказы в личном кабинете."
            
            await send_email_notification(customer_email, subject, text)
            
        else:
            print(f"ℹ️ Событие {routing_key} нас не интересует, пропускаем.")

async def main():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()
    
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME, 
        aio_pika.ExchangeType.TOPIC, 
        durable=True
    )
    
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    
    # Привязываем все нужные события
    await queue.bind(exchange, routing_key="order.created")
    await queue.bind(exchange, routing_key="payment.success")
    await queue.bind(exchange, routing_key="user.password_reset")
    await queue.bind(exchange, routing_key="user.registered")
    
    print(f"🚀 [*] Сервер уведомлений запущен. Слушаем RabbitMQ...")
    
    await queue.consume(process_message)
    
    try:
        await asyncio.Future()
    finally:
        await connection.close()

if __name__ == "__main__":
    asyncio.run(main())