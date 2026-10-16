FROM python:3.11-slim

WORKDIR /app

# 1. Устанавливаем wget и базовые сертификаты
RUN apt-get update && apt-get install -y ca-certificates wget && rm -rf /var/lib/apt/lists/*

# 2. Скачиваем корневой и выпускающий сертификаты Минцифры РФ (Официальные ссылки Госуслуг)
RUN wget https://gu-st.ru/content/Other/doc/russian_trusted_root_ca.cer -O /usr/local/share/ca-certificates/russian_trusted_root_ca.crt \
    && wget https://gu-st.ru/content/Other/doc/russian_trusted_sub_ca.cer -O /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt \
    && update-ca-certificates

# 3. КРИТИЧЕСКИ ВАЖНО: Указываем Python использовать обновленные системные сертификаты
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код сервиса
COPY ./src /app/src

EXPOSE 8000

# Запускаем FastAPI-сервер
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]