from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.food_schema import FoodResponse


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


class DrinkIngredientUpdate(BaseModel):
    amount: float = Field(..., gt=0)
    unit: str = "ml"


class DrinkIngredientResponse(BaseModel):
    id: int
    drink_id: int
    food_id: int
    amount: float
    unit: str

    food: Optional[FoodResponse]

    class Config:
        from_attributes = True


class DrinkDetailResponse(DrinkResponse):
    ingredients: List[DrinkIngredientResponse]


class DrinkListCreate(BaseModel):
    name: str


class DrinkListItemResponse(BaseModel):
    id: int
    list_id: int
    drink_id: int
    quantity: float

    drink: DrinkDetailResponse

    class Config:
        from_attributes = True


class DrinkListResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DrinkListDetailResponse(DrinkListResponse):
    items: List[DrinkListItemResponse]


class DrinkListItemCreate(BaseModel):
    drink_id: int
    quantity: float = Field(..., gt=0)
