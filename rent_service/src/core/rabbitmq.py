import json
import aio_pika
from sqlalchemy import select
from src.core.config import settings
from src.core.database import AsyncSessionLocal # Берем фабрику сессий напрямую!
from src.models.rent import ProductCache

async def process_message(message: aio_pika.IncomingMessage):
    """Эта функция вызывается автоматически при каждом новом сообщении"""
    # message.process() сам отправит RabbitMQ сигнал "Успешно", когда код выполнится
    async with message.process():
        body = json.loads(message.body.decode("utf-8"))
        event = body.get("event")
        data = body.get("data")

        if event in ["product_created", "product_updated"]:
            # ВАЖНО: Открываем сессию вручную, так как мы не в эндпоинте FastAPI
            async with AsyncSessionLocal() as db:
                # Проверяем, есть ли уже такой товар у нас в кэше
                stmt = select(ProductCache).where(ProductCache.product_id == data["id"])
                result = await db.execute(stmt)
                db_product = result.scalar_one_or_none()

                if db_product:
                    db_product.rent_price = data["rent_price"]
                    db_product.deposit_type = data["deposit_type"] # <-- Обновлено
                else:
                    db_product = ProductCache(
                        product_id=data["id"],
                        rent_price=data["rent_price"],
                        deposit_type=data["deposit_type"] # <-- Обновлено
                    )
                    db.add(db_product)
                
                await db.commit()
                print(f"✅ Локальный кэш обновлен для товара ID {data['id']}")

async def start_rabbitmq_consumer():
    """Подключается к RabbitMQ и начинает слушать очередь"""
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    # Подключаемся к тому же "громкоговорителю" (FANOUT)
    exchange = await channel.declare_exchange("product_events", aio_pika.ExchangeType.FANOUT)

    # Создаем свою личную очередь для сервиса аренды
    queue = await channel.declare_queue("rent_service_product_updates", durable=True)
    await queue.bind(exchange)

    # Запускаем бесконечное прослушивание
    await queue.consume(process_message)
    print("🎧 rent_service слушает обновления товаров...")
    
    return connection