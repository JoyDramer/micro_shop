import pytest
from sqlalchemy import select
from src.crud.product import hold_product, confirm_product, release_product
from src.models.product import Product

@pytest.mark.asyncio
async def test_hold_product_success(db_session):
    # Пытаемся зарезервировать 3 штуки (на складе 10)
    success = await hold_product(db_session, product_id=1, quantity=3)
    
    # Резерв должен пройти
    assert success is True
    
    # Проверяем БД
    result = await db_session.execute(select(Product).where(Product.id == 1))
    product = result.scalar_one_or_none()
    
    assert product.stock == 10  # Общий сток не изменился
    assert product.reserved == 3  # В резерве появилось 3 штуки

@pytest.mark.asyncio
async def test_hold_product_fail_not_enough_stock(db_session):
    # Пытаемся зарезервировать 15 штук (а на складе всего 10)
    success = await hold_product(db_session, product_id=1, quantity=15)
    
    # Резерв должен быть отклонен
    assert success is False

@pytest.mark.asyncio
async def test_confirm_product_success(db_session):
    # 1. Сначала резервируем 3 штуки
    await hold_product(db_session, product_id=1, quantity=3)
    
    # 2. Имитируем успешную оплату - подтверждаем
    success = await confirm_product(db_session, product_id=1, quantity=3)
    assert success is True
    
    # 3. Проверяем БД (Было 10, купили 3)
    result = await db_session.execute(select(Product).where(Product.id == 1))
    product = result.scalar_one_or_none()
    
    assert product.stock == 7     # Реально списалось со склада
    assert product.reserved == 0  # Резерв обнулился


@pytest.mark.asyncio
async def test_release_product_success(db_session):
    # 1. Сначала резервируем 2 штуки
    await hold_product(db_session, product_id=1, quantity=2)
    
    # 2. Имитируем отмену заказа (не оплатил)
    success = await release_product(db_session, product_id=1, quantity=2)
    assert success is True
    
    # 3. Проверяем БД
    result = await db_session.execute(select(Product).where(Product.id == 1))
    product = result.scalar_one_or_none()
    
    assert product.stock == 10    # На складе всё те же 10 штук
    assert product.reserved == 0  # Резерв обнулился, товар свободен