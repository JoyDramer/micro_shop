from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.core.database import Base

# --- Локальный кэш товаров из RabbitMQ ---
class ProductCache(Base):
    __tablename__ = "product_cache"
    
    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Неизвестный товар") # <-- ДОБАВИЛИ НАЗВАНИЕ
    price = Column(Float, nullable=False) # Нас интересует только цена продажи

# --- Таблицы заказов ---
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    status = Column(String, default="created") 
    total_amount = Column(Float, nullable=False, default=0.0)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)

    # --- ДАННЫЕ ДОСТАВКИ ---
    # 1. Провайдер (russian_post, cdek, ozon)
    delivery_provider = Column(String, nullable=False, default="russian_post") 
    
    # 2. Адрес доставки (плюс индекс, он обязателен для ТК)
    address = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)

    # 3. Трек-номер (заполняется после успешной оплаты)
    tracking_number = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer)
    product_name = Column(String, nullable=False, default="Неизвестный товар") # <-- ДОБАВИЛИ НАЗВАНИЕ В ЧЕК
    quantity = Column(Integer)
    price_per_unit = Column(Float, nullable=False) # Зафиксированная цена
    
    order = relationship("Order", back_populates="items")