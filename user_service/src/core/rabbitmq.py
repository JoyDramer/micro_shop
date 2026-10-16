import aio_pika
import json
from src.core.config import settings

EXCHANGE_NAME = "shop_events"

async def get_exchange(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractExchange:
    """Вспомогательная функция для подключения к главной шине событий"""
    return await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True
    )

async def publish_password_reset(email: str, token: str):
    """Отправляет событие сброса пароля (routing_key: user.password_reset)"""
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await get_exchange(channel)
        
        message_body = json.dumps({"email": email, "token": token}).encode("utf-8")
        
        await exchange.publish(
            aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key="user.password_reset",
        )
        print(f"✅ Сигнал user.password_reset для {email} отправлен в RabbitMQ")

async def publish_user_registered(email: str):
    """Отправляет событие успешной регистрации (routing_key: user.registered)"""
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await get_exchange(channel)
        
        message_body = json.dumps({"email": email}).encode("utf-8")
        
        await exchange.publish(
            aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key="user.registered",
        )
        print(f"✅ Сигнал user.registered для {email} отправлен в RabbitMQ")