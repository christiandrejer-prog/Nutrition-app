from sqlalchemy import Column, Integer, String
from app.database.db import Base


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    def __repr__(self):
        return f"<Drink(name={self.name})>"
