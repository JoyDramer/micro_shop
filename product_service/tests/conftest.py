import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.core.database import Base

# Убедитесь, что путь к модели Product правильный
from src.models.product import Product 

engine_test = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine_test, expire_on_commit=False)

@pytest.fixture(autouse=True)
async def setup_db():
    # 1. Создаем таблицы
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # 2. Кладем тестовый товар
    async with TestingSessionLocal() as db:
        test_product = Product(
            id=1, 
            name="Тестовый микронаушник", 
            product_type="micro",  # Обязательное поле
            category="headphones",  # <-- ДОБАВЛЯЕМ ЭТУ СТРОКУ
            description="Тест", 
            price=1500, 
            stock=10
        )
        db.add(test_product)
        await db.commit()

    yield
    
    # 3. Удаляем таблицы после теста
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session