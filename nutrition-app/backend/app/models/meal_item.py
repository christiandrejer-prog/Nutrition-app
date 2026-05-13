from sqlalchemy import Column, Integer, ForeignKey, Float
from app.database.db import Base


class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True)

    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)

    grams = Column(Float, nullable=False)

    def __repr__(self):
        return f"<MealItem(meal_id={self.meal_id}, food_id={self.food_id}, grams={self.grams})>"