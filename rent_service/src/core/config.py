from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    # Если здесь в будущем понадобятся ключи для JWT или RabbitMQ, добавим их сюда

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()