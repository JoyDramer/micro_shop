from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from src.core.config import settings

# Создаем асинхронный "движок" для связи с PostgreSQL
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Создаем фабрику сессий (каждый запрос в API будет получать свою независимую сессию)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Базовый класс, от которого мы будем наследовать модели (Order и OrderItem)
Base = declarative_base()

# Зависимость для FastAPI: выдает сессию и закрывает ее после ответа
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session