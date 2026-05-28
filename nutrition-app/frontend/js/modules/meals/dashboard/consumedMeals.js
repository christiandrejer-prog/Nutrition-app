import { getApiUrl } from "../../../config.js";
import { getMeals } from "../../../state.js";
import { escapeHtml } from "../../../utils.js";
import { FoodsAPI } from "../../../api/foodsAPI.js";
import { MealsAPI } from "../../../api/mealsAPI.js";
import { closeAppModal, openFormModal } from "../../../ui/components/modal.js";
import { hideHoverBox, showHoverBox } from "../../../ui/components/hoverBox.js";
import { loadFoods } from "../../foods.js";
import { loadMeals, showMealDetailsModal } from "../../meals.js";
import { openSearchDatabaseModal } from "../../search.js";
import { loadDashboardIntakeSummary } from "./intake.js";

let consumedMealsDeleteMode = false;

export async function initMealsDashboard() {
    bindDashboardControls();
}

export async function loadDashboardConsumedMeals() {
    const container = document.getElementById("dashboardConsumedMealsList");
    if (!container) return;
    container.innerHTML = '<div class="text-muted">Loading today\'s consumed meals...</div>';

    try {
        const response = await fetch(`${getApiUrl()}/intake/`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const entries = await response.json();
        if (!Array.isArray(entries) || entries.length === 0) {
            container.innerHTML = '<div class="text-muted">No consumed meals recorded today.</div>';
            return;
        }

        const grid = document.createElement("div");
        grid.className = "drink-grid";

        entries.forEach(entry => {
            grid.appendChild(renderConsumedMealItem(entry));
        });

        container.innerHTML = "";
        container.appendChild(grid);
    } catch (error) {
        container.innerHTML = `
            <div class="text-danger">
                Unable to load consumed meals: ${escapeHtml(error.message || String(error))}
            </div>
        `;
    }
}

export async function addConsumedMeal(mealId) {
    const response = await fetch(`${getApiUrl()}/intake/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            meal_id: mealId
        })
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        alert(`Failed to add consumed meal: HTTP ${response.status} ${response.statusText} - ${errorText}`);
        return;
    }

    await loadDashboardConsumedMeals();
    await loadDashboardIntakeSummary();
}

export async function addConsumedMealUI() {
    await openSearchDatabaseModal("meals", {
        mode: "select",
        selectLabel: "Add meal",
        onSelect: meal => addConsumedMeal(meal.id)
    });
}

export function toggleConsumedMealDeleteMode() {
    consumedMealsDeleteMode = !consumedMealsDeleteMode;

    const btn = document.getElementById("dashboardRemoveConsumedMealBtn")
        || document.querySelector('[data-action="toggle-consumed-meal-delete-mode"]');

    if (btn) {
        btn.textContent = consumedMealsDeleteMode
            ? "Exit delete mode"
            : "Delete";
    }

    loadDashboardConsumedMeals();
}

function bindDashboardControls() {
    bindClick("dashboardAddConsumedMealBtn", addConsumedMealUI);
    bindClick("dashboardAddFoodToMealBtn", addFoodToMealUI);
    bindClick("dashboardCreateMealBtn", handleCreateMeal);
    bindClick("dashboardCreateFoodBtn", handleCreateFood);
    bindClick("dashboardRemoveConsumedMealBtn", toggleConsumedMealDeleteMode);
}

function bindClick(id, handler) {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener("click", handler);
}

function renderConsumedMealItem(entry) {
    const meals = getMeals();
    const mealName = entry.meal_id
        ? meals.find(m => Number(m.id) === Number(entry.meal_id))?.name || `Meal ${entry.meal_id}`
        : "Custom entry";

    const item = document.createElement("button");
    item.type = "button";
    item.className = "drink-item";
    item.innerHTML = `
        <div class="drink-name">${escapeHtml(mealName)}</div>
        <div class="small text-muted">${escapeHtml(formatEntryTime(entry.created_at))}</div>
    `;

    item.addEventListener("mouseenter", () => {
        showHoverBox(item, [
            `${entry.calories} kcal`,
            `Protein ${entry.protein} g`,
            `Carbs ${entry.carbs} g`,
            `Fat ${entry.fat} g`
        ]);
    });
    item.addEventListener("mouseleave", hideHoverBox);

    if (consumedMealsDeleteMode) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "drink-delete";
        deleteButton.textContent = "x";
        deleteButton.addEventListener("click", async event => {
            event.stopPropagation();
            await deleteConsumedMeal(entry.id);
        });
        item.appendChild(deleteButton);
    }

    return item;
}

async function deleteConsumedMeal(entryId) {
    try {
        const response = await fetch(`${getApiUrl()}/intake/${entryId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await loadDashboardConsumedMeals();
        await loadDashboardIntakeSummary();
    } catch (error) {
        console.error("Unable to delete consumed meal", error);
        alert(`Unable to delete entry: ${error.message}`);
    }
}

async function addFoodToMealUI() {
    await openSearchDatabaseModal("meals", {
        mode: "select",
        selectLabel: "Edit meal",
        onSelect: meal => showMealDetailsModal(meal.id, {
            edit: true,
            onChanged: refreshMealDashboard
        })
    });
}

async function refreshMealDashboard() {
    await loadMeals();
    await loadDashboardConsumedMeals();
    await loadDashboardIntakeSummary();
}

function handleCreateMeal() {
    openFormModal({
        title: "Create Meal",
        submitLabel: "Create",
        body: `
            <label class="form-label" for="dynamicMealName">Meal name</label>
            <input id="dynamicMealName" class="form-control" placeholder="e.g. Chicken and rice">
        `,
        onSubmit: async modal => {
            const name = modal.querySelector("#dynamicMealName")?.value?.trim();
            if (!name) {
                alert("Enter meal name.");
                return;
            }

            await MealsAPI.create({ name });
            await loadMeals();
            closeAppModal();
        }
    });
}

function handleCreateFood() {
    openFormModal({
        title: "Create Food",
        submitLabel: "Create",
        body: `
            <label class="form-label" for="dynamicFoodName">Food name</label>
            <input id="dynamicFoodName" class="form-control mb-3" placeholder="e.g. Skyr">
            <label class="form-label" for="dynamicFoodBrand">Brand</label>
            <input id="dynamicFoodBrand" class="form-control mb-3" placeholder="Optional">
            <label class="form-label" for="dynamicFoodPrice">Price</label>
            <input id="dynamicFoodPrice" class="form-control" type="number" min="0" step="0.01" placeholder="Optional">
        `,
        onSubmit: async modal => {
            const name = modal.querySelector("#dynamicFoodName")?.value?.trim();
            const brand = modal.querySelector("#dynamicFoodBrand")?.value?.trim() || null;
            const priceValue = modal.querySelector("#dynamicFoodPrice")?.value || "";
            const price = priceValue === "" ? null : Number(priceValue);

            if (!name) {
                alert("Enter food name.");
                return;
            }
            if (priceValue !== "" && (!Number.isFinite(price) || price < 0)) {
                alert("Price must be zero or higher.");
                return;
            }

            await FoodsAPI.create({ name, brand, price });
            await loadFoods();
            closeAppModal();
        }
    });
}

function formatEntryTime(value) {
    if (!value) return "--:--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}
