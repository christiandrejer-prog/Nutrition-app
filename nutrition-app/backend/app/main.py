from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base
from app.database.connection import engine

from app.routes.foods import router as food_router
from app.routes.nutrients import router as nutrient_router
from app.routes.status import router as status_router

# Import models so SQLAlchemy metadata includes them when creating tables.
from app.models import (
    food,
    nutrient,
    food_nutrient,
    meal,
    meal_item,
    user,
    user_meal,
    drink,
    drink_ingredient,
    drink_list,
    drink_list_item,
    garnish,
    intake_entry,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(food_router, prefix="/foods", tags=["foods"])
app.include_router(nutrient_router, prefix="/nutrients", tags=["nutrients"])
app.include_router(status_router, prefix="/status")

from app.routes.meals import router as meals_router
from app.routes.users import router as users_router
from app.routes.nutrition import router as nutrition_router
from app.routes.drinks import router as drinks_router
from app.routes.intake import router as intake_router

app.include_router(meals_router, prefix="/meals", tags=["meals"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(nutrition_router, prefix="/nutrition", tags=["nutrition"])
app.include_router(drinks_router, prefix="/drinks", tags=["drinks"])
app.include_router(intake_router, prefix="/intake", tags=["intake"])

@app.on_event("startup")
def on_startup():
    print(Base.metadata.tables.keys())
    Base.metadata.create_all(bind=engine)
    print(f"Using database file: {engine.url.database}")


@app.get("/")
def home():
    return {"message": "Nutrition API running"}