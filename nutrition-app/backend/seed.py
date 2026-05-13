from app.database.connection import SessionLocal

from app.models.food import Food
from app.models.nutrient import Nutrient
from app.models.food_nutrient import FoodNutrient

db = SessionLocal()

# Create nutrients
protein = Nutrient(name="Protein", unit="g")
fat = Nutrient(name="Fat", unit="g")
carbs = Nutrient(name="Carbs", unit="g")

db.add(protein)
db.add(fat)
db.add(carbs)

# Create food
chicken = Food(
    name="Chicken Breast",
    brand="Generic"
)

db.add(chicken)

db.commit()

# Create relationships
protein_amount = FoodNutrient(
    food_id=chicken.id,
    nutrient_id=protein.id,
    amount_per_100g=31
)

fat_amount = FoodNutrient(
    food_id=chicken.id,
    nutrient_id=fat.id,
    amount_per_100g=3.6
)

carbs_amount = FoodNutrient(
    food_id=chicken.id,
    nutrient_id=carbs.id,
    amount_per_100g=0
)

db.add(protein_amount)
db.add(fat_amount)
db.add(carbs_amount)

db.commit()

print("Data seeded!")