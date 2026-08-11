import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from src.core.database import Base

class RentItem(Base):
    __tablename__ = "rent_items"
    
    id = Column(Integer, primary_key=True)
    # Ссылка на ID товара из product_service
    product_id = Column(Integer, index=True, nullable=False) 
    
    # Уникальный номер физической коробки/наушника (например, "SN-10045")
    serial_number = Column(String, unique=True, nullable=False)
    
    # Можно ли его вообще сдавать (False, если в ремонте или утерян)
    is_active = Column(Boolean, default=True) 

class BookingStatus(str, enum.Enum):
    PENDING = "pending"           # Ждет внесения залога/оплаты
    CONFIRMED = "confirmed"       # Оплачено, ждет выдачи клиенту
    ACTIVE = "active"             # Клиент забрал товар (на руках)
    COMPLETED = "completed"       # Товар возвращен, залог разморожен
    OVERDUE = "overdue"           # Просрочка возврата!
    CANCELLED = "cancelled"       # Бронь отменена

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True, nullable=False)
    
    # Какую именно физическую единицу мы отдали (связь с таблицей выше)
    rent_item_id = Column(Integer, ForeignKey("rent_items.id"), nullable=False)
    
    # Календарь (Time-Slot)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(String, default=BookingStatus.PENDING)
    
    # Финансы
    rent_price = Column(Float, nullable=False)
    deposit_amount = Column(Float, nullable=False)