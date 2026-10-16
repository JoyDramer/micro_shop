import pytest
from httpx import AsyncClient, ASGITransport
import fakeredis.aioredis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from src.main import app
from src.core.database import Base, get_db
from src.core.redis import get_redis

engine_test = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine_test, expire_on_commit=False)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def fake_redis_client():
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield redis
    await redis.aclose()

@pytest.fixture
async def async_client(fake_redis_client):
    # Оставили подмену только для БД и Redis
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = lambda: fake_redis_client
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client