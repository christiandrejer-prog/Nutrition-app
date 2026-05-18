from typing import List, Optional
from pydantic import BaseModel, Field


class DrinkCreate(BaseModel):
    name: str


class DrinkResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DrinkIngredientCreate(BaseModel):
    food_id: int
    amount: float = Field(..., gt=0)
    unit: str = "ml"


class DrinkIngredientResponse(BaseModel):
    id: int
    drink_id: int
    food_id: int
    amount: float
    unit: str

    class Config:
        from_attributes = True


class DrinkDetailResponse(DrinkResponse):
    ingredients: List[DrinkIngredientResponse]


class DrinkPrepCreate(BaseModel):
    drink_id: int
    quantity: int = Field(..., gt=0)


class DrinkPrepItemResponse(BaseModel):
    id: int
    prep_id: int
    food_id: int
    required_amount: float
    unit: str

    class Config:
        from_attributes = True


class DrinkPrepResponse(BaseModel):
    id: int
    drink_id: int
    quantity: int

    class Config:
        from_attributes = True


class DrinkPrepDetailResponse(DrinkPrepResponse):
    ingredients: List[DrinkPrepItemResponse]
