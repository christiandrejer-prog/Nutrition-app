from typing import Optional

from pydantic import BaseModel, Field


class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    price: Optional[float] = None
    base_amount: Optional[float] = None
    base_unit: Optional[str] = None


class FoodUpdate(BaseModel):
    name: str
    brand: Optional[str] = None
    price: Optional[float] = None
    base_amount: Optional[float] = None
    base_unit: Optional[str] = None


class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None
    price: Optional[float] = None
    base_amount: Optional[float] = None
    base_unit: Optional[str] = None


class FoodResponse(FoodBase):
    id: int

    class Config:
        from_attributes = True


class FoodNutrientCreate(BaseModel):
    nutrient_id: int
    amount_per_100g: float = Field(..., ge=0, le=100)


class FoodNutrientUpdate(BaseModel):
    amount_per_100g: float = Field(..., ge=0, le=100)


class FoodNutrientResponse(BaseModel):
    id: int
    food_id: int
    nutrient_id: int
    amount_per_100g: float

    class Config:
        from_attributes = True