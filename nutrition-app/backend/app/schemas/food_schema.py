from typing import Optional

from pydantic import BaseModel


class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None


class FoodUpdate(BaseModel):
    name: str
    brand: Optional[str] = None


class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None


class FoodResponse(FoodBase):
    id: int

    class Config:
        from_attributes = True


class FoodNutrientCreate(BaseModel):
    nutrient_id: int
    amount_per_100g: float


class FoodNutrientUpdate(BaseModel):
    amount_per_100g: float


class FoodNutrientResponse(BaseModel):
    id: int
    food_id: int
    nutrient_id: int
    amount_per_100g: float

    class Config:
        from_attributes = True