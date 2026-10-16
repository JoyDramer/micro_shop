import json
from redis.asyncio import Redis
from src.schemas.cart import Cart, CartItem, CartUpdate
from fastapi import HTTPException

CART_PREFIX = "cart:"
TTL = 60 * 60 * 24 * 7  # Корзина хранится 7 дней

async def add_to_cart(redis: Redis, cart_id: str, item: CartItem) -> Cart:
    cart_key = f"{CART_PREFIX}{cart_id}"
    
    # 1. Получаем текущую корзину из Redis
    cart_data = await redis.get(cart_key)
    if cart_data:
        cart = Cart.model_validate_json(cart_data)
    else:
        # Передаем строковый идентификатор
        cart = Cart(user_id=cart_id)
        
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

async def get_cart(redis: Redis, cart_id: str) -> Cart:
    cart_key = f"{CART_PREFIX}{cart_id}"
    cart_data = await redis.get(cart_key)
    
    if cart_data:
        return Cart.model_validate_json(cart_data)
    # Если корзины нет, возвращаем пустую
    return Cart(user_id=cart_id)

async def update_cart(redis: Redis, cart_id: str, item: CartUpdate) -> Cart:
    cart_key = f"{CART_PREFIX}{cart_id}"
    
    # 1. Получаем текущую корзину из Redis
    cart_data = await redis.get(cart_key)
    if not cart_data:
        raise HTTPException(status_code=404, detail="Корзина пуста или не найдена")
        
    cart = Cart.model_validate_json(cart_data)
    
    # 2. Ищем товар в списке корзины
    item_index = None
    for i, existing_item in enumerate(cart.items):
        if existing_item.product_id == item.product_id:
            item_index = i
            break
            
    # Если цикл прошел, а товар не найден
    if item_index is None:
        raise HTTPException(status_code=404, detail="Товар не найден в корзине")
        
    # 3. Обновляем количество или удаляем товар
    if item.quantity > 0:
        cart.items[item_index].quantity = item.quantity
    else:
        # Если передали 0, выкидываем элемент из списка
        cart.items.pop(item_index)
        
    # 4. Сохраняем обновленную корзину обратно в Redis в формате JSON
    await redis.set(cart_key, cart.model_dump_json(), ex=TTL)
    
    return cart

async def clear_cart(redis: Redis, cart_id: str):
    cart_key = f"{CART_PREFIX}{cart_id}"
    await redis.delete(cart_key)
    # Возвращаем пустую корзину для удобства фронтенда
    return Cart(user_id=cart_id)