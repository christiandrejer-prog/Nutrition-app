from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base
from app.database.connection import engine

from app.routes.foods import router as food_router
from app.routes.nutrients import router as nutrient_router

# Import models so SQLAlchemy metadata includes them when creating tables.
from app.models import food, nutrient, food_nutrient, meal, meal_item, user

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


from app.routes.meals import router as meals_router

app.include_router(meals_router, prefix="/meals", tags=["meals"])

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    print(f"Using database file: {engine.url.database}")


@app.get("/")
def home():
    return {"message": "Nutrition API running"}