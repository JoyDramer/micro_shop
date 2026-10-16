from fastapi import FastAPI, HTTPException, Request
import httpx
import os
import pika
import json

app = FastAPI(title="Admin Twenty Integration Service")

# Настройки CRM
TWENTY_API_URL = os.getenv("TWENTY_API_URL", "http://twenty:3000/rest")
TWENTY_API_KEY = os.getenv("TWENTY_API_KEY", "")

# Настройки RabbitMQ
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")

HEADERS = {
    "Authorization": f"Bearer {TWENTY_API_KEY}",
    "Content-Type": "application/json"
}

@app.get("/")
async def root():
    return {"message": "admin_twenty service is running"}

@app.get("/ping-crm")
async def ping_crm():
    """Проверка связи с CRM"""
    if not TWENTY_API_KEY:
        raise HTTPException(status_code=500, detail="API-ключ не задан")
        
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{TWENTY_API_URL}/companies", headers=HEADERS)
            return {
                "status_code": response.status_code,
                "data": response.json() if response.status_code == 200 else response.text
            }
        except Exception as e:
            return {"error": f"Ошибка соединения с CRM: {str(e)}"}

@app.post("/webhook/twenty")
async def receive_twenty_webhook(request: Request):
    """Эндпоинт для приема вебхуков от Twenty CRM и передачи в магазин"""
    payload = await request.json()
    print(f"[*] ПОЛУЧЕН ВЕБХУК ОТ CRM: {payload}", flush=True)
    
    event_type = payload.get("eventName", "")
    event_data = payload.get("record", {})
    
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue='product_updated', durable=True)
        
        message = {
            "event": event_type,
            "data": event_data
        }
        
        channel.basic_publish(
            exchange='',
            routing_key='product_updated',
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"[+] Данные из CRM отправлены в RabbitMQ", flush=True)
        
    except Exception as e:
        print(f"[!] Ошибка отправки вебхука в RabbitMQ: {e}", flush=True)

    return {"status": "success"}