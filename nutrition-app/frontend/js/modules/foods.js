// foods.js responsibilities:
    // 1. Load and display the list of foods
    // 2. Populate dropdowns with food options
    // 3. Handle food creation, editing, and deletion

// ###########################################################



// ======================================================
// IMPORTS
// ======================================================

import { setFoods, getState, setEditing, getNutrients } from '../state.js';
import { FoodsAPI } from '../api/foodsAPI.js';
import { escapeHtml } from '../utils.js';
import { confirmAction } from '../ui/components/modal.js';
import { showSaveSuccessToast } from '../ui/components/toast.js';

// ======================================================
// LOAD FOODS
// ======================================================

export async function loadFoods() {
    const foodList = document.getElementById("foodList");
    //const foodSelect = document.getElementById("foodSelect");
    //const mealFoodSelect = document.getElementById("mealFoodSelect");

    //if (!foodList || !foodSelect || !mealFoodSelect) {
    if (!foodList) {
        console.warn("Foods DOM not found on this page");
        return;
    }

    foodList.innerHTML = "<li>Loading foods...</li>";

    try {
        const data = await FoodsAPI.getAll();
        setFoods(data);
    } catch (err) {
        foodList.innerHTML =
            `<li class="status-error">Unable to load foods: ${err.message}</li>`;
        return;
    }

    const { foods, editing } = getState();

    foodList.innerHTML = "";
    //foodSelect.innerHTML = '<option value="">Select food</option>';
    //mealFoodSelect.innerHTML = '<option value="">Select food</option>';

    foods.forEach(food => {
        const li = document.createElement("li");
        li.id = `food-row-${food.id}`;

        const span = document.createElement("span");
        span.textContent =
            `${food.name}${food.brand ? ` (${food.brand})` : ''}`;

        li.appendChild(span);

        if (editing.foods) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () =>
                showEditFood(food.id, food.name, food.brand);

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () =>
                deleteFood(food.id);

            li.appendChild(editBtn);
            li.appendChild(delBtn);
        }

        foodList.appendChild(li);

        const option = document.createElement("option");
        option.value = food.id;
        option.textContent = food.name;
        //foodSelect.appendChild(option);

        //mealFoodSelect.appendChild(option.cloneNode(true));
    });
}

// ======================================================
// CREATE FOOD
// ======================================================

export async function createFood() {
    const name = document.getElementById("foodName")?.value.trim()
        || document.getElementById("modalFoodName")?.value.trim();
    const brand = document.getElementById("foodBrand")?.value.trim()
        || document.getElementById("modalFoodBrand")?.value.trim()
        || "";
    const priceRaw = document.getElementById("foodPrice")?.value
        || document.getElementById("modalFoodPrice")?.value;

    const price =
        priceRaw === "" || priceRaw == null
            ? null
            : parseFloat(priceRaw);

    if (!name) {
        alert("Please enter a food name");
        return false;
    }

    if (getState().foods.some(f =>
        f.name.trim().toLowerCase() === name.toLowerCase() &&
        (f.brand || "").trim().toLowerCase() === brand.toLowerCase()
    )) {
        alert("This food already exists");
        return false;
    }

    try {
        await FoodsAPI.create({
            name,
            brand: brand || null,
            price
        });

        ["foodName", "foodBrand", "foodPrice", "modalFoodName", "modalFoodBrand", "modalFoodPrice"].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = "";
        });

        await loadFoods();
        showSaveSuccessToast();
        return true;
    } catch (err) {
        alert("Error saving food: " + err.message);
        return false;
    }
}

// ======================================================
// UPDATE FOOD
// ======================================================

export async function saveFood(foodId) {
    const nameInput = document.getElementById(`food-name-edit-${foodId}`);
    const brandInput = document.getElementById(`food-brand-edit-${foodId}`);
    const priceInput = document.getElementById(`food-price-edit-${foodId}`);

    if (!nameInput) return;

    const name = nameInput.value.trim();
    const brand = brandInput?.value.trim() || null;

    const priceRaw = priceInput?.value;
    const price =
        priceRaw === "" || priceRaw == null
            ? null
            : parseFloat(priceRaw);

    if (!name) {
        alert("Please enter a food name");
        return;
    }

    try {
        await FoodsAPI.update(foodId, {
            name,
            brand,
            price
        });

        await loadFoods();
        showSaveSuccessToast();
    } catch (err) {
        alert("Error updating food: " + err.message);
    }
}

// ======================================================
// DELETE FOOD NUTRIENT
// ======================================================

export async function deleteFood(foodId) {
    if (!await confirmAction("Delete this food?")) return;

    try {
        await FoodsAPI.delete(foodId);
        await loadFoods();
    } catch (err) {
        alert("Error deleting food: " + err.message);
    }
}


export async function deleteFoodNutrient(foodId, nutrientId) {
    if (!await confirmAction("Delete this nutrient entry?")) return;

    try {
        await FoodsAPI.deleteNutrient(foodId, nutrientId);
        await loadFoodDetails(foodId);
    } catch (err) {
        alert("Error deleting nutrient: " + err.message);
    }
}

// ======================================================
// ADD NUTRIENT TO FOOD
// ======================================================

export async function addNutrientToFood() {
    const foodId = document.getElementById("foodSelect")?.value;
    const nutrientId = document.getElementById("nutrientSelect")?.value;
    const amount = document.getElementById("amountPer100g")?.value;

    if (!foodId || !nutrientId || !amount) {
        alert("Please fill all fields");
        return;
    }

    try {
        await FoodsAPI.addNutrient(foodId, {
            nutrient_id: parseInt(nutrientId),
            amount_per_100g: parseFloat(amount)
        });

        document.getElementById("amountPer100g").value = "";
        await loadFoodDetails(foodId);
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ======================================================
// FOOD DETAILS
// ======================================================

export async function loadFoodDetails(foodId) {
    const detailsDiv = document.getElementById("foodDetails");
    if (!detailsDiv) return;

    try {
        const [nutrients, macros] = await Promise.all([
            FoodsAPI.getNutrients(foodId),
            FoodsAPI.getMacros(foodId)
        ]);

        detailsDiv.innerHTML = "<h3>Food Nutrients</h3>";

        if (!nutrients.length) {
            detailsDiv.innerHTML += "<p>No nutrients added yet.</p>";
        } else {
            const list = document.createElement("ul");

            nutrients.forEach(entry => {
                const nutrient = getNutrients().find(n => n.id === entry.nutrient_id);
                const name = nutrient ? nutrient.name : `Nutrient ${entry.nutrient_id}`;
                const unit = nutrient ? nutrient.unit : "";

                const li = document.createElement("li");
                li.textContent = `${name}: ${entry.amount_per_100g} ${unit}`;

                list.appendChild(li);
            });

            detailsDiv.appendChild(list);
        }

        if (macros?.macros) {
            const macroBlock = document.createElement("div");
            macroBlock.innerHTML = `
                <h4>Macro summary</h4>
                <p>Protein: ${macros.macros.protein}g</p>
                <p>Carbs: ${macros.macros.carbs}g</p>
                <p>Fat: ${macros.macros.fat}g</p>
                <p>Calories: ${macros.macros.calories} kcal</p>
            `;
            detailsDiv.appendChild(macroBlock);
        }

    } catch (err) {
        detailsDiv.innerHTML = "Failed to load food details.";
        console.warn(err);
    }
}

// ======================================================
// UI EDIT HELPERS (unchanged logic, module-safe)
// ======================================================

export function toggleFoodDetailsEdit() {
    const next = !getState().editing.foodDetails;
    setEditing("foodDetails", next);
    const btn = document.getElementById("food-details-edit-btn");
    if (btn) btn.textContent = next ? "Stop Editing Nutrients in Food" : "Edit Nutrients in Food";
    // Reload if a food is selected
    const foodSelect = document.getElementById("foodSelect");
    if (foodSelect.value) {
        loadFoodDetails();
    }
}


export function toggleFoodEdit() {
    const next = !getState().editing.foods;
    setEditing("foods", next);
    const btn = document.getElementById("food-edit-btn");
    if (btn) btn.textContent = next ? "Stop Editing Foods" : "Edit Foods";
    loadFoods();
}


export function showEditFood(foodId, currentName, currentBrand) {
    const row = document.getElementById(`food-row-${foodId}`);
    if (!row) return;

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.id = `food-name-edit-${foodId}`;
    nameInput.value = currentName;

    const brandInput = document.createElement("input");
    brandInput.id = `food-brand-edit-${foodId}`;
    brandInput.value = currentBrand;

    const priceInput = document.createElement("input");
    priceInput.id = `food-price-edit-${foodId}`;
    priceInput.type = "number";

    const foodObj = getState().foods.find(f => String(f.id) === String(foodId));
    if (foodObj?.price != null) priceInput.value = foodObj.price;

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.onclick = () => saveFood(foodId);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.onclick = () => loadFoods();

    row.append(nameInput, brandInput, priceInput, saveButton, cancelButton);
}
