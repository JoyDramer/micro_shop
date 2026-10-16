from pydantic import BaseModel, Field

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

class Cart(BaseModel):
    user_id: str  # ИЗМЕНИЛИ: теперь тут строка (например, "user:15" или "guest:a1b2c3")
    items: list[CartItem] = []

class CartUpdate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=0, description="Новое количество товара. Если 0 — товар будет удален.")