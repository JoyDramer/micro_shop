from pydantic import BaseModel, ConfigDict
from datetime import datetime
from enum import Enum
from typing import Optional

# 1. Строгий список возможных этапов жизни заказа
class OrderStatus(str, Enum):
    CREATED = "создан"
    PAID = "оплачен"
    AWAITING_SHIPMENT = "ждет отправки"
    IN_DELIVERY = "передан в доставку"
    DELIVERED = "получен"
    CANCELLED = "отменен"

# === 2. СХЕМА ДЛЯ СОЗДАНИЯ ЗАКАЗА (ДАННЫЕ ОТ ФРОНТЕНДА) ===
class OrderCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    
    # Данные доставки от виджета
    delivery_provider: str  # 'russian_post', 'cdek', 'ozon'
    address: str
    postal_code: str

# 3. Схема для одного товара в чеке
class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str  
    quantity: int
    price_per_unit: float

    model_config = ConfigDict(from_attributes=True)

# 4. Финальная схема заказа (отдаем фронтенду)
class OrderResponse(BaseModel):
    id: int
    status: OrderStatus  # Используем наш строгий Enum
    total_amount: float
    
    # Данные доставки
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    
    delivery_provider: str  # <-- ДОБАВИЛИ ПРОВАЙДЕРА
    address: str
    postal_code: str
    tracking_number: Optional[str] = None
    
    created_at: datetime
    items: list[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

# 5. Схема для обновления заказа менеджером или системой
class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    tracking_number: Optional[str] = None
    delivery_provider: Optional[str] = None # Добавили на случай смены службы доставки