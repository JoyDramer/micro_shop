import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings

security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Извлекает ID пользователя из JWT-токена."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный или просроченный токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        user_id: str = payload.get("user_id") 
        
        if user_id is None:
            raise credentials_exception
            
        return int(user_id)
        
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise credentials_exception


async def get_admin_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Проверяет токен и убеждается, что пользователь — администратор."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный или просроченный токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Недостаточно прав. Требуются права администратора."
    )
    
    try:
        token = credentials.credentials
        
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        user_id: str = payload.get("user_id") 
        is_admin: bool = payload.get("is_admin", False)
        
        if user_id is None:
            raise credentials_exception
            
        if not is_admin:
            raise forbidden_exception
            
        return int(user_id)
        
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise credentials_exception