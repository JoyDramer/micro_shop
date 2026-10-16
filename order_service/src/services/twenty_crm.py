import httpx
import asyncio
from src.core.config import settings

class TwentyCRMClient:
    def __init__(self):
        self.base_url = settings.TWENTY_CRM_API_URL
        self.headers = {
            "Authorization": f"Bearer {settings.TWENTY_CRM_API_KEY}",
            "Content-Type": "application/json"
        }

    async def get_client_uuid(self, user_id: int, max_retries: int = 3, delay_seconds: int = 2) -> str | None:
        """Ищет внутренний UUID клиента в CRM по его ID на сайте (с ожиданием авторегистрации)"""
        if not user_id:
            return None
            
        search_url = f"{self.base_url}/klienty"
        params = {"filter[externalId][eq]": user_id}
        
        async with httpx.AsyncClient() as client:
            for attempt in range(max_retries):
                try:
                    resp = await client.get(search_url, params=params, headers=self.headers)
                    resp.raise_for_status()
                    data = resp.json().get("data", {})
                    
                    for key, value in data.items():
                        if isinstance(value, list) and len(value) > 0:
                            return value[0].get("id")
                            
                    if attempt < max_retries - 1:
                        print(f" [CRM ⏳] Клиент {user_id} не найден. Ждем {delay_seconds} сек. перед повтором (попытка {attempt+1})...", flush=True)
                        await asyncio.sleep(delay_seconds)
                        
                except Exception as e:
                    print(f" [CRM ⚠️] Ошибка поиска клиента {user_id} при попытке {attempt+1}: {e}", flush=True)
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay_seconds)
                
        print(f" [CRM ❌] Не удалось найти клиента {user_id} в CRM после {max_retries} попыток.", flush=True)
        return None

    async def create_order(self, site_order_id: int, user_id: int, total_amount: float, order_name: str, address: str, postal_code: str, delivery_type: str):
        """Создает карточку заказа в CRM и привязывает к клиенту"""
        url = f"{self.base_url}/zakazy" 
        
        payload = {
            "externalId": site_order_id,
            "totalAmount": total_amount,
            "status": "SOZDAN", 
            "name": order_name,
            "adres": address,
            "indeks": int(postal_code) if postal_code and postal_code.isdigit() else 0,
            "servisDostavki": delivery_type 
        }
        
        # 1. Получаем UUID клиента из CRM
        crm_client_uuid = await self.get_client_uuid(user_id)
        
        # 2. Если клиент найден, прикрепляем его к заказу
        if crm_client_uuid:
            payload["zakazchikId"] = crm_client_uuid 
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                data = response.json().get("data", {}).get("createZakaz", {})
                crm_order_id = data.get("id")
                
                print(f" [CRM] ✅ Заказ {site_order_id} успешно отправлен в CRM и привязан к клиенту! ID: {crm_order_id}", flush=True)
                return crm_order_id
                
            except httpx.HTTPStatusError as e:
                print(f" [CRM ❌] Ошибка ответа CRM (Создание заказа): {e.response.text}", flush=True)
                return None
            except Exception as e:
                print(f" [CRM ❌] Ошибка соединения: {e}", flush=True)
                return None
            
    async def get_product_uuid(self, site_product_id: int):
        """Ищет внутренний UUID товара в CRM по его ID на сайте (externalId)"""
        url = f"{self.base_url}/tovary"
        params = {"filter[externalId][eq]": site_product_id}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                data = response.json().get("data", {})
                
                items = []
                for key in data:
                    if isinstance(data[key], list):
                        items = data[key]
                        break
                
                if items:
                    crm_uuid = items[0].get("id")
                    print(f" [CRM] 🔍 Товар {site_product_id} найден! UUID: {crm_uuid}", flush=True)
                    return crm_uuid
                    
                print(f" [CRM ❌] Товар {site_product_id} не найден (проверь поле externalId в CRM).", flush=True)
                return None
                
            except Exception as e:
                print(f" [CRM ❌] Ошибка поиска UUID товара {site_product_id}: {e}", flush=True)
                return None
            
    async def update_order_status(self, site_order_id: int, new_status: str):
        """Обновляет статус заказа в CRM по ID сайта (externalId)"""
        search_url = f"{self.base_url}/zakazy"
        params = {"filter[externalId][eq]": site_order_id}
        
        async with httpx.AsyncClient() as client:
            try:
                search_resp = await client.get(search_url, params=params, headers=self.headers)
                search_resp.raise_for_status()
                data = search_resp.json().get("data", {})
                
                items = []
                for key in data:
                    if isinstance(data[key], list):
                        items = data[key]
                        break
                        
                if not items:
                    print(f" [CRM ❌] Заказ {site_order_id} не найден для обновления статуса", flush=True)
                    return False
                    
                crm_uuid = items[0].get("id")
                
                patch_url = f"{self.base_url}/zakazy/{crm_uuid}"
                payload = {"status": new_status}
                
                patch_resp = await client.patch(patch_url, json=payload, headers=self.headers)
                patch_resp.raise_for_status()
                print(f" [CRM] ✅ Статус заказа {site_order_id} изменен на {new_status}!", flush=True)
                return True
                
            except Exception as e:
                print(f" [CRM ❌] Ошибка обновления статуса заказа {site_order_id}: {e}", flush=True)
                return False

    async def delete_order(self, site_order_id: int):
        """Полностью удаляет заказ из CRM по ID сайта (externalId)"""
        search_url = f"{self.base_url}/zakazy"
        params = {"filter[externalId][eq]": site_order_id}
        
        async with httpx.AsyncClient() as client:
            try:
                search_resp = await client.get(search_url, params=params, headers=self.headers)
                search_resp.raise_for_status()
                data = search_resp.json().get("data", {})
                
                items = []
                for key in data:
                    if isinstance(data[key], list):
                        items = data[key]
                        break
                        
                if not items:
                    print(f" [CRM ⚠️] Заказ {site_order_id} не найден в CRM для удаления", flush=True)
                    return False
                    
                crm_uuid = items[0].get("id")
                
                delete_url = f"{self.base_url}/zakazy/{crm_uuid}"
                delete_resp = await client.delete(delete_url, headers=self.headers)
                delete_resp.raise_for_status()
                
                print(f" [CRM] 🗑️ Заказ {site_order_id} успешно удален из CRM!", flush=True)
                return True
                
            except Exception as e:
                print(f" [CRM ❌] Ошибка удаления заказа {site_order_id}: {e}", flush=True)
                return False
                
    async def create_order_item(self, crm_order_id: str, crm_product_id: str, quantity: int, price: float, item_name: str):
        """Создает позицию товара внутри заказа в CRM"""
        # ВНИМАНИЕ: Замени "pozitsii-zakaza" на точное системное имя объекта позиций в твоей CRM (например, "orderItems" или "pozitsii")
        url = f"{self.base_url}/poziciiZakazov" 
        
        payload = {
            "name": item_name,
            "quantity": quantity,
            "price": price,
            # Поля связи с заказом и товаром (проверь их точные имена в Data Model CRM, если выдаст ошибку)
            "zakazId": crm_order_id,
            "tovarId": crm_product_id
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                print(f" [CRM] ✅ Позиция '{item_name}' (х{quantity}) успешно добавлена к заказу!", flush=True)
                return True
            except httpx.HTTPStatusError as e:
                print(f" [CRM ❌] Ошибка создания позиции заказа: {e.response.text}", flush=True)
                return False
            except Exception as e:
                print(f" [CRM ❌] Ошибка соединения при создании позиции: {e}", flush=True)
                return False
            
    async def update_order_tracking(self, site_order_id: int, tracking_number: str) -> bool:
        """Отправляет трек-номер доставки в карточку заказа в CRM"""
        search_url = f"{self.base_url}/zakazy"
        params = {"filter[externalId][eq]": site_order_id}
        
        async with httpx.AsyncClient() as client:
            try:
                # Ищем внутренний UUID заказа в CRM
                search_resp = await client.get(search_url, params=params, headers=self.headers)
                search_resp.raise_for_status()
                data = search_resp.json().get("data", {})
                
                items = []
                for key in data:
                    if isinstance(data[key], list):
                        items = data[key]
                        break
                        
                if not items:
                    print(f" [CRM ⚠️] Заказ {site_order_id} не найден в CRM для обновления трек-номера", flush=True)
                    return False
                    
                crm_uuid = items[0].get("id")
                
                # Обновляем трек-номер
                patch_url = f"{self.base_url}/zakazy/{crm_uuid}"
                payload = {
                    "trekNomer": tracking_number # <-- Убедись, что системное имя поля правильное
                }
                
                patch_resp = await client.patch(patch_url, json=payload, headers=self.headers)
                patch_resp.raise_for_status()
                
                print(f" [CRM] ✅ Трек-номер {tracking_number} успешно добавлен к заказу {site_order_id}", flush=True)
                return True
                
            except Exception as e:
                print(f" [CRM ❌] Ошибка отправки трек-номера для заказа {site_order_id}: {e}", flush=True)
                return False

crm_client = TwentyCRMClient()