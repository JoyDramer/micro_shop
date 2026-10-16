from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from redis.asyncio import Redis

from src.core.redis import get_redis
from src.core.security import get_cart_identifier 
from src.schemas.cart import Cart, CartItem, CartUpdate
from src.crud import cart as crud_cart

router = APIRouter(prefix="/cart", tags=["Корзина"])

@router.post("/add", response_model=Cart)
async def add_item_to_cart(
    item: CartItem, 
    cart_id: str = Depends(get_cart_identifier), 
    # Явно добавляем заголовок, чтобы Swagger его увидел:
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID", description="ID гостя (например, guest123)"),
    redis_client: Redis = Depends(get_redis)
):
    """Добавляет товар в корзину авторизованного пользователя или гостя"""
    return await crud_cart.add_to_cart(redis_client, cart_id, item)

@router.get("/", response_model=Cart)
async def get_user_cart(
    cart_id: str = Depends(get_cart_identifier), 
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID", description="ID гостя (например, guest123)"),
    redis_client: Redis = Depends(get_redis)
):
    """Возвращает текущую корзину (по токену или X-Session-ID)"""
    return await crud_cart.get_cart(redis_client, cart_id)

@router.put("/update", response_model=Cart)
async def update_cart_item(
    item: CartUpdate,
    cart_id: str = Depends(get_cart_identifier),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID", description="ID гостя (например, guest123)"),
    redis_client: Redis = Depends(get_redis)
):
    """Обновляет количество товара в корзине или удаляет его при quantity=0"""
    return await crud_cart.update_cart(redis_client, cart_id, item)

@router.delete("/clear", response_model=Cart)
async def clear_user_cart(
    cart_id: str = Depends(get_cart_identifier),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID", description="ID гостя (например, guest123)"),
    redis_client: Redis = Depends(get_redis)
):
    """Полностью очищает корзину"""
    return await crud_cart.clear_cart(redis_client, cart_id)