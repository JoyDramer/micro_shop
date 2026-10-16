import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from src.core.rabbitmq import publish_password_reset, publish_user_registered
from src.core.config import settings
from src.database import get_db
from src.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_admin_user,
    get_current_user,
    oauth2_scheme,
)
from src.models.user import User  
from src.schemas.user import (
    TokenRefreshRequest, 
    UserCreate, 
    UserResponse, 
    UserUpdate, 
    PasswordResetRequest, 
    PasswordResetConfirm
)
from src.services import user as user_service
from src.core.redis_client import redis_client

# Импортируем наш клиент CRM
from src.services.twenty_crm import crm_client

# Создаем роутер с префиксом /users
router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя"""
    existing_user = await user_service.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    new_user = await user_service.create_user(db=db, user_in=user_in)
    
    # Отправляем приветственное письмо через RabbitMQ в фоновом режиме (без await нельзя!)
    try:
        await publish_user_registered(new_user.email)
    except Exception as e:
        print(f"❌ Не удалось отправить событие регистрации в RabbitMQ: {e}")
        
    # Отправляем пользователя в CRM в фоновом режиме
    asyncio.create_task(
        crm_client.create_client(
            user_id=new_user.id,
            first_name=getattr(new_user, "first_name", ""),
            last_name=getattr(new_user, "last_name", ""),
            email=new_user.email,
            phone=getattr(new_user, "phone", "")
        )
    )
        
    return new_user

@router.get("/check-email")
async def check_email_exists(email: str, db: AsyncSession = Depends(get_db)):
    """Проверка существования пользователя по email для фронтенда"""
    user = await user_service.get_user_by_email(db, email=email)
    return {"exists": user is not None}

@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    """Авторизация пользователя и выдача JWT-токена"""
    user = await user_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id, "is_superuser": user.is_superuser})
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)   
):
    """Возвращает профиль текущего авторизованного пользователя"""
    user = await get_current_user(token=token, db=db)
    return user

@router.patch("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    background_tasks: BackgroundTasks,  # <-- ДОБАВЬ ЭТУ СТРОКУ
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление профиля пользователя"""
    updated_user = await user_service.update_user_profile(db, current_user, update_data)
    
    # Отправляем обновленные данные в CRM в фоновом режиме
    background_tasks.add_task(
        crm_client.update_client,
        user_id=updated_user.id,
        first_name=getattr(updated_user, "first_name", "") or "",
        last_name=getattr(updated_user, "last_name", "") or "",
        middle_name=getattr(updated_user, "middle_name", "") or "",
        phone=getattr(updated_user, "phone_number", "") or ""
    )
    
    return updated_user

@router.post("/password-reset/request")
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Запрос на сброс пароля. Генерирует токен и отправляет событие в RabbitMQ."""
    user = await user_service.get_user_by_email(db, email=payload.email)
    if user:
        token = user_service.generate_reset_token()
        
        # Сохраняем токен в Redis на 30 минут
        await redis_client.setex(f"reset_{token}", 1800, user.email)
        
        # Отправляем реальную задачу в RabbitMQ
        await publish_password_reset(user.email, token)
        
    return {"message": "Если аккаунт с таким email существует, на него отправлено письмо с инструкцией."}

@router.post("/password-reset/confirm")
async def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Установка нового пароля по токену из письма"""
    # Ищем токен в Redis
    email_data = await redis_client.get(f"reset_{payload.token}")
    if not email_data:
        raise HTTPException(status_code=400, detail="Неверный или просроченный токен сброса пароля")
        
    # Если Redis вернул bytes, декодируем. Если str — используем как есть.
    email = email_data.decode("utf-8") if isinstance(email_data, bytes) else email_data
    
    user = await user_service.get_user_by_email(db, email=email)
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    # Обновляем пароль и удаляем токен, чтобы он стал одноразовым
    await user_service.update_user_password(db, user, payload.new_password)
    await redis_client.delete(f"reset_{payload.token}")
    
    return {"message": "Пароль успешно изменен. Теперь вы можете войти."}

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
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await user_service.get_user_by_email(db, email=email)
    if not user:
        raise credentials_exception
        
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
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        exp = payload.get("exp")
        
        if exp:
            now = datetime.now(timezone.utc).timestamp()
            ttl = int(exp - now)
            
            if ttl > 0:
                await redis_client.setex(f"bl_{token}", ttl, "true")
                
        return {"message": "Вы успешно вышли из системы (токен отозван)"}
    except JWTError:
        return {"message": "Вы успешно вышли из системы"}