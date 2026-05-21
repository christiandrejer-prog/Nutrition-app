from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.db import Base


class DrinkList(Base):
    __tablename__ = "drink_lists"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    items = relationship("DrinkListItem", back_populates="drink_list")

    def __repr__(self):
        return f"<DrinkList(name={self.name})>"