from sqlalchemy.orm import Session
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.utils.energy_constants import calculate_energy_from_macros


def calculate_food_macros(db: Session, food_id: int):
    results = db.query(FoodNutrient).filter(
        FoodNutrient.food_id == food_id
    ).all()

    macros = {
        "protein": 0,
        "carbs": 0,
        "fat": 0
    }

    for item in results:
        nutrient = db.query(Nutrient).filter(
            Nutrient.id == item.nutrient_id
        ).first()

        if not nutrient:
            continue

        name = nutrient.name.lower()

        if name == "protein":
            macros["protein"] += item.amount_per_100g
        elif name == "carbs":
            macros["carbs"] += item.amount_per_100g
        elif name == "fat":
            macros["fat"] += item.amount_per_100g

    macros["calories"] = round(calculate_energy_from_macros(macros), 2)

    return macros