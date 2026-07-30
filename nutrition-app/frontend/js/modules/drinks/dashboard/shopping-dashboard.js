import { StockAPI } from '../../../api/stockAPI.js';
import { DrinksAPI } from '../../../api/drinksAPI.js';
import { GarnishAPI } from '../../../api/garnishAPI.js';
import { escapeHtml } from '../../../utils.js';
import { convertMeasurement, formatAmount, getPreferredMeasurementUnit } from '../../settings.js';
import {
    computeDrinkListIngredientTotals,
    computeDrinkListGarnishTotals,
    calculateIngredientCost,
    formatPrice,
    convertGarnishStockToOwnUnit
} from '../../drinks.js';
import { getSelectedDrinkListId, subscribe } from '../../../state.js';

export function renderShoppingCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Shopping List</h5>
                        <p class="card-text text-muted small">
                            Missing amounts: the selected drink list's required totals minus current stock.
                        </p>
                        <div id="shoppingListSummary" class="mb-2"></div>
                        <div id="shoppingListItems">
                            <div class="text-muted">Select a drink list in Drink Prep to see what to buy.</div>
                        </div>
                        <div id="shoppingGarnishItems"></div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Predicted Drinks</h5>
                        <p class="card-text text-muted">Placeholder for suggesting what to buy based on past usage.</p>
                        <div class="placeholder-glow">
                            <span class="placeholder col-7"></span>
                            <span class="placeholder col-10"></span>
                            <span class="placeholder col-5"></span>
                        </div>
                        <p class="mt-3"><strong><i>(Future feature)</i></strong></p>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Budget</h5>
                        <p class="card-text text-muted">Placeholder for budget-based shopping predictions.</p>
                        <div class="placeholder-glow">
                            <span class="placeholder col-7"></span>
                            <span class="placeholder col-10"></span>
                            <span class="placeholder col-5"></span>
                        </div>
                        <p class="mt-3"><strong><i>(Future feature)</i></strong></p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let unsubscribe = null;

export async function initShoppingDashboard() {
    if (!unsubscribe) {
        unsubscribe = subscribe(() => {
            refreshShoppingList();
        });
    }
    await refreshShoppingList();
}

export async function refreshShoppingList() {
    const summary = document.getElementById("shoppingListSummary");
    const itemsEl = document.getElementById("shoppingListItems");
    const garnishItemsEl = document.getElementById("shoppingGarnishItems");
    if (!summary || !itemsEl) return;

    const listId = getSelectedDrinkListId();
    if (!listId) {
        summary.innerHTML = "";
        itemsEl.innerHTML = '<div class="text-muted">Select a drink list in Drink Prep to see what to buy.</div>';
        if (garnishItemsEl) garnishItemsEl.innerHTML = "";
        return;
    }

    try {
        const [list, stockRows, garnishTypes] = await Promise.all([
            DrinksAPI.getList(listId),
            StockAPI.getAll(),
            GarnishAPI.getAll().catch(() => [])
        ]);

        const stockMap = new Map(stockRows.map(row => [row.food_id, row]));

        const preferredUnit = getPreferredMeasurementUnit();
        const required = computeDrinkListIngredientTotals(list, preferredUnit);

        const shoppingItems = required
            .map(item => {
                const stock = item.foodId != null ? stockMap.get(item.foodId) : null;
                const stockAmount = stock
                    ? (convertMeasurement(stock.amount, stock.unit, item.unit) ?? 0)
                    : 0;
                const missingAmount = Math.max(0, item.amount - stockAmount);
                const missingCost = item.amount > 0 ? item.cost * (missingAmount / item.amount) : 0;

                return { ...item, stockAmount, missingAmount, missingCost };
            })
            .filter(item => item.missingAmount > 0.01);

        const garnishToBuy = buildGarnishShoppingItems(list, garnishTypes, stockMap);

        const ingredientCost = shoppingItems.reduce((sum, item) => sum + item.missingCost, 0);
        const garnishCost = garnishToBuy.reduce((sum, item) => sum + item.cost, 0);
        const totalCost = ingredientCost + garnishCost;

        if (!shoppingItems.length && !garnishToBuy.length) {
            summary.innerHTML = '<strong class="text-success">Fully stocked</strong> — nothing left to buy for this list.';
            itemsEl.innerHTML = "";
            renderShoppingGarnishItems([]);
            return;
        }

        summary.innerHTML = `Estimated cost to buy: <strong>${escapeHtml(formatPrice(totalCost))}</strong>`;

        itemsEl.innerHTML = shoppingItems.length
            ? `
                <div class="list-group">
                    ${shoppingItems.map(item => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${escapeHtml(item.label)}</span>
                            <span>
                                ${escapeHtml(formatAmount(item.missingAmount, item.unit))}
                                ${item.missingCost > 0 ? ` &middot; ${escapeHtml(formatPrice(item.missingCost))}` : ""}
                            </span>
                        </div>
                    `).join("")}
                </div>
            `
            : "";

        renderShoppingGarnishItems(garnishToBuy);
    } catch (error) {
        itemsEl.innerHTML = `<div class="text-danger">Unable to build shopping list: ${escapeHtml(error.message)}</div>`;
    }
}

// Converts missing garnish amounts (needed - in stock) into whole source
// items to buy, using each garnish type's yield_per_source, and prices them
// using the linked source food (so the cost folds into the one total above).
function buildGarnishShoppingItems(list, garnishTypes, stockMap) {
    const needed = computeDrinkListGarnishTotals(list);
    if (!needed.length) return [];

    const typeById = new Map(garnishTypes.map(g => [g.id, g]));

    return needed
        .map(item => {
            const type = typeById.get(item.garnishId);
            const sourceFood = type?.source_food || null;
            const stockRow = sourceFood ? stockMap.get(sourceFood.id) : null;
            const stockAmount = convertGarnishStockToOwnUnit(type, stockRow?.amount || 0);
            const missingAmount = Math.max(0, item.amount - stockAmount);
            const yieldPerSource = type?.yield_per_source || null;
            const sourceUnitsToBuy = yieldPerSource ? Math.ceil(missingAmount / yieldPerSource) : null;

            const cost = sourceUnitsToBuy && sourceFood
                ? calculateIngredientCost({
                    food: sourceFood,
                    sourceAmount: sourceUnitsToBuy,
                    sourceUnit: sourceFood.base_unit || "piece",
                    quantity: 1
                })
                : 0;

            return { ...item, missingAmount, sourceFood, yieldPerSource, sourceUnitsToBuy, cost };
        })
        .filter(item => item.missingAmount > 0.01);
}

function renderShoppingGarnishItems(garnishToBuy) {
    const garnishItemsEl = document.getElementById("shoppingGarnishItems");
    if (!garnishItemsEl) return;

    if (!garnishToBuy.length) {
        garnishItemsEl.innerHTML = "";
        return;
    }

    garnishItemsEl.innerHTML = `
        <hr>
        <div class="small text-muted mb-1">Garnish to buy</div>
        <div class="list-group">
            ${garnishToBuy.map(item => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(item.label)}${item.essential ? ' <span class="badge bg-warning text-dark ms-1">Essential</span>' : ""}</span>
                    <span>
                        ${item.sourceUnitsToBuy
                            ? `${escapeHtml(String(item.sourceUnitsToBuy))}x ${escapeHtml(item.sourceFood?.name || item.label)}`
                            : `${escapeHtml(formatAmount(item.missingAmount, item.unit))} (link a source food to convert)`
                        }
                        ${item.cost > 0 ? ` &middot; ${escapeHtml(formatPrice(item.cost))}` : ""}
                    </span>
                </div>
            `).join("")}
        </div>
    `;
}
