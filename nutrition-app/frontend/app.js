// const API_URL = "http://localhost:8000";
const API_URL = "https://nutrition-app-vxbz.onrender.com";

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global variables to store data
let nutrients = [];
let foods = [];
let meals = [];

// Edit mode flags
let editingNutrients = false;
let editingFoods = false;
let editingMeals = false;
let editingFoodDetails = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadNutrients();
    loadFoods();
    loadMeals();
});

// Toggle edit functions
function toggleNutrientEdit() {
    editingNutrients = !editingNutrients;
    const btn = document.getElementById("nutrient-edit-btn");
    btn.textContent = editingNutrients ? "Stop Editing Nutrients" : "Edit Nutrients";
    loadNutrients();
}

function toggleFoodEdit() {
    editingFoods = !editingFoods;
    const btn = document.getElementById("food-edit-btn");
    btn.textContent = editingFoods ? "Stop Editing Foods" : "Edit Foods";
    loadFoods();
}

function toggleMealEdit() {
    editingMeals = !editingMeals;
    const btn = document.getElementById("meal-edit-btn");
    btn.textContent = editingMeals ? "Stop Editing Meals" : "Edit Meals";
    loadMeals();
}

function toggleFoodDetailsEdit() {
    editingFoodDetails = !editingFoodDetails;
    const btn = document.getElementById("food-details-edit-btn");
    btn.textContent = editingFoodDetails ? "Stop Editing Nutrients in Food" : "Edit Nutrients in Food";
    // Reload if a food is selected
    const foodSelect = document.getElementById("foodSelect");
    if (foodSelect.value) {
        loadFoodDetails();
    }
}

// Nutrient functions
async function createNutrient() {
    const name = document.getElementById("nutrientName").value.trim();
    const unit = document.getElementById("nutrientUnit").value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    if (nutrients.some(n => n.name.trim().toLowerCase() === name.toLowerCase() && n.unit.trim().toLowerCase() === unit.toLowerCase())) {
        alert("This nutrient already exists");
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            unit: unit
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        document.getElementById("nutrientName").value = "";
        document.getElementById("nutrientUnit").value = "";
        await loadNutrients();
    } else {
        alert("Error saving nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function loadNutrients() {
    const response = await fetch(`${API_URL}/nutrients/`);
    nutrients = await response.json();

    const nutrientList = document.getElementById("nutrientList");
    const nutrientSelect = document.getElementById("nutrientSelect");

    nutrientList.innerHTML = "";
    nutrientSelect.innerHTML = '<option value="">Select nutrient</option>';

    nutrients.forEach(nutrient => {
        const li = document.createElement("li");
        li.id = `nutrient-row-${nutrient.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = `${nutrient.name} (${nutrient.unit})`;
        li.appendChild(textSpan);

        if (editingNutrients) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditNutrient(nutrient.id, nutrient.name, nutrient.unit);
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteNutrient(nutrient.id);
            });
            li.appendChild(deleteButton);
        }

        nutrientList.appendChild(li);

        const option = document.createElement("option");
        option.value = nutrient.id;
        option.text = `${nutrient.name} (${nutrient.unit})`;
        nutrientSelect.appendChild(option);
    });
}

function showEditNutrient(nutrientId, currentName, currentUnit) {
    const row = document.getElementById(`nutrient-row-${nutrientId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `nutrient-name-edit-${nutrientId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Nutrient name";
    row.appendChild(nameInput);

    const unitInput = document.createElement("input");
    unitInput.type = "text";
    unitInput.id = `nutrient-unit-edit-${nutrientId}`;
    unitInput.value = currentUnit;
    unitInput.placeholder = "Unit (e.g., g)";
    row.appendChild(unitInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveNutrient(nutrientId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadNutrients();
    });
    row.appendChild(cancelButton);
}

async function saveNutrient(nutrientId) {
    const nameInput = document.getElementById(`nutrient-name-edit-${nutrientId}`);
    const unitInput = document.getElementById(`nutrient-unit-edit-${nutrientId}`);

    if (!nameInput || !unitInput) {
        return;
    }

    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/${nutrientId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            unit: unit
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadNutrients();
    } else {
        alert("Error updating nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteNutrient(nutrientId) {
    if (!confirm("Delete this nutrient?")) {
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/${nutrientId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadNutrients();
    } else {
        alert("Error deleting nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

// Food functions
async function createFood() {
    const name = document.getElementById("foodName").value.trim();
    const brand = document.getElementById("foodBrand").value.trim();

    if (!name) {
        alert("Please enter a food name");
        return;
    }

    if (foods.some(f => f.name.trim().toLowerCase() === name.toLowerCase() && (f.brand || "").trim().toLowerCase() === brand.toLowerCase())) {
        alert("This food already exists");
        return;
    }

    const response = await fetch(`${API_URL}/foods/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            brand: brand || null
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        document.getElementById("foodName").value = "";
        document.getElementById("foodBrand").value = "";
        await loadFoods();
    } else {
        alert("Error saving food: " + (result.detail || JSON.stringify(result)));
    }
}

async function loadFoods() {
    const response = await fetch(`${API_URL}/foods/`);
    foods = await response.json();

    const foodList = document.getElementById("foodList");
    const foodSelect = document.getElementById("foodSelect");
    const mealFoodSelect = document.getElementById("mealFoodSelect");

    foodList.innerHTML = "";
    foodSelect.innerHTML = '<option value="">Select food</option>';
    mealFoodSelect.innerHTML = '<option value="">Select food</option>';

    foods.forEach(food => {
        const li = document.createElement("li");
        li.id = `food-row-${food.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = `${food.name}${food.brand ? ` (${food.brand})` : ''}`;
        li.appendChild(textSpan);

        if (editingFoods) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditFood(food.id, food.name, food.brand || "");
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteFood(food.id);
            });
            li.appendChild(deleteButton);
        }

        foodList.appendChild(li);

        const option1 = document.createElement("option");
        option1.value = food.id;
        option1.text = `${food.name}${food.brand ? ` (${food.brand})` : ''}`;
        foodSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = food.id;
        option2.text = `${food.name}${food.brand ? ` (${food.brand})` : ''}`;
        mealFoodSelect.appendChild(option2);
    });
}

function showEditFood(foodId, currentName, currentBrand) {
    const row = document.getElementById(`food-row-${foodId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `food-name-edit-${foodId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Food name";
    row.appendChild(nameInput);

    const brandInput = document.createElement("input");
    brandInput.type = "text";
    brandInput.id = `food-brand-edit-${foodId}`;
    brandInput.value = currentBrand;
    brandInput.placeholder = "Brand (optional)";
    row.appendChild(brandInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveFood(foodId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadFoods();
    });
    row.appendChild(cancelButton);
}

async function saveFood(foodId) {
    const nameInput = document.getElementById(`food-name-edit-${foodId}`);
    const brandInput = document.getElementById(`food-brand-edit-${foodId}`);

    if (!nameInput) {
        return;
    }

    const name = nameInput.value.trim();
    const brand = brandInput ? brandInput.value.trim() : null;

    if (!name) {
        alert("Please enter a food name");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            brand: brand || null
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadFoods();
    } else {
        alert("Error updating food: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteFood(foodId) {
    if (!confirm("Delete this food item?")) {
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadFoods();
        const foodDetails = document.getElementById("foodDetails");
        if (foodDetails) {
            foodDetails.innerHTML = "";
        }
    } else {
        alert("Error deleting food: " + (result.detail || JSON.stringify(result)));
    }
}

// Food details functions
async function loadFoodDetails() {
    const foodId = document.getElementById("foodSelect").value;
    if (!foodId) {
        alert("Please select a food");
        return;
    }

    const [nutrientResponse, macroResponse] = await Promise.all([
        fetch(`${API_URL}/foods/${foodId}/nutrients`),
        fetch(`${API_URL}/foods/${foodId}/macros`)
    ]);

    const nutrientData = nutrientResponse.ok ? await nutrientResponse.json() : [];
    const macroData = macroResponse.ok ? await macroResponse.json() : null;

    const detailsDiv = document.getElementById("foodDetails");
    detailsDiv.innerHTML = "<h3>Food Nutrients</h3>";

    if (nutrientData.length === 0) {
        detailsDiv.innerHTML += "<p>No nutrients added yet.</p>";
    } else {
        const list = document.createElement("ul");

        nutrientData.forEach(entry => {
            const nutrient = nutrients.find(n => n.id === entry.nutrient_id);
            const name = nutrient ? nutrient.name : `Nutrient ${entry.nutrient_id}`;
            const unit = nutrient ? nutrient.unit : "";

            const li = document.createElement("li");
            li.id = `nutrient-row-${entry.nutrient_id}`;

            const strong = document.createElement("strong");
            strong.textContent = `${name}: `;
            li.appendChild(strong);

            const span = document.createElement("span");
            span.id = `nutrient-amt-${entry.nutrient_id}`;
            span.textContent = entry.amount_per_100g;
            li.appendChild(span);

            const unitText = document.createTextNode(` ${unit} `);
            li.appendChild(unitText);

            if (editingFoodDetails) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "green-button";
                editButton.textContent = "Edit";
                editButton.addEventListener("click", () => {
                    showEditNutrientAmount(foodId, entry.nutrient_id, entry.amount_per_100g, name);
                });
                li.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "red-button";
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener("click", () => {
                    deleteFoodNutrient(foodId, entry.nutrient_id);
                });
                li.appendChild(deleteButton);
            }

            list.appendChild(li);
        });

        detailsDiv.appendChild(list);
    }

    if (macroResponse.ok && macroData && macroData.macros) {
        const macroBlock = document.createElement("div");
        macroBlock.innerHTML = `
            <h4>Macro summary</h4>
            <p>Protein: ${macroData.macros.protein}g</p>
            <p>Carbs: ${macroData.macros.carbs}g</p>
            <p>Fat: ${macroData.macros.fat}g</p>
            <p>Calories: ${macroData.macros.calories} kcal</p>
        `;
        detailsDiv.appendChild(macroBlock);
    }
}

function showEditNutrientAmount(foodId, nutrientId, currentAmount, nutrientName) {
    const row = document.getElementById(`nutrient-row-${nutrientId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const strong = document.createElement("strong");
    strong.textContent = `${nutrientName}: `;
    row.appendChild(strong);

    const input = document.createElement("input");
    input.id = `editAmount-${nutrientId}`;
    input.type = "number";
    input.step = "0.1";
    input.value = currentAmount;
    row.appendChild(input);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveNutrientAmount(foodId, nutrientId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadFoodDetails();
    });
    row.appendChild(cancelButton);
}

async function saveNutrientAmount(foodId, nutrientId) {
    const input = document.getElementById(`editAmount-${nutrientId}`);
    if (!input) {
        return;
    }

    const amount = parseFloat(input.value);
    if (Number.isNaN(amount)) {
        alert("Please enter a valid amount");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients/${nutrientId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount_per_100g: amount
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        loadFoodDetails();
    } else {
        alert("Error updating nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteFoodNutrient(foodId, nutrientId) {
    if (!confirm("Delete this nutrient entry?")) {
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients/${nutrientId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        loadFoodDetails();
    } else {
        alert("Error deleting nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function addNutrientToFood() {
    const foodId = document.getElementById("foodSelect").value;
    const nutrientId = document.getElementById("nutrientSelect").value;
    const amount = document.getElementById("amountPer100g").value;

    if (!foodId || !nutrientId || !amount) {
        alert("Please fill all fields");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nutrient_id: parseInt(nutrientId),
            amount_per_100g: parseFloat(amount)
        })
    });

    if (response.ok) {
        document.getElementById("amountPer100g").value = "";
        loadFoodDetails();
    } else {
        const error = await response.json();
        alert("Error: " + error.detail);
    }
}

// Meal functions
async function createMeal() {
    const name = document.getElementById("mealName").value;

    if (!name) {
        alert("Please enter a meal name");
        return;
    }

    if (meals.some(m => m.name.trim().toLowerCase() === name.toLowerCase())) {
        alert("This meal already exists");
        return;
    }

    const response = await fetch(`${API_URL}/meals/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    });

    if (response.ok) {
        document.getElementById("mealName").value = "";
        loadMeals();
    }
}

async function loadMeals() {
    const response = await fetch(`${API_URL}/meals/`);
    meals = await response.json();

    const mealList = document.getElementById("mealList");
    const mealSelect = document.getElementById("mealSelect");

    mealList.innerHTML = "";
    mealSelect.innerHTML = '<option value="">Select meal</option>';

    meals.forEach(meal => {
        const li = document.createElement("li");
        li.id = `meal-row-${meal.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = meal.name;
        li.appendChild(textSpan);

        if (editingMeals) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditMeal(meal.id, meal.name);
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteMeal(meal.id);
            });
            li.appendChild(deleteButton);
        }

        mealList.appendChild(li);

        const option = document.createElement("option");
        option.value = meal.id;
        option.text = meal.name;
        mealSelect.appendChild(option);
    });
}

function showEditMeal(mealId, currentName) {
    const row = document.getElementById(`meal-row-${mealId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `meal-name-edit-${mealId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Meal name";
    row.appendChild(nameInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveMeal(mealId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadMeals();
    });
    row.appendChild(cancelButton);
}

async function saveMeal(mealId) {
    const nameInput = document.getElementById(`meal-name-edit-${mealId}`);
    if (!nameInput) {
        return;
    }

    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a meal name");
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadMeals();
    } else {
        alert("Error updating meal: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteMeal(mealId) {
    if (!confirm("Delete this meal?")) {
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadMeals();
        const mealDetails = document.getElementById("mealDetails");
        if (mealDetails) {
            mealDetails.innerHTML = "";
        }
    } else {
        alert("Error deleting meal: " + (result.detail || JSON.stringify(result)));
    }
}

// Barcode scanning functions
function scanBarcode() {
    const scannerDiv = document.getElementById("barcode-scanner");
    scannerDiv.style.display = "block";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.log(err);
            alert("Error initializing camera: " + err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        stopScanning();
        fetchFoodFromAPI(code);
    });
}

function stopScanning() {
    Quagga.stop();
    const scannerDiv = document.getElementById("barcode-scanner");
    scannerDiv.style.display = "none";
}

// Fetch food data from Open Food Facts API
async function fetchFoodFromAPI(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = data.product;
            const name = product.product_name || "Unknown Product";
            const brand = product.brands || "";
            const productNutrients = product.nutriments || {};

            // Populate the form
            document.getElementById("foodName").value = name;
            document.getElementById("foodBrand").value = brand;

            // Create the food
            await createFood();

            // Get the newly created food ID (assuming it's the last one)
            await loadFoods();
            const newFood = foods[foods.length - 1];
            if (newFood) {
                // Add nutrients
                const nutrientMap = {
                    "energy-kcal_100g": { name: "Energy", unit: "kcal" },
                    "proteins_100g": { name: "Protein", unit: "g" },
                    "carbohydrates_100g": { name: "Carbohydrates", unit: "g" },
                    "fat_100g": { name: "Fat", unit: "g" },
                    "fiber_100g": { name: "Fiber", unit: "g" },
                    "sugars_100g": { name: "Sugars", unit: "g" },
                    "sodium_100g": { name: "Sodium", unit: "mg" },
                };

                for (const [key, value] of Object.entries(productNutrients)) {
                    if (nutrientMap[key] && value) {
                        let nutrient = nutrients.find(n => n.name.toLowerCase() === nutrientMap[key].name.toLowerCase() && n.unit.toLowerCase() === nutrientMap[key].unit.toLowerCase());
                        if (!nutrient) {
                            const createResponse = await fetch(`${API_URL}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: nutrientMap[key].name, unit: nutrientMap[key].unit })
                            });
                            if (createResponse.ok) {
                                const newNutrient = await createResponse.json();
                                nutrients.push(newNutrient);
                                nutrient = newNutrient;
                                loadNutrients();
                            }
                        }
                        if (nutrient) {
                            await fetch(`${API_URL}/foods/${newFood.id}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ nutrient_id: nutrient.id, amount_per_100g: value })
                            });
                        }
                    }
                }
                const foodSelect = document.getElementById("foodSelect");
                if (foodSelect.value == newFood.id) {
                    loadFoodDetails();
                }
            }
        } else {
            alert("Product not found in database");
        }
    } catch (error) {
        console.error("Error fetching food data:", error);
        alert("Error fetching food data");
    }
}

// Meal details functions
async function loadMealDetails() {
    const mealId = document.getElementById("mealSelect").value;
    if (!mealId) {
        alert("Please select a meal");
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}/macros`);
    const data = await response.json();

    const detailsDiv = document.getElementById("mealDetails");
    detailsDiv.innerHTML = `
        <h3>${data.meal} - Macros</h3>
        <p>Protein: ${data.totals.protein}g</p>
        <p>Carbs: ${data.totals.carbs}g</p>
        <p>Fat: ${data.totals.fat}g</p>
        <p>Calories: ${data.totals.calories} kcal</p>
    `;
}

async function addFoodToMeal() {
    const mealId = document.getElementById("mealSelect").value;
    const foodId = document.getElementById("mealFoodSelect").value;
    const grams = document.getElementById("foodGrams").value;

    if (!mealId || !foodId || !grams) {
        alert("Please fill all fields");
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}/items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            items: [{
                food_id: parseInt(foodId),
                grams: parseFloat(grams)
            }]
        })
    });

    if (response.ok) {
        document.getElementById("foodGrams").value = "";
        loadMealDetails();
    } else {
        const error = await response.json();
        alert("Error: " + error.detail);
    }
}