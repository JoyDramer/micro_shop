from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, JSON
from src.core.database import Base
from src.models.idempotency import ProcessedEvent

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)      # наименование
    product_type = Column(String(50), nullable=False)           # тип (магнитные/капсульные)
    category = Column(String(100), index=True, nullable=False)  # категория
    images = Column(JSON, nullable=True, default=list)          # НОВОЕ: массив ссылок на изображения 
    description = Column(Text, nullable=True)                   # описание
    price = Column(Numeric(10, 2), nullable=False)              # базовая цена
    stock = Column(Integer, default=0, nullable=False)          # общее количество на складе
    reserved = Column(Integer, default=0, server_default="0", nullable=False) # резерв под заказы
    is_bestseller = Column(Boolean, default=False)              # остаток на складе