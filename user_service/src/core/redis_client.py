import redis.asyncio as redis
from src.core.config import settings

# Инициализируем клиент (decode_responses=True чтобы получать строки, а не байты)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)