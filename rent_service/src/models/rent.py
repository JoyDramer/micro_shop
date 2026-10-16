import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from src.core.database import Base

class BookingStatus(str, enum.Enum):
    PENDING = "pending"           # Забронировано, ждет выдачи и оплаты на месте
    ACTIVE = "active"             # Клиент оплатил и забрал товар (на руках)
    COMPLETED = "completed"       # Товар возвращен, залог разморожен
    OVERDUE = "overdue"           # Просрочка возврата!
    CANCELLED = "cancelled"       # Бронь отменена

# 1. НОВАЯ ТАБЛИЦА: Каталог арендных товаров
class RentalProduct(Base):
    __tablename__ = "rental_products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    
    # ДОБАВЛЯЕМ ПОЛЕ ФОТО:
    photo_url = Column(String, nullable=True) # nullable=True, если фото пока нет
    
    # Финансы аренды
    price_per_day = Column(Float, nullable=False)
    deposit_type = Column(String, nullable=False)
    deposit_amount = Column(Float, nullable=True)

# 2. ОБНОВЛЕННАЯ ТАБЛИЦА: Конкретные физические единицы
class RentItem(Base):
    __tablename__ = "rent_items"
    
    id = Column(Integer, primary_key=True)
    rental_product_id = Column(Integer, ForeignKey("rental_products.id"), nullable=False)
    serial_number = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True) 

# 3. ТАБЛИЦА БРОНИРОВАНИЙ
class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True, nullable=False)
    rent_item_id = Column(Integer, ForeignKey("rent_items.id"), nullable=False)
    
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(String, default=BookingStatus.PENDING.value)
    
    rent_price = Column(Float, nullable=False)
    deposit_type = Column(String, nullable=False)