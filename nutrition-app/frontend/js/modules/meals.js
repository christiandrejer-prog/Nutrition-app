// meals.js responsibilities:
    // 1. Load meals from API and display in table
        // also populate meal dropdowns for adding foods to meals
    // 2. Handle meal editing (name, time)
    // 3. Handle adding foods to meals (meal details page)
    // 4. Handle meal deletion

// ###########################################################



// ======================================================
// IMPORTS
// ======================================================

import { setMeals, getState } from '../state.js';
import { MealsAPI } from '../api/mealsAPI.js';
import { escapeHtml } from '../utils.js';

// ======================================================
// PUBLIC API
// ======================================================

export async function loadMeals() {
    const mealList = document.getElementById("mealList");
    const mealSelect = document.getElementById("mealSelect");

    if (!mealList || !mealSelect) return;

    mealList.innerHTML = "<li>Loading meals...</li>";

    try {
        const data = await MealsAPI.getAll();
        setMeals(data);
    } catch (err) {
        mealList.innerHTML =
            `<li class="status-error">Unable to load meals: ${err.message}</li>`;
        return;
    }

    const { meals, editing } = getState();

    mealList.innerHTML = "";
    mealSelect.innerHTML = '<option value="">Select meal</option>';

    meals.forEach(meal => {
        const li = document.createElement("li");
        li.id = `meal-row-${meal.id}`;

        const span = document.createElement("span");
        span.textContent = meal.name;

        li.appendChild(span);

        if (editing.meals) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () =>
                showEditMeal(meal.id, meal.name);

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () =>
                deleteMeal(meal.id);

            li.appendChild(editBtn);
            li.appendChild(delBtn);
        }

        mealList.appendChild(li);

        const option = document.createElement("option");
        option.value = meal.id;
        option.textContent = meal.name;

        mealSelect.appendChild(option);
    });
}

// ======================================================
// CREATE
// ======================================================

export async function createMeal() {
    const name = document.getElementById("mealName")?.value?.trim();

    if (!name) {
        alert("Please enter a meal name");
        return;
    }

    if (mealsCache.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert("This meal already exists");
        return;
    }

    try {
        await MealsAPI.create({ name });

        document.getElementById("mealName").value = "";
        await loadMeals();

    } catch (err) {
        alert("Error creating meal: " + err.message);
    }
}

// ======================================================
// DELETE
// ======================================================

export async function deleteMeal(mealId) {
    if (!confirm("Delete this meal?")) return;

    try {
        await MealsAPI.delete(mealId);
        await loadMeals();
    } catch (err) {
        alert("Error deleting meal: " + err.message);
    }
}

// ======================================================
// EDIT UI
// ======================================================

export function showEditMeal(mealId, currentName) {
    const row = document.getElementById(`meal-row-${mealId}`);
    if (!row) return;

    row.innerHTML = "";

    const input = document.createElement("input");
    input.value = currentName;
    input.id = `meal-name-edit-${mealId}`;

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "green-button";
    saveBtn.onclick = () => saveMeal(mealId);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => loadMeals();

    row.appendChild(input);
    row.appendChild(saveBtn);
    row.appendChild(cancelBtn);
}

// ======================================================
// UPDATE
// ======================================================

export async function saveMeal(mealId) {
    const input = document.getElementById(`meal-name-edit-${mealId}`);
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
        alert("Meal name required");
        return;
    }

    try {
        await MealsAPI.update(mealId, { name });
        await loadMeals();
    } catch (err) {
        alert("Error updating meal: " + err.message);
    }
}

// ======================================================
// DETAILS (kept minimal here — your existing modal logic can stay)
// ======================================================

export async function showMealDetailsModal(mealId) {
    const modal = document.getElementById('modalMealDetails');
    const content = document.getElementById('modalMealDetailsContent');

    if (!modal || !content) return;

    content.innerHTML = '<p>Loading meal details...</p>';

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    try {
        const data = await MealsAPI.getDetailed(mealId);

        let html = `
            <h5>Meal: ${escapeHtml(data.meal_name || 'Meal')}</h5>
        `;

        if (!data.items?.length) {
            html += `<div class="alert alert-warning">No items found.</div>`;
        } else {
            html += `<div class="list-group">`;

            data.items.forEach(item => {
                html += `
                    <div class="list-group-item">
                        <strong>${escapeHtml(item.food_name)}</strong>
                        <div>${item.grams} g</div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        content.innerHTML = html;

    } catch (err) {
        console.warn(err);
        content.innerHTML = `<div class="alert alert-danger">Failed to load meal.</div>`;
    }
}