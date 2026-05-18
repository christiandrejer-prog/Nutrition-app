from sqlalchemy import Column, Integer, String
from app.database.db import Base


class Garnish(Base):
    __tablename__ = "garnishes"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    def __repr__(self):
        return f"<Garnish(name={self.name})>"
