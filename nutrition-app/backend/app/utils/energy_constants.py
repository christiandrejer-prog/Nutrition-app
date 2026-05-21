from __future__ import annotations

from typing import Mapping

# Macronutrient energy values in kilocalories per gram.
# Use this file as the single source of truth for energy conversion.
# Update these values here if nutrition science changes or new edge cases are needed.
ENERGY_KCAL_PER_GRAM: dict[str, float] = {
    "protein": 4.0,
    "carbs": 4.0,
    "fat": 9.0,
}

# General energy unit conversion constants
KJ_PER_KCAL = 4.184
SUPPORTED_UNITS = {"kcal", "kj"}
ACTIVITY_FACTORS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}
PROTEIN_TEF_RATE = 0.25
GOAL_ADJUSTMENTS: dict[str, int] = {
    "lose": -500,
    "maintain": 0,
    "gain": 300,
}


def normalize_energy_unit(unit: str) -> str:
    normalized = unit.strip().lower()
    if normalized not in SUPPORTED_UNITS:
        raise ValueError(f"Unsupported energy unit: {unit}. Supported units: {sorted(SUPPORTED_UNITS)}")
    return normalized


def get_energy_factor(nutrient_name: str, unit: str = "kcal", default: float = 0.0) -> float:
    """Return the energy factor per gram for the named macronutrient.

    The default unit is kcal, but kj is also supported.
    """
    unit = normalize_energy_unit(unit)
    normalized = nutrient_name.strip().lower()
    for key, factor in ENERGY_KCAL_PER_GRAM.items():
        if key in normalized:
            return factor if unit == "kcal" else factor * KJ_PER_KCAL
    return default


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """Estimate resting energy expenditure using Mifflin-St Jeor."""
    sex = sex.strip().lower()
    if sex == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    if sex == "female":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    raise ValueError("Sex must be 'male' or 'female'")


def get_activity_factor(activity_level: str) -> float:
    normalized = activity_level.strip().lower()
    if normalized not in ACTIVITY_FACTORS:
        raise ValueError(f"Unknown activity level: {activity_level}")
    return ACTIVITY_FACTORS[normalized]


def calculate_protein_thermic_effect(protein_grams: float, tef_rate: float = PROTEIN_TEF_RATE) -> float:
    """Estimate the extra calories burned by digesting protein."""
    return protein_grams * ENERGY_KCAL_PER_GRAM["protein"] * tef_rate


def get_goal_adjustment(goal: str) -> int:
    normalized = goal.strip().lower()
    if normalized not in GOAL_ADJUSTMENTS:
        raise ValueError(f"Unknown goal: {goal}")
    return GOAL_ADJUSTMENTS[normalized]


def calculate_energy_from_macros(macros: Mapping[str, float], unit: str = "kcal") -> float:
    """Calculate total energy from macro amounts.

    Args:
        macros: mapping of nutrient name to grams.
        unit: "kcal" or "kj".
    """
    unit = normalize_energy_unit(unit)
    total_kcal = sum(
        macros.get(nutrient, 0.0) * factor
        for nutrient, factor in ENERGY_KCAL_PER_GRAM.items()
    )

    return total_kcal if unit == "kcal" else total_kcal * KJ_PER_KCAL
