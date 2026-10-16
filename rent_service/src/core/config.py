from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"      # <--- Добавьте эту строчку
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/" # <--- И эту

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" # Это самая важная строчка для обхода ошибки!
    )

settings = Settings()