import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Если файла .env нет, он возьмет эти значения по умолчанию
    DATABASE_URL: str = "postgresql+asyncpg://shop_user:shop_password@localhost:5432/shop_db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()