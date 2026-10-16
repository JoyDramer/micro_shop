from fastapi import FastAPI
from contextlib import asynccontextmanager

from src.core.database import engine, Base
# Импортируем наш роутер из api/payment.py
from src.api.payment import router as payment_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Автоматически создаем таблицы (payments) при запуске
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Payment Service",
    description="Микросервис оплат (Интеграция с Т-Банком)",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api/payment"
)

# Подключаем роутер
app.include_router(payment_router)

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "payment"}