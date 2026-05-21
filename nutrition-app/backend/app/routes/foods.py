from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.food import Food
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.schemas.food_schema import (
    FoodCreate,
    FoodResponse,
    FoodUpdate,
    FoodNutrientCreate,
    FoodNutrientUpdate,
    FoodNutrientResponse,
)
from app.utils.energy_constants import calculate_energy_from_macros

router = APIRouter(tags=["Foods"])



# Create a new food item
@router.post("/")
def create_food(
    food_data: FoodCreate,
    db: Session = Depends(get_db)
):

    brand_lower = (food_data.brand or "").strip().lower()
    existing = db.query(Food).filter(
        func.lower(Food.name) == food_data.name.lower(),
        func.coalesce(func.lower(Food.brand), "") == brand_lower
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Food already exists")

    food = Food(
        name=food_data.name,
        brand=food_data.brand,
        price=food_data.price,
        base_amount=food_data.base_amount,
        base_unit=food_data.base_unit,
    )

    db.add(food)
    db.commit()
    db.refresh(food)

    return {
        "id": food.id,
        "name": food.name,
        "brand": food.brand,
        "price": food.price
    }



# Get all food items
@router.get("/", response_model=list[FoodResponse])
def get_foods(db: Session = Depends(get_db)):

    return db.query(Food).all()


@router.put("/{food_id}", response_model=FoodResponse)
def update_food(
    food_id: int,
    food_data: FoodUpdate,
    db: Session = Depends(get_db)
):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    brand_lower = (food_data.brand or "").strip().lower()
    duplicate = db.query(Food).filter(
        Food.id != food_id,
        func.lower(Food.name) == food_data.name.lower(),
        func.coalesce(func.lower(Food.brand), "") == brand_lower
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Food already exists")

    food.name = food_data.name
    food.brand = food_data.brand
    food.price = food_data.price
    food.base_amount = food_data.base_amount
    food.base_unit = food_data.base_unit
    db.commit()
    db.refresh(food)

    return food


@router.delete("/{food_id}")
def delete_food(
    food_id: int,
    db: Session = Depends(get_db)
):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    db.query(FoodNutrient).filter(FoodNutrient.food_id == food_id).delete()
    db.delete(food)
    db.commit()

    return {"detail": "Food deleted"}


# Add nutrient to food
@router.post("/{food_id}/nutrients", response_model=FoodNutrientResponse)
def add_nutrient_to_food(
    food_id: int,
    data: FoodNutrientCreate,
    db: Session = Depends(get_db)
):

    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    nutrient = db.query(Nutrient).filter(Nutrient.id == data.nutrient_id).first()
    if not nutrient:
        raise HTTPException(status_code=404, detail="Nutrient not found")

    entry = db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id,
        FoodNutrient.nutrient_id == data.nutrient_id
    ).first()

    if entry:
        raise HTTPException(status_code=400, detail="Food nutrient entry already exists")

    entry = FoodNutrient(
        food_id=food_id,
        nutrient_id=data.nutrient_id,
        amount_per_100g=data.amount_per_100g
    )
    db.add(entry)

    db.commit()
    db.refresh(entry)

    return entry


@router.get("/{food_id}/nutrients", response_model=list[FoodNutrientResponse])
def get_food_nutrients(food_id: int, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    return db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id
    ).all()


@router.put("/{food_id}/nutrients/{nutrient_id}", response_model=FoodNutrientResponse)
def update_food_nutrient(
    food_id: int,
    nutrient_id: int,
    data: FoodNutrientUpdate,
    db: Session = Depends(get_db)
):
    entry = db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id,
        FoodNutrient.nutrient_id == nutrient_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Food nutrient entry not found")

    entry.amount_per_100g = data.amount_per_100g
    db.commit()
    db.refresh(entry)

    return entry


@router.delete("/{food_id}/nutrients/{nutrient_id}")
def delete_food_nutrient(
    food_id: int,
    nutrient_id: int,
    db: Session = Depends(get_db)
):
    entry = db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id,
        FoodNutrient.nutrient_id == nutrient_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Food nutrient entry not found")

    db.delete(entry)
    db.commit()

    return {"detail": "Food nutrient entry deleted"}


# Get macros for a food item
@router.get("/{food_id}/macros")
def get_food_macros(food_id: int, db: Session = Depends(get_db)):

    food_nutrients = db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id
    ).all()

    if not food_nutrients:
        raise HTTPException(status_code=404, detail="No nutrients found for this food")

    macros = {
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0
    }

    for item in food_nutrients:

        nutrient = db.query(Nutrient).filter(
            Nutrient.id == item.nutrient_id
        ).first()

        if not nutrient:
            continue

        name = nutrient.name.lower()

        if "protein" in name:
            macros["protein"] += item.amount_per_100g
        elif "carb" in name:
            macros["carbs"] += item.amount_per_100g
        elif "fat" in name:
            macros["fat"] += item.amount_per_100g

    macros["calories"] = round(calculate_energy_from_macros(macros), 2)

    return {
        "food_id": food_id,
        "macros": macros
    }