from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models.food import Food
from app.models.stock import Stock
from app.schemas.stock_schema import StockAdjust, StockResponse

router = APIRouter(tags=["Stock"])


# Get current stock for every food that has a tracked stock entry
@router.get("/", response_model=list[StockResponse])
def get_stock(db: Session = Depends(get_db)):
    return db.query(Stock).options(joinedload(Stock.food)).all()


# Add to a food's current stock amount
@router.post("/{food_id}/add", response_model=StockResponse)
def add_stock(food_id: int, data: StockAdjust, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    entry = db.query(Stock).filter(Stock.food_id == food_id).first()

    if not entry:
        entry = Stock(food_id=food_id, amount=data.amount, unit=data.unit)
        db.add(entry)
    else:
        if entry.amount > 0 and entry.unit != data.unit:
            raise HTTPException(
                status_code=400,
                detail=f"Stock for this food is tracked in {entry.unit}. Use the same unit to adjust it."
            )
        entry.amount += data.amount
        entry.unit = data.unit

    db.commit()
    db.refresh(entry)
    return entry


# Remove from a food's current stock amount (clamped at 0)
@router.post("/{food_id}/remove", response_model=StockResponse)
def remove_stock(food_id: int, data: StockAdjust, db: Session = Depends(get_db)):
    entry = db.query(Stock).filter(Stock.food_id == food_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No stock tracked for this food")

    if entry.unit != data.unit:
        raise HTTPException(
            status_code=400,
            detail=f"Stock for this food is tracked in {entry.unit}. Use the same unit to adjust it."
        )

    entry.amount = max(0, entry.amount - data.amount)
    db.commit()
    db.refresh(entry)
    return entry


# Clear stock tracking for a food entirely
@router.delete("/{food_id}")
def delete_stock(food_id: int, db: Session = Depends(get_db)):
    entry = db.query(Stock).filter(Stock.food_id == food_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No stock tracked for this food")

    db.delete(entry)
    db.commit()
    return {"detail": "Stock entry removed"}
