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
from app.schemas.meal_item_schema import MealItemUpdate

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
            amount=item.amount,
            unit=item.unit
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

            # Attempt to scale nutrient amount. If item is specified in grams, use direct scaling.
            # For other units we fall back to treating the value as equivalent to grams for now (W.I.P.)
            try:
                item_amount = float(getattr(item, 'amount', 0))
            except Exception:
                item_amount = 0

            scaled_amount = fn.amount_per_100g * (item_amount / 100)

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


# Get detailed meal items with food and macro information
@router.get("/{meal_id}/items/detailed")
def get_meal_items_detailed(meal_id: int, db: Session = Depends(get_db)):
    """Get all items in a meal with food details and macro breakdown."""
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    meal_items = db.query(MealItem).filter(MealItem.meal_id == meal_id).all()
    
    # Calculate total macros for percentage calculations
    total_macros = {"protein": 0.0, "carbs": 0.0, "fat": 0.0}
    
    items_details = []
    for item in meal_items:
        food = db.query(Food).filter(Food.id == item.food_id).first()
        if not food:
            continue

        # Calculate macros for this item
        macros = {"protein": 0.0, "carbs": 0.0, "fat": 0.0}
        food_nutrients = db.query(FoodNutrient).filter(
            FoodNutrient.food_id == item.food_id
        ).all()

        for fn in food_nutrients:
            nutrient = db.query(Nutrient).filter(Nutrient.id == fn.nutrient_id).first()
            if not nutrient:
                continue
            
            # same scaling logic for detailed view
            try:
                item_amount = float(getattr(item, 'amount', 0))
            except Exception:
                item_amount = 0
            scaled_amount = fn.amount_per_100g * (item_amount / 100)
            name = nutrient.name.lower()
            
            if "protein" in name:
                macros["protein"] += scaled_amount
            elif "carb" in name:
                macros["carbs"] += scaled_amount
            elif "fat" in name:
                macros["fat"] += scaled_amount

        # Update totals
        total_macros["protein"] += macros["protein"]
        total_macros["carbs"] += macros["carbs"]
        total_macros["fat"] += macros["fat"]

        # Calculate price for this quantity
        price_for_amount = None
        if food.price:
            # If the food has a base_amount and the meal item unit matches that base_unit, use proportional pricing.
            if getattr(food, 'base_amount', None) and getattr(food, 'base_unit', None) and item.unit == food.base_unit:
                price_for_amount = round(food.price * (item_amount / float(food.base_amount)), 2)
            elif getattr(food, 'base_amount', None) and getattr(food, 'base_unit', None) and item.unit == 'g' and food.base_unit == 'g':
                price_for_amount = round(food.price * (item_amount / float(food.base_amount)), 2)
            else:
                # Fallback: assume price refers to 100g
                price_for_amount = round(food.price * (item_amount / 100), 2)

        calories = round(calculate_energy_from_macros(macros), 1)

        items_details.append({
            "id": item.id,
            "meal_id": meal.id,
            "food_id": food.id,
            "food_name": food.name,
            "food_brand": food.brand,
            "food_price": food.price,
            "amount": getattr(item, 'amount', None),
            "unit": getattr(item, 'unit', "g"),
            "protein": round(macros["protein"], 1),
            "carbs": round(macros["carbs"], 1),
            "fat": round(macros["fat"], 1),
            "calories": calories,
            "price_for_amount": price_for_amount
        })

    # Calculate total price
    total_price = sum([item.get("price_for_amount") or 0 for item in items_details])
    total_calories = round(calculate_energy_from_macros(total_macros), 1)

    return {
        "meal_id": meal_id,
        "meal_name": meal.name,
        "items": items_details,
        "totals": {
            "protein": round(total_macros["protein"], 1),
            "carbs": round(total_macros["carbs"], 1),
            "fat": round(total_macros["fat"], 1),
            "calories": total_calories,
            "price": round(total_price, 2) if total_price > 0 else None
        }
    }


# Update a meal item
@router.put("/{meal_id}/items/{item_id}")
def update_meal_item(meal_id: int, item_id: int, data: MealItemUpdate, db: Session = Depends(get_db)):
    """Update an item in a meal (change grams or food_id)."""
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    item = db.query(MealItem).filter(
        MealItem.id == item_id,
        MealItem.meal_id == meal_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Meal item not found")

    if getattr(data, 'grams', None) is not None:
        # Backwards compatibility: if client sends `grams` update, map to `amount`
        item.amount = getattr(data, 'grams')

    if getattr(data, 'amount', None) is not None:
        item.amount = data.amount

    if getattr(data, 'unit', None) is not None:
        item.unit = data.unit

    if data.food_id is not None:
        food = db.query(Food).filter(Food.id == data.food_id).first()
        if not food:
            raise HTTPException(status_code=404, detail="Food not found")
        item.food_id = data.food_id

    db.commit()
    db.refresh(item)
    return {"detail": "Meal item updated"}


# Delete a meal item
@router.delete("/{meal_id}/items/{item_id}")
def delete_meal_item(meal_id: int, item_id: int, db: Session = Depends(get_db)):
    """Delete an item from a meal."""
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    item = db.query(MealItem).filter(
        MealItem.id == item_id,
        MealItem.meal_id == meal_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Meal item not found")

    db.delete(item)
    db.commit()

    return {"detail": "Meal item deleted"}
