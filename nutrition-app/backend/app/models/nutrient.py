from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Nutrient(Base):
    __tablename__ = "nutrients"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    unit = Column(String, nullable=False)

    def __repr__(self):
        return f"<Nutrient(name={self.name})>"