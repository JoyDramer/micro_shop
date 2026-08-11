import redis.asyncio as redis

# В продакшене URL лучше выносить в .env (например, redis://redis:6379)
REDIS_URL = "redis://localhost:6379"

async def get_redis():
    client = await redis.from_url(REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()