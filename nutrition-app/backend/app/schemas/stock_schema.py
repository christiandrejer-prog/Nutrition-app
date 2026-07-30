from pydantic import BaseModel, Field

from app.schemas.food_schema import FoodResponse


class StockAdjust(BaseModel):
    amount: float = Field(..., gt=0)
    unit: str = "ml"


class StockResponse(BaseModel):
    id: int
    food_id: int
    amount: float
    unit: str

    food: FoodResponse

    class Config:
        from_attributes = True
