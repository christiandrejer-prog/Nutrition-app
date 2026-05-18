from sqlalchemy import Column, Integer, String
from app.database.db import Base


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    def __repr__(self):
        return f"<Meal(name={self.name})>"