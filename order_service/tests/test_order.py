import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_checkout_flow(async_client, mocker):
    mock_rabbitmq = mocker.patch("src.api.order.send_order_created_event", new_callable=AsyncMock)

    # Добавляем товар пользователю 1
    add_response = await async_client.post(
        "/cart/1/add",  # <-- Вернули ID в URL
        json={"product_id": 1, "quantity": 2}
    )
    assert add_response.status_code == 200

    # Оформляем заказ для пользователя 1
    checkout_response = await async_client.post("/orders/checkout/1")  # <-- Вернули ID в URL
    
    assert checkout_response.status_code == 200
    data = checkout_response.json()
    assert data["message"] == "Заказ успешно оформлен"
    assert "order_id" in data

    mock_rabbitmq.assert_called_once()
    called_args = mock_rabbitmq.call_args[0][0]
    assert called_args["user_id"] == 1