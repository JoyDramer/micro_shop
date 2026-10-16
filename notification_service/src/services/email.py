import aiosmtplib
from email.message import EmailMessage
from src.core.config import settings

async def send_email_notification(to_email: str, subject: str, body_text: str):
    """Асинхронная отправка email через SMTP-сервер"""
    
    # 1. Формируем структуру письма
    message = EmailMessage()
    message["From"] = settings.SMTP_USER
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body_text)

    try:
        # 2. Подключаемся к SMTP и отправляем
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=465,  # Жестко указываем 465 порт
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=True,    # Включаем неявный SSL с первой секунды
            start_tls=False  # Отключаем STARTTLS, чтобы не было конфликта
        )
        print(f"📧 [EMAIL УСПЕШНО ОТПРАВЛЕН] Получатель: {to_email} | Тема: '{subject}'")
    except Exception as e:
        print(f"❌ [ОШИБКА SMTP] Не удалось отправить письмо на {to_email}. Причина: {e}")