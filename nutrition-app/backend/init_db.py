from app.database.db import Base
from app.database.connection import engine

from app.models.food import Food
from app.models.nutrient import Nutrient
from app.models.food_nutrient import FoodNutrient
from app.models.meal import Meal
from app.models.meal_item import MealItem

Base.metadata.create_all(bind=engine)

print("Database tables created!")
print(Base.metadata.tables.keys())