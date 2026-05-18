from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserMealCreate(BaseModel):
    meal_id: int


class UserMealResponse(BaseModel):
    id: int
    user_id: int
    meal_id: int

    class Config:
        from_attributes = True
