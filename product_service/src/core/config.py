from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"      
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/" 
    SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" 
    )

settings = Settings()