// drinks.js responsibilities:
    // 1. Load and display drinks
    // 2. Handle drink list operations
    // 3. Dashboard aggregation + chart rendering

// ###########################################################



// ======================================================
// IMPORTS
// ======================================================

import { setDrinks, setDrinkLists, setDeleteMode, getState } from '../state.js';
import { DrinksAPI } from '../api/drinksAPI.js';
import { escapeHtml } from '../utils.js';
import { openFormModal } from '../ui/components/modal.js';
import { openSearchDatabaseModal } from './search.js';
import {
    convertMeasurement,
    formatAmount,
    getCompatibleDisplayUnit,
    getPreferredMeasurementUnit,
    renderUnitOptions
} from './settings.js';
import { hideHoverBox, showHoverBox } from '../ui/components/hoverBox.js';

let pendingDrinkIngredientSelection = null;

// ======================================================
// LOAD DRINKS
// ======================================================

export async function loadDrinks() {
    try {
        const data = await DrinksAPI.getAll();
        setDrinks(data);
    } catch (err) {
        console.warn("Unable to load drinks", err);
        setDrinks([]);
    }
}

// ======================================================
// LOAD DRINK LISTS
// ======================================================

export async function loadDrinkLists() {
    let drinkListsCache = [];
    try {
        drinkListsCache = await DrinksAPI.getLists();
    } catch (error) {
        console.warn("Unable to load drink lists:", error);
        drinkListsCache = [];
    }
    setDrinkLists(drinkListsCache);
    return drinkListsCache;
}

export async function createDrink() {
    const name = document.getElementById("modalDrinkName")?.value?.trim();
    if (!name) {
        alert("Enter drink name");
        return false;
    }

    try {
        await DrinksAPI.create({ name });
        document.getElementById("modalDrinkName").value = "";
        await loadDrinks();
        return true;
    } catch (error) {
        alert("Failed to add drink: " + error.message);
        return false;
    }
}

export async function createDrinkList() {
    const name = document.getElementById("modalDrinkListName")?.value?.trim();
    if (!name) {
        alert("Enter drink list name");
        return false;
    }

    try {
        await DrinksAPI.createList({ name });
        document.getElementById("modalDrinkListName").value = "";
        await loadDrinkLists();
        return true;
    } catch (error) {
        alert("Failed to add drink list: " + error.message);
        return false;
    }
}

// ======================================================
// ADD DRINK TO LIST
// ======================================================

export async function addDrinkListItem(listId, drinkId, quantity = 1) {
    const qty = Number(quantity || 1);

    if (!listId || !drinkId || qty <= 0) {
        alert("Invalid input");
        return false;
    }

    try {
        await DrinksAPI.addListItem(listId, {
            drink_id: parseInt(drinkId, 10),
            quantity: qty
        });

        await loadDrinkLists();
        await loadDashboardDrinkChart(listId);
        return true;

    } catch (error) {
        alert("Unable to add drink: " + error.message);
        return false;
    }
}

export async function showDrinkDetailsModal(drinkId, { edit = false, onChanged } = {}) {
    let drink;

    try {
        drink = await DrinksAPI.getDetail(drinkId);
    } catch (error) {
        alert("Unable to load drink: " + error.message);
        return;
    }

    openFormModal({
        title: drink.name,
        submitLabel: edit ? "Done" : "Edit",
        cancelLabel: edit ? "Back" : "Close",
        size: "modal-lg",
        body: renderDrinkDetailsBody(drink, edit),
        onCancel: edit
            ? async () => {
                await showDrinkDetailsModal(drinkId, { edit: false, onChanged });
            }
            : undefined,
        onHidden: undefined,
        onSubmit: async modal => {
            if (!edit) {
                showDrinkDetailsModal(drinkId, { edit: true, onChanged });
                return;
            }

            await showDrinkDetailsModal(drinkId, { edit: false, onChanged });
            await onChanged?.();
        }
    });

    if (edit) {
        pendingDrinkIngredientSelection = {
            ...(pendingDrinkIngredientSelection || {}),
            drinkId,
            onChanged
        };
        bindDrinkDetailsEditActions(drink, onChanged);
    } else {
        pendingDrinkIngredientSelection = null;
    }
}

export async function showDrinkListDetailsModal(listId, { edit = false, onChanged } = {}) {
    let drinkList;

    try {
        drinkList = await DrinksAPI.getList(listId);
    } catch (error) {
        alert("Unable to load drink list: " + error.message);
        return;
    }

    openFormModal({
        title: drinkList.name,
        submitLabel: edit ? "Done" : "Edit",
        cancelLabel: edit ? "Back" : "Close",
        size: "modal-lg",
        body: renderDrinkListDetailsBody(drinkList, edit),
        onCancel: edit
            ? async () => {
                await showDrinkListDetailsModal(listId, { edit: false, onChanged });
            }
            : undefined,
        onSubmit: async () => {
            if (!edit) {
                await showDrinkListDetailsModal(listId, { edit: true, onChanged });
                return;
            }

            await showDrinkListDetailsModal(listId, { edit: false, onChanged });
            await onChanged?.();
        }
    });

    if (edit) {
        bindDrinkListDetailsEditActions(drinkList, onChanged);
    }
}

function renderDrinkListDetailsBody(drinkList, edit) {
    const items = drinkList.items || [];

    if (!items.length) {
        return '<div class="alert alert-warning">No drinks added to this list yet.</div>';
    }

    return `
        <div class="list-group">
            ${items.map(item => renderDrinkListItemRow(item, edit)).join("")}
        </div>
    `;
}

function renderDrinkListItemRow(item, edit) {
    const drinkName = item.drink?.name || `Drink ${item.drink_id}`;
    const ingredientText = item.drink?.ingredients?.length
        ? item.drink.ingredients
            .map(ingredient => `${ingredient.amount}${ingredient.unit || ""} ${ingredient.food?.name || `Food ${ingredient.food_id}`}`)
            .join(", ")
        : "No ingredients added yet";

    if (!edit) {
        return `
            <div class="list-group-item d-flex justify-content-between align-items-start gap-3">
                <div>
                    <strong>${escapeHtml(drinkName)}</strong>
                    <div class="small text-muted">${escapeHtml(ingredientText)}</div>
                </div>
                <span>x ${escapeHtml(String(item.quantity))}</span>
            </div>
        `;
    }

    return `
        <div class="list-group-item drink-list-item-edit-row" data-item-id="${item.id}" data-drink-id="${item.drink_id}">
            <div class="fw-semibold mb-2">${escapeHtml(drinkName)}</div>
            <div class="drink-ingredient-edit-row d-flex flex-wrap align-items-center gap-2">
                <div class="drink-ingredient-amount-control">
                    <input class="form-control form-control-sm drink-list-item-quantity" type="number" min="0" step="1" value="${escapeHtml(String(item.quantity))}">
                </div>
                <div class="drink-ingredient-actions-control d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary drink-list-item-save" type="button">Save</button>
                    <button class="btn btn-sm btn-outline-danger drink-list-item-delete" type="button">Delete</button>
                </div>
            </div>
        </div>
    `;
}

function bindDrinkListDetailsEditActions(drinkList, onChanged) {
    document.querySelectorAll(".drink-list-item-edit-row").forEach(row => {
        const itemId = Number(row.dataset.itemId);
        const drinkId = Number(row.dataset.drinkId);

        row.querySelector(".drink-list-item-save")?.addEventListener("click", async () => {
            const quantity = Number(row.querySelector(".drink-list-item-quantity")?.value);

            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert("Enter a positive quantity.");
                return;
            }

            try {
                await DrinksAPI.updateListItem(drinkList.id, itemId, {
                    drink_id: drinkId,
                    quantity
                });
                await loadDrinkLists();
                await onChanged?.();
                await showDrinkListDetailsModal(drinkList.id, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to update drink list item: " + error.message);
            }
        });

        row.querySelector(".drink-list-item-delete")?.addEventListener("click", async () => {
            if (!confirm("Remove this drink from the list?")) return;

            try {
                await DrinksAPI.deleteListItem(drinkList.id, itemId);
                await loadDrinkLists();
                await onChanged?.();
                await showDrinkListDetailsModal(drinkList.id, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to remove drink: " + error.message);
            }
        });
    });
}

function renderDrinkDetailsBody(drink, edit) {
    const ingredients = drink.ingredients || [];

    const ingredientRows = ingredients.length
        ? ingredients.map(ingredient => renderIngredientRow(ingredient, edit)).join("")
        : '<div class="text-muted">No ingredients added yet.</div>';

    const addIngredient = edit
        ? `
            <hr>
            <h6>Add ingredient</h6>
            <div class="drink-ingredient-add-row d-flex flex-wrap align-items-start gap-2">
                <div class="drink-ingredient-food-control">
                    <label class="form-label mb-1">Food</label>
                    <div id="drinkDetailSelectedFood" class="border rounded p-2 small">
                        ${renderPendingSelectedFood(drink.id)}
                    </div>
                    <button id="drinkDetailSelectFoodBtn" class="btn btn-outline-primary btn-sm mt-2" type="button">
                        Search ingredient
                    </button>
                </div>
                <div class="drink-ingredient-amount-control">
                    <label class="form-label mb-1" for="drinkDetailAmount">Amount</label>
                    <input id="drinkDetailAmount" class="form-control" type="number" min="0" step="0.1">
                </div>
                <div class="drink-ingredient-unit-control">
                    <label class="form-label mb-1" for="drinkDetailUnit">Unit</label>
                    <select id="drinkDetailUnit" class="form-select">
                        ${renderUnitOptions(["cl", "ml", "g", "l"])}
                    </select>
                </div>
                <div class="drink-ingredient-add-control">
                    <button id="drinkDetailAddIngredientBtn" class="btn btn-primary" type="button">Add</button>
                </div>
            </div>
        `
        : "";

    return `
        <div class="mb-3">
            <h6>Ingredients</h6>
            <div class="list-group">
                ${ingredientRows}
            </div>
        </div>
        ${addIngredient}
    `;
}

function renderPendingSelectedFood(drinkId) {
    const selected = pendingDrinkIngredientSelection?.drinkId === drinkId
        ? pendingDrinkIngredientSelection.food
        : null;

    if (!selected) {
        return '<span class="text-muted">No ingredient selected.</span>';
    }

    return `
        <strong>${escapeHtml(selected.name)}</strong>
        ${selected.brand ? `<span class="text-muted">(${escapeHtml(selected.brand)})</span>` : ""}
    `;
}

function renderIngredientRow(ingredient, edit) {
    const foodName = ingredient.food?.name || `Food ${ingredient.food_id}`;
    const brand = ingredient.food?.brand ? ` (${ingredient.food.brand})` : "";

    if (!edit) {
        return `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span>${escapeHtml(foodName)}${escapeHtml(brand)}</span>
                <span>${escapeHtml(String(ingredient.amount))} ${escapeHtml(ingredient.unit || "")}</span>
            </div>
        `;
    }

    return `
        <div class="list-group-item drink-ingredient-row" data-ingredient-id="${ingredient.id}">
            <div class="fw-semibold mb-2">${escapeHtml(foodName)}${escapeHtml(brand)}</div>
            <div class="drink-ingredient-edit-row d-flex flex-wrap align-items-center gap-2">
                <div class="drink-ingredient-amount-control">
                    <input class="form-control form-control-sm drink-ingredient-amount" type="number" min="0" step="0.1" value="${escapeHtml(String(ingredient.amount))}">
                </div>
                <div class="drink-ingredient-unit-control">
                    <select class="form-select form-select-sm drink-ingredient-unit">
                        ${["cl", "ml", "g", "l"].map(unit => `
                            <option value="${unit}" ${ingredient.unit === unit ? "selected" : ""}>${unit}</option>
                        `).join("")}
                    </select>
                </div>
                <div class="drink-ingredient-actions-control d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary drink-ingredient-save" type="button">Save</button>
                    <button class="btn btn-sm btn-outline-danger drink-ingredient-delete" type="button">Delete</button>
                </div>
            </div>
        </div>
    `;
}

function bindDrinkDetailsEditActions(drink, onChanged) {
    document.querySelectorAll(".drink-ingredient-row").forEach(row => {
        const ingredientId = row.dataset.ingredientId;

        row.querySelector(".drink-ingredient-save")?.addEventListener("click", async () => {
            const amount = Number(row.querySelector(".drink-ingredient-amount")?.value);
            const unit = row.querySelector(".drink-ingredient-unit")?.value || "ml";

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Enter a positive amount.");
                return;
            }

            try {
                await DrinksAPI.updateIngredient(drink.id, Number(ingredientId), { amount, unit });
                await onChanged?.();
                await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to update ingredient: " + error.message);
            }
        });

        row.querySelector(".drink-ingredient-delete")?.addEventListener("click", async () => {
            if (!confirm("Delete this ingredient?")) return;
            try {
                await DrinksAPI.deleteIngredient(drink.id, Number(ingredientId));
                await onChanged?.();
                await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to delete ingredient: " + error.message);
            }
        });
    });

    document.getElementById("drinkDetailSelectFoodBtn")?.addEventListener("click", async () => {
        pendingDrinkIngredientSelection = {
            ...(pendingDrinkIngredientSelection || {}),
            drinkId: drink.id,
            amount: document.getElementById("drinkDetailAmount")?.value || "",
            unit: document.getElementById("drinkDetailUnit")?.value || "ml",
            onChanged
        };

        await openSearchDatabaseModal("foods", {
            mode: "select",
            selectLabel: "Use ingredient",
            onSelect: async food => {
                pendingDrinkIngredientSelection = {
                    ...(pendingDrinkIngredientSelection || {}),
                    drinkId: drink.id,
                    food,
                    onChanged
                };
                await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            }
        });
    });

    const amountInput = document.getElementById("drinkDetailAmount");
    const unitSelect = document.getElementById("drinkDetailUnit");

    if (pendingDrinkIngredientSelection?.drinkId === drink.id) {
        if (amountInput && pendingDrinkIngredientSelection.amount) {
            amountInput.value = pendingDrinkIngredientSelection.amount;
        }
        if (unitSelect && pendingDrinkIngredientSelection.unit) {
            unitSelect.value = pendingDrinkIngredientSelection.unit;
        }
    }

    document.getElementById("drinkDetailAddIngredientBtn")?.addEventListener("click", async () => {
        const foodId = pendingDrinkIngredientSelection?.drinkId === drink.id
            ? pendingDrinkIngredientSelection.food?.id
            : null;
        const amount = Number(document.getElementById("drinkDetailAmount")?.value);
        const unit = document.getElementById("drinkDetailUnit")?.value || "ml";

        if (!foodId || !Number.isFinite(amount) || amount <= 0) {
            alert("Select an ingredient and enter a positive amount.");
            return;
        }

        try {
            await DrinksAPI.addIngredient(drink.id, {
                food_id: Number(foodId),
                amount,
                unit
            });
            pendingDrinkIngredientSelection = {
                drinkId: drink.id,
                onChanged
            };
            await onChanged?.();
            await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
        } catch (error) {
            alert("Unable to add ingredient: " + error.message);
        }
    });
}

// ======================================================
// DELETE DRINK LIST ITEM
// ======================================================

export async function deleteDrinkListItem(listId, itemId) {
    if (!confirm("Remove this drink from the list?")) return;

    try {
        await DrinksAPI.deleteListItem(listId, itemId);

        await loadDrinkLists();
        await loadDashboardDrinkChart(listId);

    } catch (error) {
        console.error(error);
        alert("Unable to delete item: " + error.message);
    }
}

// ======================================================
// TOGGLE DELETE MODE (optional UI feature)
// ======================================================

export function toggleDrinkListDeleteMode() {
    const current = getState().deleteModes.drinkList;
    const next = !current;
    setDeleteMode("drinkList", next);

    const btn = document.getElementById("toggle-remove-drink-btn");
    if (btn) {
        btn.textContent = next
            ? "Exit delete mode"
            : "Remove drink from list";
    }
}

// ======================================================
// DASHBOARD CHART
// ======================================================

export async function loadDashboardDrinkChart(listId) {
    const summaryContainer = document.getElementById('dashboardDrinkSummary');
    const chartCanvas = document.getElementById('dashboardDrinkChart');

    if (!summaryContainer || !chartCanvas) return;

    try {
        const list = await DrinksAPI.getList(listId);
        const entries = list.items || [];

        if (!entries.length) {
            summaryContainer.innerHTML =
                '<div class="text-muted">No drinks added to list.</div>';
            return;
        }

        const preferredUnit = getPreferredMeasurementUnit();
        const ingredientTotals = {};

        entries.forEach(entry => {
            const drink = entry.drink;
            if (!drink?.ingredients?.length) return;

            const quantity = Number(entry.quantity || 1);

            drink.ingredients.forEach(ingredient => {
                const food = ingredient.food || {};
                const name = food.name || ingredient.name || 'Unknown';
                const amount = Number(ingredient.amount || 0);
                const sourceUnit = ingredient.unit || food.base_unit || preferredUnit;
                const displayUnit = getCompatibleDisplayUnit(sourceUnit, preferredUnit);
                const convertedAmount = convertMeasurement(amount, sourceUnit, displayUnit) ?? amount;

                const totalAmount = convertedAmount * quantity;
                const key = `${food.id || name}-${displayUnit}`;

                if (!ingredientTotals[key]) {
                    ingredientTotals[key] = {
                        label: name,
                        unit: displayUnit,
                        amount: 0,
                        cost: 0,
                        baseAmount: getDisplayBaseAmount(food, displayUnit),
                        priceParts: []
                    };
                }

                const cost = calculateIngredientCost({
                    food,
                    sourceAmount: amount,
                    sourceUnit,
                    quantity
                });

                ingredientTotals[key].amount += totalAmount;
                ingredientTotals[key].cost += cost;
                ingredientTotals[key].priceParts.push({
                    name,
                    amount: totalAmount,
                    unit: displayUnit,
                    cost
                });
            });
        });

        const ingredients = Object.values(ingredientTotals);
        const labels = ingredients.map(item => `${item.label} (${item.unit})`);
        const quantityData = ingredients.map(item => item.amount);
        const totalCost = ingredients.reduce((sum, item) => sum + item.cost, 0);
        const priceBreakdown = ingredients
            .filter(item => item.cost > 0)
            .map(item => `${item.label}: ${formatPrice(item.cost)} (${formatAmount(item.amount, item.unit)})`);

        summaryContainer.innerHTML = `
            <div>
                To make: <strong>${
                    entries.reduce((s, e) => s + (Number(e.quantity) || 1), 0)
                }</strong> drinks
            </div>
            <div class="small text-muted">
                Ingredient amounts in ${escapeHtml(preferredUnit)} where possible
            </div>
            <div class="mt-2">
                Estimated price:
                <strong id="dashboardDrinkPrice" class="dashboard-price-hover" tabindex="0">
                    ${escapeHtml(formatPrice(totalCost))}
                </strong>
            </div>
        `;

        bindPriceHover(priceBreakdown);

        if (!ingredients.length) {
            if (window.dashboardDrinkChart instanceof Chart) {
                window.dashboardDrinkChart.destroy();
            }

            const ctx = chartCanvas.getContext('2d');
            ctx?.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            return;
        }

        if (window.dashboardDrinkChart instanceof Chart) {
            window.dashboardDrinkChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');

        window.dashboardDrinkChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Amount',
                        data: quantityData,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const item = ingredients[context.dataIndex];
                                return `${item.label}: ${formatAmount(item.amount, item.unit)}`;
                            }
                        }
                    },
                    legend: {
                        display: false
                    },
                    bottleSeparators: {
                        ingredients
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount'
                        }
                    }
                }
            },
            plugins: [bottleSeparatorPlugin]
        });

    } catch (err) {
        console.warn(err);
        summaryContainer.innerHTML =
            '<div class="text-danger">Failed to load chart.</div>';
    }
}

const bottleSeparatorPlugin = {
    id: 'bottleSeparators',
    afterDatasetsDraw(chart, args, pluginOptions) {
        const ingredients = pluginOptions.ingredients || [];
        const meta = chart.getDatasetMeta(0);
        const yScale = chart.scales.y;
        const ctx = chart.ctx;

        if (!meta?.data?.length || !yScale) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;

        meta.data.forEach((bar, index) => {
            const ingredient = ingredients[index];
            const step = ingredient?.baseAmount || getGeneralSeparatorStep(ingredient?.unit);
            const amount = Number(ingredient?.amount || 0);

            if (!step || step <= 0 || amount <= step) return;

            for (let marker = step; marker < amount; marker += step) {
                const y = yScale.getPixelForValue(marker);
                const width = Math.max(10, bar.width || 24);

                ctx.beginPath();
                ctx.moveTo(bar.x - width / 2, y);
                ctx.lineTo(bar.x + width / 2, y);
                ctx.stroke();
            }
        });

        ctx.restore();
    }
};

function getDisplayBaseAmount(food, displayUnit) {
    const baseAmount = Number(food?.base_amount || 0);
    const baseUnit = food?.base_unit;

    if (baseAmount > 0 && baseUnit) {
        const converted = convertMeasurement(baseAmount, baseUnit, displayUnit);
        if (converted !== null && converted > 0) {
            return converted;
        }
    }

    return getGeneralSeparatorStep(displayUnit);
}

function getGeneralSeparatorStep(unit) {
    const normalizedUnit = String(unit || '').toLowerCase();
    if (normalizedUnit === 'ml') return 1000;
    if (normalizedUnit === 'cl') return 100;
    if (normalizedUnit === 'l') return 1;
    if (normalizedUnit === 'g') return 1000;
    if (normalizedUnit === 'kg') return 1;
    return null;
}

function calculateIngredientCost({
    food,
    sourceAmount,
    sourceUnit,
    quantity
}) {
    const price = Number(food?.price || 0);
    const baseAmount = Number(food?.base_amount || 0);
    const baseUnit = food?.base_unit;

    if (!price || !baseAmount || !baseUnit) return 0;

    const amountInBaseUnit = convertMeasurement(sourceAmount, sourceUnit, baseUnit);
    if (amountInBaseUnit === null) return 0;

    return (amountInBaseUnit * quantity / baseAmount) * price;
}

function bindPriceHover(priceBreakdown) {
    const priceEl = document.getElementById('dashboardDrinkPrice');
    if (!priceEl) return;

    const lines = priceBreakdown.length
        ? priceBreakdown
        : ['No ingredient prices available yet.'];

    priceEl.addEventListener('mouseenter', () => showHoverBox(priceEl, lines));
    priceEl.addEventListener('mouseleave', hideHoverBox);
    priceEl.addEventListener('focus', () => showHoverBox(priceEl, lines));
    priceEl.addEventListener('blur', hideHoverBox);
}

function formatPrice(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} DKK`;
}
