from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"      
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/" 
    
    # Настройки для интеграции с Twenty CRM
    TWENTY_CRM_API_URL: str
    TWENTY_CRM_API_KEY: str

    # Указываем, где искать .env файл
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Создаем глобальный объект настроек, который мы будем импортировать
settings = Settings()