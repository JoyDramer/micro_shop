from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    # Ограничиваем длину пароля максимум 72 символами из-за особенностей bcrypt
    password: str = Field(..., max_length=72, description="Пароль (максимум 72 символа)")
    phone_number: Optional[str] = None
    telegram_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    phone_number: str | None = None
    telegram_id: int | None = None
    is_active: bool
    is_superuser: bool  # <-- Добавили сюда

    model_config = ConfigDict(from_attributes=True)

class TokenRefreshRequest(BaseModel):
    refresh_token: str