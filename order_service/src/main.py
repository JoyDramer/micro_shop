from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.cart import router as cart_router
from src.api.order import router as order_router

# Импортируем функцию, где собраны воркеры каталога и CRM
from src.core.rabbitmq import main as start_rabbitmq_workers, send_order_cancelled_event

# ДОБАВЛЕНО: Импортируем воркер оплат
from src.payment_worker import main as start_payment_worker 

from src.core.database import engine, Base
from src.models.order import Order, OrderItem, ProductCache
from src.services.twenty_crm import crm_client

# Создаем фабрику сессий специально для фоновых задач
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def cancel_expired_orders_task():
    """Фоновый воркер: каждые 10 минут проверяет и отменяет заказы старше 3 часов"""
    while True:
        try:
            async with async_session() as session:
                expiration_time = datetime.utcnow() - timedelta(hours=3)
                
                stmt = (
                    select(Order)
                    .where(
                        Order.status == "создан", 
                        Order.created_at <= expiration_time
                    )
                    .options(selectinload(Order.items))
                )
                result = await session.execute(stmt)
                expired_orders = result.scalars().all()

                for order in expired_orders:
                    order.status = "отменен" 
                    
                    cancelled_items = [
                        {"product_id": item.product_id, "quantity": item.quantity} 
                        for item in order.items
                    ]
                    await send_order_cancelled_event({
                        "order_id": order.id, 
                        "items": cancelled_items
                    })

                    await crm_client.update_order_status(site_order_id=order.id, new_status="OTMENEN")
                    
                if expired_orders:
                    await session.commit()
                    print(f"Автоматически отменено неоплаченных заказов: {len(expired_orders)}")
                    
        except Exception as e:
            print(f"Ошибка в фоновом воркере отмены заказов: {e}")
        
        await asyncio.sleep(600)

async def delete_old_cancelled_orders_task():
    """Фоновый воркер: раз в сутки удаляет отмененные заказы старше 30 дней"""
    while True:
        try:
            async with async_session() as session:
                delete_threshold = datetime.utcnow() - timedelta(days=30)
                
                stmt = select(Order).where(
                    Order.status == "отменен", 
                    Order.created_at <= delete_threshold
                )
                result = await session.execute(stmt)
                old_orders = result.scalars().all()

                for order in old_orders:
                    await crm_client.delete_order(site_order_id=order.id)
                    await session.delete(order)
                    
                if old_orders:
                    await session.commit()
                    print(f"Удалено старых отмененных заказов (старше 30 дней): {len(old_orders)}")
                    
        except Exception as e:
            print(f"Ошибка в фоновом воркере удаления старых заказов: {e}")
        
        await asyncio.sleep(86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Таблицы заказов успешно проверены/созданы!")

    print("🚀 Запуск воркеров Order Service...")
    
    # Запускаем фоновые задачи 
    consumer_task = asyncio.create_task(start_rabbitmq_workers())
    cancel_task = asyncio.create_task(cancel_expired_orders_task())
    delete_task = asyncio.create_task(delete_old_cancelled_orders_task())
    
    # ДОБАВЛЕНО: Запуск слушателя успешных оплат
    payment_worker_task = asyncio.create_task(start_payment_worker())
    
    yield
    
    consumer_task.cancel()
    cancel_task.cancel()
    delete_task.cancel()
    payment_worker_task.cancel()

app = FastAPI(
    title="Shop Order Service",
    description="Микросервис корзины и оформления заказов",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api",
    docs_url="/orders/docs",
    openapi_url="/orders/openapi.json"
)

app.include_router(cart_router)
app.include_router(order_router)