from pydantic import BaseModel
from typing import List


class MealCreate(BaseModel):
    name: str


class MealUpdate(BaseModel):
    name: str


class MealItemCreate(BaseModel):
    food_id: int
    grams: float


class MealAddFood(BaseModel):
    items: List[MealItemCreate]