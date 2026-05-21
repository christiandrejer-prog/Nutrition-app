from sqlalchemy import Column, Integer, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database.db import Base


class DrinkIngredient(Base):
    __tablename__ = "drink_ingredients"

    id = Column(Integer, primary_key=True)
    drink_id = Column(Integer, ForeignKey("drinks.id"), nullable=False)
    # Reference a food item as an ingredient
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    # amount per single drink (stored in ml or g depending on unit)
    amount = Column(Float, nullable=False)
    unit = Column(String, default="ml")

    drink = relationship("Drink", back_populates="ingredients")
    food = relationship("Food")

    def __repr__(self):
        return f"<DrinkIngredient(drink_id={self.drink_id}, food_id={self.food_id}, amount={self.amount}{self.unit})>"
