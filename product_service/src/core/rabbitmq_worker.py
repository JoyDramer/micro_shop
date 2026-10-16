import asyncio
import json
import aio_pika
from sqlalchemy import select, update
from src.crud.product import hold_product
from src.core.database import AsyncSessionLocal
from src.models.idempotency import ProcessedEvent
from src.models.product import Product
from src.core.config import settings
import redis.asyncio as redis

# Добавляем импорт для отправки событий
from src.core.rabbitmq import publish_product_event

async def consume_orders():
    # ... (Твой текущий код этой функции остается без изменений) ...
    pass

async def consume_cancellations():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()
    
    # Подключаемся к очереди отмененных заказов
    queue = await channel.declare_queue("order_cancelled_queue", durable=True)

    print(" [*] Воркер запущен. Ожидание отмененных заказов для ВОЗВРАТА ОСТАТКОВ...")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                data = json.loads(message.body)
                order_id = data.get('order_id')
                items = data.get('items', [])
                
                event_key = f"order_cancelled_{order_id}"
                
                async with AsyncSessionLocal() as db:
                    check_stmt = select(ProcessedEvent).where(ProcessedEvent.id == event_key)
                    result = await db.execute(check_stmt)
                    
                    if result.scalar_one_or_none() is not None:
                        continue

                    for item in items:
                        product_id = item['product_id']
                        quantity_to_return = item['quantity']
                        
                        stmt = (
                            update(Product)
                            .where(Product.id == product_id)
                            .values(stock=Product.stock + quantity_to_return)
                        )
                        await db.execute(stmt)
                    
                    redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
                    await redis_client.delete("catalog:all_products")
                    await redis_client.aclose()
                    
                    db.add(ProcessedEvent(id=event_key))
                    await db.commit()

# === НОВАЯ ФУНКЦИЯ БЕЗ ПОЛЯ IMAGE_URL ===
async def consume_product_updates():
    await asyncio.sleep(5)
    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()
        
        queue = await channel.declare_queue("product_updated", durable=True)
        print(" [*] Product Service подключился к RabbitMQ. Ожидание событий...", flush=True)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    payload = json.loads(message.body.decode())
                    event_type = payload.get("event", "").lower()
                    event_data = payload.get("data", {})
                    
                    name = event_data.get("name")
                    if not name:
                        continue
                        
                    price_raw = event_data.get("price")
                    price = float(price_raw) if price_raw is not None else 0.0
                    
                    stock_raw = event_data.get("stock")
                    stock = int(stock_raw) if stock_raw is not None else 0
                    
                    bestseller_raw = event_data.get("isBestseller")
                    is_bestseller = bool(bestseller_raw) if bestseller_raw is not None else False
                    
                    category_map = {
                        "BESPROVODNYE": "беспроводные",
                        "PROVODNYE": "проводные",
                        "PREMIUM": "премиум",
                        "AKCESSUARY": "аксессуары"
                    }
                    product_type_map = {
                        "MAGNITNYE": "магнитные",
                        "KAPSULNYE": "капсульные"
                    }
                    
                    raw_product_type = event_data.get("productType") or "MAGNITNYE"
                    raw_category = event_data.get("category") or "BESPROVODNYE"
                    product_type = product_type_map.get(raw_product_type, str(raw_product_type).lower())
                    category = category_map.get(raw_category, str(raw_category).lower())
                    
                    desc_obj = event_data.get("description")
                    description = ""
                    if isinstance(desc_obj, dict):
                        description = desc_obj.get("markdown", "")
                    elif isinstance(desc_obj, str):
                        description = desc_obj
                    
                    # === ИЗВЛЕКАЕМ ВСЕ КАРТИНКИ (ОСНОВНУЮ И ДОПОЛНИТЕЛЬНЫЕ) ===
                    images_obj = event_data.get("images")
                    images_list = []
                    
                    if isinstance(images_obj, list):
                        images_list = [str(img) for img in images_obj]
                    elif isinstance(images_obj, dict):
                        primary = images_obj.get("primaryLinkUrl")
                        if primary:
                            images_list.append(primary)
                            
                        secondary = images_obj.get("secondaryLinks", [])
                        for sec in secondary:
                            if isinstance(sec, str):
                                images_list.append(sec)
                            # ИСПРАВЛЕННЫЙ КЛЮЧ: ищем "url", а не "linkUrl"
                            elif isinstance(sec, dict) and "url" in sec:
                                images_list.append(sec["url"])
                            # На всякий случай оставим и старый вариант, вдруг формат плавает
                            elif isinstance(sec, dict) and "linkUrl" in sec:
                                images_list.append(sec["linkUrl"])
                    elif isinstance(images_obj, str):
                        images_list = [img.strip() for img in images_obj.split(",") if img.strip()]

                    async with AsyncSessionLocal() as db:
                        stmt = select(Product).where(Product.name == name)
                        result = await db.execute(stmt)
                        existing_product = result.scalar_one_or_none()
                        
                        is_deleted = "deleted" in event_type or "destroyed" in event_type or event_data.get("deletedAt") is not None
                        
                        if is_deleted:
                            if existing_product:
                                await db.delete(existing_product)
                                await db.commit()
                                print(f" [-] Товар '{name}' удален с витрины!")
                                
                        elif "updated" in event_type:
                            if existing_product:
                                update_stmt = (
                                    update(Product)
                                    .where(Product.id == existing_product.id)
                                    .values(
                                        price=price,
                                        description=description.strip(),
                                        stock=stock,
                                        images=images_list, # Только массив фото
                                        product_type=product_type,
                                        category=category,
                                        is_bestseller=is_bestseller
                                    )
                                )
                                await db.execute(update_stmt)
                                await db.commit()
                                print(f" [v] Товар '{name}' обновлен из CRM!")
                                
                                # ---> ОТПРАВЛЯЕМ ОБНОВЛЕНИЕ ЦЕНЫ В МИКРОСЕРВИС ЗАКАЗОВ <---
                                await publish_product_event({
                                    "id": existing_product.id,
                                    "name": name,
                                    "price": price
                                })
                                
                            else:
                                event_type = "created"
                                
                        if "created" in event_type and not is_deleted and not existing_product:
                            new_product = Product(
                                name=name,
                                product_type=product_type,
                                category=category,
                                price=price,
                                description=description.strip(),
                                stock=stock,
                                images=images_list, # Только массив фото
                                is_bestseller=is_bestseller
                            )
                            db.add(new_product)
                            await db.commit()
                            print(f" [+] Новый товар '{name}' добавлен из CRM!")
                            
                            # ---> ОТПРАВЛЯЕМ СОЗДАНИЕ ТОВАРА В МИКРОСЕРВИС ЗАКАЗОВ <---
                            await publish_product_event({
                                "id": new_product.id,
                                "name": name,
                                "price": price
                            })
                            
                        redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
                        await redis_client.delete("catalog:all_products")
                        await redis_client.aclose()

    except Exception as e:
        print(f" [!] Ошибка в consume_product_updates: {e}", flush=True)