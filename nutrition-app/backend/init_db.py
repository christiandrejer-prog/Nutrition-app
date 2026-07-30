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
from app.models.drink_garnish import DrinkGarnish
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
    {"name": "Dry Vermouth", "brand": "Generic", "price": 85, "base_amount": 750, "base_unit": "ml", "protein": 0.0, "carbs": 3.0, "fat": 0.0, "alcohol": 18.0},
    {"name": "Angostura Bitters", "brand": "Generic", "price": 95, "base_amount": 200, "base_unit": "ml", "protein": 0.0, "carbs": 5.0, "fat": 0.0, "alcohol": 44.7},
    {"name": "Amaretto", "brand": "Generic", "price": 150, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 28.0, "fat": 0.0, "alcohol": 28.0},
    {"name": "Baileys Irish Cream", "brand": "Generic", "price": 160, "base_amount": 700, "base_unit": "ml", "protein": 1.5, "carbs": 17.0, "fat": 11.0, "alcohol": 17.0},
    {"name": "Flode 38%", "brand": "Generic DK", "price": 20, "base_amount": 250, "base_unit": "ml", "protein": 2.1, "carbs": 3.0, "fat": 38.0},
    {"name": "Rom mork 40%", "brand": "Generic", "price": 165, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 0.0, "fat": 0.0, "alcohol": 40.0},
    {"name": "Grenadine", "brand": "Generic", "price": 45, "base_amount": 500, "base_unit": "ml", "protein": 0.0, "carbs": 65.0, "fat": 0.0},
    {"name": "Blue Curacao", "brand": "Generic", "price": 130, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 30.0, "fat": 0.0, "alcohol": 20.0},
    {"name": "Peach Schnapps", "brand": "Generic", "price": 130, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 20.0, "fat": 0.0, "alcohol": 20.0},
    {"name": "Grapefruit Juice", "brand": "Generic", "price": 22, "base_amount": 1000, "base_unit": "ml", "protein": 0.5, "carbs": 8.0, "fat": 0.1},
    {"name": "Aperol", "brand": "Generic", "price": 140, "base_amount": 700, "base_unit": "ml", "protein": 0.0, "carbs": 26.0, "fat": 0.0, "alcohol": 11.0},
    {"name": "Coconut Cream", "brand": "Generic", "price": 22, "base_amount": 400, "base_unit": "ml", "protein": 1.9, "carbs": 7.0, "fat": 20.0},
    # Garnish source items - also usable directly in the Meal Dashboard
    {"name": "Lime", "brand": "Generic", "price": 3.5, "base_amount": 1, "base_unit": "piece"},
    {"name": "Lemon", "brand": "Generic", "price": 3, "base_amount": 1, "base_unit": "piece"},
    {"name": "Mint bunch", "brand": "Generic", "price": 18, "base_amount": 1, "base_unit": "piece"},
    {"name": "Orange", "brand": "Generic", "price": 4, "base_amount": 1, "base_unit": "piece"},
    {"name": "Cherry jar", "brand": "Generic", "price": 32, "base_amount": 1, "base_unit": "piece"},
    {"name": "Olive jar", "brand": "Generic", "price": 28, "base_amount": 1, "base_unit": "piece"},
]


GARNISHES = [
    {"name": "Lime wedge", "source_food": "Lime", "unit_name": "piece", "yield_per_source": 8, "default_essential": False},
    {"name": "Lemon twist", "source_food": "Lemon", "unit_name": "piece", "yield_per_source": 8, "default_essential": False},
    {"name": "Mint sprig", "source_food": "Mint bunch", "unit_name": "piece", "yield_per_source": 20, "default_essential": False},
    {"name": "Orange slice", "source_food": "Orange", "unit_name": "piece", "yield_per_source": 8, "default_essential": False},
    {"name": "Cherry", "source_food": "Cherry jar", "unit_name": "piece", "yield_per_source": 25, "default_essential": False},
    {"name": "Olive", "source_food": "Olive jar", "unit_name": "piece", "yield_per_source": 30, "default_essential": False},
]


DRINKS = [
    {"name": "Screwdriver", "ingredients": [("Vodka 40%", 40, "ml"), ("Orange Juice", 120, "ml")],
     "instructions": "Chill a highball glass with ice.\nPour 4cl vodka over ice.\nTop with orange juice.\nStir gently and serve."},
    {"name": "Gin and Tonic", "ingredients": [("Gin 40%", 50, "ml"), ("Tonic Water", 150, "ml"), ("Lime Juice", 5, "ml")],
     "instructions": "Fill a highball glass with ice.\nPour 5cl gin over the ice.\nTop with tonic water.\nAdd a squeeze of lime juice and stir gently."},
    {"name": "Moscow Mule", "ingredients": [("Vodka 40%", 50, "ml"), ("Ginger Beer", 150, "ml"), ("Lime Juice", 15, "ml")],
     "instructions": "Fill a copper mug or highball glass with ice.\nAdd vodka and lime juice.\nTop with ginger beer.\nStir gently and serve."},
    {"name": "Mojito", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Lime Juice", 25, "ml"), ("Sugar Syrup", 20, "ml"), ("Danskvand", 100, "ml"), ("Mint", 2, "g")],
     "instructions": "Muddle mint leaves gently with sugar syrup and lime juice in a highball glass.\nFill the glass with crushed ice.\nAdd rum and stir well.\nTop with soda water and stir again.\nGarnish with a mint sprig."},
    {"name": "Margarita", "ingredients": [("Tequila 38%", 50, "ml"), ("Triple sec 40%", 25, "ml"), ("Lime Juice", 25, "ml")],
     "instructions": "Rim a rocks glass with salt (optional).\nShake tequila, triple sec, and lime juice with ice.\nStrain into the glass over fresh ice.\nGarnish with a lime wedge."},
    {"name": "Cosmopolitan", "ingredients": [("Vodka 40%", 40, "ml"), ("Triple sec 40%", 15, "ml"), ("Cranberry Juice", 30, "ml"), ("Lime Juice", 15, "ml")],
     "instructions": "Shake all ingredients with ice until well chilled.\nDouble strain into a chilled martini glass.\nGarnish with a lime wheel or twist."},
    {"name": "Espresso Martini", "ingredients": [("Vodka 40%", 40, "ml"), ("Kahlua", 20, "ml"), ("Espresso", 30, "ml"), ("Sugar Syrup", 10, "ml")],
     "instructions": "Brew a fresh shot of espresso and let it cool slightly.\nShake vodka, Kahlua, espresso, and sugar syrup hard with ice.\nDouble strain into a chilled martini glass.\nServe promptly while the foam is fresh."},
    {"name": "Whisky Sour", "ingredients": [("Whisky 40%", 50, "ml"), ("Lemon Juice", 25, "ml"), ("Sugar Syrup", 20, "ml"), ("Egg Whites", 20, "g")],
     "instructions": "Dry shake whisky, lemon juice, sugar syrup, and egg white (no ice) to build foam.\nAdd ice and shake again until chilled.\nStrain into a rocks glass over fresh ice.\nGarnish with a cherry."},
    {"name": "Daiquiri", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Lime Juice", 25, "ml"), ("Sugar Syrup", 15, "ml")],
     "instructions": "Shake rum, lime juice, and sugar syrup hard with ice.\nDouble strain into a chilled coupe glass.\nGarnish with a lime wheel."},
    {"name": "Negroni", "ingredients": [("Gin 40%", 30, "ml"), ("Campari", 30, "ml"), ("Sweet vermouth", 30, "ml")],
     "instructions": "Fill a rocks glass with ice.\nAdd gin, Campari, and sweet vermouth.\nStir gently until chilled.\nGarnish with an orange slice."},
    {"name": "Aperol Spritz", "ingredients": [("Prosecco", 90, "ml"), ("Aperol", 60, "ml"), ("Danskvand", 30, "ml")],
     "instructions": "Fill a wine glass with ice.\nPour prosecco, then Aperol.\nTop with a splash of soda water.\nStir gently and garnish with an orange slice."},
    {"name": "Cuba Libre", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Cola", 120, "ml"), ("Lime Juice", 10, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd rum and lime juice.\nTop with cola and stir gently.\nGarnish with a lime wedge."},
    {"name": "Tequila Sunrise", "ingredients": [("Tequila 38%", 50, "ml"), ("Orange Juice", 120, "ml"), ("Grenadine", 10, "ml")],
     "instructions": "Fill a highball glass with ice.\nPour tequila and orange juice, and stir.\nSlowly pour grenadine down the side of the glass so it settles at the bottom.\nGarnish with a cherry - do not stir, to keep the sunrise effect."},
    {"name": "Vodka Cranberry", "ingredients": [("Vodka 40%", 40, "ml"), ("Cranberry Juice", 120, "ml"), ("Lime Juice", 10, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd vodka, cranberry juice, and lime juice.\nStir gently and garnish with a lime wedge."},
    {"name": "Pina Colada Simple", "ingredients": [("Rom lys 37.5%", 50, "ml"), ("Pineapple Juice", 120, "ml"), ("Sugar Syrup", 15, "ml")],
     "instructions": "Blend rum, pineapple juice, and sugar syrup with a cup of ice until smooth.\nPour into a hurricane glass.\nGarnish with a cherry."},
    {"name": "Martini", "ingredients": [("Gin 40%", 60, "ml"), ("Dry Vermouth", 10, "ml")],
     "instructions": "Stir gin and dry vermouth with ice until very cold.\nStrain into a chilled martini glass.\nGarnish with an olive (or a lemon twist for a dry martini)."},
    {"name": "Manhattan", "ingredients": [("Whisky 40%", 60, "ml"), ("Sweet vermouth", 20, "ml"), ("Angostura Bitters", 2, "ml")],
     "instructions": "Stir whisky, sweet vermouth, and bitters with ice until well chilled.\nStrain into a chilled coupe glass.\nGarnish with a cherry."},
    {"name": "Old Fashioned", "ingredients": [("Whisky 40%", 60, "ml"), ("Sugar Syrup", 10, "ml"), ("Angostura Bitters", 2, "ml")],
     "instructions": "Add sugar syrup and bitters to a rocks glass.\nAdd whisky and one large ice cube.\nStir until well chilled.\nGarnish with an orange slice and a cherry."},
    {"name": "White Russian", "ingredients": [("Vodka 40%", 50, "ml"), ("Kahlua", 20, "ml"), ("Flode 38%", 20, "ml")],
     "instructions": "Fill a rocks glass with ice.\nAdd vodka and Kahlua, stir.\nGently float the cream on top by pouring over the back of a spoon.\nServe without stirring further."},
    {"name": "Black Russian", "ingredients": [("Vodka 40%", 50, "ml"), ("Kahlua", 20, "ml")],
     "instructions": "Fill a rocks glass with ice.\nAdd vodka and Kahlua.\nStir gently and serve."},
    {"name": "Amaretto Sour", "ingredients": [("Amaretto", 45, "ml"), ("Lemon Juice", 25, "ml"), ("Sugar Syrup", 10, "ml"), ("Egg Whites", 15, "g")],
     "instructions": "Dry shake amaretto, lemon juice, sugar syrup, and egg white (no ice) to build foam.\nAdd ice and shake again until chilled.\nStrain into a rocks glass over fresh ice.\nGarnish with a cherry."},
    {"name": "Godfather", "ingredients": [("Whisky 40%", 45, "ml"), ("Amaretto", 15, "ml")],
     "instructions": "Fill a rocks glass with ice.\nAdd whisky and amaretto.\nStir gently and serve."},
    {"name": "Mai Tai", "ingredients": [("Rom lys 37.5%", 30, "ml"), ("Rom mork 40%", 30, "ml"), ("Triple sec 40%", 15, "ml"), ("Lime Juice", 25, "ml"), ("Sugar Syrup", 10, "ml")],
     "instructions": "Shake light rum, triple sec, lime juice, and sugar syrup with ice.\nStrain into a rocks glass filled with crushed ice.\nFloat the dark rum on top.\nGarnish with a mint sprig."},
    {"name": "Dark 'n Stormy", "ingredients": [("Rom mork 40%", 50, "ml"), ("Ginger Beer", 120, "ml"), ("Lime Juice", 5, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd lime juice and top with ginger beer.\nFloat the dark rum on top by pouring slowly over a spoon.\nGarnish with a lime wedge."},
    {"name": "Zombie", "ingredients": [("Rom lys 37.5%", 30, "ml"), ("Rom mork 40%", 30, "ml"), ("Triple sec 40%", 15, "ml"), ("Lime Juice", 20, "ml"), ("Pineapple Juice", 30, "ml"), ("Sugar Syrup", 10, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a hurricane glass filled with crushed ice.\nGarnish with a mint sprig."},
    {"name": "Sex on the Beach", "ingredients": [("Vodka 40%", 40, "ml"), ("Peach Schnapps", 20, "ml"), ("Cranberry Juice", 40, "ml"), ("Orange Juice", 40, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd vodka and peach schnapps.\nTop with cranberry juice and orange juice.\nStir gently and garnish with an orange slice."},
    {"name": "Fuzzy Navel", "ingredients": [("Peach Schnapps", 45, "ml"), ("Orange Juice", 90, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd peach schnapps and top with orange juice.\nStir gently and serve."},
    {"name": "Blue Lagoon", "ingredients": [("Vodka 40%", 40, "ml"), ("Blue Curacao", 20, "ml"), ("Sodavand lemon-lime", 90, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd vodka and blue curacao.\nTop with lemon-lime soda and stir gently.\nGarnish with a cherry."},
    {"name": "Long Island Iced Tea", "ingredients": [("Vodka 40%", 15, "ml"), ("Gin 40%", 15, "ml"), ("Rom lys 37.5%", 15, "ml"), ("Tequila 38%", 15, "ml"), ("Triple sec 40%", 15, "ml"), ("Lemon Juice", 25, "ml"), ("Cola", 30, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd vodka, gin, rum, tequila, triple sec, and lemon juice.\nStir gently and top with a splash of cola for color.\nGarnish with a lemon twist."},
    {"name": "Mimosa", "ingredients": [("Prosecco", 75, "ml"), ("Orange Juice", 75, "ml")],
     "instructions": "Pour chilled prosecco into a champagne flute.\nTop with an equal amount of chilled orange juice.\nStir very gently and serve immediately."},
    {"name": "French 75", "ingredients": [("Gin 40%", 30, "ml"), ("Lemon Juice", 15, "ml"), ("Sugar Syrup", 10, "ml"), ("Prosecco", 60, "ml")],
     "instructions": "Shake gin, lemon juice, and sugar syrup with ice.\nStrain into a champagne flute.\nTop with prosecco.\nGarnish with a lemon twist."},
    {"name": "Paloma", "ingredients": [("Tequila 38%", 50, "ml"), ("Grapefruit Juice", 90, "ml"), ("Danskvand", 30, "ml"), ("Lime Juice", 10, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd tequila, grapefruit juice, and lime juice.\nTop with soda water and stir gently.\nGarnish with a lime wedge."},
    {"name": "Salty Dog", "ingredients": [("Vodka 40%", 50, "ml"), ("Grapefruit Juice", 120, "ml")],
     "instructions": "Rim a highball glass with salt (optional).\nFill the glass with ice.\nAdd vodka and top with grapefruit juice.\nStir gently and serve."},
    {"name": "Sea Breeze", "ingredients": [("Vodka 40%", 40, "ml"), ("Cranberry Juice", 80, "ml"), ("Grapefruit Juice", 40, "ml")],
     "instructions": "Fill a highball glass with ice.\nAdd vodka, cranberry juice, and grapefruit juice.\nStir gently and garnish with a lime wedge."},
    {"name": "Tom Collins", "ingredients": [("Gin 40%", 45, "ml"), ("Lemon Juice", 25, "ml"), ("Sugar Syrup", 15, "ml"), ("Danskvand", 90, "ml")],
     "instructions": "Shake gin, lemon juice, and sugar syrup with ice.\nStrain into a highball glass filled with ice.\nTop with soda water and stir gently.\nGarnish with a cherry and a lemon twist."},
    # Maritime / nautical theme - rum-forward, tiki, and sailor's classics
    {"name": "Painkiller", "ingredients": [("Rom mork 40%", 60, "ml"), ("Pineapple Juice", 120, "ml"), ("Orange Juice", 30, "ml"), ("Coconut Cream", 30, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a hurricane glass filled with crushed ice.\nGarnish with an orange slice."},
    {"name": "Navy Grog", "ingredients": [("Rom mork 40%", 30, "ml"), ("Rom lys 37.5%", 30, "ml"), ("Lime Juice", 15, "ml"), ("Grapefruit Juice", 30, "ml"), ("Sugar Syrup", 15, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a rocks glass filled with crushed ice.\nGarnish with a lime wedge."},
    {"name": "Hurricane", "ingredients": [("Rom lys 37.5%", 30, "ml"), ("Rom mork 40%", 30, "ml"), ("Orange Juice", 30, "ml"), ("Pineapple Juice", 30, "ml"), ("Lime Juice", 15, "ml"), ("Grenadine", 15, "ml"), ("Sugar Syrup", 10, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a hurricane glass filled with ice.\nGarnish with a cherry and an orange slice."},
    {"name": "Rum Runner", "ingredients": [("Rom lys 37.5%", 30, "ml"), ("Rom mork 40%", 15, "ml"), ("Pineapple Juice", 60, "ml"), ("Orange Juice", 30, "ml"), ("Grenadine", 15, "ml"), ("Lime Juice", 15, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a hurricane glass filled with crushed ice.\nGarnish with a cherry."},
    {"name": "Bahama Mama", "ingredients": [("Rom lys 37.5%", 30, "ml"), ("Rom mork 40%", 15, "ml"), ("Kahlua", 15, "ml"), ("Pineapple Juice", 60, "ml"), ("Orange Juice", 30, "ml"), ("Grenadine", 10, "ml")],
     "instructions": "Shake all ingredients hard with ice.\nStrain into a hurricane glass filled with crushed ice.\nGarnish with a cherry and an orange slice."},
    {"name": "Blue Hawaiian", "ingredients": [("Rom lys 37.5%", 45, "ml"), ("Blue Curacao", 30, "ml"), ("Pineapple Juice", 90, "ml"), ("Coconut Cream", 30, "ml")],
     "instructions": "Blend all ingredients with a cup of ice until smooth.\nPour into a hurricane glass.\nGarnish with a cherry."},
]


# (garnish_name, quantity_per_serving, essential) per drink. Essential means the
# drink isn't considered makeable without it (e.g. muddled mint in a Mojito);
# everything else is a decorative, overridable-by-toggle garnish.
DRINK_GARNISHES = {
    "Screwdriver": [("Orange slice", 1, False)],
    "Gin and Tonic": [("Lime wedge", 1, False)],
    "Moscow Mule": [("Lime wedge", 1, False)],
    "Mojito": [("Mint sprig", 1, True)],
    "Margarita": [("Lime wedge", 1, False)],
    "Cosmopolitan": [("Lime wedge", 1, False)],
    "Whisky Sour": [("Cherry", 1, False)],
    "Daiquiri": [("Lime wedge", 1, False)],
    "Negroni": [("Orange slice", 1, False)],
    "Aperol Spritz": [("Orange slice", 1, False)],
    "Cuba Libre": [("Lime wedge", 1, False)],
    "Tequila Sunrise": [("Cherry", 1, False)],
    "Vodka Cranberry": [("Lime wedge", 1, False)],
    "Pina Colada Simple": [("Cherry", 1, False)],
    "Martini": [("Olive", 1, False)],
    "Manhattan": [("Cherry", 1, False)],
    "Old Fashioned": [("Orange slice", 1, False), ("Cherry", 1, False)],
    "Amaretto Sour": [("Cherry", 1, False)],
    "Mai Tai": [("Mint sprig", 1, False)],
    "Dark 'n Stormy": [("Lime wedge", 1, False)],
    "Zombie": [("Mint sprig", 1, False)],
    "Sex on the Beach": [("Orange slice", 1, False)],
    "Blue Lagoon": [("Cherry", 1, False)],
    "Long Island Iced Tea": [("Lemon twist", 1, False)],
    "Mimosa": [("Orange slice", 1, False)],
    "French 75": [("Lemon twist", 1, False)],
    "Paloma": [("Lime wedge", 1, False)],
    "Sea Breeze": [("Lime wedge", 1, False)],
    "Tom Collins": [("Cherry", 1, False), ("Lemon twist", 1, False)],
    "Painkiller": [("Orange slice", 1, False)],
    "Navy Grog": [("Lime wedge", 1, False)],
    "Hurricane": [("Cherry", 1, False), ("Orange slice", 1, False)],
    "Rum Runner": [("Cherry", 1, False)],
    "Bahama Mama": [("Cherry", 1, False), ("Orange slice", 1, False)],
    "Blue Hawaiian": [("Cherry", 1, False)],
}


DRINK_LISTS = [
    {"name": "Starter Cocktail Party", "items": [("Gin and Tonic", 6), ("Moscow Mule", 6), ("Margarita", 6), ("Espresso Martini", 4)]},
    {"name": "Vodka Classics", "items": [("Screwdriver", 6), ("Cosmopolitan", 6), ("Vodka Cranberry", 6), ("Espresso Martini", 4)]},
    {"name": "Maritime Party", "items": [
        ("Dark 'n Stormy", 6),
        ("Sea Breeze", 6),
        ("Blue Lagoon", 6),
        ("Salty Dog", 6),
        ("Mai Tai", 6),
        ("Zombie", 6),
        ("Painkiller", 6),
        ("Navy Grog", 6),
        ("Hurricane", 6),
        ("Rum Runner", 6),
        ("Bahama Mama", 6),
        ("Blue Hawaiian", 6),
    ]},
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


def get_or_create_drink(session, name, instructions=None):
    drink = session.query(Drink).filter(Drink.name == name).first()
    if not drink:
        drink = Drink(name=name)
        session.add(drink)
        session.flush()

    if instructions is not None:
        drink.instructions = instructions
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


def get_or_create_garnish(session, data, foods_by_name):
    garnish = session.query(Garnish).filter(Garnish.name == data["name"]).first()
    if not garnish:
        garnish = Garnish(name=data["name"])
        session.add(garnish)
        session.flush()

    garnish.source_food_id = foods_by_name[data["source_food"]].id
    garnish.unit_name = data["unit_name"]
    garnish.yield_per_source = data["yield_per_source"]
    garnish.default_essential = data["default_essential"]
    return garnish


def set_drink_garnishes(session, drink, assignments, garnishes_by_name):
    wanted_garnish_ids = []
    for garnish_name, quantity_per_serving, essential in assignments:
        garnish = garnishes_by_name[garnish_name]
        wanted_garnish_ids.append(garnish.id)
        item = session.query(DrinkGarnish).filter(
            DrinkGarnish.drink_id == drink.id,
            DrinkGarnish.garnish_id == garnish.id,
        ).first()
        if not item:
            item = DrinkGarnish(drink_id=drink.id, garnish_id=garnish.id)
            session.add(item)
        item.quantity_per_serving = quantity_per_serving
        item.essential = essential

    extras = session.query(DrinkGarnish).filter(
        DrinkGarnish.drink_id == drink.id,
        ~DrinkGarnish.garnish_id.in_(wanted_garnish_ids),
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
            drink = get_or_create_drink(session, drink_data["name"], drink_data.get("instructions"))
            set_drink_ingredients(session, drink, drink_data["ingredients"], foods_by_name)
            drinks_by_name[drink.name] = drink
        session.commit()

        for list_data in DRINK_LISTS:
            drink_list = get_or_create_drink_list(session, list_data["name"])
            set_drink_list_items(session, drink_list, list_data["items"], drinks_by_name)
        session.commit()

        garnishes_by_name = {}
        for garnish_data in GARNISHES:
            garnish = get_or_create_garnish(session, garnish_data, foods_by_name)
            garnishes_by_name[garnish.name] = garnish
        session.commit()

        for drink_name, assignments in DRINK_GARNISHES.items():
            drink = drinks_by_name[drink_name]
            set_drink_garnishes(session, drink, assignments, garnishes_by_name)
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
