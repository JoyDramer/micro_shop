from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal
from decimal import Decimal

class ProductBase(BaseModel):
    name: str = Field(..., max_length=255, description="Наименование товара")
    # Literal жестко ограничивает допустимые значения
    product_type: Literal["магнитные", "капсульные"] = Field(..., description="Тип наушника")
    category: str = Field(..., max_length=100, description="Категория")
    image_url: Optional[str] = Field(default=None, description="Ссылка на фото")
    is_active: bool = Field(default=True, description="Отображать в каталоге?")
    description: Optional[str] = Field(default=None, description="Подробное описание")
    discount: int = Field(default=0, ge=0, le=100, description="Скидка в процентах (0-100)")
    
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Цена")
    stock: int = Field(default=0, ge=0, description="Остаток на складе")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    product_type: Optional[Literal["магнитные", "капсульные"]] = None
    category: Optional[str] = Field(default=None, max_length=100)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    discount: Optional[int] = Field(default=None, ge=0, le=100)
    price: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    stock: Optional[int] = Field(default=None, ge=0)

class ProductResponse(ProductBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)