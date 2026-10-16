import asyncio
import json
import aio_pika

RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

# Имя обменника точно как в вашем rabbitmq.py
EXCHANGE_NAME = "orders_exchange"
# Имя очереди конкретно для этого воркера (например, для уведомлений)
QUEUE_NAME = "email_notifications_queue" 

async def process_message(message: aio_pika.IncomingMessage):
    """Эта функция вызывается автоматически, когда приходит новое сообщение"""
    async with message.process():
        body = message.body.decode()
        data = json.loads(body)
        
        print("\n" + "="*40)
        print(f"🔔 [ВОРКЕР УВЕДОМЛЕНИЙ] Поймано новое событие!")
        print(f"📦 Заказ №{data.get('order_id')} на сумму {data.get('total_amount')} руб.")
        print(f"👤 ID Покупателя: {data.get('user_id')}")
        print(f"⏳ Имитация отправки Email-письма...")
        
        # Спим 3 секунды, имитируя задержку сети
        await asyncio.sleep(3) 
        
        print(f"✅ Письмо успешно отправлено покупателю!")
        print("="*40 + "\n")

async def main():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    
    # 1. Объявляем тот же самый обменник (рупор), в который кричит order_service
    exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.FANOUT)
    
    # 2. Создаем нашу личную очередь
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    
    # 3. САМОЕ ГЛАВНОЕ: Привязываем очередь к обменнику! 
    # Теперь все, что попадает в orders_exchange, перетечет в нашу очередь
    await queue.bind(exchange)
    
    print(f"🚀 [*] Воркер запущен. Слушаем обменник '{EXCHANGE_NAME}' (Ctrl+C для остановки)...")
    
    await queue.consume(process_message)
    
    try:
        await asyncio.Future()
    finally:
        await connection.close()

if __name__ == "__main__":
    asyncio.run(main())