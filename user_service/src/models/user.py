from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    
    # Новые поля ФИО (опциональные, при регистрации не требуются)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    middle_name = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)