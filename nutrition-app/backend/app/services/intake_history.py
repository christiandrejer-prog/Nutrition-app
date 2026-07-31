from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.intake_entry import IntakeEntry


@dataclass(frozen=True)
class MacroAverages:
    protein_grams_per_day: float
    carbs_grams_per_day: float
    fat_grams_per_day: float
    days_counted: int


def get_daily_totals(db: Session, start_date: date, end_date: date) -> dict[date, dict]:
    """Sum protein/carbs/fat/calories per calendar day, for days that have entries."""
    rows = (
        db.query(
            IntakeEntry.intake_date,
            func.coalesce(func.sum(IntakeEntry.protein), 0).label("protein"),
            func.coalesce(func.sum(IntakeEntry.carbs), 0).label("carbs"),
            func.coalesce(func.sum(IntakeEntry.fat), 0).label("fat"),
            func.coalesce(func.sum(IntakeEntry.calories), 0).label("calories"),
            func.count(IntakeEntry.id).label("entries"),
        )
        .filter(IntakeEntry.intake_date >= start_date, IntakeEntry.intake_date <= end_date)
        .group_by(IntakeEntry.intake_date)
        .all()
    )

    return {
        row.intake_date: {
            "protein": float(row.protein),
            "carbs": float(row.carbs),
            "fat": float(row.fat),
            "calories": float(row.calories),
            "entries": int(row.entries),
        }
        for row in rows
    }


def zero_fill_range(start_date: date, end_date: date, totals_by_date: dict[date, dict]) -> list[dict]:
    """Walk every calendar day in [start_date, end_date], filling gaps with zeros."""
    days = []
    current = start_date
    while current <= end_date:
        totals = totals_by_date.get(current, {
            "protein": 0.0, "carbs": 0.0, "fat": 0.0, "calories": 0.0, "entries": 0,
        })
        days.append({
            "intake_date": current,
            "total_protein": totals["protein"],
            "total_carbs": totals["carbs"],
            "total_fat": totals["fat"],
            "total_calories": totals["calories"],
            "entries": totals["entries"],
        })
        current += timedelta(days=1)
    return days


def get_trailing_macro_averages(
    db: Session,
    window_days: int,
    end_date: date | None = None,
) -> MacroAverages:
    """Average logged macros over the trailing window, ending yesterday by default.

    Today is excluded since it's still in progress. Averages are computed only
    over days that actually have logged entries - a day you forgot to log is
    not the same as a day you ate zero, so it shouldn't drag the average down.
    """
    last_day = end_date if end_date is not None else date.today() - timedelta(days=1)
    first_day = last_day - timedelta(days=window_days - 1)

    totals_by_date = get_daily_totals(db, first_day, last_day)
    logged_days = [day for day in totals_by_date.values() if day["entries"] > 0]
    days_counted = len(logged_days)

    if days_counted == 0:
        return MacroAverages(0.0, 0.0, 0.0, 0)

    return MacroAverages(
        protein_grams_per_day=sum(day["protein"] for day in logged_days) / days_counted,
        carbs_grams_per_day=sum(day["carbs"] for day in logged_days) / days_counted,
        fat_grams_per_day=sum(day["fat"] for day in logged_days) / days_counted,
        days_counted=days_counted,
    )
