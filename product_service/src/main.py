import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

# Импортируем наш роутер
from src.api.products import router as products_router

# Импортируем фоновые задачи для RabbitMQ (ДОБАВИЛИ consume_product_updates)
from src.core.rabbitmq_worker import consume_orders, consume_cancellations, consume_product_updates

# Импортируем базу данных и модели для автосоздания таблиц
from src.core.database import engine, Base
from src.models import *  # Гарантирует, что все модели загрузятся

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Автоматически создаем таблицы в базе при старте (если их еще нет)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Запускаем фоновые задачи для RabbitMQ
    task_orders = asyncio.create_task(consume_orders())
    task_cancellations = asyncio.create_task(consume_cancellations())
    task_product_updates = asyncio.create_task(consume_product_updates()) # Наш новый слушатель
    
    yield
    
    # При остановке сервера — корректно завершаем ВСЕ задачи
    task_orders.cancel()
    task_cancellations.cancel()
    task_product_updates.cancel()

app = FastAPI(
    title="Product Service", 
    description="Каталог микронаушников",
    lifespan=lifespan,
    root_path="/api/products"
)

# Подключаем роутер к приложению
app.include_router(products_router)

@app.get("/")
async def root():
    return {"message": "Product Service is running!"}