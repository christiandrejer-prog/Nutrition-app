import { setMeals, getState, setEditing } from '../state.js';
import { MealsAPI } from '../api/mealsAPI.js';
import { escapeHtml } from '../utils.js';
import { openFormModal } from '../ui/components/modal.js';
import { openSearchDatabaseModal } from './search.js';

let pendingMealFoodSelection = null;

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
            `<li class="status-error">Unable to load meals: ${escapeHtml(err.message)}</li>`;
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
            editBtn.type = "button";
            editBtn.textContent = "Edit";
            editBtn.onclick = () => showEditMeal(meal.id, meal.name);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.textContent = "Delete";
            delBtn.onclick = () => deleteMeal(meal.id);

            li.append(editBtn, delBtn);
        }

        mealList.appendChild(li);

        const option = document.createElement("option");
        option.value = meal.id;
        option.textContent = meal.name;
        mealSelect.appendChild(option);
    });
}

export async function createMeal() {
    const name = document.getElementById("mealName")?.value?.trim()
        || document.getElementById("modalMealPrepName")?.value?.trim();

    if (!name) {
        alert("Please enter a meal name");
        return false;
    }

    if (getState().meals.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert("This meal already exists");
        return false;
    }

    try {
        await MealsAPI.create({ name });

        const pageInput = document.getElementById("mealName");
        const modalInput = document.getElementById("modalMealPrepName");
        if (pageInput) pageInput.value = "";
        if (modalInput) modalInput.value = "";

        await loadMeals();
        return true;
    } catch (err) {
        alert("Error creating meal: " + err.message);
        return false;
    }
}

export async function deleteMeal(mealId) {
    if (!confirm("Delete this meal?")) return;

    try {
        await MealsAPI.delete(mealId);
        await loadMeals();
    } catch (err) {
        alert("Error deleting meal: " + err.message);
    }
}

export function toggleMealEdit() {
    const next = !getState().editing.meals;
    setEditing("meals", next);
    const btn = document.getElementById("meal-edit-btn");
    if (btn) btn.textContent = next ? "Stop Editing Meals" : "Edit Meals";
    loadMeals();
}

export function showEditMeal(mealId, currentName) {
    const row = document.getElementById(`meal-row-${mealId}`);
    if (!row) return;

    row.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.id = `meal-name-edit-${mealId}`;

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => saveMeal(mealId);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => loadMeals();

    row.append(input, saveBtn, cancelBtn);
}

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

export async function loadMealDetails(mealId = document.getElementById("mealSelect")?.value) {
    if (!mealId) return;
    await showMealDetailsModal(mealId);
}

export async function showMealDetailsModal(mealId, { edit = false, onChanged } = {}) {
    try {
        const data = await MealsAPI.getDetailed(mealId);

        openFormModal({
            title: data.meal_name || "Meal",
            submitLabel: edit ? "Done" : "Edit",
            cancelLabel: edit ? "Back" : "Close",
            size: "modal-lg",
            body: renderMealDetailsBody(data, edit),
            onCancel: edit
                ? async () => {
                    await showMealDetailsModal(mealId, { edit: false, onChanged });
                }
                : undefined,
            onHidden: undefined,
            onSubmit: async () => {
                if (!edit) {
                    await showMealDetailsModal(mealId, { edit: true, onChanged });
                    return;
                }

                await showMealDetailsModal(mealId, { edit: false, onChanged });
                await onChanged?.();
            }
        });

        if (edit) {
            pendingMealFoodSelection = {
                ...(pendingMealFoodSelection || {}),
                mealId,
                onChanged
            };
            bindMealDetailsEditActions(mealId, onChanged);
        } else {
            pendingMealFoodSelection = null;
        }
    } catch (err) {
        console.warn(err);
        alert("Failed to load meal.");
    }
}

function renderMealDetailsBody(data, edit) {
    const totals = data.totals || {};
    const summary = `
        <div class="border rounded p-3 mb-3 bg-light">
            <div><strong>Calories:</strong> ${escapeHtml(String(totals.calories ?? 0))} kcal</div>
            <div><strong>Protein:</strong> ${escapeHtml(String(totals.protein ?? 0))} g</div>
            <div><strong>Carbs:</strong> ${escapeHtml(String(totals.carbs ?? 0))} g</div>
            <div><strong>Fat:</strong> ${escapeHtml(String(totals.fat ?? 0))} g</div>
        </div>
    `;

    const addFood = edit
        ? `
            <hr>
            <h6>Add food</h6>
            <div class="drink-ingredient-add-row d-flex flex-wrap align-items-start gap-2">
                <div class="drink-ingredient-food-control">
                    <label class="form-label mb-1">Food</label>
                    <div id="mealDetailSelectedFood" class="border rounded p-2 small">
                        ${renderPendingMealFood(data.meal_id)}
                    </div>
                    <button id="mealDetailSelectFoodBtn" class="btn btn-outline-primary btn-sm mt-2" type="button">
                        Search food
                    </button>
                </div>
                <div class="drink-ingredient-amount-control">
                    <label class="form-label mb-1" for="mealDetailAmount">Amount</label>
                    <input id="mealDetailAmount" class="form-control" type="number" min="0" step="0.1">
                </div>
                <div class="drink-ingredient-unit-control">
                    <label class="form-label mb-1" for="mealDetailUnit">Unit</label>
                    <select id="mealDetailUnit" class="form-select">
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="cl">cl</option>
                    </select>
                </div>
                <div class="drink-ingredient-add-control">
                    <button id="mealDetailAddFoodBtn" class="btn btn-primary" type="button">Add</button>
                </div>
            </div>
        `
        : "";

    if (!data.items?.length) {
        return `
            ${summary}
            <div class="alert alert-warning">No items found.</div>
            ${addFood}
        `;
    }

    const rows = data.items.map(item => renderMealItemRow(item, edit)).join("");

    return `
        ${summary}
        <div class="list-group">
            ${rows}
        </div>
        ${addFood}
    `;
}

function renderPendingMealFood(mealId) {
    const selected = pendingMealFoodSelection?.mealId === mealId
        ? pendingMealFoodSelection.food
        : null;

    if (!selected) {
        return '<span class="text-muted">No food selected.</span>';
    }

    return `
        <strong>${escapeHtml(selected.name)}</strong>
        ${selected.brand ? `<span class="text-muted">(${escapeHtml(selected.brand)})</span>` : ""}
    `;
}

function renderMealItemRow(item, edit) {
    const foodName = `${item.food_name || "Food"}${item.food_brand ? ` (${item.food_brand})` : ""}`;

    if (!edit) {
        return `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${escapeHtml(foodName)}</strong>
                    <div class="small text-muted">
                        ${escapeHtml(String(item.calories ?? 0))} kcal
                    </div>
                </div>
                <span>${escapeHtml(String(item.amount ?? 0))} ${escapeHtml(item.unit || "g")}</span>
            </div>
        `;
    }

    return `
        <div class="list-group-item meal-item-edit-row" data-item-id="${item.id}">
            <div class="fw-semibold mb-2">${escapeHtml(foodName)}</div>
            <div class="drink-ingredient-edit-row d-flex flex-wrap align-items-center gap-2">
                <div class="drink-ingredient-amount-control">
                    <input class="form-control form-control-sm meal-item-amount" type="number" min="0" step="0.1" value="${escapeHtml(String(item.amount ?? 0))}">
                </div>
                <div class="drink-ingredient-unit-control">
                    <select class="form-select form-select-sm meal-item-unit">
                        ${["g", "ml", "cl"].map(unit => `
                            <option value="${unit}" ${item.unit === unit ? "selected" : ""}>${unit}</option>
                        `).join("")}
                    </select>
                </div>
                <div class="drink-ingredient-actions-control d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary meal-item-save" type="button">Save</button>
                    <button class="btn btn-sm btn-outline-danger meal-item-delete" type="button">Delete</button>
                </div>
            </div>
        </div>
    `;
}

function bindMealDetailsEditActions(mealId, onChanged) {
    document.querySelectorAll(".meal-item-edit-row").forEach(row => {
        const itemId = Number(row.dataset.itemId);

        row.querySelector(".meal-item-save")?.addEventListener("click", async () => {
            const amount = Number(row.querySelector(".meal-item-amount")?.value);
            const unit = row.querySelector(".meal-item-unit")?.value || "g";

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Enter a positive amount.");
                return;
            }

            try {
                await MealsAPI.updateItem(mealId, itemId, { amount, unit });
                await onChanged?.();
                await showMealDetailsModal(mealId, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to update meal item: " + error.message);
            }
        });

        row.querySelector(".meal-item-delete")?.addEventListener("click", async () => {
            if (!confirm("Delete this meal item?")) return;

            try {
                await MealsAPI.deleteItem(mealId, itemId);
                await onChanged?.();
                await showMealDetailsModal(mealId, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to delete meal item: " + error.message);
            }
        });
    });

    document.getElementById("mealDetailSelectFoodBtn")?.addEventListener("click", async () => {
        pendingMealFoodSelection = {
            ...(pendingMealFoodSelection || {}),
            mealId,
            amount: document.getElementById("mealDetailAmount")?.value || "",
            unit: document.getElementById("mealDetailUnit")?.value || "g",
            onChanged
        };

        await openSearchDatabaseModal("foods", {
            mode: "select",
            selectLabel: "Use food",
            onSelect: async food => {
                pendingMealFoodSelection = {
                    ...(pendingMealFoodSelection || {}),
                    mealId,
                    food,
                    onChanged
                };
                await showMealDetailsModal(mealId, { edit: true, onChanged });
            }
        });
    });

    const amountInput = document.getElementById("mealDetailAmount");
    const unitSelect = document.getElementById("mealDetailUnit");

    if (pendingMealFoodSelection?.mealId === mealId) {
        if (amountInput && pendingMealFoodSelection.amount) {
            amountInput.value = pendingMealFoodSelection.amount;
        }
        if (unitSelect && pendingMealFoodSelection.unit) {
            unitSelect.value = pendingMealFoodSelection.unit;
        }
    }

    document.getElementById("mealDetailAddFoodBtn")?.addEventListener("click", async () => {
        const foodId = pendingMealFoodSelection?.mealId === mealId
            ? pendingMealFoodSelection.food?.id
            : null;
        const amount = Number(document.getElementById("mealDetailAmount")?.value);
        const unit = document.getElementById("mealDetailUnit")?.value || "g";

        if (!foodId || !Number.isFinite(amount) || amount <= 0) {
            alert("Select a food and enter a positive amount.");
            return;
        }

        try {
            await MealsAPI.addItem(mealId, {
                items: [{
                    food_id: Number(foodId),
                    amount,
                    unit
                }]
            });
            pendingMealFoodSelection = {
                mealId,
                onChanged
            };
            await onChanged?.();
            await showMealDetailsModal(mealId, { edit: true, onChanged });
        } catch (error) {
            alert("Unable to add food: " + error.message);
        }
    });
}

export function toggleMealDetailsEdit() {
    const next = !getState().editing.mealItems;
    setEditing("mealItems", next);
    const btn = document.getElementById("meal-details-edit-btn");
    if (btn) btn.textContent = next ? "Stop Editing Meal Items" : "Edit Meal Items";
}

export function openAddMealItemModal() {
    const modal = document.getElementById("modalAddMealItem");
    if (modal && typeof bootstrap !== "undefined") {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

export async function searchMealItemFoods() {
    alert("Food search for meal items is not wired yet.");
}

export async function addMealItemToSelectedMeal() {
    alert("Adding meal items is not wired yet.");
}
