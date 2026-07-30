from sqlalchemy import Column, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base


class DrinkGarnish(Base):
    __tablename__ = "drink_garnishes"

    id = Column(Integer, primary_key=True)
    drink_id = Column(Integer, ForeignKey("drinks.id"), nullable=False)
    garnish_id = Column(Integer, ForeignKey("garnishes.id"), nullable=False)
    # Units of the garnish's own unit_name needed per single drink serving.
    quantity_per_serving = Column(Float, nullable=False, default=1)
    # Whether this garnish is required for the drink to count as makeable.
    # Defaults from Garnish.default_essential when first added, but can be
    # overridden per drink (e.g. mint is essential in a Mojito, decorative
    # as a sprig on top of a Moscow Mule).
    essential = Column(Boolean, nullable=False, default=False)

    drink = relationship("Drink", back_populates="garnishes")
    garnish = relationship("Garnish")

    def __repr__(self):
        return f"<DrinkGarnish(drink_id={self.drink_id}, garnish_id={self.garnish_id}, qty={self.quantity_per_serving})>"
