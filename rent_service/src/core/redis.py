import redis.asyncio as redis
from src.core.config import settings

async def get_redis():
    client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()