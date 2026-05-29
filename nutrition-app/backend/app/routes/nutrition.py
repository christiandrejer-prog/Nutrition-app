from enum import Enum

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.maintenance_calculator import (
    ActivitySession as MaintenanceActivitySession,
    calculate_maintenance,
)
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


class BaselineActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"


class ScheduledActivityRequest(BaseModel):
    name: str = Field("Activity", max_length=80)
    minutes_per_week: float = Field(..., ge=0, le=10080)
    met: float = Field(..., ge=1, le=25)


class MaintenanceEstimateRequest(BaseModel):
    age: int = Field(..., ge=10, le=120)
    sex: str = Field(..., pattern="^(male|female)$")
    weight_kg: float = Field(..., gt=0, le=500)
    height_cm: float = Field(..., gt=0, le=300)
    baseline_activity_level: BaselineActivityLevel = BaselineActivityLevel.sedentary
    protein_grams_per_day: float = Field(0, ge=0, le=1000)
    goal: GoalOption = GoalOption.maintain
    activity_sessions: list[ScheduledActivityRequest] = Field(default_factory=list)
    direct_activity_kcal_per_week: float = Field(0, ge=0, le=100000)


class ScheduledActivityResponse(BaseModel):
    name: str
    minutes_per_week: float
    met: float
    kcal_per_week: float


class MacroTargetResponse(BaseModel):
    grams: float
    kcal: float
    percent: float


class MaintenanceEstimateResponse(BaseModel):
    method: str
    bmr_kcal_per_day: float
    baseline_activity_factor: float
    baseline_living_kcal_per_day: float
    scheduled_activity_kcal_per_week: float
    direct_activity_kcal_per_week: float
    total_activity_kcal_per_week: float
    scheduled_activity_kcal_per_day: float
    total_activity_kcal_per_day: float
    protein_thermic_effect_kcal_per_day: float
    daily_maintenance_kcal: float
    weekly_maintenance_kcal: float
    goal_adjustment_kcal_per_day: float
    daily_target_kcal: float
    weekly_target_kcal: float
    macro_targets: dict[str, MacroTargetResponse]
    activity_sessions: list[ScheduledActivityResponse]


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


@router.post("/maintenance", response_model=MaintenanceEstimateResponse)
def estimate_maintenance(data: MaintenanceEstimateRequest):
    return calculate_maintenance(
        sex=data.sex,
        age=data.age,
        weight_kg=data.weight_kg,
        height_cm=data.height_cm,
        baseline_activity_level=data.baseline_activity_level.value,
        protein_grams_per_day=data.protein_grams_per_day,
        goal=data.goal.value,
        activity_sessions=[
            MaintenanceActivitySession(
                name=session.name,
                minutes_per_week=session.minutes_per_week,
                met=session.met,
            )
            for session in data.activity_sessions
        ],
        direct_activity_kcal_per_week=data.direct_activity_kcal_per_week,
    )


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
