from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from src.core.redis_client import redis_client
from src.core.config import settings
from src.core.database import get_db

# Берем секретный ключ и алгоритм из конфига (теперь они безопасны!)
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(data: dict):
    """Создает короткоживущий токен доступа"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    """Создает долгоживущий токен обновления"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

# Указываем FastAPI, где находится эндпоинт для логина (чтобы в Swagger появилась кнопка Authorize)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db) # Сюда мы передадим get_db из api чуть позже
):
    """Проверяет токен и возвращает текущего пользователя. Вызывает ошибку, если токен невалиден."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные (неверный или просроченный токен)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        
        is_blacklisted = await redis_client.get(f"bl_{token}")
        if is_blacklisted:
            raise credentials_exception
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") 
        token_type: str = payload.get("type") # <-- Достаем тип токена
        
        # Токен должен быть только типа "access"
        if email is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Внимание: здесь мы делаем ленивый импорт, чтобы избежать циклической зависимости
    from src.services.user import get_user_by_email
    
    user = await get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_admin_user(current_user=Depends(get_current_user)):
    """Проверяет, является ли текущий пользователь администратором"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется статус администратора.",
        )
    return current_user