import json
import aio_pika
import os

# В production этот URL должен браться из файла настроек (.env)
# Если запускаете локально без Docker, используйте localhost
# Если в Docker, то имя сервиса, например: "amqp://guest:guest@rabbitmq:5672/"
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def publish_payment_success(order_id: int):
    """
    Асинхронная отправка события об успешной оплате в RabbitMQ.
    """
    # Устанавливаем надежное соединение (robust автоматически переподключается при обрывах)
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    
    async with connection:
        channel = await connection.channel()
        
        # Объявляем Exchange (обменник) типа TOPIC. 
        # durable=True значит, что обменник переживет перезагрузку RabbitMQ
        exchange = await channel.declare_exchange(
            "shop_events", 
            aio_pika.ExchangeType.TOPIC, 
            durable=True
        )
        
        # Формируем тело сообщения
        message_data = {
            "order_id": order_id,
            "status": "PAID"
        }
        
        # Создаем объект сообщения. PERSISTENT гарантирует сохранение сообщения на диск
        message = aio_pika.Message(
            body=json.dumps(message_data).encode("utf-8"),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        
        # Публикуем сообщение с ключом маршрутизации 'payment.success'
        await exchange.publish(
            message, 
            routing_key="payment.success"
        )