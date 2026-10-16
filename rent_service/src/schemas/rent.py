from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from src.models.rent import BookingStatus

# ==========================================
# СХЕМЫ ДЛЯ КАТАЛОГА АРЕНДЫ (RentalProduct)
# ==========================================
class RentalProductBase(BaseModel):
    name: str = Field(..., description="Название арендного товара")
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price_per_day: float = Field(..., gt=0, description="Цена аренды за сутки")
    deposit_type: str = Field(..., description="Тип залога: cash, document, none")
    deposit_amount: Optional[float] = Field(None, ge=0, description="Сумма залога (если cash)")

class RentalProductCreate(RentalProductBase):
    pass

class RentalProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price_per_day: Optional[float] = Field(None, gt=0)
    deposit_type: Optional[str] = None
    deposit_amount: Optional[float] = Field(None, ge=0)

class RentalProductResponse(RentalProductBase):
    id: int

    class Config:
        from_attributes = True


# ==========================================
# СХЕМЫ ДЛЯ БРОНИРОВАНИЯ (Booking)
# ==========================================
class BookRequest(BaseModel):
    # ИЗМЕНИЛИ: теперь клиент выбирает товар из нашего каталога аренды
    rental_product_id: int 
    start_time: datetime
    end_time: datetime
    
    # В реальности user_id берется из JWT-токена, 
    # но пока для тестов будем передавать явно
    user_id: int 

class BookingResponse(BaseModel):
    id: int
    rent_item_id: int
    status: str
    rent_price: float
    deposit_type: str
    
    class Config:
        from_attributes = True

class BookingStatusUpdate(BaseModel):
    # УБРАЛИ confirmed из комментария, так как мы удалили этот статус
    status: str # Ожидаем значения: pending, active, completed, overdue, cancelled