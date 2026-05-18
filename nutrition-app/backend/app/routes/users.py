from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.meal import Meal
from app.models.meal_item import MealItem
from app.models.user import User
from app.models.user_meal import UserMeal
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.schemas.user_schema import (
    UserCreate,
    UserResponse,
    UserMealCreate,
    UserMealResponse,
)
from app.utils.energy_constants import calculate_energy_from_macros

router = APIRouter(tags=["Users"])


@router.post("/", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        func.lower(User.username) == user_data.username.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=user_data.username,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/meals", response_model=UserMealResponse)
def assign_meal_to_user(user_id: int, data: UserMealCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    meal = db.query(Meal).filter(Meal.id == data.meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    existing = db.query(UserMeal).filter(
        UserMeal.user_id == user_id,
        UserMeal.meal_id == data.meal_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Meal already assigned to user")

    user_meal = UserMeal(user_id=user_id, meal_id=data.meal_id)
    db.add(user_meal)
    db.commit()
    db.refresh(user_meal)
    return user_meal


def _calculate_meal_macros(meal_id: int, db: Session) -> dict[str, float]:
    totals = {"protein": 0.0, "carbs": 0.0, "fat": 0.0}
    meal_items = db.query(MealItem).filter(MealItem.meal_id == meal_id).all()
    for item in meal_items:
        food_nutrients = db.query(FoodNutrient).filter(
            FoodNutrient.food_id == item.food_id
        ).all()
        for fn in food_nutrients:
            nutrient = db.query(Nutrient).filter(Nutrient.id == fn.nutrient_id).first()
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
    return totals


@router.get("/{user_id}/meals")
def get_user_meals(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assignments = db.query(UserMeal).filter(UserMeal.user_id == user_id).all()
    result = []
    for assignment in assignments:
        meal = db.query(Meal).filter(Meal.id == assignment.meal_id).first()
        if not meal:
            continue
        macros = _calculate_meal_macros(meal.id, db)
        result.append(
            {
                "meal_id": meal.id,
                "meal_name": meal.name,
                "macros": macros,
                "calories": round(calculate_energy_from_macros(macros), 1),
            }
        )
    return result
