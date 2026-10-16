# Импортируем нужные инструменты из библиотеки SQLAlchemy
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from src.core.config import settings

# 2. ДВИЖОК (Engine)
# Движок — это сердце SQLAlchemy. Он физически устанавливает связь с PostgreSQL.
# echo=True значит, что в консоль будут выводиться все SQL-запросы (очень полезно при обучении)
engine = create_async_engine(settings.DATABASE_URL, echo=True)


# 3. ФАБРИКА СЕССИЙ (SessionLocal)
# Сессия — это один "разговор" с базой данных. 
# Пришел запрос от пользователя -> открыли сессию -> сохранили данные -> закрыли сессию.
# expire_on_commit=False нужно, чтобы объекты не удалялись из памяти Python после сохранения в БД.
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# 4. БАЗОВЫЙ КЛАСС ДЛЯ МОДЕЛЕЙ (Base)
# От этого класса будут наследоваться все наши таблицы (пользователи, товары и т.д.)
# SQLAlchemy будет смотреть на этот класс и понимать, какие таблицы нужно создать в PostgreSQL.
Base = declarative_base()


# 5. ФУНКЦИЯ ПОЛУЧЕНИЯ СЕССИИ
# Эта функция будет использоваться в наших маршрутах (API) для FastAPI.
# yield означает, что мы "выдаем" сессию, ждем пока роут выполнит свою работу, 
# а потом блок finally гарантированно закрывает сессию, чтобы не перегружать базу.
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
