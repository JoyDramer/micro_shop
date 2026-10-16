import json
import aio_pika
from src.core.config import settings

async def publish_product_event(product_data: dict):
    # Подключаемся к RabbitMQ
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    
    async with connection:
        channel = await connection.channel()
        
        # 1. Имя обменника теперь ТОЧНО совпадает с тем, что слушает order_service
        exchange = await channel.declare_exchange(
            "products_exchange", 
            aio_pika.ExchangeType.FANOUT
        )
        
        # 2. Отправляем плоский словарь, как ждет order_service
        message = aio_pika.Message(
            body=json.dumps(product_data).encode("utf-8")
        )
        
        await exchange.publish(message, routing_key="")