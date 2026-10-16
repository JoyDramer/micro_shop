from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.payment import Payment, PaymentStatus
from src.schemas.payment import PaymentCreate

async def create_payment(db: AsyncSession, payment_in: PaymentCreate) -> Payment:
    """Создает новую запись о платеже в статусе PENDING"""
    db_payment = Payment(
        order_id=payment_in.order_id,
        amount=payment_in.amount,
        currency=payment_in.currency,
        status=PaymentStatus.PENDING
    )
    db.add(db_payment)
    await db.commit()
    await db.refresh(db_payment)
    return db_payment

async def get_payment(db: AsyncSession, payment_id: int) -> Payment:
    """Получает платеж по нашему внутреннему ID"""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    return result.scalar_one_or_none()

async def update_payment_status(
    db: AsyncSession, 
    payment: Payment, 
    status: PaymentStatus, 
    provider_id: str = None
) -> Payment:
    """Обновляет статус платежа и (опционально) ID провайдера"""
    payment.status = status
    if provider_id:
        payment.provider_payment_id = provider_id
    await db.commit()
    await db.refresh(payment)
    return payment