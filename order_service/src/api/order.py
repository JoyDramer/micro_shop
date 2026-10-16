from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis
from sqlalchemy.orm import selectinload

from src.core.redis import get_redis
from src.core.database import get_db
from src.core.security import get_current_user_id
from src.crud.cart import get_cart, add_to_cart, CART_PREFIX 
from src.crud.orders import create_order 
from src.core.rabbitmq import send_order_created_event, send_order_cancelled_event
from src.models.order import Order, OrderItem, ProductCache
from src.schemas.order import OrderResponse
from src.services.twenty_crm import crm_client 

router = APIRouter(prefix="/orders", tags=["Оформление заказа"])

class CheckoutRequest(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    phone: str
    address: str
    postal_code: str
    delivery_provider: str  # <-- Изменили на delivery_provider (cdek, ozon, russian_post)

@router.post("/checkout")
async def checkout(
    payload: CheckoutRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db), 
    redis: Redis = Depends(get_redis),
    user_id: int = Depends(get_current_user_id),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID")
):
    user_cart_id = f"user:{user_id}"
    
    if x_session_id:
        guest_cart_id = f"guest:{x_session_id}"
        guest_cart = await get_cart(redis, guest_cart_id)
        
        if guest_cart and guest_cart.items:
            for item in guest_cart.items:
                await add_to_cart(redis, user_cart_id, item)
            await redis.delete(f"{CART_PREFIX}{guest_cart_id}")

    cart = await get_cart(redis, user_cart_id)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Корзина пуста")
        
    product_ids = [item.product_id for item in cart.items]
    stmt = select(ProductCache).where(ProductCache.product_id.in_(product_ids))
    result = await db.execute(stmt)
    
    cached_products = {p.product_id: p for p in result.scalars().all()}
    
    missing_ids = [pid for pid in product_ids if pid not in cached_products]
    
    if missing_ids:
        async with httpx.AsyncClient() as client:
            for pid in missing_ids:
                try:
                    url = f"http://product_service:8000/api/products/products/{pid}"
                    response = await client.get(url, timeout=5.0)
                    
                    if response.status_code == 200:
                        prod_data = response.json()
                        
                        new_cache = ProductCache(
                            product_id=pid,
                            name=prod_data.get("name"),
                            price=float(prod_data.get("price"))
                        )
                        db.add(new_cache)
                        cached_products[pid] = new_cache 
                    else:
                        raise HTTPException(status_code=400, detail=f"Товар недоступен. ID: {pid}")
                except httpx.RequestError:
                    raise HTTPException(status_code=500, detail="Сервис каталога временно недоступен")
        
        await db.commit()

    total_sum = sum(cached_products[item.product_id].price * item.quantity for item in cart.items)

    new_order = await create_order(
        db=db,
        current_user_id=user_id,
        total_amount=total_sum,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        address=payload.address,
        postal_code=payload.postal_code,
        delivery_provider=payload.delivery_provider # <-- Передаем в БД
    )
    
    order_items_data = []
    
    for item in cart.items:
        cached_product = cached_products[item.product_id]
        
        order_item = OrderItem(
            order_id=new_order.id, 
            product_id=item.product_id, 
            product_name=cached_product.name,
            quantity=item.quantity,
            price_per_unit=cached_product.price
        )
        db.add(order_item)
        
        order_items_data.append({
            "product_id": item.product_id, 
            "product_name": cached_product.name, 
            "quantity": item.quantity,
            "price": float(cached_product.price) 
        })
        
    await db.commit()
    await redis.delete(f"{CART_PREFIX}{user_cart_id}")
    
# ----------------- ОТПРАВКА В CRM (ФОНОВАЯ ЗАДАЧА) -----------------
    order_name = f"Заказ #{new_order.id}"
    
    async def send_order_to_crm_task(order_id: int, u_id: int, t_sum: float, o_name: str, p_load: CheckoutRequest, items_data: list):
        crm_order_id = await crm_client.create_order(
            site_order_id=order_id,
            user_id=u_id,
            total_amount=t_sum,
            order_name=o_name,
            address=p_load.address,
            postal_code=p_load.postal_code,
            delivery_type=p_load.delivery_provider # <-- CRM получит 'russian_post', 'cdek' и т.д.
        )

        if crm_order_id and hasattr(crm_client, "create_order_item"):
            for item_data in items_data:
                crm_product_uuid = await crm_client.get_product_uuid(item_data["product_id"])
                if crm_product_uuid:
                    await crm_client.create_order_item(
                        crm_order_id=crm_order_id,
                        crm_product_id=crm_product_uuid,
                        quantity=item_data["quantity"],
                        price=int(item_data["price"]),
                        item_name=item_data["product_name"]
                    )

    background_tasks.add_task(
        send_order_to_crm_task,
        order_id=new_order.id,
        u_id=user_id,
        t_sum=total_sum,
        o_name=order_name,
        p_load=payload,
        items_data=order_items_data
    )
    # ------------------------------------------------------------------
    
    event_payload = {
        "order_id": new_order.id,
        "user_id": user_id,
        "total_amount": float(total_sum),
        "items": order_items_data,
        "delivery_info": {
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "middle_name": payload.middle_name,
            "phone": payload.phone,
            "address": payload.address,
            "postal_code": payload.postal_code,
            "delivery_provider": payload.delivery_provider # <-- Отправляем в RabbitMQ
        }
    }
    await send_order_created_event(event_payload)
    
    return {
        "message": "Заказ успешно оформлен", 
        "order_id": new_order.id, 
        "total_amount": total_sum
    }

@router.get("/", response_model=list[OrderResponse])
async def get_user_orders(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Возвращает историю заказов текущего пользователя"""
    stmt = (
        select(Order)
        .where(Order.user_id == user_id,
               Order.status != "отменен"
               )
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    result = await db.execute(stmt)
    orders = result.scalars().all()
    return orders

@router.delete("/{order_id}")
async def cancel_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Отмена неоплаченного заказа пользователем"""
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.user_id == user_id)
        .options(selectinload(Order.items))
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.status != "создан":
        raise HTTPException(status_code=400, detail="Можно отменить только неоплаченный заказ")

    order.status = "отменен"
    
    cancelled_items = [{"product_id": item.product_id, "quantity": item.quantity} for item in order.items]
    
    await db.commit()

    # ----------------- СИНХРОНИЗАЦИЯ С CRM -----------------
    await crm_client.update_order_status(site_order_id=order.id, new_status="OTMENEN")
    # -------------------------------------------------------

    await send_order_cancelled_event({
        "order_id": order.id, 
        "items": cancelled_items
    })

    return {"message": "Заказ успешно отменен"}