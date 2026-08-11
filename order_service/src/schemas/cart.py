from pydantic import BaseModel

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

class Cart(BaseModel):
    user_id: int
    items: list[CartItem] = []