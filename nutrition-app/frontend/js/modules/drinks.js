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
import { StockAPI } from '../api/stockAPI.js';
import { GarnishAPI } from '../api/garnishAPI.js';
import { escapeHtml } from '../utils.js';
import { openFormModal, confirmAction, closeAppModal } from '../ui/components/modal.js';
import { showSaveSuccessToast } from '../ui/components/toast.js';
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
let pendingDrinkListDrinkSelection = null;
// Not reset on the shared modal's 'hidden.bs.modal' event: that event also
// fires when a nested modal (e.g. the ingredient search) briefly hides this
// modal to show itself, which would otherwise wipe this out mid-flow.
// Cleared explicitly by goBackFromDrinkDetails()/goBackFromDrinkListDetails() instead.
let drinkDetailsBackHandler = null;
let drinkListDetailsBackHandler = null;

export function goBackFromDrinkDetails() {
    const handler = drinkDetailsBackHandler;
    drinkDetailsBackHandler = null;

    if (typeof handler === 'function') {
        handler();
    } else {
        closeAppModal();
    }
}

export function goBackFromDrinkListDetails() {
    const handler = drinkListDetailsBackHandler;
    drinkListDetailsBackHandler = null;

    if (typeof handler === 'function') {
        handler();
    } else {
        closeAppModal();
    }
}

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
        showSaveSuccessToast();
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
        showSaveSuccessToast();
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
        showSaveSuccessToast();
        return true;

    } catch (error) {
        alert("Unable to add drink: " + error.message);
        return false;
    }
}

export async function showDrinkDetailsModal(drinkId, { edit = false, onChanged, onBack } = {}) {
    if (onBack !== undefined) {
        drinkDetailsBackHandler = onBack;
    }

    let drink;
    let macros = null;
    let garnishTypes = [];

    try {
        drink = await DrinksAPI.getDetail(drinkId);
    } catch (error) {
        alert("Unable to load drink: " + error.message);
        return;
    }

    try {
        macros = await DrinksAPI.getMacros(drinkId);
    } catch (error) {
        console.warn("Unable to load drink macros:", error);
    }

    if (edit) {
        try {
            garnishTypes = await GarnishAPI.getAll();
        } catch (error) {
            console.warn("Unable to load garnish types:", error);
        }
    }

    openFormModal({
        title: drink.name,
        submitLabel: edit ? "Done" : "Edit",
        cancelLabel: "Back",
        size: "modal-lg",
        body: renderDrinkDetailsBody(drink, edit, macros, garnishTypes),
        onCancel: edit
            ? async () => {
                await showDrinkDetailsModal(drinkId, { edit: false, onChanged });
            }
            : async () => {
                goBackFromDrinkDetails();
            },
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
        bindDrinkDetailsEditActions(drink, onChanged, garnishTypes);
    } else {
        pendingDrinkIngredientSelection = null;
    }
}

export async function showDrinkListDetailsModal(listId, { edit = false, onChanged, onBack } = {}) {
    if (onBack !== undefined) {
        drinkListDetailsBackHandler = onBack;
    }

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
        cancelLabel: "Back",
        size: "modal-lg",
        body: renderDrinkListDetailsBody(drinkList, edit),
        onCancel: edit
            ? async () => {
                await showDrinkListDetailsModal(listId, { edit: false, onChanged });
            }
            : async () => {
                goBackFromDrinkListDetails();
            },
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
        pendingDrinkListDrinkSelection = {
            ...(pendingDrinkListDrinkSelection || {}),
            listId,
            onChanged
        };
        bindDrinkListDetailsEditActions(drinkList, onChanged);
    } else {
        pendingDrinkListDrinkSelection = null;
    }
}

function renderDrinkListDetailsBody(drinkList, edit) {
    const items = drinkList.items || [];

    const itemsBody = items.length
        ? `
            <div class="list-group">
                ${items.map(item => renderDrinkListItemRow(item, edit)).join("")}
            </div>
        `
        : '<div class="alert alert-warning">No drinks added to this list yet.</div>';

    const addDrink = edit
        ? `
            <hr>
            <h6>Add drink</h6>
            <div class="drink-ingredient-add-row d-flex flex-wrap align-items-start gap-2">
                <div class="drink-ingredient-food-control">
                    <label class="form-label mb-1">Drink</label>
                    <div id="drinkListSelectedDrink" class="border rounded p-2 small">
                        ${renderPendingSelectedDrink(drinkList.id)}
                    </div>
                    <button id="drinkListSelectDrinkBtn" class="btn btn-outline-primary btn-sm mt-2" type="button">
                        Search drink
                    </button>
                </div>
                <div class="drink-ingredient-amount-control">
                    <label class="form-label mb-1" for="drinkListAddQuantity">Quantity</label>
                    <input id="drinkListAddQuantity" class="form-control" type="number" min="1" step="1" value="1">
                </div>
                <div class="drink-ingredient-add-control">
                    <button id="drinkListAddDrinkBtn" class="btn btn-primary" type="button">Add</button>
                </div>
            </div>
        `
        : "";

    return `${itemsBody}${addDrink}`;
}

function renderPendingSelectedDrink(listId) {
    const selected = pendingDrinkListDrinkSelection?.listId === listId
        ? pendingDrinkListDrinkSelection.drink
        : null;

    if (!selected) {
        return '<span class="text-muted">No drink selected.</span>';
    }

    return `<strong>${escapeHtml(selected.name)}</strong>`;
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
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to update drink list item: " + error.message);
            }
        });

        row.querySelector(".drink-list-item-delete")?.addEventListener("click", async () => {
            if (!await confirmAction("Remove this drink from the list?")) return;

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

    document.getElementById("drinkListSelectDrinkBtn")?.addEventListener("click", async () => {
        pendingDrinkListDrinkSelection = {
            ...(pendingDrinkListDrinkSelection || {}),
            listId: drinkList.id,
            quantity: document.getElementById("drinkListAddQuantity")?.value || "1",
            onChanged
        };

        await openSearchDatabaseModal("drinks", {
            mode: "select",
            selectLabel: "Use drink",
            onSelect: async drink => {
                pendingDrinkListDrinkSelection = {
                    ...(pendingDrinkListDrinkSelection || {}),
                    listId: drinkList.id,
                    drink,
                    onChanged
                };
                await showDrinkListDetailsModal(drinkList.id, { edit: true, onChanged });
            },
            onBack: async () => {
                await showDrinkListDetailsModal(drinkList.id, { edit: true, onChanged });
            }
        });
    });

    const quantityInput = document.getElementById("drinkListAddQuantity");
    if (quantityInput && pendingDrinkListDrinkSelection?.listId === drinkList.id && pendingDrinkListDrinkSelection.quantity) {
        quantityInput.value = pendingDrinkListDrinkSelection.quantity;
    }

    document.getElementById("drinkListAddDrinkBtn")?.addEventListener("click", async () => {
        const drinkId = pendingDrinkListDrinkSelection?.listId === drinkList.id
            ? pendingDrinkListDrinkSelection.drink?.id
            : null;
        const quantity = Number(document.getElementById("drinkListAddQuantity")?.value);

        if (!drinkId || !Number.isFinite(quantity) || quantity <= 0) {
            alert("Select a drink and enter a positive quantity.");
            return;
        }

        try {
            await DrinksAPI.addListItem(drinkList.id, {
                drink_id: Number(drinkId),
                quantity
            });
            pendingDrinkListDrinkSelection = {
                listId: drinkList.id,
                onChanged
            };
            await loadDrinkLists();
            await onChanged?.();
            await showDrinkListDetailsModal(drinkList.id, { edit: true, onChanged });
            showSaveSuccessToast();
        } catch (error) {
            alert("Unable to add drink: " + error.message);
        }
    });
}

function renderDrinkDetailsBody(drink, edit, macros, garnishTypes = []) {
    const ingredients = drink.ingredients || [];

    const totals = macros?.totals;
    const summary = totals
        ? `
            <div class="macro-summary mb-3">
                <div><strong>Calories:</strong> ${escapeHtml(String(totals.calories ?? 0))} kcal</div>
                <div><strong>Protein:</strong> ${escapeHtml(String(totals.protein ?? 0))} g</div>
                <div><strong>Carbs:</strong> ${escapeHtml(String(totals.carbs ?? 0))} g</div>
                <div><strong>Fat:</strong> ${escapeHtml(String(totals.fat ?? 0))} g</div>
            </div>
        `
        : "";

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

    const steps = (drink.instructions || "").split("\n").map(s => s.trim()).filter(Boolean);

    const recipeSection = edit
        ? `
            <hr>
            <h6>Recipe</h6>
            <div class="mb-2">
                <label class="form-label small text-muted" for="drinkRecipeInstructions">One step per line</label>
                <textarea id="drinkRecipeInstructions" class="form-control" rows="4">${escapeHtml(drink.instructions || "")}</textarea>
            </div>
            <button id="drinkRecipeSaveBtn" class="btn btn-outline-primary btn-sm" type="button">Save Recipe</button>
        `
        : `
            <div class="mb-3">
                <h6>Recipe</h6>
                ${steps.length
                    ? `<ol class="ps-3 mb-0">${steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
                    : '<div class="text-muted small">No recipe steps added yet.</div>'
                }
            </div>
        `;

    return `
        ${summary}
        <div class="mb-3">
            <h6>Ingredients</h6>
            <div class="list-group">
                ${ingredientRows}
            </div>
        </div>
        ${addIngredient}
        ${renderDrinkGarnishSection(drink, edit, garnishTypes)}
        ${recipeSection}
    `;
}

function renderDrinkGarnishSection(drink, edit, garnishTypes) {
    const garnishes = drink.garnishes || [];

    const garnishRows = garnishes.length
        ? garnishes.map(dg => renderGarnishRow(dg, edit)).join("")
        : '<div class="text-muted">No garnishes added yet.</div>';

    const attachedGarnishIds = new Set(garnishes.map(dg => dg.garnish_id));
    const availableTypes = garnishTypes.filter(g => !attachedGarnishIds.has(g.id));

    const addGarnish = edit
        ? (availableTypes.length
            ? `
                <hr>
                <h6>Add garnish</h6>
                <div class="drink-ingredient-add-row d-flex flex-wrap align-items-start gap-2">
                    <div class="drink-ingredient-food-control">
                        <label class="form-label mb-1" for="drinkGarnishTypeSelect">Garnish</label>
                        <select id="drinkGarnishTypeSelect" class="form-select">
                            ${availableTypes.map(g => `
                                <option value="${g.id}" data-essential="${g.default_essential ? "1" : "0"}">${escapeHtml(g.name)}</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="drink-ingredient-amount-control">
                        <label class="form-label mb-1" for="drinkGarnishQuantity">Qty per serving</label>
                        <input id="drinkGarnishQuantity" class="form-control" type="number" min="0.01" step="0.01" value="1">
                    </div>
                    <div class="drink-ingredient-add-control d-flex flex-column">
                        <div class="form-check mb-1">
                            <input id="drinkGarnishEssential" class="form-check-input" type="checkbox" ${availableTypes[0]?.default_essential ? "checked" : ""}>
                            <label class="form-check-label small" for="drinkGarnishEssential">Essential</label>
                        </div>
                        <button id="drinkGarnishAddBtn" class="btn btn-primary btn-sm" type="button">Add</button>
                    </div>
                </div>
            `
            : `<hr><h6>Add garnish</h6><div class="text-muted small">All garnish types are already added to this drink.</div>`)
        : "";

    return `
        <div class="mb-3">
            <h6>Garnishes</h6>
            <div class="list-group">
                ${garnishRows}
            </div>
        </div>
        ${addGarnish}
    `;
}

function renderGarnishRow(drinkGarnish, edit) {
    const name = drinkGarnish.garnish?.name || `Garnish ${drinkGarnish.garnish_id}`;
    const unit = drinkGarnish.garnish?.unit_name || "piece";
    const essentialBadge = drinkGarnish.essential
        ? '<span class="badge bg-warning text-dark">Essential</span>'
        : '<span class="badge bg-secondary">Decorative</span>';

    if (!edit) {
        return `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span>${escapeHtml(name)}</span>
                <div class="d-flex align-items-center gap-2">
                    <span>${escapeHtml(String(drinkGarnish.quantity_per_serving))} ${escapeHtml(unit)}/serving</span>
                    ${essentialBadge}
                </div>
            </div>
        `;
    }

    return `
        <div class="list-group-item drink-garnish-row" data-garnish-id="${drinkGarnish.garnish_id}">
            <div class="fw-semibold mb-2">${escapeHtml(name)}</div>
            <div class="drink-ingredient-edit-row d-flex flex-wrap align-items-center gap-2">
                <div class="drink-ingredient-amount-control">
                    <input class="form-control form-control-sm drink-garnish-quantity" type="number" min="0.01" step="0.01" value="${escapeHtml(String(drinkGarnish.quantity_per_serving))}">
                </div>
                <div class="form-check">
                    <input class="form-check-input drink-garnish-essential" type="checkbox" ${drinkGarnish.essential ? "checked" : ""}>
                    <label class="form-check-label small">Essential</label>
                </div>
                <div class="drink-ingredient-actions-control d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary drink-garnish-save" type="button">Save</button>
                    <button class="btn btn-sm btn-outline-danger drink-garnish-delete" type="button">Delete</button>
                </div>
            </div>
        </div>
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

function bindDrinkDetailsEditActions(drink, onChanged, garnishTypes = []) {
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
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to update ingredient: " + error.message);
            }
        });

        row.querySelector(".drink-ingredient-delete")?.addEventListener("click", async () => {
            if (!await confirmAction("Delete this ingredient?")) return;
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
            },
            onBack: async () => {
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
            showSaveSuccessToast();
        } catch (error) {
            alert("Unable to add ingredient: " + error.message);
        }
    });

    document.querySelectorAll(".drink-garnish-row").forEach(row => {
        const garnishId = Number(row.dataset.garnishId);

        row.querySelector(".drink-garnish-save")?.addEventListener("click", async () => {
            const quantity = Number(row.querySelector(".drink-garnish-quantity")?.value);
            const essential = Boolean(row.querySelector(".drink-garnish-essential")?.checked);

            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert("Enter a positive quantity.");
                return;
            }

            try {
                await DrinksAPI.updateGarnish(drink.id, garnishId, { quantity_per_serving: quantity, essential });
                await onChanged?.();
                await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to update garnish: " + error.message);
            }
        });

        row.querySelector(".drink-garnish-delete")?.addEventListener("click", async () => {
            if (!await confirmAction("Remove this garnish?")) return;
            try {
                await DrinksAPI.deleteGarnish(drink.id, garnishId);
                await onChanged?.();
                await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            } catch (error) {
                alert("Unable to remove garnish: " + error.message);
            }
        });
    });

    const garnishTypeSelect = document.getElementById("drinkGarnishTypeSelect");
    const garnishEssentialCheckbox = document.getElementById("drinkGarnishEssential");

    garnishTypeSelect?.addEventListener("change", () => {
        const selectedOption = garnishTypeSelect.selectedOptions[0];
        if (garnishEssentialCheckbox && selectedOption) {
            garnishEssentialCheckbox.checked = selectedOption.dataset.essential === "1";
        }
    });

    document.getElementById("drinkGarnishAddBtn")?.addEventListener("click", async () => {
        const garnishId = Number(garnishTypeSelect?.value);
        const quantity = Number(document.getElementById("drinkGarnishQuantity")?.value);
        const essential = Boolean(garnishEssentialCheckbox?.checked);

        if (!garnishId || !Number.isFinite(quantity) || quantity <= 0) {
            alert("Select a garnish and enter a positive quantity.");
            return;
        }

        try {
            await DrinksAPI.addGarnish(drink.id, { garnish_id: garnishId, quantity_per_serving: quantity, essential });
            await onChanged?.();
            await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            showSaveSuccessToast();
        } catch (error) {
            alert("Unable to add garnish: " + error.message);
        }
    });

    document.getElementById("drinkRecipeSaveBtn")?.addEventListener("click", async () => {
        const instructions = document.getElementById("drinkRecipeInstructions")?.value ?? "";

        try {
            await DrinksAPI.update(drink.id, { name: drink.name, instructions });
            await onChanged?.();
            await showDrinkDetailsModal(drink.id, { edit: true, onChanged });
            showSaveSuccessToast();
        } catch (error) {
            alert("Unable to save recipe: " + error.message);
        }
    });
}

// ======================================================
// DELETE DRINK LIST ITEM
// ======================================================

export async function deleteDrinkListItem(listId, itemId) {
    if (!await confirmAction("Remove this drink from the list?")) return;

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

export function computeDrinkListIngredientTotals(list, preferredUnit = getPreferredMeasurementUnit()) {
    const entries = list?.items || [];
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
                    foodId: food.id ?? null,
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

    return Object.values(ingredientTotals);
}

// Aggregates garnish needs across a list's drinks (qty_per_serving * entry
// quantity, grouped by garnish type). Purely informational — a garnish
// being short never blocks a drink from being made.
export function computeDrinkListGarnishTotals(list) {
    const entries = list?.items || [];
    const garnishTotals = {};

    entries.forEach(entry => {
        const drink = entry.drink;
        if (!drink?.garnishes?.length) return;

        const quantity = Number(entry.quantity || 1);

        drink.garnishes.forEach(dg => {
            const garnish = dg.garnish || {};
            const key = dg.garnish_id;

            if (!garnishTotals[key]) {
                garnishTotals[key] = {
                    garnishId: dg.garnish_id,
                    label: garnish.name || `Garnish ${dg.garnish_id}`,
                    unit: garnish.unit_name || "piece",
                    amount: 0,
                    essential: false
                };
            }

            garnishTotals[key].amount += Number(dg.quantity_per_serving || 0) * quantity;
            if (dg.essential) garnishTotals[key].essential = true;
        });
    });

    return Object.values(garnishTotals);
}

// Garnish stock is tracked by the source item you actually buy (e.g. "Lime")
// when a garnish type has a yield configured, not by the garnish unit itself
// (e.g. "Lime wedge"). This converts a raw stock amount into the garnish's
// own unit so it can be compared against per-serving requirements. Falls
// back to treating the stock amount as already being in the garnish's own
// unit when no yield is configured.
export function convertGarnishStockToOwnUnit(garnish, stockAmount) {
    const amount = Number(stockAmount || 0);
    if (garnish?.yield_per_source) {
        return amount * garnish.yield_per_source;
    }
    return amount;
}

export async function loadDashboardDrinkChart(listId, { showStock = false } = {}) {
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
        const ingredients = computeDrinkListIngredientTotals(list, preferredUnit);
        const garnishes = computeDrinkListGarnishTotals(list);

        let stockData = null;
        if (showStock) {
            try {
                const stockRows = await StockAPI.getAll();
                const stockByFood = new Map(stockRows.map(row => [row.food_id, row]));

                stockData = ingredients.map(item => {
                    const stock = item.foodId != null ? stockByFood.get(item.foodId) : null;
                    if (!stock) return 0;
                    const converted = convertMeasurement(stock.amount, stock.unit, item.unit);
                    return converted ?? 0;
                });
            } catch (error) {
                console.warn("Unable to load stock for overlay:", error);
                stockData = null;
            }
        }

        const labels = ingredients.map(item => `${item.label} (${item.unit})`);
        const quantityData = ingredients.map(item => item.amount);

        let totalCost;
        let priceBreakdown;
        let priceLabel;

        if (stockData) {
            const missingItems = ingredients
                .map((item, index) => {
                    const stockAmount = stockData[index] ?? 0;
                    const missingAmount = Math.max(0, item.amount - stockAmount);
                    const missingCost = item.amount > 0 ? item.cost * (missingAmount / item.amount) : 0;
                    return { ...item, missingAmount, missingCost };
                })
                .filter(item => item.missingCost > 0);

            totalCost = missingItems.reduce((sum, item) => sum + item.missingCost, 0);
            priceBreakdown = missingItems
                .sort((a, b) => b.missingCost - a.missingCost)
                .map(item => `${item.label}: ${formatPrice(item.missingCost)} (${formatAmount(item.missingAmount, item.unit)})`);
            priceLabel = "Estimated price to buy";
        } else {
            totalCost = ingredients.reduce((sum, item) => sum + item.cost, 0);
            priceBreakdown = ingredients
                .filter(item => item.cost > 0)
                .sort((a, b) => b.cost - a.cost)
                .map(item => `${item.label}: ${formatPrice(item.cost)} (${formatAmount(item.amount, item.unit)})`);
            priceLabel = "Estimated price";
        }

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
                ${escapeHtml(priceLabel)}:
                <strong id="dashboardDrinkPrice" class="dashboard-price-hover" tabindex="0">
                    ${escapeHtml(formatPrice(totalCost))}
                </strong>
            </div>
            ${garnishes.length ? `
                <div class="mt-2 small">
                    Garnish needed:
                    <strong id="dashboardDrinkGarnish" class="dashboard-price-hover" tabindex="0">
                        ${garnishes.length} type${garnishes.length === 1 ? "" : "s"}
                    </strong>
                </div>
            ` : ""}
        `;

        bindPriceHover(priceBreakdown);
        bindGarnishHover(garnishes);

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

        const datasets = [
            {
                label: 'Required',
                data: quantityData,
                backgroundColor: 'rgba(54, 162, 235, 0.9)',
                borderWidth: 1,
                grouped: false,
                barPercentage: 1.0,
                categoryPercentage: 0.6,
                order: 2
            }
        ];

        if (stockData) {
            datasets.push({
                label: 'In stock',
                data: stockData,
                backgroundColor: 'rgba(255, 255, 255, 0.45)',
                borderWidth: 0,
                grouped: false,
                barPercentage: 1.0,
                categoryPercentage: 0.6,
                order: 1
            });
        }

        const differenceItems = stockData
            ? ingredients.map((item, index) => ({
                requiredAmount: item.amount,
                stockAmount: stockData[index],
                unit: item.unit
            }))
            : null;

        window.dashboardDrinkChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 20 }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const item = ingredients[context.dataIndex];
                                if (context.dataset.label === 'In stock') {
                                    return `In stock: ${formatAmount(context.raw, item.unit)}`;
                                }
                                return `Required: ${formatAmount(item.amount, item.unit)}`;
                            }
                        }
                    },
                    legend: {
                        display: Boolean(stockData)
                    },
                    bottleSeparators: {
                        ingredients
                    },
                    stockDifference: {
                        items: differenceItems
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
            plugins: [bottleSeparatorPlugin, stockDifferencePlugin]
        });

    } catch (err) {
        console.warn(err);
        summaryContainer.innerHTML =
            '<div class="text-danger">Failed to load chart.</div>';
    }
}

export const bottleSeparatorPlugin = {
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

// Draws the stock-vs-required difference above each ingredient's bars:
// green "+N" when stock covers (and exceeds) what's required, red "-N"
// when stock falls short.
export const stockDifferencePlugin = {
    id: 'stockDifference',
    afterDatasetsDraw(chart, args, pluginOptions) {
        const items = pluginOptions.items;
        if (!items) return;

        const meta = chart.getDatasetMeta(0);
        const yScale = chart.scales.y;
        const ctx = chart.ctx;

        if (!meta?.data?.length || !yScale) return;

        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        meta.data.forEach((bar, index) => {
            const item = items[index];
            if (!item || item.stockAmount == null) return;

            const diff = item.stockAmount - item.requiredAmount;
            const topValue = Math.max(item.stockAmount, item.requiredAmount);
            const topY = yScale.getPixelForValue(topValue);
            const label = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}${formatAmount(Math.abs(diff), item.unit)}`;

            ctx.fillStyle = diff >= 0 ? '#2fbf71' : '#e5484d';
            ctx.fillText(label, bar.x, topY - 4);
        });

        ctx.restore();
    }
};

export function getDisplayBaseAmount(food, displayUnit) {
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

export function calculateIngredientCost({
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

function bindGarnishHover(garnishes) {
    const garnishEl = document.getElementById('dashboardDrinkGarnish');
    if (!garnishEl) return;

    const lines = garnishes
        .sort((a, b) => Number(b.essential) - Number(a.essential))
        .map(g => `${g.label}: ${formatAmount(g.amount, g.unit)}${g.essential ? " (essential)" : " (decorative)"}`);

    garnishEl.addEventListener('mouseenter', () => showHoverBox(garnishEl, lines));
    garnishEl.addEventListener('mouseleave', hideHoverBox);
    garnishEl.addEventListener('focus', () => showHoverBox(garnishEl, lines));
    garnishEl.addEventListener('blur', hideHoverBox);
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

export function formatPrice(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} DKK`;
}
