from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional

from src.models.product import Product
from src.schemas.product import ProductCreate, ProductUpdate

# Создание нового товара
async def create_product(session: AsyncSession, product_in: ProductCreate) -> Product:
    # model_dump() превращает Pydantic-схему в обычный словарь
    db_product = Product(**product_in.model_dump())
    session.add(db_product)
    await session.commit()
    await session.refresh(db_product)
    return db_product

# Получение одного товара по ID
async def get_product(session: AsyncSession, product_id: int) -> Optional[Product]:
    stmt = select(Product).where(Product.id == product_id)
    result = await session.execute(stmt)
    # scalar_one_or_none вернет товар либо None, если такого ID нет
    return result.scalar_one_or_none()

# Получение списка товаров (с пагинацией и фильтром по типу)
async def get_products(
    session: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    product_type: Optional[str] = None
) -> list[Product]:
    stmt = select(Product).offset(skip).limit(limit)
    
    # Если передали тип (например, "магнитные"), добавляем фильтр
    if product_type:
        stmt = stmt.where(Product.product_type == product_type)
        
    result = await session.execute(stmt)
    return list(result.scalars().all())

# Обновление товара
async def update_product(
    session: AsyncSession, 
    db_product: Product, 
    product_in: ProductUpdate
) -> Product:
    # Получаем только те поля, которые пользователь передал для обновления
    update_data = product_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_product, field, value)
        
    session.add(db_product)
    await session.commit()
    await session.refresh(db_product)
    return db_product

# Удаление товара
async def delete_product(session: AsyncSession, db_product: Product) -> Product:
    await session.delete(db_product)
    await session.commit()
    return db_product

async def hold_product(db: AsyncSession, product_id: int, quantity: int) -> bool:
    """
    Резервирует товар. Возвращает True, если резерв успешен, и False, если товара не хватает.
    """
    # Этот запрос атомарный. Он обновит строку ТОЛЬКО если (stock - reserved) >= quantity.
    stmt = (
        update(Product)
        .where(Product.id == product_id)
        .where((Product.stock - Product.reserved) >= quantity)
        .values(reserved=Product.reserved + quantity)
        .returning(Product.id)  # Просим БД вернуть ID, если строка обновилась
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    # Если вернулся ID, значит условие выполнилось и товар зарезервирован
    updated_id = result.scalar_one_or_none()
    
    return updated_id is not None

async def confirm_product(db: AsyncSession, product_id: int, quantity: int) -> bool:
    """
    Подтверждает покупку: окончательно списывает со склада и снимает резерв.
    """
    stmt = (
        update(Product)
        .where(Product.id == product_id)
        .where(Product.reserved >= quantity)  # Защита от ухода в минус
        .values(
            stock=Product.stock - quantity,
            reserved=Product.reserved - quantity
        )
        .returning(Product.id)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one_or_none() is not None


async def release_product(db: AsyncSession, product_id: int, quantity: int) -> bool:
    """
    Отменяет резерв: просто уменьшает счетчик зарезервированного товара.
    """
    stmt = (
        update(Product)
        .where(Product.id == product_id)
        .where(Product.reserved >= quantity)
        .values(reserved=Product.reserved - quantity)
        .returning(Product.id)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one_or_none() is not None