from enum import Enum

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.utils.energy_constants import (
    calculate_bmr,
    calculate_protein_thermic_effect,
    get_activity_factor,
    get_goal_adjustment,
)


class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class GoalOption(str, Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"


class EnergyEstimateRequest(BaseModel):
    age: int = Field(..., ge=10, le=120)
    sex: str = Field(..., pattern="^(male|female)$")
    weight_kg: float = Field(..., gt=0, le=500)
    height_cm: float = Field(..., gt=0, le=300)
    activity_level: ActivityLevel
    protein_grams: float = Field(..., ge=0, le=1000)
    weekly_activity_minutes: int = Field(0, ge=0, le=10000)
    goal: GoalOption = GoalOption.maintain


class EnergyEstimateResponse(BaseModel):
    bmr: float
    activity_factor: float
    daily_maintenance_kcal: float
    weekly_maintenance_kcal: float
    protein_thermic_effect_kcal: float
    goal_adjustment_kcal: float
    recommended_daily_calories: float


router = APIRouter(tags=["nutrition"])


@router.post("/tdee", response_model=EnergyEstimateResponse)
def estimate_tdee(data: EnergyEstimateRequest):
    bmr = calculate_bmr(
        weight_kg=data.weight_kg,
        height_cm=data.height_cm,
        age=data.age,
        sex=data.sex,
    )

    activity_factor = get_activity_factor(data.activity_level.value)
    daily_maintenance = round(bmr * activity_factor, 1)
    weekly_maintenance = round(daily_maintenance * 7, 1)
    protein_thermic_effect = round(calculate_protein_thermic_effect(data.protein_grams), 1)
    goal_adjustment = get_goal_adjustment(data.goal.value)
    recommended_daily = round(daily_maintenance + protein_thermic_effect + goal_adjustment, 1)

    return {
        "bmr": round(bmr, 1),
        "activity_factor": activity_factor,
        "daily_maintenance_kcal": daily_maintenance,
        "weekly_maintenance_kcal": weekly_maintenance,
        "protein_thermic_effect_kcal": protein_thermic_effect,
        "goal_adjustment_kcal": goal_adjustment,
        "recommended_daily_calories": recommended_daily,
    }
