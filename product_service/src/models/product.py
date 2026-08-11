from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean
from src.core.database import Base
from src.models.idempotency import ProcessedEvent

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)      # наименование
    product_type = Column(String(50), nullable=False)           # тип (магнитные/капсульные)
    category = Column(String(100), index=True, nullable=False)  # категория
    image_url = Column(String, nullable=True)                   # ссылка на изображение
    is_active = Column(Boolean, default=True)                   # статус (True - показывается, False - скрыт)
    description = Column(Text, nullable=True)                   # описание
    discount = Column(Integer, default=0)                       # скидка (в процентах, от 0 до 100)
    # Системные поля магазина:
    price = Column(Numeric(10, 2), nullable=False)              # базовая цена
    stock = Column(Integer, default=0, nullable=False)
    reserved = Column(Integer, default=0, server_default="0", nullable=False)          # остаток на складе