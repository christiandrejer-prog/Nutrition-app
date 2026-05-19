from datetime import date
from app.database.db import Base
from app.database.connection import engine, SessionLocal, get_database_path

from app.models.food import Food
from app.models.nutrient import Nutrient
from app.models.food_nutrient import FoodNutrient
from app.models.meal import Meal
from app.models.meal_item import MealItem

# New models
from app.models.drink import Drink
from app.models.drink_ingredient import DrinkIngredient
from app.models.drink_list import DrinkList
from app.models.drink_list_item import DrinkListItem
from app.models.garnish import Garnish
from app.models.intake_entry import IntakeEntry


Base.metadata.create_all(bind=engine)

print("Database tables created!")
print(Base.metadata.tables.keys())


def seed_dummy_data():
	session = SessionLocal()

	# Quick guard: don't insert duplicates when running multiple times
	if session.query(Food).first():
		print("Seed data already present, skipping seeding.")
		session.close()
		return

	# Macronutrients
	# Macronutrients (idempotent creation)
	def get_or_create_nutrient(name, unit):
		existing = session.query(Nutrient).filter_by(name=name).first()
		if existing:
			return existing
		obj = Nutrient(name=name, unit=unit)
		session.add(obj)
		session.flush()
		return obj

	protein_nutrient = get_or_create_nutrient("Protein", "g")
	carbs_nutrient = get_or_create_nutrient("Carbs", "g")
	fat_nutrient = get_or_create_nutrient("Fat", "g")
	alcohol_nutrient = get_or_create_nutrient("Alcohol", "g")
	session.commit()

	# Foods (price for base_amount/base_unit)
	vodka = Food(name="Vodka 40%", brand="Generic", price=150.0, base_amount=700, base_unit="ml")
	orange = Food(name="Orange Juice", brand="Generic", price=20.0, base_amount=1000, base_unit="ml")
	sugar = Food(name="Sugar Syrup", brand="Generic", price=10.0, base_amount=500, base_unit="ml")
	lemon_juice = Food(name="Lemon Juice", brand="Generic", price=15.0, base_amount=1000, base_unit="ml")
	lime_juice = Food(name="Lime Juice", brand="Generic", price=15.0, base_amount=1000, base_unit="ml")
	egg_whites = Food(name="Egg Whites", brand="Generic", price=30.0, base_amount=1000, base_unit="g")
	ginger_beer = Food(name="Ginger Beer", brand="Generic", price=12.0, base_amount=1000, base_unit="ml")
	gin = Food(name="Gin", brand="Generic", price=180.0, base_amount=700, base_unit="ml")
	tonic_water = Food(name="Tonic Water", brand="Generic", price=12.0, base_amount=1000, base_unit="ml")
	espresso = Food(name="Espresso", brand="Generic", price=3.5, base_amount=100, base_unit="ml")
	kahlua = Food(name="Kahlua", brand="Generic", price=140.0, base_amount=700, base_unit="ml")
	bread = Food(name="Bread", brand="Bakery", price=20.0, base_amount=500, base_unit="g")
	milk = Food(name="Milk", brand="Arla", price=10.0, base_amount=1000, base_unit="ml")
	chicken_breast = Food(name="Chicken Breast", brand="Generic", price=50.0, base_amount=500, base_unit="g")
	butter = Food(name="Butter", brand="Generic", price=25.0, base_amount=250, base_unit="g")
	protein_bar = Food(name="Protein Bar", brand="Generic", price=25.0, base_amount=60, base_unit="g")

	session.add_all([
	    vodka, orange, sugar, bread, milk, chicken_breast, butter, protein_bar,
	    lemon_juice, lime_juice, egg_whites,
	    ginger_beer, gin, tonic_water, espresso, kahlua,
	])
	session.commit()

	nutrient_links = [
	    FoodNutrient(food_id=vodka.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=40.0),
	    FoodNutrient(food_id=vodka.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=vodka.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=vodka.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=gin.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=40.0),
	    FoodNutrient(food_id=gin.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=gin.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=gin.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=kahlua.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=20.0),
	    FoodNutrient(food_id=kahlua.id, nutrient_id=carbs_nutrient.id, amount_per_100g=27.0),
	    FoodNutrient(food_id=kahlua.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.4),
	    FoodNutrient(food_id=kahlua.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=orange.id, nutrient_id=carbs_nutrient.id, amount_per_100g=8.0),
	    FoodNutrient(food_id=orange.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.7),
	    FoodNutrient(food_id=orange.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.2),
	    FoodNutrient(food_id=orange.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=sugar.id, nutrient_id=carbs_nutrient.id, amount_per_100g=65.0),
	    FoodNutrient(food_id=sugar.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=sugar.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=sugar.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=bread.id, nutrient_id=protein_nutrient.id, amount_per_100g=8.0),
	    FoodNutrient(food_id=bread.id, nutrient_id=carbs_nutrient.id, amount_per_100g=49.0),
	    FoodNutrient(food_id=bread.id, nutrient_id=fat_nutrient.id, amount_per_100g=3.2),
	    FoodNutrient(food_id=bread.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=lemon_juice.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.4),
	    FoodNutrient(food_id=lemon_juice.id, nutrient_id=carbs_nutrient.id, amount_per_100g=6.0),
	    FoodNutrient(food_id=lemon_juice.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.2),
	    FoodNutrient(food_id=lemon_juice.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=lime_juice.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.4),
	    FoodNutrient(food_id=lime_juice.id, nutrient_id=carbs_nutrient.id, amount_per_100g=6.9),
	    FoodNutrient(food_id=lime_juice.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.1),
	    FoodNutrient(food_id=lime_juice.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=egg_whites.id, nutrient_id=protein_nutrient.id, amount_per_100g=10.9),
	    FoodNutrient(food_id=egg_whites.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.7),
	    FoodNutrient(food_id=egg_whites.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.2),
	    FoodNutrient(food_id=egg_whites.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=ginger_beer.id, nutrient_id=carbs_nutrient.id, amount_per_100g=10.0),
	    FoodNutrient(food_id=ginger_beer.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=ginger_beer.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=ginger_beer.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=tonic_water.id, nutrient_id=carbs_nutrient.id, amount_per_100g=9.0),
	    FoodNutrient(food_id=tonic_water.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=tonic_water.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=tonic_water.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=espresso.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.1),
	    FoodNutrient(food_id=espresso.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=espresso.id, nutrient_id=fat_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=espresso.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=milk.id, nutrient_id=protein_nutrient.id, amount_per_100g=3.4),
	    FoodNutrient(food_id=milk.id, nutrient_id=carbs_nutrient.id, amount_per_100g=4.8),
	    FoodNutrient(food_id=milk.id, nutrient_id=fat_nutrient.id, amount_per_100g=3.6),
	    FoodNutrient(food_id=milk.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=chicken_breast.id, nutrient_id=protein_nutrient.id, amount_per_100g=31.0),
	    FoodNutrient(food_id=chicken_breast.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=chicken_breast.id, nutrient_id=fat_nutrient.id, amount_per_100g=3.6),
	    FoodNutrient(food_id=chicken_breast.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=butter.id, nutrient_id=protein_nutrient.id, amount_per_100g=0.5),
	    FoodNutrient(food_id=butter.id, nutrient_id=carbs_nutrient.id, amount_per_100g=0.1),
	    FoodNutrient(food_id=butter.id, nutrient_id=fat_nutrient.id, amount_per_100g=81.0),
	    FoodNutrient(food_id=butter.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	    FoodNutrient(food_id=protein_bar.id, nutrient_id=protein_nutrient.id, amount_per_100g=20.0),
	    FoodNutrient(food_id=protein_bar.id, nutrient_id=carbs_nutrient.id, amount_per_100g=50.0),
	    FoodNutrient(food_id=protein_bar.id, nutrient_id=fat_nutrient.id, amount_per_100g=8.0),
	    FoodNutrient(food_id=protein_bar.id, nutrient_id=alcohol_nutrient.id, amount_per_100g=0.0),
	]
	session.add_all(nutrient_links)
	session.commit()

	# Example drink: Screwdriver (per drink: 30ml vodka, 90ml orange)
	screw = Drink(name="Screwdriver")
	session.add(screw)
	session.commit()

	di1 = DrinkIngredient(drink_id=screw.id, food_id=vodka.id, amount=30, unit="ml")
	di2 = DrinkIngredient(drink_id=screw.id, food_id=orange.id, amount=90, unit="ml")
	session.add_all([di1, di2])
	session.commit()

	# Create a list for 10 drinks and the aggregated required amounts
	list = DrinkList(name="Screwdriver Batch")
	session.add(list)
	session.commit()

	# For each ingredient, create list items (amount * quantity)
	list_items = []
	for di in [di1, di2]:
		list_items.append(
			DrinkListItem(list_id=list.id, drink_id=di.drink_id, quantity=10)
		)
	session.add_all(list_items)
	session.commit()

	# Add a simple meal with a single bread item (100g)
	meal = Meal(name="Test Meal")
	session.add(meal)
	session.commit()

	meal_item = MealItem(meal_id=meal.id, food_id=bread.id, amount=100, unit="g")
	session.add(meal_item)
	session.commit()

	# Garnish placeholder
	session.add(Garnish(name="Lemon Twist"))
	session.commit()

	# Seed sample intake entries for today
	sample_entry = IntakeEntry(
	    intake_date=date.today(),
	    meal_id=meal.id,
	    description=f"Sample intake for {meal.name}",
	    protein=10.0,
	    carbs=20.0,
	    fat=5.0,
	    calories=round(10.0 * 4 + 20.0 * 4 + 5.0 * 9, 1),
	)
	session.add(sample_entry)
	session.commit()


if __name__ == "__main__":
	seed_dummy_data()