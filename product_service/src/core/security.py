from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from redis.asyncio import Redis

from src.core.config import settings
from src.core.redis import get_redis

# Нам не нужно генерировать токены в этом сервисе, поэтому оставляем только алгоритм
ALGORITHM = "HS256"

# Путь для Swagger, чтобы он знал, куда отправлять логин и пароль через API Gateway
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/users/login")

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    redis: Redis = Depends(get_redis)
):
    """
    Проверяет JWT-токен, сверяет с черным списком в Redis 
    и требует наличия прав администратора (is_superuser=True).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные (неверный или просроченный токен)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Проверяем, не разлогинился ли пользователь (есть ли токен в черном списке Redis)
        # Обрати внимание: ключ может немного отличаться, если Redis у сервисов не общий
        is_blacklisted = await redis.get(f"bl_{token}")
        if is_blacklisted:
            raise credentials_exception
            
        # 2. Расшифровываем токен секретным ключом (он должен совпадать в settings обоих сервисов)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        email: str = payload.get("sub") 
        token_type: str = payload.get("type")
        # Достаем флаг админа прямо из расшифрованного токена
        is_superuser: bool = payload.get("is_superuser", False) 
        
        # 3. Токен должен быть корректным и иметь тип "access"
        if email is None or token_type != "access":
            raise credentials_exception
            
        # 4. Проверяем права администратора
        if not is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав. Требуется статус администратора.",
            )
            
        return payload
        
    except JWTError:
        raise credentials_exception