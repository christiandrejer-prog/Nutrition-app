from sqlalchemy import Column, Integer, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database.db import Base


class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False, unique=True)
    amount = Column(Float, nullable=False, default=0)
    unit = Column(String, default="ml")

    food = relationship("Food")

    def __repr__(self):
        return f"<Stock(food_id={self.food_id}, amount={self.amount}{self.unit})>"
