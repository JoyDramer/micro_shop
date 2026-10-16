from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from src.models.payment import PaymentStatus

# 1. ОБЯЗАТЕЛЬНО СНАЧАЛА ОБЪЯВЛЯЕМ СХЕМУ ТОВАРА
class PaymentItem(BaseModel):
    name: str
    price: Decimal
    quantity: int

# 2. ТЕПЕРЬ ЕЕ МОЖНО ИСПОЛЬЗОВАТЬ ЗДЕСЬ
class PaymentCreate(BaseModel):
    order_id: int
    amount: Decimal
    currency: str = "RUB"
    customer_email: str
    items: Optional[List[PaymentItem]] = None

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    amount: Decimal
    currency: str
    status: PaymentStatus
    provider_payment_id: Optional[str] = None
    payment_url: Optional[str] = None # Ссылка для перенаправления клиента на страницу оплаты
    created_at: datetime

    class Config:
        from_attributes = True

# Схема для приема вебхука от Т-Банка
class TinkoffWebhook(BaseModel):
    TerminalKey: str
    OrderId: str
    Success: bool
    Status: str
    PaymentId: int
    ErrorCode: str
    Amount: int
    Token: str