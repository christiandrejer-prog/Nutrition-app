from sqlalchemy import Column, Integer, ForeignKey
from app.database.db import Base


class UserMeal(Base):
    __tablename__ = "user_meals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)

    def __repr__(self):
        return f"<UserMeal(user_id={self.user_id}, meal_id={self.meal_id})>"
