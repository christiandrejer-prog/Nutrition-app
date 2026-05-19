from pydantic import BaseModel, Field
from typing import List


class MealCreate(BaseModel):
    name: str


class MealUpdate(BaseModel):
    name: str

class MealListResponse(BaseModel):
    id: int
    name: str
    item_count: int

class MealItemCreate(BaseModel):
    food_id: int
    amount: float = Field(..., gt=0)
    unit: str = "g"


class MealAddFood(BaseModel):
    items: List[MealItemCreate]