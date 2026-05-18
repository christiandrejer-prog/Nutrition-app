from sqlalchemy import Column, Integer, Float, ForeignKey, String
from app.database.db import Base


class DrinkPrepItem(Base):
    __tablename__ = "drink_prep_items"

    id = Column(Integer, primary_key=True)
    prep_id = Column(Integer, ForeignKey("drink_preps.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    required_amount = Column(Float, nullable=False)
    unit = Column(String, default="ml")

    def __repr__(self):
        return f"<DrinkPrepItem(prep_id={self.prep_id}, food_id={self.food_id}, required={self.required_amount}{self.unit})>"
