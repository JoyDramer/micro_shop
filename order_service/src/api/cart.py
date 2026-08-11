from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from src.core.redis import get_redis
from src.schemas.cart import Cart, CartItem
from src.crud import cart as crud_cart

router = APIRouter(prefix="/cart", tags=["Корзина"])

@router.post("/{user_id}/add", response_model=Cart)
async def add_item_to_cart(
    user_id: int, 
    item: CartItem, 
    redis_client: Redis = Depends(get_redis)
):
    """Добавляет товар в корзину пользователя"""
    return await crud_cart.add_to_cart(redis_client, user_id, item)

@router.get("/{user_id}", response_model=Cart)
async def get_user_cart(
    user_id: int, 
    redis_client: Redis = Depends(get_redis)
):
    """Возвращает текущую корзину пользователя"""
    return await crud_cart.get_cart(redis_client, user_id)