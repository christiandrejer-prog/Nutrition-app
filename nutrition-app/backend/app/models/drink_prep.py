from sqlalchemy import Column, Integer, ForeignKey
from app.database.db import Base


class DrinkPrep(Base):
    __tablename__ = "drink_preps"

    id = Column(Integer, primary_key=True)
    drink_id = Column(Integer, ForeignKey("drinks.id"), nullable=False)
    # number of drinks to prepare
    quantity = Column(Integer, nullable=False, default=1)

    def __repr__(self):
        return f"<DrinkPrep(drink_id={self.drink_id}, quantity={self.quantity})>"
