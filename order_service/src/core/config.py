from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Основные настройки
    REDIS_URL: str
    DATABASE_URL: str
    RABBITMQ_URL: str
    
    # Авторизация
    SECRET_KEY: str 
    JWT_ALGORITHM: str = "HS256"

    # CRM
    TWENTY_CRM_API_URL: str
    TWENTY_CRM_API_KEY: str
    
    # Ключи для логистики (добавлено из .env)
    CDEK_TOKEN: str
    OZON_CLIENT_ID: str
    OZON_API_KEY: str
    RUSSIAN_POST_TOKEN: str
    RUSSIAN_POST_LOGIN: str
    RUSSIAN_POST_PASSWORD: str

    # Конфиг Pydantic должен быть в самом конце
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()