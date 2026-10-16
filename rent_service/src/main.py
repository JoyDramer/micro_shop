from fastapi import FastAPI

# 1. Импортируем движок и базу
from src.core.database import engine, Base

# 2. Импортируем ВСЕ модели, чтобы Алхимия их увидела и создала таблицы
from src.models.rent import RentalProduct, RentItem, Booking 

app = FastAPI(title="Rent Service", version="1.0", root_path="/api/rent")

@app.on_event("startup")
async def startup_event():
    # 3. Блок автоматического создания таблиц
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Таблицы аренды успешно проверены/созданы!")

# 4. Подключаем наш роутер аренды
from src.api.rent import router as rent_router
app.include_router(rent_router)