from fastapi import FastAPI
from src.api.user import router as user_router

app = FastAPI(title="Micro Shop API")

# Подключаем наш роутер пользователей
app.include_router(user_router)

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Micro Shop API!"}