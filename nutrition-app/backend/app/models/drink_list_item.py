from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base


class DrinkListItem(Base):
    __tablename__ = "drink_list_items"

    id = Column(Integer, primary_key=True)
    list_id = Column(Integer, ForeignKey("drink_lists.id"), nullable=False)
    drink_id = Column(Integer, ForeignKey("drinks.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    # relationship to DrinkList
    drink_list = relationship("DrinkList", back_populates="items")

    # relationship to Drink
    drink = relationship("Drink")

    def __repr__(self):
        return f"<DrinkListItem(list_id={self.list_id}, drink_id={self.drink_id}, quantity={self.quantity})>"
