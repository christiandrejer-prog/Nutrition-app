from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class WeightEntryCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, le=500)
    logged_date: Optional[date] = None


class WeightEntryResponse(BaseModel):
    id: int
    weight_kg: float
    logged_date: date
    created_at: datetime

    class Config:
        from_attributes = True
