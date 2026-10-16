import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from src.core.database import get_db 
from src.core.redis import get_redis
from src.core.security import get_admin_user_id, get_current_user_id 

from src.schemas.rent import (
    RentalProductCreate, 
    RentalProductResponse, 
    BookRequest, 
    BookingResponse, 
    BookingStatusUpdate
)
from src.crud import rent as crud_rent

router = APIRouter(prefix="/rent", tags=["Аренда"])

# ==========================================
# ЭНДПОИНТЫ КАТАЛОГА
# ==========================================

@router.post("/catalog", response_model=RentalProductResponse)
async def create_rental_product(
    product_in: RentalProductCreate,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(get_admin_user_id), # Защищено: только для админа
    redis: Redis = Depends(get_redis) # Добавили Redis
):
    """Добавить новый товар в каталог аренды (Только для администратора)"""
    new_product = await crud_rent.create_rental_product(db, product_in)
    
    # Очищаем кэш каталога аренды после добавления
    await redis.delete("rent:all_products")
    
    return new_product

@router.get("/catalog")
async def get_rental_catalog(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis) # Добавили Redis
):
    """Получить весь список товаров (доступно всем)"""
    cache_key = "rent:all_products"
    
    # 1. Ищем в кэше
    cached_data = await redis.get(cache_key)
    if cached_data:
        return json.loads(cached_data) # Отдаем моментально!
        
    # 2. Если кэш пуст, идем в БД
    products = await crud_rent.get_rental_products(db)
    
    # 3. Подготавливаем данные (конвертируем Decimal и прочие типы)
    json_safe_data = jsonable_encoder(products)
    
    # 4. Сохраняем в кэш на 5 минут (300 секунд)
    await redis.setex(cache_key, 300, json.dumps(json_safe_data))
    
    return json_safe_data


# ==========================================
# ЭНДПОИНТЫ БРОНИРОВАНИЯ
# ==========================================

@router.post("/book", response_model=BookingResponse)
async def create_booking(
    request: BookRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id) # Доступно авторизованному пользователю
):
    """Создать новую бронь на товар из каталога"""
    request.user_id = user_id
    
    booking = await crud_rent.create_booking(db, request)
    if not booking:
        raise HTTPException(
            status_code=400, 
            detail="К сожалению, нет свободных единиц этого товара на выбранные даты."
        )
    return booking

@router.get("/bookings", response_model=List[BookingResponse])
async def get_all_bookings(
    rental_product_id: int = None,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Получить список бронирований"""
    return await crud_rent.get_bookings(db, user_id=user_id, rental_product_id=rental_product_id)

@router.put("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_status(
    booking_id: int,
    status_update: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(get_admin_user_id) # Защищено: только для админа
):
    """Изменить статус брони (Только для администратора)"""
    updated_booking = await crud_rent.update_booking_status(db, booking_id, status_update.status)
    if not updated_booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    return updated_booking