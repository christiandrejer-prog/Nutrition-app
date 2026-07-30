from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base


class Garnish(Base):
    __tablename__ = "garnishes"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    # Countable unit this garnish is tracked/used in, e.g. "wedge", "slice", "sprig".
    unit_name = Column(String, nullable=False, default="piece")
    # What you actually buy, e.g. the Food "Lime" for a "Lime wedge". A real
    # Food so it carries its own brand/price and can double as a meal
    # ingredient, and so its stock is tracked in the one shared Stock table.
    source_food_id = Column(Integer, ForeignKey("foods.id"), nullable=True)
    # How many units one source item yields, e.g. 8 wedges per lime.
    yield_per_source = Column(Float, nullable=True)
    # Suggested default for whether this garnish is structural (affects drink
    # availability) or purely decorative (informational only). Pre-fills
    # DrinkGarnish.essential when added to a drink; not itself authoritative.
    default_essential = Column(Boolean, nullable=False, default=False)

    source_food = relationship("Food")

    def __repr__(self):
        return f"<Garnish(name={self.name})>"
