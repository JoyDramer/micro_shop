import aio_pika
import json
from sqlalchemy import select
from src.crud.product import hold_product
from src.core.database import AsyncSessionLocal
from src.models.idempotency import ProcessedEvent
import redis.asyncio as redis

async def consume_orders():
    connection = await aio_pika.connect_robust("amqp://guest:guest@localhost:5672/")
    channel = await connection.channel()
    
    exchange = await channel.declare_exchange("orders_exchange", aio_pika.ExchangeType.FANOUT)
    queue = await channel.declare_queue("", exclusive=True)
    await queue.bind(exchange)

    print(" [*] Воркер запущен. Ожидание заказов для РЕЗЕРВИРОВАНИЯ...")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                data = json.loads(message.body)
                order_id = data['order_id']
                
                # Генерируем уникальный ключ события
                event_key = f"order_created_{order_id}"
                
                async with AsyncSessionLocal() as db:
                    # 1. ПРОВЕРКА ИДЕМПОТЕНТНОСТИ
                    check_stmt = select(ProcessedEvent).where(ProcessedEvent.id == event_key)
                    result = await db.execute(check_stmt)
                    
                    if result.scalar_one_or_none() is not None:
                        print(f" [~] ДУБЛИКАТ: Заказ {order_id} уже обрабатывался. Игнорируем.")
                        continue # Пропускаем и идем к следующему сообщению!

                    # 2. РЕЗЕРВИРОВАНИЕ ТОВАРОВ
                    print(f" [x] Получен новый заказ {order_id}, пытаюсь зарезервировать товары...")
                    all_reserved = True
                    for item in data['items']:
                        success = await hold_product(db, item['product_id'], item['quantity'])
                        if not success:
                            print(f" [!] ОШИБКА: Не хватает товара {item['product_id']} для заказа {order_id}!")
                            all_reserved = False
                    
                    # 3. ОТМЕЧАЕМ СОБЫТИЕ КАК ОБРАБОТАННОЕ
                    if all_reserved:
                        print(f" [v] Товары для заказа {order_id} успешно зарезервированы!")
                        redis_client = await redis.from_url("redis://localhost:6379", decode_responses=True)
                        await redis_client.delete("catalog:all_products")
                        await redis_client.aclose()
                        
                    # Сохраняем ключ (даже если резерв не удался, мы обработали это сообщение)
                    db.add(ProcessedEvent(id=event_key))
                    await db.commit()