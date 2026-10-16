from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://user:password@postgres:5432/shop_db"
)

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with async_session_maker() as session:
        yield session