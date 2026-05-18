from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.drink import Drink
from app.models.drink_ingredient import DrinkIngredient
from app.models.drink_prep import DrinkPrep
from app.models.drink_prep_item import DrinkPrepItem
from app.models.food import Food
from app.schemas.drink_schema import (
    DrinkCreate,
    DrinkResponse,
    DrinkDetailResponse,
    DrinkIngredientCreate,
    DrinkIngredientResponse,
    DrinkPrepCreate,
    DrinkPrepResponse,
    DrinkPrepDetailResponse,
)

router = APIRouter(tags=["Drinks"])


@router.post("/", response_model=DrinkResponse)
def create_drink(data: DrinkCreate, db: Session = Depends(get_db)):
    existing = db.query(Drink).filter(func.lower(Drink.name) == data.name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Drink already exists")

    drink = Drink(name=data.name)
    db.add(drink)
    db.commit()
    db.refresh(drink)

    return drink


@router.get("/", response_model=list[DrinkResponse])
def get_drinks(db: Session = Depends(get_db)):
    return db.query(Drink).all()


@router.get("/{drink_id}", response_model=DrinkDetailResponse)
def get_drink(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    ingredients = db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink_id).all()

    return {
        "id": drink.id,
        "name": drink.name,
        "ingredients": ingredients,
    }


@router.post("/{drink_id}/ingredients", response_model=DrinkIngredientResponse)
def add_drink_ingredient(drink_id: int, data: DrinkIngredientCreate, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    food = db.query(Food).filter(Food.id == data.food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    ingredient = DrinkIngredient(
        drink_id=drink_id,
        food_id=data.food_id,
        amount=data.amount,
        unit=data.unit,
    )
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)

    return ingredient


@router.get("/{drink_id}/ingredients", response_model=list[DrinkIngredientResponse])
def get_drink_ingredients(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    return db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink_id).all()


@router.post("/preps", response_model=DrinkPrepResponse)
def create_drink_prep(data: DrinkPrepCreate, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == data.drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    ingredients = db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink.id).all()

    prep = DrinkPrep(drink_id=drink.id, quantity=data.quantity)
    db.add(prep)
    db.commit()
    db.refresh(prep)

    for ingredient in ingredients:
        prep_item = DrinkPrepItem(
            prep_id=prep.id,
            food_id=ingredient.food_id,
            required_amount=ingredient.amount * data.quantity,
            unit=ingredient.unit,
        )
        db.add(prep_item)

    db.commit()

    return prep


@router.get("/preps", response_model=list[DrinkPrepResponse])
def get_drink_preps(db: Session = Depends(get_db)):
    return db.query(DrinkPrep).all()


@router.get("/preps/{prep_id}", response_model=DrinkPrepDetailResponse)
def get_drink_prep(prep_id: int, db: Session = Depends(get_db)):
    prep = db.query(DrinkPrep).filter(DrinkPrep.id == prep_id).first()
    if not prep:
        raise HTTPException(status_code=404, detail="Drink prep not found")

    ingredients = db.query(DrinkPrepItem).filter(DrinkPrepItem.prep_id == prep.id).all()
    return {
        "id": prep.id,
        "drink_id": prep.drink_id,
        "quantity": prep.quantity,
        "ingredients": ingredients,
    }
