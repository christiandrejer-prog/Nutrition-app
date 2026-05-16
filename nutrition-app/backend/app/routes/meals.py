from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.meal import Meal
from app.models.meal_item import MealItem
from app.models.food import Food
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.utils.energy_constants import calculate_energy_from_macros

from app.schemas.meal_schema import MealCreate, MealAddFood, MealUpdate

router = APIRouter(tags=["Meals"])



# Create a new meal
@router.post("/")
def create_meal(data: MealCreate, db: Session = Depends(get_db)):

    existing = db.query(Meal).filter(func.lower(Meal.name) == data.name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Meal already exists")

    meal = Meal(name=data.name)

    db.add(meal)
    db.commit()
    db.refresh(meal)

    return meal


@router.put("/{meal_id}")
def update_meal(meal_id: int, data: MealUpdate, db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    duplicate = db.query(Meal).filter(
        Meal.id != meal_id,
        func.lower(Meal.name) == data.name.lower()
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Meal already exists")

    meal.name = data.name
    db.commit()
    db.refresh(meal)

    return meal


@router.delete("/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    db.query(MealItem).filter(MealItem.meal_id == meal_id).delete()
    db.delete(meal)
    db.commit()

    return {"detail": "Meal deleted"}


# Get all meals
@router.get("/")
def get_meals(db: Session = Depends(get_db)):
    return db.query(Meal).all()



# Add food items to meal
@router.post("/{meal_id}/items")
def add_items(meal_id: int, data: MealAddFood, db: Session = Depends(get_db)):

    meal = db.query(Meal).filter(Meal.id == meal_id).first()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    for item in data.items:

        food = db.query(Food).filter(Food.id == item.food_id).first()

        if not food:
            raise HTTPException(status_code=404, detail=f"Food {item.food_id} not found")

        existing_item = db.query(MealItem).filter(
            MealItem.meal_id == meal_id,
            MealItem.food_id == item.food_id
        ).first()
        if existing_item:
            raise HTTPException(status_code=400, detail=f"Food {item.food_id} already added to meal")

        meal_item = MealItem(
            meal_id=meal_id,
            food_id=item.food_id,
            grams=item.grams
        )

        db.add(meal_item)

    db.commit()

    return {"message": "Items added to meal"}



# Get meal details
@router.get("/{meal_id}")
def get_meal(meal_id: int, db: Session = Depends(get_db)):

    meal = db.query(Meal).filter(Meal.id == meal_id).first()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    items = db.query(MealItem).filter(MealItem.meal_id == meal_id).all()

    return {
        "meal": meal.name,
        "items": items
    }



# Get meal macros
@router.get("/{meal_id}/macros")
def get_meal_macros(meal_id: int, db: Session = Depends(get_db)):

    meal = db.query(Meal).filter(Meal.id == meal_id).first()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    meal_items = db.query(MealItem).filter(
        MealItem.meal_id == meal_id
    ).all()

    totals = {
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0
    }

    for item in meal_items:

        food_nutrients = db.query(FoodNutrient).filter(
            FoodNutrient.food_id == item.food_id
        ).all()

        for fn in food_nutrients:

            nutrient = db.query(Nutrient).filter(
                Nutrient.id == fn.nutrient_id
            ).first()

            if not nutrient:
                continue

            scaled_amount = fn.amount_per_100g * (item.grams / 100)

            name = nutrient.name.lower()

            if "protein" in name:
                totals["protein"] += scaled_amount

            elif "carb" in name:
                totals["carbs"] += scaled_amount

            elif "fat" in name:
                totals["fat"] += scaled_amount

    totals["calories"] = round(calculate_energy_from_macros(totals), 0)

    return {
        "meal": meal.name,
        "totals": totals
    }
