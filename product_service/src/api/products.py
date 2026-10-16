import json
from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.rabbitmq import publish_product_event
from src.core.database import get_db
from src.core.redis import get_redis
from src.crud import product as crud_product
from src.models.product import Product
from src.schemas.product import ProductCreate, ProductResponse, ProductUpdate

# 1. Импортируем нашу новую функцию проверки прав
from src.core.security import get_current_admin

# Создаем роутер (группу эндпоинтов)
router = APIRouter(prefix="/products", tags=["Товары"])

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_in: ProductCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    admin: dict = Depends(get_current_admin)
):
    """Создать новый товар (наушник) - Только для администраторов"""
    # 1. Сохраняем в БД
    new_product = await crud_product.create_product(db, product_in)
    
    # 2. СБРАСЫВАЕМ КЭШ Redis
    await redis.delete("catalog:all_products")
    
    # 3. ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ В RABBITMQ (В ФОНЕ)
    product_data = {
        "id": new_product.id,
        "name": new_product.name,
        "price": float(new_product.price) # Конвертируем для безопасного JSON
    }
    background_tasks.add_task(publish_product_event, product_data)
    
    return new_product

@router.get("/")
async def get_all_products(
    db: AsyncSession = Depends(get_db), 
    redis: Redis = Depends(get_redis)
):
    """Остается открытым для всех пользователей (без Depends)"""
    cache_key = "catalog:all_products"
    
    # 1. Ищем в кэше
    cached_data = await redis.get(cache_key)
    if cached_data:
        return json.loads(cached_data) # Отдаем моментально!
        
    # 2. Если кэш пуст (Cache Miss), идем в БД
    result = await db.execute(select(Product))
    products = result.scalars().all()
    
    # Превращаем объекты SQLAlchemy в словари для JSON
    products_list = []
    for p in products:
        prod_dict = ProductResponse.model_validate(p).model_dump()
        prod_dict["available"] = p.stock - p.reserved 
        products_list.append(prod_dict)
    
    # 3. Подготавливаем данные (конвертируем Decimal)
    json_safe_data = jsonable_encoder(products_list)
    
    # 4. Сохраняем в кэш на 5 минут (300 секунд)
    await redis.setex(cache_key, 300, json.dumps(json_safe_data))
    
    return json_safe_data  # Лучше возвращать сразу безопасные данные

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Получить один товар по ID - Открыто для всех"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product

@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int, 
    product_in: ProductUpdate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    # 3. Защищаем редактирование
    admin: dict = Depends(get_current_admin)
):
    """Частично обновить данные товара - Только для администраторов"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
        
    updated_product = await crud_product.update_product(db, product, product_in)
    
    # Сбрасываем кэш, так как цена или данные могли измениться
    await redis.delete("catalog:all_products")
    
    product_data = {
        "id": updated_product.id,
        "name": updated_product.name,
        "price": float(updated_product.price)
    }
    background_tasks.add_task(publish_product_event, product_data) 
    
    return updated_product

@router.delete("/{product_id}")
async def delete_product(
    product_id: int, 
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    # 4. Защищаем удаление
    admin: dict = Depends(get_current_admin)
):
    """Удалить товар из каталога - Только для администраторов"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
        
    await crud_product.delete_product(db, product)
    # СБРАСЫВАЕМ КЭШ после удаления
    await redis.delete("catalog:all_products")
    return {"message": "Товар успешно удален"}