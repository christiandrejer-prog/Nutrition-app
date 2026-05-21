
from unittest.mock import Base

from sqlalchemy import Column, Integer, String


class FeedbackDB(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    message = Column(String)