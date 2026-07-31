from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.weight_entry import WeightEntry
from app.schemas.weight_schema import WeightEntryCreate, WeightEntryResponse

router = APIRouter(tags=["Weight"])


# Create or update the weight entry for a given date (one entry per day).
@router.post("/", response_model=WeightEntryResponse)
def log_weight(data: WeightEntryCreate, db: Session = Depends(get_db)):
    logged_date = data.logged_date or date.today()

    entry = db.query(WeightEntry).filter(WeightEntry.logged_date == logged_date).first()
    if entry:
        entry.weight_kg = data.weight_kg
    else:
        entry = WeightEntry(weight_kg=data.weight_kg, logged_date=logged_date)
        db.add(entry)

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=list[WeightEntryResponse])
def get_weight_entries(
    start_date: date = Query(None),
    end_date: date = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(WeightEntry)
    if start_date is not None:
        query = query.filter(WeightEntry.logged_date >= start_date)
    if end_date is not None:
        query = query.filter(WeightEntry.logged_date <= end_date)
    return query.order_by(WeightEntry.logged_date.asc()).all()


@router.get("/latest", response_model=WeightEntryResponse)
def get_latest_weight(db: Session = Depends(get_db)):
    entry = db.query(WeightEntry).order_by(WeightEntry.logged_date.desc()).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No weight entries logged yet")
    return entry


@router.delete("/{entry_id}")
def delete_weight_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(WeightEntry).filter(WeightEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    db.delete(entry)
    db.commit()
    return {"detail": f"Weight entry deleted {entry_id}"}
