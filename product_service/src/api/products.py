import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.redis import get_redis
from src.crud import product as crud_product
from src.models.product import Product
from src.schemas.product import ProductCreate, ProductResponse, ProductUpdate


# Создаем роутер (группу эндпоинтов)
router = APIRouter(prefix="/products", tags=["Товары"])

@router.post("/", response_model=ProductResponse)
async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db)):
    """Создать новый товар (наушник)"""
    return await crud_product.create_product(db, product_in)

@router.get("/")
async def get_all_products(
    db: AsyncSession = Depends(get_db), 
    redis: Redis = Depends(get_redis)
):
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
        # Pydantic сам соберет все поля!
        prod_dict = ProductResponse.model_validate(p).model_dump()
        # Добавляем наше вычисляемое поле
        prod_dict["available"] = p.stock - p.reserved 
        products_list.append(prod_dict)
    
    # 3. Сохраняем в кэш на 5 минут (300 секунд)
    await redis.setex(cache_key, 300, json.dumps(products_list))
    
    return products_list

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Получить один товар по ID"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product

@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_in: ProductUpdate, db: AsyncSession = Depends(get_db)):
    """Частично обновить данные товара"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return await crud_product.update_product(db, product, product_in)

@router.delete("/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить товар из каталога"""
    product = await crud_product.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    await crud_product.delete_product(db, product)
    return {"message": "Товар успешно удален"}