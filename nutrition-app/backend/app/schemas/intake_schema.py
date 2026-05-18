from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class IntakeEntryCreate(BaseModel):
    intake_date: Optional[date] = None
    meal_id: Optional[int] = None
    description: Optional[str] = None
    protein: float = Field(0.0, ge=0)
    carbs: float = Field(0.0, ge=0)
    fat: float = Field(0.0, ge=0)


class IntakeEntryResponse(BaseModel):
    id: int
    intake_date: date
    meal_id: Optional[int]
    description: Optional[str]
    protein: float
    carbs: float
    fat: float
    calories: float

    class Config:
        from_attributes = True


class IntakeSummaryResponse(BaseModel):
    intake_date: date
    total_protein: float
    total_carbs: float
    total_fat: float
    total_calories: float
    entries: int


class IntakeDateResponse(BaseModel):
    date: date
    entries: int
