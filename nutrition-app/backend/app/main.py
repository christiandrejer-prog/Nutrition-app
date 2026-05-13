from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.foods import router as food_router
from app.routes.nutrients import router as nutrient_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(food_router)
app.include_router(nutrient_router)


from app.routes.meals import router as meals_router

app.include_router(meals_router)

@app.get("/")
def home():
    return {"message": "Nutrition API running"}