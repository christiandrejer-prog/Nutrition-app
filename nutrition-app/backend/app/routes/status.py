from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.database.connection import engine
from app.database.session import get_db
from app.models.food import Food
from app.models.nutrient import Nutrient
from app.models.meal import Meal
from app.models.user import User
from app.models.drink import Drink
from app.models.drink_ingredient import DrinkIngredient
from app.models.drink_list import DrinkList
from app.models.garnish import Garnish
from app.models.intake_entry import IntakeEntry

router = APIRouter(tags=["Status"])


@router.get("/")
def get_status(db: Session = Depends(get_db)):
    status = {
        "backend": {
            "running": True,
            "message": "Nutrition API running",
        },
        "api": {},
        "database": {
            "file": engine.url.database,
            "reachable": False,
            "tables": [],
            "counts": {},
        },
        "checked_at": (datetime.utcnow() + timedelta(hours=2)).isoformat(sep=" ", timespec="seconds") + " UTC+2",
    }

    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        status["database"]["tables"] = tables
        status["database"]["counts"] = {
            "foods": db.query(Food).count(),
            "nutrients": db.query(Nutrient).count(),
            "meals": db.query(Meal).count(),
            "users": db.query(User).count(),
            "drinks": db.query(Drink).count(),
            "drink_ingredients": db.query(DrinkIngredient).count(),
            "drink_lists": db.query(DrinkList).count(),
            "garnishes": db.query(Garnish).count(),
            "intake_entries": db.query(IntakeEntry).count(),
        }
        status["database"]["reachable"] = True
    except Exception as exc:
        status["database"]["error"] = str(exc)
        status["database"]["reachable"] = False

    status["api"] = {
        "root": {"url": "/", "available": True},
        "foods": {"url": "/foods/", "available": any(name == "foods" for name in status["database"]["tables"])},
        "nutrients": {"url": "/nutrients/", "available": any(name == "nutrients" for name in status["database"]["tables"])},
        "meals": {"url": "/meals/", "available": any(name == "meals" for name in status["database"]["tables"])},
        "users": {"url": "/users/", "available": any(name == "users" for name in status["database"]["tables"])},
        "user_meals": {"url": "/user_meals/", "available": any(name == "user_meals" for name in status["database"]["tables"])},
        "drinks": {"url": "/drinks/", "available": any(name == "drinks" for name in status["database"]["tables"])},
        "drink_ingredients": {"url": "/drink_ingredients/", "available": any(name == "drink_ingredients" for name in status["database"]["tables"])},
        "drink_list_items": {"url": "/drink_list_items/", "available": any(name == "drink_list_items" for name in status["database"]["tables"])},
        "garnishes": {"url": "/garnishes/", "available": any(name == "garnishes" for name in status["database"]["tables"])},
        "drink_lists": {"url": "/drink_lists/", "available": any(name == "drink_lists" for name in status["database"]["tables"])},
        "garnishes": {"url": "/garnishes/", "available": any(name == "garnishes" for name in status["database"]["tables"])},
        "intake": {"url": "/intake/", "available": any(name == "intake_entries" for name in status["database"]["tables"])},
        "nutrition": {"url": "/nutrition/", "available": any(name == "foods" for name in status["database"]["tables"]) and any(name == "nutrients" for name in status["database"]["tables"])},
    }

    return status
