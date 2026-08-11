import json
import aio_pika

# В коммерции этот URL берется из config.py
RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

async def send_order_created_event(order_data: dict):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    
    async with connection:
        channel = await connection.channel()
        
        # Создаем "обменник" типа fanout (рассылает сообщение всем, кто на него подписан)
        exchange = await channel.declare_exchange("orders_exchange", aio_pika.ExchangeType.FANOUT)
        
        message = aio_pika.Message(
            body=json.dumps(order_data).encode(),
            content_type="application/json"
        )
        
        # Отправляем сообщение
        await exchange.publish(message, routing_key="")