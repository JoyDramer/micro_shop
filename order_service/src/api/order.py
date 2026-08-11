from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from src.core.redis import get_redis
from src.core.database import get_db
from src.crud.cart import get_cart, CART_PREFIX
from src.core.rabbitmq import send_order_created_event
from src.models.order import Order, OrderItem

router = APIRouter(prefix="/orders", tags=["Оформление заказа"])

@router.post("/checkout/{user_id}")
async def checkout(user_id: int, db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)):
    # 1. Достаем корзину из памяти
    cart = await get_cart(redis, user_id)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Корзина пуста")
        
    # 2. Создаем чек в PostgreSQL
    new_order = Order(user_id=user_id, status="created")
    db.add(new_order)
    await db.flush() # Получаем ID нового заказа до коммита
    
    for item in cart.items:
        order_item = OrderItem(order_id=new_order.id, product_id=item.product_id, quantity=item.quantity)
        db.add(order_item)
        
    await db.commit()
    
    # 3. Очищаем корзину в Redis
    await redis.delete(f"{CART_PREFIX}{user_id}")
    
    # 4. Кидаем событие в RabbitMQ
    event_payload = {
        "order_id": new_order.id,
        "user_id": user_id,
        "items": [{"product_id": i.product_id, "quantity": i.quantity} for i in cart.items]
    }
    await send_order_created_event(event_payload)
    
    return {"message": "Заказ успешно оформлен", "order_id": new_order.id}