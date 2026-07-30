from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models.drink import Drink
from app.models.drink_ingredient import DrinkIngredient
from app.models.drink_garnish import DrinkGarnish
from app.models.garnish import Garnish
from app.models.drink_list import DrinkList
from app.models.drink_list_item import DrinkListItem
from app.models.food import Food
from app.models.food_nutrient import FoodNutrient
from app.models.nutrient import Nutrient
from app.utils.energy_constants import calculate_energy_from_macros
from app.schemas.drink_schema import (
    DrinkCreate,
    DrinkResponse,
    DrinkDetailResponse,
    DrinkIngredientCreate,
    DrinkIngredientUpdate,
    DrinkIngredientResponse,
    DrinkListCreate,
    DrinkListResponse,
    DrinkListDetailResponse,
    DrinkListItemCreate,
    DrinkListItemResponse,
)
from app.schemas.garnish_schema import (
    DrinkGarnishCreate,
    DrinkGarnishUpdate,
    DrinkGarnishResponse,
)

router = APIRouter(tags=["Drinks"])


def merge_duplicate_drink_list_items(list_id: int, db: Session) -> None:
    items = db.query(DrinkListItem).filter(DrinkListItem.list_id == list_id).all()
    by_drink = {}
    changed = False

    for item in items:
        if item.drink_id not in by_drink:
            by_drink[item.drink_id] = item
            continue

        by_drink[item.drink_id].quantity += item.quantity
        db.delete(item)
        changed = True

    if changed:
        db.commit()

# Create a new drink
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


# Update a drink's name
@router.put("/{drink_id}", response_model=DrinkResponse)
def update_drink(drink_id: int, data: DrinkCreate, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    existing = db.query(Drink).filter(func.lower(Drink.name) == data.name.lower()).first()
    if existing and existing.id != drink_id:
        raise HTTPException(status_code=400, detail="Drink already exists")

    drink.name = data.name
    if data.instructions is not None:
        drink.instructions = data.instructions
    db.commit()
    db.refresh(drink)

    return drink


# Delete a drink
@router.delete("/{drink_id}")
def delete_drink(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink_id).delete()
    db.query(DrinkGarnish).filter(DrinkGarnish.drink_id == drink_id).delete()
    db.delete(drink)
    db.commit()

    return {"detail": f"Drink deleted {drink_id}"}


# Get all drinks
@router.get("/", response_model=list[DrinkResponse])
def get_drinks(db: Session = Depends(get_db)):
    return db.query(Drink).all()


# Get all drinks with their ingredients (for stock/shopping computations)
@router.get("/details", response_model=list[DrinkDetailResponse])
def get_all_drink_details(db: Session = Depends(get_db)):
    drinks = db.query(Drink).options(
        joinedload(Drink.ingredients).joinedload(DrinkIngredient.food),
        joinedload(Drink.garnishes).joinedload(DrinkGarnish.garnish).joinedload(Garnish.source_food),
    ).all()
    return drinks


# Get drink details with ingredients
@router.get("/details/{drink_id}", response_model=DrinkDetailResponse)
def get_drink(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    ingredients = (
        db.query(DrinkIngredient)
        .options(joinedload(DrinkIngredient.food))
        .filter(DrinkIngredient.drink_id == drink_id)
        .all()
    )
    garnishes = (
        db.query(DrinkGarnish)
        .options(joinedload(DrinkGarnish.garnish).joinedload(Garnish.source_food))
        .filter(DrinkGarnish.drink_id == drink_id)
        .all()
    )
    return {
        "id": drink.id,
        "name": drink.name,
        "instructions": drink.instructions,
        "ingredients": ingredients,
        "garnishes": garnishes,
    }


# Get total macros for a drink, summed across its ingredients
@router.get("/{drink_id}/macros")
def get_drink_macros(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    ingredients = db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink_id).all()

    totals = {"protein": 0.0, "carbs": 0.0, "fat": 0.0}

    for ingredient in ingredients:
        try:
            amount = float(ingredient.amount or 0)
        except (TypeError, ValueError):
            amount = 0

        food_nutrients = db.query(FoodNutrient).filter(
            FoodNutrient.food_id == ingredient.food_id
        ).all()

        for fn in food_nutrients:
            nutrient = db.query(Nutrient).filter(Nutrient.id == fn.nutrient_id).first()
            if not nutrient:
                continue

            # Same simplified scaling as meals: treat the ingredient amount as
            # grams-equivalent regardless of unit (W.I.P. until proper unit
            # conversion is in place).
            scaled_amount = fn.amount_per_100g * (amount / 100)
            name = nutrient.name.lower()

            if "protein" in name:
                totals["protein"] += scaled_amount
            elif "carb" in name:
                totals["carbs"] += scaled_amount
            elif "fat" in name:
                totals["fat"] += scaled_amount

    totals["calories"] = round(calculate_energy_from_macros(totals), 1)

    return {
        "drink_id": drink_id,
        "drink_name": drink.name,
        "totals": {
            "protein": round(totals["protein"], 1),
            "carbs": round(totals["carbs"], 1),
            "fat": round(totals["fat"], 1),
            "calories": totals["calories"]
        }
    }


# Add an ingredient to a drink
@router.post("/{drink_id}/ingredients", response_model=DrinkIngredientResponse)
def add_drink_ingredient(drink_id: int, data: DrinkIngredientCreate, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    food = db.query(Food).filter(Food.id == data.food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    existing = db.query(DrinkIngredient).filter(
        DrinkIngredient.drink_id == drink_id,
        DrinkIngredient.food_id == data.food_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ingredient already exists for this drink")

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


# Get all ingredients for a drink
@router.get("/{drink_id}/ingredients", response_model=list[DrinkIngredientResponse])
def get_drink_ingredients(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    return db.query(DrinkIngredient).filter(DrinkIngredient.drink_id == drink_id).all()


@router.put("/{drink_id}/ingredients/{ingredient_id}", response_model=DrinkIngredientResponse)
def update_drink_ingredient(
    drink_id: int,
    ingredient_id: int,
    data: DrinkIngredientUpdate,
    db: Session = Depends(get_db)
):
    ingredient = db.query(DrinkIngredient).filter(
        DrinkIngredient.id == ingredient_id,
        DrinkIngredient.drink_id == drink_id
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Drink ingredient not found")

    ingredient.amount = data.amount
    ingredient.unit = data.unit
    db.commit()
    db.refresh(ingredient)

    return ingredient


@router.delete("/{drink_id}/ingredients/{ingredient_id}")
def delete_drink_ingredient(
    drink_id: int,
    ingredient_id: int,
    db: Session = Depends(get_db)
):
    ingredient = db.query(DrinkIngredient).filter(
        DrinkIngredient.id == ingredient_id,
        DrinkIngredient.drink_id == drink_id
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Drink ingredient not found")

    db.delete(ingredient)
    db.commit()

    return {"detail": f"Drink ingredient deleted {ingredient_id}"}


# Add a garnish to a drink
@router.post("/{drink_id}/garnishes", response_model=DrinkGarnishResponse)
def add_drink_garnish(drink_id: int, data: DrinkGarnishCreate, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    garnish = db.query(Garnish).filter(Garnish.id == data.garnish_id).first()
    if not garnish:
        raise HTTPException(status_code=404, detail="Garnish not found")

    existing = db.query(DrinkGarnish).filter(
        DrinkGarnish.drink_id == drink_id,
        DrinkGarnish.garnish_id == data.garnish_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Garnish already exists for this drink")

    essential = data.essential if data.essential is not None else garnish.default_essential

    drink_garnish = DrinkGarnish(
        drink_id=drink_id,
        garnish_id=data.garnish_id,
        quantity_per_serving=data.quantity_per_serving,
        essential=essential,
    )
    db.add(drink_garnish)
    db.commit()
    db.refresh(drink_garnish)

    return drink_garnish


# Get all garnishes for a drink
@router.get("/{drink_id}/garnishes", response_model=list[DrinkGarnishResponse])
def get_drink_garnishes(drink_id: int, db: Session = Depends(get_db)):
    drink = db.query(Drink).filter(Drink.id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    return db.query(DrinkGarnish).options(
        joinedload(DrinkGarnish.garnish).joinedload(Garnish.source_food)
    ).filter(
        DrinkGarnish.drink_id == drink_id
    ).all()


@router.put("/{drink_id}/garnishes/{garnish_id}", response_model=DrinkGarnishResponse)
def update_drink_garnish(
    drink_id: int,
    garnish_id: int,
    data: DrinkGarnishUpdate,
    db: Session = Depends(get_db)
):
    drink_garnish = db.query(DrinkGarnish).filter(
        DrinkGarnish.drink_id == drink_id,
        DrinkGarnish.garnish_id == garnish_id
    ).first()
    if not drink_garnish:
        raise HTTPException(status_code=404, detail="Drink garnish not found")

    drink_garnish.quantity_per_serving = data.quantity_per_serving
    drink_garnish.essential = data.essential
    db.commit()
    db.refresh(drink_garnish)

    return drink_garnish


@router.delete("/{drink_id}/garnishes/{garnish_id}")
def delete_drink_garnish(
    drink_id: int,
    garnish_id: int,
    db: Session = Depends(get_db)
):
    drink_garnish = db.query(DrinkGarnish).filter(
        DrinkGarnish.drink_id == drink_id,
        DrinkGarnish.garnish_id == garnish_id
    ).first()
    if not drink_garnish:
        raise HTTPException(status_code=404, detail="Drink garnish not found")

    db.delete(drink_garnish)
    db.commit()

    return {"detail": f"Drink garnish deleted {garnish_id}"}


# Create a new drink list
@router.post("/lists", response_model=DrinkListResponse)
def create_drink_list(data: DrinkListCreate, db: Session = Depends(get_db)):
    existing = db.query(DrinkList).filter(func.lower(DrinkList.name) == data.name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="List already exists")

    drink_list = DrinkList(name=data.name)
    db.add(drink_list)
    db.commit()
    db.refresh(drink_list)

    return drink_list


# Get all drink lists with item counts
@router.get("/lists")
def get_drink_lists(db: Session = Depends(get_db)):

    results = db.query(
        DrinkList.id,
        DrinkList.name,
        func.count(DrinkListItem.id).label("item_count")
    ).outerjoin(
        DrinkListItem,
        DrinkListItem.list_id == DrinkList.id
    ).group_by(
        DrinkList.id
    ).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "item_count": r.item_count
        }
        for r in results
    ]


# Get details of a drink list with all items and their ingredients
@router.get("/lists/{list_id}", response_model=DrinkListDetailResponse)
def get_drink_list(list_id: int, db: Session = Depends(get_db)):
    merge_duplicate_drink_list_items(list_id, db)

    drink_list = (
        db.query(DrinkList)
        .options(
            joinedload(DrinkList.items)
            .joinedload(DrinkListItem.drink)
            .joinedload(Drink.ingredients)
            .joinedload(DrinkIngredient.food),
            joinedload(DrinkList.items)
            .joinedload(DrinkListItem.drink)
            .joinedload(Drink.garnishes)
            .joinedload(DrinkGarnish.garnish)
            .joinedload(Garnish.source_food)
        )
        .filter(DrinkList.id == list_id)
        .first()
    )

    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    return {
        "id": drink_list.id,
        "name": drink_list.name,
        "items": drink_list.items 
    }


# Update a drink list's name
@router.put("/lists/{list_id}", response_model=DrinkListResponse)
def update_drink_list(list_id: int, data: DrinkListCreate, db: Session = Depends(get_db)):
    drink_list = db.query(DrinkList).filter(DrinkList.id == list_id).first()
    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    existing = db.query(DrinkList).filter(func.lower(DrinkList.name) == data.name.lower()).first()
    if existing and existing.id != list_id:
        raise HTTPException(status_code=400, detail="Drink list already exists")

    drink_list.name = data.name
    db.commit()
    db.refresh(drink_list)

    return drink_list


# Delete a drink list and its items
@router.delete("/lists/{list_id}")
def delete_drink_list(list_id: int, db: Session = Depends(get_db)):
    drink_list = db.query(DrinkList).filter(DrinkList.id == list_id).first()
    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    db.query(DrinkListItem).filter(DrinkListItem.list_id == list_id).delete()
    db.delete(drink_list)
    db.commit()
    return {"detail": f"Drink list deleted {list_id}"}


# Add a drink to a drink list
@router.post("/lists/{list_id}/items", response_model=DrinkListItemResponse)
def add_drink_to_list(list_id: int, data: DrinkListItemCreate, db: Session = Depends(get_db)):
    drink_list = db.query(DrinkList).filter(DrinkList.id == list_id).first()
    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    drink = db.query(Drink).filter(Drink.id == data.drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    merge_duplicate_drink_list_items(list_id, db)

    item = db.query(DrinkListItem).filter(
        DrinkListItem.list_id == list_id,
        DrinkListItem.drink_id == data.drink_id
    ).first()

    if item:
        item.quantity += data.quantity
    else:
        item = DrinkListItem(
            list_id=list_id,
            drink_id=data.drink_id,
            quantity=data.quantity
        )
        db.add(item)

    db.commit()
    db.refresh(item)

    return item


# Update a drink list item (change drink)
@router.put("/lists/{list_id}/items/{item_id}", response_model=DrinkListItemResponse)
def update_drink_list_item(list_id: int, item_id: int, data: DrinkListItemCreate, db: Session = Depends(get_db)):
    drink_list = db.query(DrinkList).filter(DrinkList.id == list_id).first()
    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    item = db.query(DrinkListItem).filter(DrinkListItem.id == item_id, DrinkListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Drink list item not found")

    drink = db.query(Drink).filter(Drink.id == data.drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    merge_duplicate_drink_list_items(list_id, db)

    item = db.query(DrinkListItem).filter(DrinkListItem.id == item_id, DrinkListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Drink list item not found")

    duplicate = db.query(DrinkListItem).filter(
        DrinkListItem.id != item_id,
        DrinkListItem.list_id == list_id,
        DrinkListItem.drink_id == data.drink_id
    ).first()
    if duplicate:
        duplicate.quantity += data.quantity
        db.delete(item)
        db.commit()
        db.refresh(duplicate)
        return duplicate

    item.drink_id = data.drink_id
    item.quantity = data.quantity
    db.commit()
    db.refresh(item)

    return item


# Delete a drink list item
@router.delete("/lists/{list_id}/items/{item_id}")
def delete_drink_list_item(list_id: int, item_id: int, db: Session = Depends(get_db)):
    drink_list = db.query(DrinkList).filter(DrinkList.id == list_id).first()
    if not drink_list:
        raise HTTPException(status_code=404, detail="Drink list not found")

    item = db.query(DrinkListItem).filter(
        DrinkListItem.id == item_id, 
        DrinkListItem.list_id == list_id
        ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Drink list item not found")
    
    db.delete(item)
    db.commit()

    return {"detail": f"Drink list item deleted {item.id} from list {list_id}"}

