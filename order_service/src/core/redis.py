import redis.asyncio as redis
from src.core.config import settings

# Создаем асинхронный пул соединений с Redis
redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

# Зависимость для FastAPI
async def get_redis():
    yield redis_client