from datetime import datetime, date
from sqlalchemy import Column, Integer, Float, ForeignKey, Date, DateTime, String
from app.database.db import Base


class IntakeEntry(Base):
    __tablename__ = "intake_entries"

    id = Column(Integer, primary_key=True)
    intake_date = Column(Date, nullable=False, default=date.today)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=True)
    description = Column(String, nullable=True)
    protein = Column(Float, nullable=False, default=0.0)
    carbs = Column(Float, nullable=False, default=0.0)
    fat = Column(Float, nullable=False, default=0.0)
    calories = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<IntakeEntry(date={self.intake_date}, meal_id={self.meal_id}, kcal={self.calories})>"
