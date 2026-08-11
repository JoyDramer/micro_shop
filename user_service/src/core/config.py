from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str
    REDIS_URL: str

    # Указываем, где искать .env файл (путь зависит от структуры, 
    # обычно поднимаемся из src/core на уровень выше или указываем абсолютный путь)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Создаем глобальный объект настроек, который мы будем импортировать
settings = Settings()