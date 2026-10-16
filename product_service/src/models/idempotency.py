import datetime
from sqlalchemy import Column, String, DateTime
from src.core.database import Base

class ProcessedEvent(Base):
    __tablename__ = "processed_events"
    
    # ID события (например, "order_created_5")
    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.now())
    