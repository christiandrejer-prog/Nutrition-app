from datetime import date, datetime
from sqlalchemy import Column, Integer, Float, Date, DateTime
from app.database.db import Base


class WeightEntry(Base):
    __tablename__ = "weight_entries"

    id = Column(Integer, primary_key=True)
    weight_kg = Column(Float, nullable=False)
    logged_date = Column(Date, nullable=False, default=date.today, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<WeightEntry(logged_date={self.logged_date}, weight_kg={self.weight_kg})>"
