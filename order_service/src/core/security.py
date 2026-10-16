import jwt
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # <-- НОВЫЙ ИМПОРТ
from src.core.config import settings

# Используем HTTPBearer, который создает простое поле для ввода токена в Swagger
security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Извлекает ID пользователя из JWT-токена."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный или просроченный токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # FastAPI сам извлекает токен из заголовка Authorization
        token = credentials.credentials
        
        # Расшифровываем токен нашим секретным ключом
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Достаем ID пользователя (в поле "sub")
        user_id: str = payload.get("user_id") 
        
        if user_id is None:
            raise credentials_exception
            
        return int(user_id)
        
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise credentials_exception
    
# Создаем "нестрогую" проверку: если токена нет, FastAPI не выдаст ошибку сразу
optional_security = HTTPBearer(auto_error=False)

async def get_cart_identifier(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID", description="Введите любой ID для гостя (например, guest123)")
) -> str:
    """
    Определяет, чья это корзина.
    Возвращает "user:{id}", если есть токен, или "guest:{session_id}", если токена нет.
    """
    # 1. Проверяем, есть ли JWT-токен
    if credentials:
        try:
            token = credentials.credentials
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("user_id")
            if user_id:
                return f"user:{user_id}"
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            # Если токен прислали, но он недействителен — заставляем перелогиниться
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Токен недействителен или просрочен"
            )
            
    # 2. Если токена нет, проверяем гостевой заголовок от фронтенда
    if x_session_id:
        return f"guest:{x_session_id}"
        
    # 3. Если нет ни того, ни другого — мы не знаем, чья это корзина
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Требуется авторизация или заголовок X-Session-ID для гостей"
    )