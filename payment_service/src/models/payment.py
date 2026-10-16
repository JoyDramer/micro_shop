from sqlalchemy import Column, Integer, String, Numeric, DateTime, Enum
from datetime import datetime
import enum
from src.core.database import Base

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)  # Привязка к заказу из Order Service
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="RUB")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    provider_payment_id = Column(String, nullable=True) # ID на стороне платежного провайдера
    created_at = Column(DateTime, default=datetime.utcnow)