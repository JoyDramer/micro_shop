import httpx
from src.core.config import settings

class TwentyCRMClient:
    def __init__(self):
        self.base_url = settings.TWENTY_CRM_API_URL
        self.headers = {
            "Authorization": f"Bearer {settings.TWENTY_CRM_API_KEY}",
            "Content-Type": "application/json"
        }

    def _normalize_phone(self, phone: str) -> str:
        """Приводит номер телефона к международному формату (E.164)"""
        if not phone:
            return ""
        # Очищаем от лишних символов (пробелы, скобки, тире)
        cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
        
        # Конвертируем российские форматы
        if cleaned.startswith("8") and len(cleaned) == 11:
            return "+7" + cleaned[1:]
        elif cleaned.startswith("7") and len(cleaned) == 11:
            return "+" + cleaned
            
        return cleaned

    async def create_client(self, user_id: int, first_name: str, last_name: str, email: str, phone: str = ""):
        """Отправляет нового зарегистрированного пользователя в CRM"""
        url = f"{self.base_url}/klienty"
        
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = email.split('@')[0]
            
        payload = {
            "externalId": user_id,
            "name": full_name
        }
        
        if email:
            payload["email"] = {
                "primaryEmail": email
            }
            
        # Нормализуем телефон перед добавлением в payload
        valid_phone = self._normalize_phone(phone)
        if valid_phone:
            payload["telefon"] = {
                "primaryPhoneNumber": valid_phone
            }
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                data = response.json().get("data", {}).get("createKlienty", {})
                crm_client_id = data.get("id")
                
                print(f" [CRM] ✅ Пользователь {email} успешно отправлен в CRM! ID: {crm_client_id}", flush=True)
                return crm_client_id
                
            except httpx.HTTPStatusError as e:
                print(f" [CRM ❌] Ошибка создания клиента в CRM: {e.response.text}", flush=True)
                return None
            except Exception as e:
                print(f" [CRM ❌] Ошибка соединения с CRM: {e}", flush=True)
                return None

    async def update_client(self, user_id: int, first_name: str, last_name: str, middle_name: str = "", phone: str = ""):
        """Обновляет данные клиента в CRM (ФИО и телефон)"""
        search_url = f"{self.base_url}/klienty"
        params = {"filter[externalId][eq]": user_id}
        
        full_name_parts = [p for p in [first_name, middle_name, last_name] if p]
        full_name = " ".join(full_name_parts).strip()
        
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
                    print(f" [CRM ⚠️] Клиент с ID {user_id} не найден в CRM для обновления", flush=True)
                    return False
                    
                crm_uuid = items[0].get("id")
                
                payload = {}
                if full_name:
                    payload["name"] = full_name
                
                valid_phone = self._normalize_phone(phone)
                if valid_phone:
                    payload["telefon"] = {
                        "primaryPhoneNumber": valid_phone
                    }
                    
                if not payload:
                    return True 
                    
                patch_url = f"{self.base_url}/klienty/{crm_uuid}"
                patch_resp = await client.patch(patch_url, json=payload, headers=self.headers)
                patch_resp.raise_for_status()
                
                print(f" [CRM] ✅ Данные клиента (ID: {user_id}) успешно обновлены!", flush=True)
                return True
                
            except httpx.HTTPStatusError as e:
                print(f" [CRM ❌] Детали ошибки обновления: {e.response.text}", flush=True)
                return False
            except Exception as e:
                print(f" [CRM ❌] Ошибка соединения с CRM при обновлении {user_id}: {e}", flush=True)
                return False

crm_client = TwentyCRMClient()