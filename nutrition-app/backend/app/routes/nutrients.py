from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.nutrient import Nutrient
from pydantic import BaseModel

class NutrientCreate(BaseModel):
    name: str
    unit: str

class NutrientResponse(BaseModel):
    id: int
    name: str
    unit: str

    class Config:
        from_attributes = True

class NutrientUpdate(BaseModel):
    name: str
    unit: str

router = APIRouter(tags=["Nutrients"])

@router.post("/", response_model=NutrientResponse)
def create_nutrient(nutrient: NutrientCreate, db: Session = Depends(get_db)):
    existing = db.query(Nutrient).filter(
        func.lower(Nutrient.name) == nutrient.name.lower(),
        func.lower(Nutrient.unit) == nutrient.unit.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nutrient already exists")

    new_nutrient = Nutrient(name=nutrient.name, unit=nutrient.unit)
    db.add(new_nutrient)
    db.commit()
    db.refresh(new_nutrient)
    return new_nutrient


@router.put("/{nutrient_id}", response_model=NutrientResponse)
def update_nutrient(nutrient_id: int, nutrient: NutrientUpdate, db: Session = Depends(get_db)):
    existing = db.query(Nutrient).filter(Nutrient.id == nutrient_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Nutrient not found")

    duplicate = db.query(Nutrient).filter(
        Nutrient.id != nutrient_id,
        func.lower(Nutrient.name) == nutrient.name.lower(),
        func.lower(Nutrient.unit) == nutrient.unit.lower()
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nutrient already exists")

    existing.name = nutrient.name
    existing.unit = nutrient.unit
    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{nutrient_id}")
def delete_nutrient(nutrient_id: int, db: Session = Depends(get_db)):
    nutrient = db.query(Nutrient).filter(Nutrient.id == nutrient_id).first()
    if not nutrient:
        raise HTTPException(status_code=404, detail="Nutrient not found")

    db.delete(nutrient)
    db.commit()
    return {"detail": "Nutrient deleted"}

@router.get("/", response_model=list[NutrientResponse])
def get_nutrients(db: Session = Depends(get_db)):
    return db.query(Nutrient).all()