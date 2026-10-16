from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.models.order import Order
from src.schemas.order import OrderStatus 

async def create_order(
    db: AsyncSession, 
    current_user_id: int, 
    total_amount: float,
    first_name: str,
    last_name: str,
    address: str,
    postal_code: str,
    delivery_provider: str, # <-- ДОБАВИЛИ ПРОВАЙДЕРА ДОСТАВКИ
    middle_name: str | None = None
) -> Order:
    """Создает новый заказ из переданных параметров напрямую (без OrderCreate)"""
    
    # Создаем объект модели для базы данных
    db_order = Order(
        user_id=current_user_id,
        total_amount=total_amount,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        address=address,
        postal_code=postal_code,
        delivery_provider=delivery_provider, # <-- СОХРАНЯЕМ В БАЗУ
        status=OrderStatus.CREATED, 
    )
    
    # Сохраняем в базу
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    return db_order


async def get_order(db: AsyncSession, order_id: int) -> Order | None:
    """Получает заказ из базы по его ID"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def update_order_status(db: AsyncSession, order: Order, new_status: OrderStatus) -> Order:
    """Обновляет статус заказа (теперь строго через Enum)"""
    order.status = new_status
    await db.commit()
    await db.refresh(order)
    return order