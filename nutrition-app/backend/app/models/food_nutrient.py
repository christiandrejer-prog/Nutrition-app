from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database.db import Base

class FoodNutrient(Base):
    __tablename__ = "food_nutrients"

    id = Column(Integer, primary_key=True)

    food_id = Column(Integer, ForeignKey("foods.id"))
    nutrient_id = Column(Integer, ForeignKey("nutrients.id"))

    amount_per_100g = Column(Float)

    def __repr__(self):
        return (
            f"<FoodNutrient(food_id={self.food_id}, "
            f"nutrient_id={self.nutrient_id}, "
            f"amount={self.amount_per_100g})>"
        )