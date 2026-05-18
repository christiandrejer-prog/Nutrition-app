from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.intake_entry import IntakeEntry
from app.models.meal import Meal
from app.models.meal_item import MealItem
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.models.food import Food
from app.utils.energy_constants import calculate_energy_from_macros
from app.schemas.intake_schema import (
    IntakeEntryCreate,
    IntakeEntryResponse,
    IntakeSummaryResponse,
    IntakeDateResponse,
)

router = APIRouter(tags=["Intake"])


def _calculate_meal_macros(meal_id: int, db: Session) -> dict:
    meal_items = db.query(MealItem).filter(MealItem.meal_id == meal_id).all()
    totals = {"protein": 0.0, "carbs": 0.0, "fat": 0.0}

    for item in meal_items:
        food_nutrients = db.query(FoodNutrient).filter(FoodNutrient.food_id == item.food_id).all()
        item_amount = float(getattr(item, 'amount', 0) or 0)

        for fn in food_nutrients:
            nutrient = db.query(Nutrient).filter(Nutrient.id == fn.nutrient_id).first()
            if not nutrient:
                continue
            scaled_amount = fn.amount_per_100g * (item_amount / 100)
            name = nutrient.name.lower()
            if "protein" in name:
                totals["protein"] += scaled_amount
            elif "carb" in name:
                totals["carbs"] += scaled_amount
            elif "fat" in name:
                totals["fat"] += scaled_amount

    totals["calories"] = round(calculate_energy_from_macros(totals), 1)
    return totals


@router.post("/", response_model=IntakeEntryResponse)
def create_intake_entry(data: IntakeEntryCreate, db: Session = Depends(get_db)):
    intake_date = data.intake_date or date.today()
    protein = float(data.protein or 0)
    carbs = float(data.carbs or 0)
    fat = float(data.fat or 0)
    calories = round(protein * 4 + carbs * 4 + fat * 9, 1)
    description = data.description

    if data.meal_id is not None:
        meal = db.query(Meal).filter(Meal.id == data.meal_id).first()
        if not meal:
            raise HTTPException(status_code=404, detail="Meal not found")
        meal_totals = _calculate_meal_macros(meal.id, db)
        protein = meal_totals["protein"]
        carbs = meal_totals["carbs"]
        fat = meal_totals["fat"]
        calories = meal_totals["calories"]
        description = description or f"Meal: {meal.name}"

    entry = IntakeEntry(
        intake_date=intake_date,
        meal_id=data.meal_id,
        description=description,
        protein=protein,
        carbs=carbs,
        fat=fat,
        calories=calories,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=list[IntakeEntryResponse])
def get_intake_entries(intake_date: date = Query(None), db: Session = Depends(get_db)):
    current_date = intake_date if intake_date is not None else date.today()
    return (
        db.query(IntakeEntry)
        .filter(IntakeEntry.intake_date == current_date)
        .order_by(IntakeEntry.created_at.desc())
        .all()
    )


@router.get("/dates", response_model=list[IntakeDateResponse])
def get_intake_dates(db: Session = Depends(get_db)):
    rows = (
        db.query(IntakeEntry.intake_date, func.count(IntakeEntry.id).label("entries"))
        .group_by(IntakeEntry.intake_date)
        .order_by(IntakeEntry.intake_date.desc())
        .all()
    )
    return [{"date": row.intake_date, "entries": row.entries} for row in rows]


@router.get("/summary", response_model=IntakeSummaryResponse)
def get_intake_summary(intake_date: date = Query(None), db: Session = Depends(get_db)):
    current_date = intake_date if intake_date is not None else date.today()

    totals = (
        db.query(
            func.coalesce(func.sum(IntakeEntry.protein), 0).label("protein"),
            func.coalesce(func.sum(IntakeEntry.carbs), 0).label("carbs"),
            func.coalesce(func.sum(IntakeEntry.fat), 0).label("fat"),
            func.coalesce(func.sum(IntakeEntry.calories), 0).label("calories"),
            func.count(IntakeEntry.id).label("entries"),
        )
        .filter(IntakeEntry.intake_date == current_date)
        .first()
    )

    return {
        "intake_date": current_date,
        "total_protein": float(totals.protein),
        "total_carbs": float(totals.carbs),
        "total_fat": float(totals.fat),
        "total_calories": float(totals.calories),
        "entries": int(totals.entries),
    }
