from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.db import Base


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    ingredients = relationship("DrinkIngredient", back_populates="drink")

    def __repr__(self):
        return f"<Drink(name={self.name})>"
