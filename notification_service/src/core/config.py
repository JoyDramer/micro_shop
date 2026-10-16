from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Настройки RabbitMQ (по умолчанию локально)
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    
    # Настройки Яндекс SMTP
    SMTP_HOST: str = "smtp.yandex.ru"
    SMTP_PORT: int = 465  # Порт для безопасного соединения (SSL)
    
    # Эти два поля Pydantic автоматически подтянет из вашего файла .env
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FRONTEND_URL: str = "https://xn--80apbahcjkbhv3b3d.xn--p1ai"
    
    class Config:
        env_file = ".env"

# Создаем объект настроек, который будем импортировать в другие файлы
settings = Settings()