from fastapi import HTTPException
from sqlalchemy import select, and_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# ИМПОРТЫ ИЗМЕНЕНЫ: Убрали ProductCache, добавили RentalProduct
from src.models.rent import RentItem, Booking, BookingStatus, RentalProduct
from src.schemas.rent import BookRequest, RentalProductCreate, RentalProductUpdate


# ==========================================
# CRUD ДЛЯ КАТАЛОГА АРЕНДЫ (RentalProduct)
# ==========================================
async def create_rental_product(db: AsyncSession, product_in: RentalProductCreate):
    """Создает новый товар в каталоге аренды"""
    db_product = RentalProduct(**product_in.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

async def get_rental_products(db: AsyncSession):
    """Возвращает весь каталог аренды"""
    result = await db.execute(select(RentalProduct))
    return result.scalars().all()


# ==========================================
# CRUD ДЛЯ БРОНИРОВАНИЯ (Booking)
# ==========================================
async def create_booking(db: AsyncSession, request: BookRequest):
    # 1. Получаем товар напрямую из НАШЕГО каталога аренды (больше никакого кэша RabbitMQ)
    catalog_stmt = select(RentalProduct).where(RentalProduct.id == request.rental_product_id)
    catalog_result = await db.execute(catalog_stmt)
    product_data = catalog_result.scalar_one_or_none()

    if not product_data:
        raise HTTPException(
            status_code=404, 
            detail="Арендный товар не найден в каталоге."
        )

    # 2. ПОДЗАПРОС: Ищем ID физических единиц, которые ЗАНЯТЫ в эти даты
    subquery = select(Booking.rent_item_id).where(
        and_(
            # Убрали CONFIRMED, добавили PENDING (бронь держит товар, пока клиент едет)
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.ACTIVE, BookingStatus.OVERDUE]),
            Booking.start_time < request.end_time,
            Booking.end_time > request.start_time
        )
    ).scalar_subquery()

    # 3. ОСНОВНОЙ ЗАПРОС: Берем 1 свободную физическую единицу
    stmt = select(RentItem).where(
        and_(
            # Ищем по нашему новому полю rental_product_id
            RentItem.rental_product_id == request.rental_product_id,
            RentItem.is_active == True,
            not_(RentItem.id.in_(subquery))
        )
    ).limit(1)

    result = await db.execute(stmt)
    available_item = result.scalar_one_or_none()

    # Если свободных единиц нет — возвращаем None
    if not available_item:
        return None

    # 4. Создаем саму бронь
    new_booking = Booking(
        user_id=request.user_id,
        rent_item_id=available_item.id,
        start_time=request.start_time,
        end_time=request.end_time,
        status=BookingStatus.PENDING.value,
        rent_price=product_data.price_per_day,  # Берем из RentalProduct
        deposit_type=product_data.deposit_type  # Берем из RentalProduct
    )
    
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    
    return new_booking

async def update_booking_status(db: AsyncSession, booking_id: int, new_status: str):
    """Изменение статуса бронирования"""
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        return None
    
    booking.status = new_status
    await db.commit()
    await db.refresh(booking)
    return booking


async def get_bookings(
    db: AsyncSession, 
    user_id: int = None, 
    rental_product_id: int = None, # Поменяли product_id на rental_product_id
    limit: int = 100
):
    """Получить список бронирований с фильтрацией"""
    stmt = select(Booking)

    if user_id:
        stmt = stmt.where(Booking.user_id == user_id)
        
    if rental_product_id:
        # Присоединяем таблицу RentItem по-новому
        stmt = stmt.join(RentItem, Booking.rent_item_id == RentItem.id)\
                   .where(RentItem.rental_product_id == rental_product_id)
                   
    stmt = stmt.order_by(Booking.start_time.desc()).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()