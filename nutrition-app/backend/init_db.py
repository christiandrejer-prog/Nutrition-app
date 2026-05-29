from datetime import date

from app.database.db import Base
from app.database.connection import engine, SessionLocal

from app.models.food import Food
from app.models.nutrient import Nutrient
from app.models.food_nutrient import FoodNutrient
from app.models.meal import Meal
from app.models.meal_item import MealItem
from app.models.drink import Drink
from app.models.drink_ingredient import DrinkIngredient
from app.models.drink_list import DrinkList
from app.models.drink_list_item import DrinkListItem
from app.models.garnish import Garnish
from app.models.intake_entry import IntakeEntry


Base.metadata.create_all(bind=engine)

print("Database tables created!")
print(Base.metadata.tables.keys())


NUTRIENTS = [
    ("Protein", "g"),
    ("Carbs", "g"),
    ("Fat", "g"),
    ("Alcohol", "g"),
    ("Fiber", "g"),
    ("Sodium", "mg"),
    ("Caffeine", "mg"),
]


# Starter values are approximate per 100 g/ml values for a general fallback
# database. They are intentionally generic, not branded/verified product data.
FOODS = [
    # Danish/common groceries
    {"name": "Rugbrod", "brand": "Generic DK", "price": 18, "base_amount": 500, "base_unit": "g", "protein": 6.0, "carbs": 41.0, "fat": 2.0, "fiber": 8.0},
    {"name": "Havregryn", "brand": "Generic DK", "price": 14, "base_amount": 1000, "base_unit": "g", "protein": 13.0, "carbs": 58.0, "fat": 7.0, "fiber": 10.0},
    {"name": "Kartofler", "brand": "Generic DK", "price": 18, "base_amount": 2000, "base_unit": "g", "protein": 1.9, "carbs": 17.0, "fat": 0.1, "fiber": 1.8},
    {"name": "Ris, kogt", "brand": "Generic", "price": 18, "base_amount": 1000, "base_unit": "g", "protein": 2.7, "carbs": 28.0, "fat": 0.3, "fiber": 0.4},
    {"name": "Pasta, kogt", "brand": "Generic", "price": 15, "base_amount": 500, "base_unit": "g", "protein": 5.0, "carbs": 25.0, "fat": 1.1, "fiber": 1.8},
    {"name": "Kyllingebryst", "brand": "Generic DK", "price": 55, "base_amount": 500, "base_unit": "g", "protein": 23.0, "carbs": 0.0, "fat": 2.0},
    {"name": "Hakket oksekod 10%", "brand": "Generic DK", "price": 42, "base_amount": 400, "base_unit": "g", "protein": 20.0, "carbs": 0.0, "fat": 10.0},
    {"name": "Svinekam", "brand": "Generic DK", "price": 45, "base_amount": 500, "base_unit": "g", "protein": 21.0, "carbs": 0.0, "fat": 6.0},
    {"name": "Laks", "brand": "Generic DK", "price": 55, "base_amount": 250, "base_unit": "g", "protein": 20.0, "carbs": 0.0, "fat": 13.0},
    {"name": "Tun i vand", "brand": "Generic DK", "price": 12, "base_amount": 140, "base_unit": "g", "protein": 24.0, "carbs": 0.0, "fat": 1.0},
    {"name": "Makrel i tomat", "brand": "Generic DK", "price": 14, "base_amount": 125, "base_unit": "g", "protein": 13.0, "carbs": 5.0, "fat": 12.0},
    {"name": "AEg", "brand": "Generic DK", "price": 28, "base_amount": 600, "base_unit": "g", "protein": 13.0, "carbs": 1.0, "fat": 10.0},
    {"name": "Skummetmaelk", "brand": "Generic DK", "price": 11, "base_amount": 1000, "base_unit": "ml", "protein": 3.5, "carbs": 4.8, "fat": 0.2},
    {"name": "Letmaelk", "brand": "Generic DK", "price": 12, "base_amount": 1000, "base_unit": "ml", "protein": 3.5, "carbs": 4.8, "fat": 1.5},
    {"name": "Sodmaelk", "brand": "Generic DK", "price": 13, "base_amount": 1000, "base_unit": "ml", "protein": 3.4, "carbs": 4.7, "fat": 3.5},
    {"name": "Skyr naturel", "brand": "Generic DK", "price": 22, "base_amount": 1000, "base_unit": "g", "protein": 11.0, "carbs": 3.8, "fat": 0.2},
    {"name": "Yoghurt naturel", "brand": "Generic DK", "price": 18, "base_amount": 1000, "base_unit": "g", "protein": 4.0, "carbs": 5.0, "fat": 1.5},
    {"name": "Hytteost", "brand": "Generic DK", "price": 18, "base_amount": 250, "base_unit": "g", "protein": 12.0, "carbs": 2.0, "fat": 4.0},
    {"name": "Ost 45+", "brand": "Generic DK", "price": 38, "base_amount": 400, "base_unit": "g", "protein": 25.0, "carbs": 1.0, "fat": 27.0},
    {"name": "Leverpostej", "brand": "Generic DK", "price": 15, "base_amount": 200, "base_unit": "g", "protein": 11.0, "carbs": 5.0, "fat": 20.0},
    {"name": "Smor", "brand": "Generic DK", "price": 24, "base_amount": 200, "base_unit": "g", "protein": 0.5, "carbs": 0.5, "fat": 82.0},
    {"name": "Rapsolie", "brand": "Generic DK", "price": 24, "base_amount": 1000, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 100.0},
    {"name": "Olivenolie", "brand": "Generic", "price": 55, "base_amount": 500, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 100.0},
    {"name": "Banan", "brand": "Generic", "price": 3, "base_amount": 120, "base_unit": "g", "protein": 1.1, "carbs": 22.8, "fat": 0.3, "fiber": 2.6},
    {"name": "AEble", "brand": "Generic DK", "price": 3, "base_amount": 150, "base_unit": "g", "protein": 0.3, "carbs": 11.0, "fat": 0.2, "fiber": 2.4},
    {"name": "Gulerod", "brand": "Generic DK", "price": 10, "base_amount": 1000, "base_unit": "g", "protein": 0.9, "carbs": 9.6, "fat": 0.2, "fiber": 2.8},
    {"name": "Broccoli", "brand": "Generic", "price": 16, "base_amount": 500, "base_unit": "g", "protein": 2.8, "carbs": 6.6, "fat": 0.4, "fiber": 2.6},
    {"name": "Agurk", "brand": "Generic", "price": 10, "base_amount": 350, "base_unit": "g", "protein": 0.7, "carbs": 3.6, "fat": 0.1, "fiber": 0.5},
    {"name": "Tomat", "brand": "Generic", "price": 16, "base_amount": 500, "base_unit": "g", "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2},
    {"name": "Log", "brand": "Generic", "price": 8, "base_amount": 500, "base_unit": "g", "protein": 1.1, "carbs": 9.3, "fat": 0.1, "fiber": 1.7},
    {"name": "Avocado", "brand": "Generic", "price": 10, "base_amount": 150, "base_unit": "g", "protein": 2.0, "carbs": 8.5, "fat": 14.7, "fiber": 6.7},
    {"name": "Mandler", "brand": "Generic", "price": 35, "base_amount": 200, "base_unit": "g", "protein": 21.0, "carbs": 22.0, "fat": 50.0, "fiber": 12.0},
    {"name": "Peanutbutter", "brand": "Generic", "price": 28, "base_amount": 350, "base_unit": "g", "protein": 25.0, "carbs": 20.0, "fat": 50.0, "fiber": 6.0},
    {"name": "Kidneybonner", "brand": "Generic", "price": 10, "base_amount": 240, "base_unit": "g", "protein": 8.7, "carbs": 22.8, "fat": 0.5, "fiber": 6.4},
    {"name": "Kikaerter", "brand": "Generic", "price": 10, "base_amount": 240, "base_unit": "g", "protein": 8.9, "carbs": 27.4, "fat": 2.6, "fiber": 7.6},
    {"name": "Linser, kogte", "brand": "Generic", "price": 16, "base_amount": 500, "base_unit": "g", "protein": 9.0, "carbs": 20.0, "fat": 0.4, "fiber": 8.0},
    {"name": "Protein bar", "brand": "Generic", "price": 25, "base_amount": 60, "base_unit": "g", "protein": 20.0, "carbs": 50.0, "fat": 8.0, "fiber": 4.0},
    # Drink ingredients and mixers
    {"name": "Vodka 40%", "brand": "Generic", "price": 150, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 40.0},
    {"name": "Gin 40%", "brand": "Generic", "price": 180, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 40.0},
    {"name": "Rom lys 37.5%", "brand": "Generic", "price": 160, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 37.5},
    {"name": "Tequila 38%", "brand": "Generic", "price": 180, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 38.0},
    {"name": "Whisky 40%", "brand": "Generic", "price": 190, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 40.0},
    {"name": "Triple sec 40%", "brand": "Generic", "price": 130, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 25.0, "fat": 0.0, "alcohol": 40.0},
    {"name": "Kahlua", "brand": "Generic", "price": 140, "base_amount": 700, "base_unit": "ml", "protein": 0.4, "carbs": 27.0, "fat": 0.0, "alcohol": 20.0},
    {"name": "Campari", "brand": "Generic", "price": 140, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 24.0, "fat": 0.0, "alcohol": 25.0},
    {"name": "Sweet vermouth", "brand": "Generic", "price": 80, "base_amount": 750, "base_unit": "ml", "protein": 0.0, "carbs": 14.0, "fat": 0.0, "alcohol": 15.0},
    {"name": "Prosecco", "brand": "Generic", "price": 75, "base_amount": 750, "base_unit": "ml", "protein": 0.0, "carbs": 2.0, "fat": 0.0, "alcohol": 11.0},
    {"name": "Orange Juice", "brand": "Generic", "price": 20, "base_amount": 1000, "base_unit": "ml", "protein": 0.7, "carbs": 8.0, "fat": 0.2},
    {"name": "Cranberry Juice", "brand": "Generic", "price": 18, "base_amount": 1000, "base_unit": "ml", "protein": 0.1, "carbs": 12.0, "fat": 0.0},
    {"name": "Pineapple Juice", "brand": "Generic", "price": 20, "base_amount": 1000, "base_unit": "ml", "protein": 0.4, "carbs": 13.0, "fat": 0.1},
    {"name": "Cola", "brand": "Generic", "price": 15, "base_amount": 1500, "base_unit": "ml", "protein": 0.0, "carbs": 10.6, "fat": 0.0, "caffeine": 8.0},
    {"name": "Tonic Water", "brand": "Generic", "price": 12, "base_amount": 1000, "base_unit": "ml", "protein": 0.0, "carbs": 9.0, "fat": 0.0},
    {"name": "Ginger Beer", "brand": "Generic", "price": 12, "base_amount": 1000, "base_unit": "ml", "protein": 0.0, "carbs": 10.0, "fat": 0.0},
    {"name": "Sodavand lemon-lime", "brand": "Generic", "price": 15, "base_amount": 1500, "base_unit": "ml", "protein": 0.0, "carbs": 10.0, "fat": 0.0},
    {"name": "Danskvand", "brand": "Generic DK", "price": 8, "base_amount": 1500, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0},
    {"name": "Lime Juice", "brand": "Generic", "price": 15, "base_amount": 1000, "base_unit": "ml", "protein": 0.4, "carbs": 6.9, "fat": 0.1},
    {"name": "Lemon Juice", "brand": "Generic", "price": 15, "base_amount": 1000, "base_unit": "ml", "protein": 0.4, "carbs": 6.0, "fat": 0.2},
    {"name": "Sugar Syrup", "brand": "Generic", "price": 10, "base_amount": 500, "base_unit": "ml", "protein": 0.0, "carbs": 65.0, "fat": 0.0},
    {"name": "Mint", "brand": "Generic", "price": 15, "base_amount": 30, "base_unit": "g", "protein": 3.8, "carbs": 14.9, "fat": 0.9, "fiber": 8.0},
    {"name": "Espresso", "brand": "Generic", "price": 3.5, "base_amount": 100, "base_unit": "ml", "protein": 0.1, "carbs": 0.0, "fat": 0.0, "caffeine": 65.0},
    {"name": "Egg Whites", "brand": "Generic", "price": 30, "base_amount": 1000, "base_unit": "g", "protein": 10.9, "carbs": 0.7, "fat": 0.2},
]


DRINKS = [
    {"name": "Screwdriver", "ingredients": [("Vodka 40%", 40, "ml"), ("Orange Juice", 120, "ml")]},
    {"name": "Gin and Tonic", "ingredients": [("Gin 40%", 50, "ml"), ("Tonic Water", 150, "ml"), ("Lime Juice", 5, "ml")]},
    {"name": "Moscow Mule", "ingredients": [("Vodka 40%", 50, "ml"), ("Ginger Beer", 150, "ml"), ("Lime Juice", 15, "ml")]},
    {"name": "Mojito", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Lime Juice", 25, "ml"), ("Sugar Syrup", 20, "ml"), ("Danskvand", 100, "ml"), ("Mint", 2, "g")]},
    {"name": "Margarita", "ingredients": [("Tequila 38%", 50, "ml"), ("Triple sec 40%", 25, "ml"), ("Lime Juice", 25, "ml")]},
    {"name": "Cosmopolitan", "ingredients": [("Vodka 40%", 40, "ml"), ("Triple sec 40%", 15, "ml"), ("Cranberry Juice", 30, "ml"), ("Lime Juice", 15, "ml")]},
    {"name": "Espresso Martini", "ingredients": [("Vodka 40%", 40, "ml"), ("Kahlua", 20, "ml"), ("Espresso", 30, "ml"), ("Sugar Syrup", 10, "ml")]},
    {"name": "Whisky Sour", "ingredients": [("Whisky 40%", 50, "ml"), ("Lemon Juice", 25, "ml"), ("Sugar Syrup", 20, "ml"), ("Egg Whites", 20, "g")]},
    {"name": "Daiquiri", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Lime Juice", 25, "ml"), ("Sugar Syrup", 15, "ml")]},
    {"name": "Negroni", "ingredients": [("Gin 40%", 30, "ml"), ("Campari", 30, "ml"), ("Sweet vermouth", 30, "ml")]},
    {"name": "Aperol Spritz", "ingredients": [("Prosecco", 90, "ml"), ("Danskvand", 30, "ml")]},
    {"name": "Cuba Libre", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Cola", 120, "ml"), ("Lime Juice", 10, "ml")]},
    {"name": "Tequila Sunrise", "ingredients": [("Tequila 38%", 50, "ml"), ("Orange Juice", 120, "ml")]},
    {"name": "Vodka Cranberry", "ingredients": [("Vodka 40%", 40, "ml"), ("Cranberry Juice", 120, "ml"), ("Lime Juice", 10, "ml")]},
    {"name": "Pina Colada Simple", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Pineapple Juice", 120, "ml"), ("Sugar Syrup", 15, "ml")]},
]


DRINK_LISTS = [
    {"name": "Starter Cocktail Party", "items": [("Gin and Tonic", 6), ("Moscow Mule", 6), ("Margarita", 6), ("Espresso Martini", 4)]},
    {"name": "Vodka Classics", "items": [("Screwdriver", 6), ("Cosmopolitan", 6), ("Vodka Cranberry", 6), ("Espresso Martini", 4)]},
]


def get_or_create_nutrient(session, name, unit):
    nutrient = session.query(Nutrient).filter(Nutrient.name == name).first()
    if nutrient:
        nutrient.unit = unit
        return nutrient

    nutrient = Nutrient(name=name, unit=unit)
    session.add(nutrient)
    session.flush()
    return nutrient


def get_or_create_food(session, data):
    food = session.query(Food).filter(Food.name == data["name"], Food.brand == data.get("brand")).first()
    if not food:
        food = Food(name=data["name"], brand=data.get("brand"))
        session.add(food)
        session.flush()

    food.price = data.get("price")
    food.base_amount = data.get("base_amount")
    food.base_unit = data.get("base_unit")
    if data.get("barcode"):
        food.barcode = data["barcode"]
    return food


def set_food_nutrients(session, food, data, nutrients_by_name):
    for nutrient_key, nutrient_name in {
        "protein": "Protein",
        "carbs": "Carbs",
        "fat": "Fat",
        "alcohol": "Alcohol",
        "fiber": "Fiber",
        "sodium": "Sodium",
        "caffeine": "Caffeine",
    }.items():
        amount = data.get(nutrient_key)
        if amount is None:
            continue

        nutrient = nutrients_by_name[nutrient_name]
        link = session.query(FoodNutrient).filter(
            FoodNutrient.food_id == food.id,
            FoodNutrient.nutrient_id == nutrient.id,
        ).first()
        if not link:
            link = FoodNutrient(food_id=food.id, nutrient_id=nutrient.id)
            session.add(link)
        link.amount_per_100g = amount


def get_or_create_drink(session, name):
    drink = session.query(Drink).filter(Drink.name == name).first()
    if drink:
        return drink

    drink = Drink(name=name)
    session.add(drink)
    session.flush()
    return drink


def set_drink_ingredients(session, drink, ingredients, foods_by_name):
    wanted_food_ids = []
    for food_name, amount, unit in ingredients:
        food = foods_by_name[food_name]
        wanted_food_ids.append(food.id)
        item = session.query(DrinkIngredient).filter(
            DrinkIngredient.drink_id == drink.id,
            DrinkIngredient.food_id == food.id,
        ).first()
        if not item:
            item = DrinkIngredient(drink_id=drink.id, food_id=food.id)
            session.add(item)
        item.amount = amount
        item.unit = unit

    extras = session.query(DrinkIngredient).filter(
        DrinkIngredient.drink_id == drink.id,
        ~DrinkIngredient.food_id.in_(wanted_food_ids),
    ).all()
    for extra in extras:
        session.delete(extra)


def get_or_create_drink_list(session, name):
    drink_list = session.query(DrinkList).filter(DrinkList.name == name).first()
    if drink_list:
        return drink_list

    drink_list = DrinkList(name=name)
    session.add(drink_list)
    session.flush()
    return drink_list


def set_drink_list_items(session, drink_list, items, drinks_by_name):
    wanted_drink_ids = []
    for drink_name, quantity in items:
        drink = drinks_by_name[drink_name]
        wanted_drink_ids.append(drink.id)
        item = session.query(DrinkListItem).filter(
            DrinkListItem.list_id == drink_list.id,
            DrinkListItem.drink_id == drink.id,
        ).first()
        if not item:
            item = DrinkListItem(list_id=drink_list.id, drink_id=drink.id)
            session.add(item)
        item.quantity = quantity

    extras = session.query(DrinkListItem).filter(
        DrinkListItem.list_id == drink_list.id,
        ~DrinkListItem.drink_id.in_(wanted_drink_ids),
    ).all()
    for extra in extras:
        session.delete(extra)


def seed_starter_database():
    session = SessionLocal()
    try:
        nutrients_by_name = {
            name: get_or_create_nutrient(session, name, unit)
            for name, unit in NUTRIENTS
        }
        session.commit()

        foods_by_name = {}
        for food_data in FOODS:
            food = get_or_create_food(session, food_data)
            set_food_nutrients(session, food, food_data, nutrients_by_name)
            foods_by_name[food.name] = food
        session.commit()

        drinks_by_name = {}
        for drink_data in DRINKS:
            drink = get_or_create_drink(session, drink_data["name"])
            set_drink_ingredients(session, drink, drink_data["ingredients"], foods_by_name)
            drinks_by_name[drink.name] = drink
        session.commit()

        for list_data in DRINK_LISTS:
            drink_list = get_or_create_drink_list(session, list_data["name"])
            set_drink_list_items(session, drink_list, list_data["items"], drinks_by_name)
        session.commit()

        if not session.query(Meal).filter(Meal.name == "Starter Danish Breakfast").first():
            breakfast = Meal(name="Starter Danish Breakfast")
            session.add(breakfast)
            session.flush()
            for food_name, amount, unit in [
                ("Rugbrod", 100, "g"),
                ("AEg", 60, "g"),
                ("Skyr naturel", 150, "g"),
            ]:
                session.add(MealItem(meal_id=breakfast.id, food_id=foods_by_name[food_name].id, amount=amount, unit=unit))

        if not session.query(Garnish).filter(Garnish.name == "Lime wedge").first():
            session.add_all([
                Garnish(name="Lime wedge"),
                Garnish(name="Lemon twist"),
                Garnish(name="Mint sprig"),
            ])

        if not session.query(IntakeEntry).first():
            meal = session.query(Meal).filter(Meal.name == "Starter Danish Breakfast").first()
            if meal:
                session.add(
                    IntakeEntry(
                        intake_date=date.today(),
                        meal_id=meal.id,
                        description=f"Sample intake for {meal.name}",
                        protein=25.0,
                        carbs=55.0,
                        fat=13.0,
                        calories=round(25.0 * 4 + 55.0 * 4 + 13.0 * 9, 1),
                    )
                )
        session.commit()

        print(
            "Starter database seeded: "
            f"{len(FOODS)} foods, {len(DRINKS)} drinks, {len(DRINK_LISTS)} drink lists."
        )
    finally:
        session.close()


if __name__ == "__main__":
    seed_starter_database()
