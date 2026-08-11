import json
from redis.asyncio import Redis
from src.schemas.cart import Cart, CartItem

CART_PREFIX = "cart:"
TTL = 60 * 60 * 24 * 7  # Корзина хранится 7 дней

async def add_to_cart(redis: Redis, user_id: int, item: CartItem) -> Cart:
    cart_key = f"{CART_PREFIX}{user_id}"
    
    # 1. Получаем текущую корзину из Redis
    cart_data = await redis.get(cart_key)
    if cart_data:
        cart = Cart.model_validate_json(cart_data)
    else:
        cart = Cart(user_id=user_id)
        
    # 2. Проверяем, есть ли уже такой товар в корзине
    for existing_item in cart.items:
        if existing_item.product_id == item.product_id:
            existing_item.quantity += item.quantity
            break
    else:
        # Если товара не было — добавляем новый
        cart.items.append(item)
        
    # 3. Сохраняем обновленную корзину обратно в Redis
    await redis.set(cart_key, cart.model_dump_json(), ex=TTL)
    return cart

async def get_cart(redis: Redis, user_id: int) -> Cart:
    cart_key = f"{CART_PREFIX}{user_id}"
    cart_data = await redis.get(cart_key)
    
    if cart_data:
        return Cart.model_validate_json(cart_data)
    # Если корзины нет, возвращаем пустую
    return Cart(user_id=user_id)