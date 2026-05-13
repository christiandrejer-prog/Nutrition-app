from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    brand = Column(String)
    barcode = Column(String, unique=True)

    def __repr__(self):
        return f"<Food(name={self.name})>"