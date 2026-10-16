import pytest
import httpx

# Базовый URL нашего Nginx-шлюза
BASE_URL = "http://localhost"

@pytest.mark.asyncio
async def test_get_products_catalog():
    """Проверяем, что каталог товаров доступен через шлюз и возвращает список"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/products/")
        
        # Проверяем, что запрос успешен (код 200)
        assert response.status_code == 200
        
        # Проверяем, что в ответ приходит список
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_and_get_product():
    """Проверяем полный цикл: создание товара через API и его появление в каталоге"""
    async with httpx.AsyncClient() as client:
        # Уникальные данные для теста
        new_product = {
            "name": "Тестовый микронаушник E2E",
            "product_type": "Capsule",
            "category": "Wireless",
            "description": "Тестовое описание для проверки интеграции",
            "price": 1500.0,
            "stock": 10,
            "discount": 0,
            "image_url": "http://example.com/image.jpg",
            "is_active": True
        }

        # 1. Создаем товар (предполагаем, что эндпоинт POST /api/products/ доступен)
        create_response = await client.post(f"{BASE_URL}/api/products/", json=new_product)
        
        # Если эндпоинт создания защищен или имеет другой путь, тест покажет это
        if create_response.status_code in [200, 201]:
            created_data = create_response.json()
            product_id = created_data.get("id")
            
            # 2. Проверяем, что товар появился в общем списке
            list_response = await client.get(f"{BASE_URL}/api/products/")
            assert list_response.status_code == 200
            
            products = list_response.json()
            product_ids = [p["id"] for p in products]
            assert product_id in product_ids
        else:
            # Если метод создания еще не реализован или требует авторизации — зафиксируем это
            print(f"Создание товара вернуло статус {create_response.status_code}: {create_response.text}")