from pydantic import BaseModel, Field
from typing import Optional


class MealItemCreate(BaseModel):
    food_id: int
    amount: float = Field(..., gt=0, le=100000)
    unit: str = "g"


class MealItemUpdate(BaseModel):
    food_id: Optional[int] = None
    amount: Optional[float] = Field(None, gt=0, le=100000)
    unit: Optional[str] = None


class MealItemResponse(BaseModel):
    id: int
    meal_id: int
    food_id: int
    amount: float
    unit: str

    class Config:
        from_attributes = True


class MealItemDetail(MealItemResponse):
    """Extended meal item response with food and macro details."""
    food_name: str
    food_brand: Optional[str]
    food_price: Optional[float]
    protein: float
    carbs: float
    fat: float
    calories: float
    price_for_calories: Optional[float]  # price per 100 calories
