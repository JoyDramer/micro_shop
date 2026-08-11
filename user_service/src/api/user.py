from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_admin_user,
    get_current_user,
    oauth2_scheme,
)
from src.models.user import User  # Импортируем модель для аннотации типов
from src.schemas.user import TokenRefreshRequest, UserCreate, UserResponse
from src.services import user as user_service
from src.core.redis_client import redis_client
from datetime import datetime, timezone


# Создаем роутер с префиксом /users
router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя"""
    
    # 1. Проверяем, нет ли уже такого email в базе
    existing_user = await user_service.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    # 2. Если всё чисто — создаем пользователя
    new_user = await user_service.create_user(db=db, user_in=user_in)
    
    # 3. Возвращаем данные (FastAPI сам отфильтрует пароль благодаря UserResponse)
    return new_user


@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    """Авторизация пользователя и выдача JWT-токена"""
    # Проверяем email (в форме он называется username) и пароль
    user = await user_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Если всё верно, создаем токен, зашивая в него email пользователя (поле sub)
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    token: str = Depends(oauth2_scheme), # Получаем токен
    db: AsyncSession = Depends(get_db)   # Получаем сессию БД
):
    """
    Возвращает профиль текущего авторизованного пользователя. 
    """
    # Вызываем нашу функцию проверки руками, передавая ей и токен, и базу
    user = await get_current_user(token=token, db=db)
    return user

@router.get("/admin-only")
async def read_admin_data(admin_user: User = Depends(get_current_admin_user)):
    """Эндпоинт только для администраторов"""
    return {
        "message": f"Добро пожаловать в админку, {admin_user.email}!",
        "secret_data": "Здесь мы будем создавать товары"
    }

@router.post("/refresh")
async def refresh_tokens(body: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """Принимает refresh-токен и возвращает новую пару токенов"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительный refresh-токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Расшифровываем refresh-токен
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # Проверяем, что нам прислали именно refresh-токен
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Проверяем, жив ли еще пользователь в БД
    user = await user_service.get_user_by_email(db, email=email)
    if not user:
        raise credentials_exception
        
    # Генерируем новую пару токенов
    new_access = create_access_token(data={"sub": user.email})
    new_refresh = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Отзывает текущий access токен, помещая его в черный список Redis"""
    try:
        # Расшифровываем токен, чтобы узнать, когда он истекает
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        exp = payload.get("exp")
        
        if exp:
            # Считаем, сколько секунд осталось жить токену
            now = datetime.now(timezone.utc).timestamp()
            ttl = int(exp - now)
            
            if ttl > 0:
                # Кладем токен в Redis с префиксом "bl_" (blacklist) и таймером самоуничтожения (ttl)
                await redis_client.setex(f"bl_{token}", ttl, "true")
                
        return {"message": "Вы успешно вышли из системы (токен отозван)"}
    except JWTError:
        # Если токен уже невалидный, нам не нужно ничего делать
        return {"message": "Вы успешно вышли из системы"}