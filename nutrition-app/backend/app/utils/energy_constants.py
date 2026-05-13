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
