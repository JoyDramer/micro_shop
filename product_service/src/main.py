import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

# Импортируем наш роутер
from src.api.products import router as products_router

# Импортируем фоновую задачу для RabbitMQ
from src.core.rabbitmq_worker import consume_orders

@asynccontextmanager
async def lifespan(app: FastAPI):
    # При запуске сервера создаем фоновую задачу, которая будет слушать RabbitMQ
    task = asyncio.create_task(consume_orders())
    yield
    # При остановке сервера — корректно её завершаем
    task.cancel()

app = FastAPI(
    title="Product Service", 
    description="Каталог микронаушников",
    lifespan=lifespan  # <-- Передаем lifespan в приложение
)

# Подключаем роутер к приложению
app.include_router(products_router)

@app.get("/")
async def root():
    return {"message": "Product Service is running!"}