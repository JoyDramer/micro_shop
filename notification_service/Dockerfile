FROM python:3.11-slim

WORKDIR /app

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY ./src /app/src

# Порт (EXPOSE) здесь не нужен, так как это фоновый воркер, а не веб-сервер

# Запускаем скрипт воркера как модуль
CMD ["python", "-m", "src.worker"]