import json
import aio_pika
import asyncio
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, update

from src.core.database import AsyncSessionLocal
from src.models.order import ProductCache, Order
from src.core.config import settings

RABBITMQ_URL = settings.RABBITMQ_URL

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

async def send_order_cancelled_event(payload: dict):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    
    async with connection:
        channel = await connection.channel()
        
        # Объявляем прямую очередь для отмененных заказов
        await channel.declare_queue("order_cancelled_queue", durable=True)
        
        message = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json"
        )
        
        # Отправляем сообщение напрямую в очередь
        await channel.default_exchange.publish(
            message,
            routing_key="order_cancelled_queue"
        )

async def start_product_cache_consumer():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange("products_exchange", aio_pika.ExchangeType.FANOUT)
        
        queue = await channel.declare_queue("order_service_product_cache", durable=True)
        await queue.bind(exchange)
        
        print(" [*] RabbitMQ: Ожидание обновлений каталога...")
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    payload = json.loads(message.body.decode())
                    
                    # 1. ЛОГИРУЕМ ВСЁ, ЧТО ПРИШЛО
                    print(f"\n📦 [RABBITMQ] Пришло сообщение: {payload}")
                    
                    product_id = payload.get("id")
                    price = payload.get("price")
                    
                    # 2. ПРОБУЕМ ДОСТАТЬ И name, И title
                    name = payload.get("name") or payload.get("title") 
                    
                    if product_id is not None and price is not None and name is not None:
                        async with AsyncSessionLocal() as db:
                            stmt = insert(ProductCache).values(
                                product_id=product_id, 
                                name=name, 
                                price=price
                            )
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['product_id'],
                                set_={
                                    'price': stmt.excluded.price,
                                    'name': stmt.excluded.name
                                }
                            )
                            await db.execute(stmt)
                            await db.commit()
                            print(f" [v] Кэш успешно обновлен: Товар {product_id} ({name}) -> {price} руб.")
                    else:
                        print(f" ⚠️ [ОШИБКА] Сообщение проигнорировано! Не хватает данных: id={product_id}, price={price}, name/title={name}")

async def consume_crm_order_updates():
    await asyncio.sleep(5)
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        channel = await connection.channel()
        
        queue = await channel.declare_queue("order_updated", durable=True)
        print(" [*] Order Service: Ожидание обновлений статусов из CRM...", flush=True)
        
        status_map = {
            "Создан": "CREATED",
            "Оплачен": "PAID",
            "Ждет отправки": "AWAITING_SHIPMENT",
            "Передан в доставку": "IN_DELIVERY",
            "Получен": "DELIVERED",
            "Отменен": "CANCELLED"
        }

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    payload = json.loads(message.body.decode())
                    event_data = payload.get("data", {})
                    
                    # Ищем ID заказа на сайте, который мы передадим в CRM при создании
                    site_order_id = event_data.get("external_id") 
                    
                    if not site_order_id:
                        continue
                        
                    raw_status = event_data.get("status")
                    if not raw_status:
                        continue
                        
                    new_db_status = status_map.get(raw_status)
                    if not new_db_status:
                        continue

                    async with AsyncSessionLocal() as db:
                        stmt = select(Order).where(Order.id == int(site_order_id))
                        result = await db.execute(stmt)
                        existing_order = result.scalar_one_or_none()
                        
                        if existing_order and existing_order.status != new_db_status:
                            update_stmt = (
                                update(Order)
                                .where(Order.id == existing_order.id)
                                .values(status=new_db_status)
                            )
                            await db.execute(update_stmt)
                            await db.commit()
                            print(f" [v] Статус заказа {existing_order.id} изменен на {new_db_status} (из CRM)")
                            
                            # Если заказ отменен в CRM, отправляем сигнал на возврат остатков
                            if new_db_status == "CANCELLED":
                                cancel_payload = {
                                    "order_id": existing_order.id,
                                    # TODO: При интеграции товаров в заказ достать позиции из базы и заполнить items
                                    "items": [] 
                                }
                                await send_order_cancelled_event(cancel_payload)

    except Exception as e:
        print(f" [!] Ошибка в consume_crm_order_updates: {e}", flush=True)

# === ЗАПУСК ВСЕХ ВОРКЕРОВ СЕРВИСА ЗАКАЗОВ ===
async def main():
    print("🚀 Запуск воркеров Order Service...")
    # asyncio.gather запустит обе функции параллельно
    await asyncio.gather(
        start_product_cache_consumer(),
        consume_crm_order_updates()
    )

if __name__ == "__main__":
    asyncio.run(main())