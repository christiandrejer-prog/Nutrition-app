from __future__ import annotations

from dataclasses import dataclass

from app.services.intake_history import MacroAverages


# Thermic effect of food (TEF) rates: the energy cost of digesting each
# macronutrient, as a fraction of that macro's own energy. Protein has the
# highest cost (commonly cited range 20-30%), carbs a moderate cost (5-10%),
# fat the lowest (0-3%). Midpoints are used here.
PROTEIN_THERMIC_EFFECT_RATE = 0.25
CARBS_THERMIC_EFFECT_RATE = 0.075
FAT_THERMIC_EFFECT_RATE = 0.02

KCAL_PER_GRAM_PROTEIN = 4.0
KCAL_PER_GRAM_CARBS = 4.0
KCAL_PER_GRAM_FAT = 9.0

# Minimum distinct logged days before trusting the actual macro average over
# the manually-entered protein target, and how far back to average over.
MIN_HISTORY_DAYS_FOR_TEF = 3
TEF_HISTORY_WINDOW_DAYS = 14

BASELINE_ACTIVITY_FACTORS = {
    "sedentary": 1.2,
    "light": 1.35,
    "moderate": 1.5,
    "active": 1.65,
}

GOAL_ADJUSTMENTS = {
    "lose": -500,
    "maintain": 0,
    "gain": 300,
}

MACRO_TARGETS_BY_GOAL = {
    # Protein is set by g/kg first, then fat gets a conservative AMDR-based
    # energy share, and carbs receive the remaining energy.
    "lose": {"protein_g_per_kg": 2.0, "fat_percent": 25},
    "maintain": {"protein_g_per_kg": 1.6, "fat_percent": 30},
    "gain": {"protein_g_per_kg": 1.8, "fat_percent": 25},
}


@dataclass(frozen=True)
class ActivitySession:
    name: str
    minutes_per_week: float
    met: float


def calculate_bmr_mifflin_st_jeor(
    *,
    sex: str,
    age: int,
    weight_kg: float,
    height_cm: float,
) -> float:
    """Estimate basal metabolic rate with the Mifflin-St Jeor equation."""
    normalized_sex = sex.strip().lower()
    sex_constant = {"male": 5, "female": -161}.get(normalized_sex)
    if sex_constant is None:
        raise ValueError("sex must be 'male' or 'female'")

    return 10 * weight_kg + 6.25 * height_cm - 5 * age + sex_constant


def calculate_activity_kcal_per_week(
    *,
    weight_kg: float,
    sessions: list[ActivitySession],
) -> float:
    """Estimate net scheduled activity kcal with MET values.

    Uses the standard kcal/min equation: MET * 3.5 * bodyweight(kg) / 200.
    The calculation subtracts resting MET 1.0 so planned exercise is added
    on top of baseline living rather than double-counting rest.
    """
    total = 0.0
    for session in sessions:
        net_met = max(session.met - 1.0, 0.0)
        total += net_met * 3.5 * weight_kg / 200 * session.minutes_per_week
    return total


def calculate_thermic_effect_kcal_per_day(
    *,
    protein_grams_per_day: float,
    carbs_grams_per_day: float = 0.0,
    fat_grams_per_day: float = 0.0,
) -> float:
    """Estimate the full thermic effect of food (TEF) across all 3 macros."""
    return (
        protein_grams_per_day * KCAL_PER_GRAM_PROTEIN * PROTEIN_THERMIC_EFFECT_RATE
        + carbs_grams_per_day * KCAL_PER_GRAM_CARBS * CARBS_THERMIC_EFFECT_RATE
        + fat_grams_per_day * KCAL_PER_GRAM_FAT * FAT_THERMIC_EFFECT_RATE
    )


def calculate_macro_targets(
    *,
    daily_target_kcal: float,
    weight_kg: float,
    goal: str,
) -> dict[str, dict[str, float]]:
    """Create practical macro targets inside broad AMDR guardrails.

    The goal changes protein first because protein needs are best expressed
    relative to bodyweight. Fat is kept in a moderate AMDR-compatible range,
    and carbohydrate fills the remaining energy.
    """
    goal_targets = MACRO_TARGETS_BY_GOAL[goal]
    protein_grams = weight_kg * goal_targets["protein_g_per_kg"]
    protein_kcal = protein_grams * 4
    protein_percent = (protein_kcal / daily_target_kcal) * 100 if daily_target_kcal else 0

    # Keep protein inside the adult AMDR range of 10-35% of energy.
    protein_percent = min(max(protein_percent, 10), 35)
    protein_kcal = daily_target_kcal * (protein_percent / 100)
    protein_grams = protein_kcal / 4

    fat_percent = goal_targets["fat_percent"]
    fat_kcal = daily_target_kcal * (fat_percent / 100)
    fat_grams = fat_kcal / 9

    carbs_kcal = max(daily_target_kcal - protein_kcal - fat_kcal, 0)
    carbs_grams = carbs_kcal / 4
    carbs_percent = (carbs_kcal / daily_target_kcal) * 100 if daily_target_kcal else 0

    return {
        "protein": {
            "grams": round(protein_grams, 1),
            "kcal": round(protein_kcal, 1),
            "percent": round(protein_percent, 1),
        },
        "carbs": {
            "grams": round(carbs_grams, 1),
            "kcal": round(carbs_kcal, 1),
            "percent": round(carbs_percent, 1),
        },
        "fat": {
            "grams": round(fat_grams, 1),
            "kcal": round(fat_kcal, 1),
            "percent": round(fat_percent, 1),
        },
    }


def calculate_maintenance(
    *,
    sex: str,
    age: int,
    weight_kg: float,
    height_cm: float,
    baseline_activity_level: str,
    protein_grams_per_day: float,
    goal: str,
    activity_sessions: list[ActivitySession] | None = None,
    direct_activity_kcal_per_week: float = 0.0,
    trailing_macro_averages: MacroAverages | None = None,
) -> dict[str, float | str | list[dict[str, float | str]]]:
    bmr = calculate_bmr_mifflin_st_jeor(
        sex=sex,
        age=age,
        weight_kg=weight_kg,
        height_cm=height_cm,
    )
    baseline_factor = BASELINE_ACTIVITY_FACTORS[baseline_activity_level]
    baseline_living_kcal_per_day = bmr * baseline_factor

    sessions = activity_sessions or []
    scheduled_activity_kcal_per_week = calculate_activity_kcal_per_week(
        weight_kg=weight_kg,
        sessions=sessions,
    )
    total_activity_kcal_per_week = scheduled_activity_kcal_per_week + direct_activity_kcal_per_week
    activity_kcal_per_day = total_activity_kcal_per_week / 7

    has_enough_history = (
        trailing_macro_averages is not None
        and trailing_macro_averages.days_counted >= MIN_HISTORY_DAYS_FOR_TEF
    )
    if has_enough_history:
        thermic_effect_kcal_per_day = calculate_thermic_effect_kcal_per_day(
            protein_grams_per_day=trailing_macro_averages.protein_grams_per_day,
            carbs_grams_per_day=trailing_macro_averages.carbs_grams_per_day,
            fat_grams_per_day=trailing_macro_averages.fat_grams_per_day,
        )
        thermic_effect_source = "logged_history"
    else:
        thermic_effect_kcal_per_day = calculate_thermic_effect_kcal_per_day(
            protein_grams_per_day=protein_grams_per_day,
        )
        thermic_effect_source = "manual_protein_input"

    goal_adjustment_kcal_per_day = GOAL_ADJUSTMENTS[goal]

    daily_maintenance_kcal = (
        baseline_living_kcal_per_day
        + activity_kcal_per_day
        + thermic_effect_kcal_per_day
    )
    daily_target_kcal = daily_maintenance_kcal + goal_adjustment_kcal_per_day
    macro_targets = calculate_macro_targets(
        daily_target_kcal=daily_target_kcal,
        weight_kg=weight_kg,
        goal=goal,
    )

    return {
        "method": "Mifflin-St Jeor BMR + baseline activity + net MET activity/direct activity kcal + thermic effect of food",
        "bmr_kcal_per_day": round(bmr, 1),
        "baseline_activity_factor": baseline_factor,
        "baseline_living_kcal_per_day": round(baseline_living_kcal_per_day, 1),
        "scheduled_activity_kcal_per_week": round(scheduled_activity_kcal_per_week, 1),
        "direct_activity_kcal_per_week": round(direct_activity_kcal_per_week, 1),
        "total_activity_kcal_per_week": round(total_activity_kcal_per_week, 1),
        "scheduled_activity_kcal_per_day": round(activity_kcal_per_day, 1),
        "total_activity_kcal_per_day": round(activity_kcal_per_day, 1),
        "thermic_effect_kcal_per_day": round(thermic_effect_kcal_per_day, 1),
        "thermic_effect_source": thermic_effect_source,
        "thermic_effect_window_days": TEF_HISTORY_WINDOW_DAYS if has_enough_history else 0,
        "daily_maintenance_kcal": round(daily_maintenance_kcal, 1),
        "weekly_maintenance_kcal": round(daily_maintenance_kcal * 7, 1),
        "goal_adjustment_kcal_per_day": goal_adjustment_kcal_per_day,
        "daily_target_kcal": round(daily_target_kcal, 1),
        "weekly_target_kcal": round(daily_target_kcal * 7, 1),
        "macro_targets": macro_targets,
        "activity_sessions": [
            {
                "name": session.name,
                "minutes_per_week": session.minutes_per_week,
                "met": session.met,
                "kcal_per_week": round(
                    max(session.met - 1.0, 0.0) * 3.5 * weight_kg / 200 * session.minutes_per_week,
                    1,
                ),
            }
            for session in sessions
        ],
    }
