from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt
import secrets

from src.models.user import User
from src.schemas.user import UserCreate, UserUpdate

def get_password_hash(password: str) -> str:
    """Хеширование пароля через чистый bcrypt"""
    pwd_bytes = password[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    pwd_bytes = plain_password[:72].encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Ищет пользователя в базе по email"""
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """Создает нового пользователя и сохраняет его в БД"""
    hashed_pwd = get_password_hash(user_in.password) if user_in.password else None
    
    db_user = User(
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=hashed_pwd
        # ФИО при регистрации остаются пустыми, telegram_id удален
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user_profile(db: AsyncSession, user: User, update_data: UserUpdate) -> User:
    """Обновляет ФИО и телефон пользователя (вызывается при умном чекауте)"""
    # exclude_unset=True означает, что мы обновим только те поля, которые реально прислали
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for field, value in update_dict.items():
        setattr(user, field, value)
        
    await db.commit()
    await db.refresh(user)
    return user

def generate_reset_token() -> str:
    """Генерирует безопасный случайный токен для письма сброса пароля"""
    return secrets.token_urlsafe(32)

async def update_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    """Сохраняет новый хеш пароля при сбросе"""
    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """Ищет пользователя и проверяет правильность пароля"""
    user = await get_user_by_email(db, email=email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user