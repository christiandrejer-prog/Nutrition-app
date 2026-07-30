from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.food_schema import FoodResponse


class GarnishCreate(BaseModel):
    name: str
    unit_name: str = "piece"
    source_food_id: Optional[int] = None
    yield_per_source: Optional[float] = None
    default_essential: bool = False


class GarnishUpdate(BaseModel):
    name: str
    unit_name: str = "piece"
    source_food_id: Optional[int] = None
    yield_per_source: Optional[float] = None
    default_essential: bool = False


class GarnishResponse(BaseModel):
    id: int
    name: str
    unit_name: str
    source_food_id: Optional[int] = None
    yield_per_source: Optional[float] = None
    default_essential: bool

    source_food: Optional[FoodResponse] = None

    class Config:
        from_attributes = True


class DrinkGarnishCreate(BaseModel):
    garnish_id: int
    quantity_per_serving: float = Field(1, gt=0)
    essential: Optional[bool] = None  # falls back to the garnish's default_essential


class DrinkGarnishUpdate(BaseModel):
    quantity_per_serving: float = Field(..., gt=0)
    essential: bool


class DrinkGarnishResponse(BaseModel):
    id: int
    drink_id: int
    garnish_id: int
    quantity_per_serving: float
    essential: bool

    garnish: GarnishResponse

    class Config:
        from_attributes = True
