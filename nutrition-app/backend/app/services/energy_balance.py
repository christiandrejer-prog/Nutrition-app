from __future__ import annotations

# Wishnofsky approximation (3500 kcal/lb ~= 7700 kcal/kg of body mass). This is
# a widely-cited rough estimate, not a precise prediction - real weight change
# also involves water, glycogen, and metabolic adaptation over sustained
# deficits/surpluses. Any number derived from it should be labeled an estimate.
KCAL_PER_KG_BODY_MASS = 7700


def calculate_energy_balance(
    *,
    daily_calories: list[float],
    daily_maintenance_kcal: float,
) -> dict[str, float]:
    """Roll up a trailing window of daily intake against maintenance.

    The point of this calculation is exactly what a single day's number can't
    show: a surplus one day and a deficit the next average out, because the
    body responds to sustained energy balance over time, not day to day.
    """
    days = len(daily_calories) or 1
    total_calories = sum(daily_calories)

    average_daily_calories = total_calories / days
    average_daily_balance_kcal = average_daily_calories - daily_maintenance_kcal
    cumulative_balance_kcal = total_calories - daily_maintenance_kcal * days

    return {
        "average_daily_calories": round(average_daily_calories, 1),
        "average_daily_balance_kcal": round(average_daily_balance_kcal, 1),
        "cumulative_balance_kcal": round(cumulative_balance_kcal, 1),
        "estimated_weight_change_kg": round(cumulative_balance_kcal / KCAL_PER_KG_BODY_MASS, 3),
        "projected_weekly_rate_kg": round(average_daily_balance_kcal * 7 / KCAL_PER_KG_BODY_MASS, 3),
    }
