from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal, List
from decimal import Decimal

class ProductBase(BaseModel):
    name: str = Field(..., max_length=255, description="Наименование товара")
    product_type: Literal["магнитные", "капсульные"] = Field(..., description="Тип наушника")
    category: str = Field(..., max_length=100, description="Категория")
    images: Optional[List[str]] = Field(default=[], description="Массив ссылок на фото") # НОВОЕ ПОЛЕ
    
    description: Optional[str] = Field(default=None, description="Подробное описание")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Цена")
    stock: int = Field(default=0, ge=0, description="Остаток на складе")
    reserved: int = Field(default=0, ge=0, description="Зарезервировано в заказах")
    is_bestseller: bool = Field(default=False, description="Хит продаж (отображается в карусели)")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    product_type: Optional[Literal["магнитные", "капсульные"]] = None
    category: Optional[str] = Field(default=None, max_length=100)
    
    images: Optional[List[str]] = None # НОВОЕ ПОЛЕ
    
    description: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    stock: Optional[int] = Field(default=None, ge=0)
    reserved: Optional[int] = Field(default=None, ge=0)
    is_bestseller: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)