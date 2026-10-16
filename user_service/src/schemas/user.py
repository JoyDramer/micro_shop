from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    # Ограничиваем длину пароля максимум 72 символами из-за особенностей bcrypt
    password: str = Field(..., max_length=72, description="Пароль (максимум 72 символа)")
    phone_number: Optional[str] = None
    # telegram_id успешно удален, ФИО здесь не требуем (при регистрации они не нужны)

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    phone_number: str | None = None
    
    # Новые поля ФИО, чтобы фронтенд мог отобразить их в Личном кабинете
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    
    is_active: bool
    is_superuser: bool

    model_config = ConfigDict(from_attributes=True)

# Схема для дозаполнения профиля (понадобится для умного чекаута)
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    phone_number: Optional[str] = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., max_length=72, description="Новый пароль (максимум 72 символа)")