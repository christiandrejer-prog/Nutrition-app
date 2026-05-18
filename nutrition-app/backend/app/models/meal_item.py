from sqlalchemy import Column, Integer, ForeignKey, Float, String
from app.database.db import Base


class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True)

    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)

    # Amount of the food item used in this meal (units indicated by `unit`, e.g. 'g' or 'ml')
    amount = Column(Float, nullable=False)
    unit = Column(String, default="g")

    def __repr__(self):
        return f"<MealItem(meal_id={self.meal_id}, food_id={self.food_id}, amount={self.amount}{self.unit})>"