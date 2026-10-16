FROM python:3.11-slim

WORKDIR /app

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код сервиса
COPY ./src /app/src

# Внутренний порт контейнера
EXPOSE 8000

# Запускаем FastAPI-сервер
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]