from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models.garnish import Garnish
from app.models.food import Food
from app.schemas.garnish_schema import GarnishCreate, GarnishUpdate, GarnishResponse

router = APIRouter(tags=["Garnishes"])


@router.get("/", response_model=list[GarnishResponse])
def get_garnishes(db: Session = Depends(get_db)):
    return db.query(Garnish).options(joinedload(Garnish.source_food)).all()


def _validate_source_food(source_food_id, db: Session):
    if source_food_id is None:
        return
    food = db.query(Food).filter(Food.id == source_food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Source food not found")


@router.post("/", response_model=GarnishResponse)
def create_garnish(data: GarnishCreate, db: Session = Depends(get_db)):
    existing = db.query(Garnish).filter(func.lower(Garnish.name) == data.name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Garnish already exists")

    _validate_source_food(data.source_food_id, db)

    garnish = Garnish(
        name=data.name,
        unit_name=data.unit_name,
        source_food_id=data.source_food_id,
        yield_per_source=data.yield_per_source,
        default_essential=data.default_essential,
    )
    db.add(garnish)
    db.commit()
    db.refresh(garnish)
    return garnish


@router.put("/{garnish_id}", response_model=GarnishResponse)
def update_garnish(garnish_id: int, data: GarnishUpdate, db: Session = Depends(get_db)):
    garnish = db.query(Garnish).filter(Garnish.id == garnish_id).first()
    if not garnish:
        raise HTTPException(status_code=404, detail="Garnish not found")

    duplicate = db.query(Garnish).filter(
        Garnish.id != garnish_id,
        func.lower(Garnish.name) == data.name.lower()
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Garnish already exists")

    _validate_source_food(data.source_food_id, db)

    garnish.name = data.name
    garnish.unit_name = data.unit_name
    garnish.source_food_id = data.source_food_id
    garnish.yield_per_source = data.yield_per_source
    garnish.default_essential = data.default_essential
    db.commit()
    db.refresh(garnish)
    return garnish


@router.delete("/{garnish_id}")
def delete_garnish(garnish_id: int, db: Session = Depends(get_db)):
    garnish = db.query(Garnish).filter(Garnish.id == garnish_id).first()
    if not garnish:
        raise HTTPException(status_code=404, detail="Garnish not found")

    db.delete(garnish)
    db.commit()
    return {"detail": "Garnish deleted"}
