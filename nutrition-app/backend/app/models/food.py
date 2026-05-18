from sqlalchemy import Column, Integer, String, Float
from app.database.db import Base

class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    brand = Column(String)
    barcode = Column(String, unique=True)
    price = Column(Float, nullable=True)  # Price in DKK (or primary currency)
    # The amount that `price` refers to (e.g. price = 15 DKK for base_amount=1000 and base_unit='ml')
    base_amount = Column(Float, nullable=True)
    base_unit = Column(String, nullable=True)

    def __repr__(self):
        return f"<Food(name={self.name}, price={self.price})>"