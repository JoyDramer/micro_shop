import httpx
import base64
from typing import Optional
from src.core.config import settings

class PochtaRuClient:
    def __init__(self):
        self.base_url = "https://otpravka-api.pochta.ru/1.0"
        
    def _get_headers(self):
        # Обязательно используем .strip(), чтобы убрать \n или лишние пробелы из .env,
        # из-за которых сервер Почты мгновенно сбрасывает TCP-соединение!
        login = settings.RUSSIAN_POST_LOGIN.strip()
        password = settings.RUSSIAN_POST_PASSWORD.strip()
        token = settings.RUSSIAN_POST_TOKEN.strip()

        credentials = f"{login}:{password}"
        encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        return {
            "Authorization": f"AccessToken {token}",
            "X-User-Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json"
        }

    async def create_shipment(
        self, 
        order_id: int | str, 
        full_name: str, 
        address: str, 
        postal_code: str, 
        phone: Optional[str] = None,
        weight_grams: int = 300
    ) -> Optional[str]:
        """
        Создает реальный заказ (автоматически формирует партию) и возвращает трек-номер.
        """
        url = f"{self.base_url}/user/backlog"
        
        order_data = {
            "order-num": str(order_id),
            "mail-type": "PARCEL_CLASS_1",  # Посылка 1-го класса
            "mail-category": "ORDINARY",    # Без наложенного платежа (клиент ничего не платит)
            "payment-method": "CASHLESS",   # Оплата безналом с твоего баланса Почты
            "mass": weight_grams,
            "place-to": address,
            "index-to": postal_code,
            "recipient-name": full_name,
            "mail-direct": 643,
            "postoffice-code": "115682"
        }
        
        # Если есть телефон, Почта его любит (для смс-уведомлений)
        if phone:
            order_data["tel-address"] = ''.join(filter(str.isdigit, phone))

        payload = [order_data]

        # Выводим в логи то, что отправляем (поможет при отладке)
        print(f"📤 [Почта] Отправка запроса: {url}")
        print(f"📤 [Почта] Данные: {payload}")

        try:
            # timeout=10.0 достаточно, httpx по умолчанию использует HTTP/1.1
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.put(url, json=payload, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "orders" in data and len(data["orders"]) > 0:
                        order_info = data["orders"][0]
                        barcode = order_info.get("barcode")
                        
                        if barcode:
                            print(f"✅ [Почта] Заказ {order_id} успешно оформлен в партию. Трек: {barcode}", flush=True)
                            return barcode
                        else:
                            print(f"⚠️ [Почта] Заказ создан, но barcode отсутствует: {order_info}", flush=True)
                
                # Логируем ошибку, если статус не 200
                print(f"❌ [Почта] Ошибка создания отправления. Код: {response.status_code}, Ответ: {response.text}", flush=True)
                
        except Exception as e:
            print(f"❌ [Почта] Ошибка соединения с API: {e}", flush=True)
            
        return None

pochta_client = PochtaRuClient()