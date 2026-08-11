from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True) 
    is_active = Column(Boolean, default=True)
    
    # Это поле должно быть внутри класса, с таким же отступом, как у остальных!
    is_superuser = Column(Boolean, default=False)