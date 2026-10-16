import asyncio
from fastapi import FastAPI
from src.api.user import router as user_router

# Импортируем базу и модели для автосоздания таблиц
from src.database import engine, Base 
from src.models.user import User  

app = FastAPI(
    title="User Service",
    root_path="/api/auth"
)

# Событие старта: автоматическое создание таблиц
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # run_sync выполняет синхронную команду create_all в асинхронном контексте
        await conn.run_sync(Base.metadata.create_all)
        print("Таблицы успешно проверены/созданы!")

# Подключаем наш роутер пользователей
app.include_router(user_router)

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Micro Shop API!"}