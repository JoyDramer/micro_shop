from fastapi import FastAPI
from src.api.cart import router as cart_router
from src.api.order import router as order_router

app = FastAPI(
    title="Shop Order Service",
    description="Микросервис корзины и оформления заказов",
    version="1.0.0"
)

app.include_router(cart_router)
app.include_router(order_router)