import { StockAPI } from '../../../api/stockAPI.js';
import { DrinksAPI } from '../../../api/drinksAPI.js';
import { GarnishAPI } from '../../../api/garnishAPI.js';
import { escapeHtml } from '../../../utils.js';
import { openFormModal, closeAppModal, confirmAction } from '../../../ui/components/modal.js';
import { showSaveSuccessToast } from '../../../ui/components/toast.js';
import { openSearchDatabaseModal } from '../../search.js';
import { convertMeasurement, formatAmount, renderUnitOptions } from '../../settings.js';
import {
    calculateIngredientCost,
    formatPrice,
    bottleSeparatorPlugin,
    getDisplayBaseAmount,
    computeDrinkListIngredientTotals,
    addDrinkListItem,
    convertGarnishStockToOwnUnit
} from '../../drinks.js';
import { loadDashboardDrinkChart, loadDashboardDrinkListsItems, refreshRecipeCard } from './drinks-dashboard.js';
import { refreshShoppingList } from './shopping-dashboard.js';
import { getSelectedDrinkListId, subscribe } from '../../../state.js';
import { showHoverBox, hideHoverBox } from '../../../ui/components/hoverBox.js';

let stockChart = null;
let latestStockRows = [];
let latestDrinks = [];
let latestGarnishTypes = [];
let pendingGarnishSourceFood = null;
let compareToListMode = false;
let missingIngredientsMaxFilter = 2;
let missingIngredientsCompareMode = false;
let ignoreGarnishMode = false;

export function renderStockCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title mb-2">Stock Overview</h5>
                        <div id="stockOverviewSummary" class="text-muted mb-3">Loading stock...</div>
                        <div class="d-flex flex-wrap gap-2">
                            <button id="stockDetailsBtn" class="btn btn-primary btn-sm" type="button">
                                <i class="bi bi-box-seam me-1"></i>View stock details
                            </button>
                            <button id="stockAddCardBtn" class="btn btn-outline-primary btn-sm" type="button">
                                <i class="bi bi-plus-lg me-1"></i>Add to stock
                            </button>
                            <button id="garnishStockCardBtn" class="btn btn-outline-primary btn-sm" type="button">
                                <i class="bi bi-flower1 me-1"></i>Garnish stock
                            </button>
                            <button id="stockScanCardBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                <i class="bi bi-upc-scan me-1"></i>Scan barcode
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">Available Drinks</h5>
                            <div class="d-flex gap-1">
                                <button id="ignoreGarnishToggleBtn" class="btn btn-outline-secondary btn-sm" type="button" title="Essential garnish shortages count against availability. Click to ignore garnish entirely.">
                                    <i class="bi bi-flower1"></i>
                                </button>
                                <button id="availableDrinksCompareBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                    Compare to list
                                </button>
                            </div>
                        </div>
                        <p class="card-text text-muted small">Drinks you can make right now from current stock.</p>
                        <div id="availableDrinksList"><div class="text-muted">Loading...</div></div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">Missing Ingredients</h5>
                            <button id="missingIngredientsCompareBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                Compare to list
                            </button>
                        </div>
                        <p class="card-text text-muted small">Drinks that are partially stocked, and what's still needed.</p>
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <label class="small text-muted mb-0" for="missingIngredientsMaxInput">Max missing</label>
                            <input id="missingIngredientsMaxInput" class="form-control form-control-sm text-center" style="max-width: 70px;" type="number" min="1" value="2">
                        </div>
                        <input
                            id="missingIngredientsSearch"
                            class="form-control form-control-sm mb-2"
                            type="text"
                            placeholder="Search by ingredient category (coming soon)"
                            title="Placeholder: needs food categories to be implemented first"
                            disabled
                        >
                        <div id="missingIngredientsList"><div class="text-muted">Loading...</div></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let unsubscribe = null;

export async function initStockDashboard() {
    document.getElementById("stockDetailsBtn")?.addEventListener("click", openStockDetailsModal);
    document.getElementById("stockAddCardBtn")?.addEventListener("click", openAddStockSearch);
    document.getElementById("garnishStockCardBtn")?.addEventListener("click", openGarnishStockModal);
    document.getElementById("stockScanCardBtn")?.addEventListener("click", () => {
        alert("Barcode scanning for stock is coming soon.");
    });
    document.getElementById("availableDrinksCompareBtn")?.addEventListener("click", toggleCompareToList);
    document.getElementById("ignoreGarnishToggleBtn")?.addEventListener("click", toggleIgnoreGarnish);
    updateIgnoreGarnishButton();
    document.getElementById("missingIngredientsCompareBtn")?.addEventListener("click", toggleMissingIngredientsCompareMode);
    bindMissingIngredientsControls();

    if (!unsubscribe) {
        unsubscribe = subscribe(() => {
            if (compareToListMode) renderAvailableDrinksForCurrentMode();
            if (missingIngredientsCompareMode) renderMissingIngredientsForCurrentMode();
        });
    }

    await refreshStockDashboard();
}

export async function refreshStockDashboard() {
    const [stockRows, drinks, garnishTypes] = await Promise.all([
        StockAPI.getAll().catch(() => []),
        DrinksAPI.getAllDetails().catch(() => []),
        GarnishAPI.getAll().catch(() => [])
    ]);

    latestStockRows = stockRows;
    latestDrinks = drinks;
    latestGarnishTypes = garnishTypes;

    renderStockOverviewSummary(stockRows);
    await renderMissingIngredientsForCurrentMode();
    await renderAvailableDrinksForCurrentMode();

    await Promise.all([
        loadDashboardDrinkChart().catch(() => {}),
        loadDashboardDrinkListsItems().catch(() => {}),
        refreshRecipeCard().catch(() => {}),
        refreshShoppingList().catch(() => {})
    ]);
}

export function getLatestStockRows() {
    return latestStockRows;
}

export function getLatestGarnishTypes() {
    return latestGarnishTypes;
}

export function buildStockMap(stockRows) {
    return new Map(stockRows.map(row => [row.food_id, row]));
}

export function estimateStockValue(row) {
    return calculateIngredientCost({
        food: row.food,
        sourceAmount: row.amount,
        sourceUnit: row.unit,
        quantity: 1
    });
}

function buildStockValueBreakdown(stockRows) {
    return stockRows
        .map(row => ({ name: row.food.name, value: estimateStockValue(row), amount: row.amount, unit: row.unit }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .map(item => `${item.name}: ${formatPrice(item.value)} (${formatAmount(item.amount, item.unit)})`);
}

function bindStockValueHover(elementId, stockRows) {
    const valueEl = document.getElementById(elementId);
    if (!valueEl) return;

    const lines = buildStockValueBreakdown(stockRows);
    const hoverLines = lines.length ? lines : ["No priced stock yet."];

    valueEl.addEventListener("mouseenter", () => showHoverBox(valueEl, hoverLines));
    valueEl.addEventListener("mouseleave", hideHoverBox);
    valueEl.addEventListener("focus", () => showHoverBox(valueEl, hoverLines));
    valueEl.addEventListener("blur", hideHoverBox);
}

function renderStockOverviewSummary(stockRows) {
    const summary = document.getElementById("stockOverviewSummary");
    if (!summary) return;

    if (!stockRows.length) {
        summary.textContent = "No stock tracked yet.";
        return;
    }

    const totalValue = stockRows.reduce((sum, row) => sum + estimateStockValue(row), 0);
    summary.innerHTML = `
        ${stockRows.length} item${stockRows.length === 1 ? "" : "s"} tracked<br>
        Total inventory value:
        <strong id="stockOverviewValue" class="dashboard-price-hover" tabindex="0">
            ${escapeHtml(formatPrice(totalValue))}
        </strong>
    `;

    bindStockValueHover("stockOverviewValue", stockRows);
}

// ======================================================
// STOCK DETAILS MODAL
// ======================================================

function openStockDetailsModal() {
    openFormModal({
        title: "Stock Details",
        submitLabel: "Done",
        cancelLabel: "Close",
        size: "modal-lg",
        body: renderStockDetailsBody(latestStockRows),
        onSubmit: () => closeAppModal()
    });

    bindStockDetailsActions();
    bindStockValueHover("stockDetailsValue", latestStockRows);
    renderStockChart(latestStockRows);
}

function renderStockDetailsBody(stockRows) {
    const totalValue = stockRows.reduce((sum, row) => sum + estimateStockValue(row), 0);

    const header = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span>
                Total inventory value:
                <strong id="stockDetailsValue" class="dashboard-price-hover" tabindex="0">
                    ${escapeHtml(formatPrice(totalValue))}
                </strong>
            </span>
            <button id="stockAddBtn" class="btn btn-outline-primary btn-sm" type="button">
                <i class="bi bi-plus-lg me-1"></i>Add to stock
            </button>
        </div>
    `;

    if (!stockRows.length) {
        return `
            ${header}
            <div class="text-muted">Add ingredients you have on hand to start tracking stock.</div>
        `;
    }

    return `
        ${header}
        <div class="dashboard-chart-shell mb-3">
            <canvas id="stockOverviewChart" height="180"></canvas>
        </div>
        <div class="stock-details-grid">
            ${stockRows.map(row => `
                <div class="stock-details-item" data-food-id="${row.food_id}">
                    <div class="fw-semibold">${escapeHtml(row.food.name)}</div>
                    ${row.food.brand ? `<div class="small text-muted">${escapeHtml(row.food.brand)}</div>` : ""}
                    <div class="small text-muted mb-2">${escapeHtml(formatAmount(row.amount, row.unit))}</div>
                    <div class="btn-group btn-group-sm w-100">
                        <button class="btn btn-outline-success stock-add-btn" type="button" title="Add"><i class="bi bi-plus"></i></button>
                        <button class="btn btn-outline-warning stock-remove-btn" type="button" title="Remove"><i class="bi bi-dash"></i></button>
                        <button class="btn btn-outline-danger stock-clear-btn" type="button" title="Clear"><i class="bi bi-x"></i></button>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function bindStockDetailsActions() {
    document.getElementById("stockAddBtn")?.addEventListener("click", openAddStockSearch);

    document.querySelectorAll("#appDynamicModalBody [data-food-id]").forEach(row => {
        const foodId = Number(row.dataset.foodId);
        const stockRow = latestStockRows.find(r => r.food_id === foodId);
        if (!stockRow) return;

        row.querySelector(".stock-add-btn")?.addEventListener("click", () => openAdjustModal(stockRow, "add"));
        row.querySelector(".stock-remove-btn")?.addEventListener("click", () => openAdjustModal(stockRow, "remove"));
        row.querySelector(".stock-clear-btn")?.addEventListener("click", async () => {
            if (!await confirmAction(`Clear tracked stock for ${stockRow.food.name}?`)) return;

            try {
                await StockAPI.delete(foodId);
                await refreshStockDashboard();
                openStockDetailsModal();
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to clear stock: " + error.message);
            }
        });
    });
}

// ======================================================
// GARNISH STOCK MODAL
// ======================================================

function openGarnishStockModal() {
    openFormModal({
        title: "Garnish Stock",
        submitLabel: "Done",
        cancelLabel: "Close",
        size: "modal-lg",
        body: renderGarnishStockBody(),
        onSubmit: () => closeAppModal()
    });

    bindGarnishStockActions();
}

// Finds the shared Stock row for a garnish's linked source food, if any.
function findGarnishStockRow(garnish) {
    if (!garnish.source_food_id) return null;
    return latestStockRows.find(row => row.food_id === garnish.source_food_id) || null;
}

function renderGarnishStockBody() {
    if (!latestGarnishTypes.length) {
        return '<div class="text-muted">No garnish types set up yet.</div>';
    }

    return `
        <div class="stock-details-grid">
            ${latestGarnishTypes.map(garnish => {
                const sourceFood = garnish.source_food;
                const stockRow = findGarnishStockRow(garnish);
                const amount = stockRow?.amount || 0;
                const hasYield = Boolean(garnish.yield_per_source);
                const equivalent = hasYield ? convertGarnishStockToOwnUnit(garnish, amount) : null;

                if (!sourceFood) {
                    return `
                        <div class="stock-details-item" data-garnish-id="${garnish.id}">
                            <div class="fw-semibold">${escapeHtml(garnish.name)}</div>
                            <div class="small text-muted mb-2">No source food linked yet.</div>
                            <button class="btn btn-outline-secondary btn-sm w-100 garnish-yield-edit-btn" type="button">
                                <i class="bi bi-link-45deg me-1"></i>Link source food
                            </button>
                        </div>
                    `;
                }

                const foodLabel = sourceFood.brand ? `${sourceFood.name} (${sourceFood.brand})` : sourceFood.name;

                return `
                    <div class="stock-details-item" data-garnish-id="${garnish.id}">
                        <div class="fw-semibold">${escapeHtml(foodLabel)}</div>
                        <div class="small text-muted">for ${escapeHtml(garnish.name)}</div>
                        <div class="small text-muted mb-2">
                            ${escapeHtml(formatAmount(amount, stockRow?.unit || sourceFood.base_unit || "piece"))}
                            ${hasYield ? ` &middot; &asymp;${escapeHtml(formatAmount(equivalent, garnish.unit_name))}` : ""}
                        </div>
                        <div class="btn-group btn-group-sm w-100 mb-1">
                            <button class="btn btn-outline-success garnish-stock-add-btn" type="button" title="Add"><i class="bi bi-plus"></i></button>
                            <button class="btn btn-outline-warning garnish-stock-remove-btn" type="button" title="Remove"><i class="bi bi-dash"></i></button>
                            <button class="btn btn-outline-danger garnish-stock-clear-btn" type="button" title="Clear"><i class="bi bi-x"></i></button>
                        </div>
                        <button class="btn btn-outline-secondary btn-sm w-100 garnish-yield-edit-btn" type="button">
                            <i class="bi bi-sliders me-1"></i>Edit yield
                        </button>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function bindGarnishStockActions() {
    document.querySelectorAll("#appDynamicModalBody [data-garnish-id]").forEach(row => {
        const garnishId = Number(row.dataset.garnishId);
        const garnish = latestGarnishTypes.find(g => g.id === garnishId);
        if (!garnish) return;

        row.querySelector(".garnish-stock-add-btn")?.addEventListener("click", () => openGarnishAdjustModal(garnish, "add"));
        row.querySelector(".garnish-stock-remove-btn")?.addEventListener("click", () => openGarnishAdjustModal(garnish, "remove"));
        row.querySelector(".garnish-stock-clear-btn")?.addEventListener("click", async () => {
            if (!await confirmAction(`Clear tracked stock for ${garnish.source_food?.name || garnish.name}?`)) return;

            try {
                await StockAPI.delete(garnish.source_food_id);
                await refreshStockDashboard();
                openGarnishStockModal();
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to clear garnish stock: " + error.message);
            }
        });

        row.querySelector(".garnish-yield-edit-btn")?.addEventListener("click", () => openGarnishYieldEditModal(garnish));
    });
}

function openGarnishAdjustModal(garnish, direction) {
    const label = direction === "add" ? "Add" : "Remove";
    const sourceFood = garnish.source_food;
    const displayName = sourceFood?.name || garnish.name;
    const stockRow = findGarnishStockRow(garnish);
    const unit = stockRow?.unit || sourceFood?.base_unit || "piece";

    openFormModal({
        title: `${label} stock: ${displayName}`,
        submitLabel: label,
        cancelLabel: "Back",
        body: `
            <label class="form-label" for="garnishAdjustAmount">Amount (${escapeHtml(unit)})</label>
            <input id="garnishAdjustAmount" class="form-control" type="number" min="0" step="1">
        `,
        onCancel: () => openGarnishStockModal(),
        onSubmit: async modal => {
            const amount = Number(modal.querySelector("#garnishAdjustAmount")?.value);

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Enter a positive amount.");
                return;
            }

            try {
                if (direction === "add") {
                    await StockAPI.add(garnish.source_food_id, { amount, unit });
                } else {
                    await StockAPI.remove(garnish.source_food_id, { amount, unit });
                }
                await refreshStockDashboard();
                openGarnishStockModal();
                showSaveSuccessToast();
            } catch (error) {
                alert(`Unable to ${direction} garnish stock: ` + error.message);
            }
        }
    });
}

function openGarnishYieldEditModal(garnish) {
    const selectedFood = pendingGarnishSourceFood?.garnishId === garnish.id
        ? pendingGarnishSourceFood.food
        : garnish.source_food;

    openFormModal({
        title: `Edit yield: ${garnish.name}`,
        submitLabel: "Save",
        cancelLabel: "Back",
        body: `
            <div class="mb-2">
                <label class="form-label mb-1">Bought as (source food)</label>
                <div id="garnishYieldSourceFood" class="border rounded p-2 small mb-2">
                    ${selectedFood
                        ? `<strong>${escapeHtml(selectedFood.name)}</strong>${selectedFood.brand ? ` <span class="text-muted">(${escapeHtml(selectedFood.brand)})</span>` : ""}`
                        : '<span class="text-muted">No source food linked.</span>'
                    }
                </div>
                <button id="garnishYieldSearchFoodBtn" class="btn btn-outline-primary btn-sm" type="button">
                    Search / change source food
                </button>
            </div>
            <div class="mb-2 mt-3">
                <label class="form-label" for="garnishYieldAmount">Yield per source (${escapeHtml(garnish.unit_name)}s per source food)</label>
                <input id="garnishYieldAmount" class="form-control" type="number" min="0.01" step="0.01" value="${garnish.yield_per_source ?? ""}">
            </div>
            <div class="form-check">
                <input id="garnishYieldEssential" class="form-check-input" type="checkbox" ${garnish.default_essential ? "checked" : ""}>
                <label class="form-check-label" for="garnishYieldEssential">Essential by default for new drinks</label>
            </div>
        `,
        onCancel: () => {
            pendingGarnishSourceFood = null;
            openGarnishStockModal();
        },
        onSubmit: async modal => {
            const sourceFoodId = selectedFood?.id ?? null;
            const yieldPerSource = Number(modal.querySelector("#garnishYieldAmount")?.value) || null;
            const defaultEssential = Boolean(modal.querySelector("#garnishYieldEssential")?.checked);

            try {
                await GarnishAPI.update(garnish.id, {
                    name: garnish.name,
                    unit_name: garnish.unit_name,
                    source_food_id: sourceFoodId,
                    yield_per_source: yieldPerSource,
                    default_essential: defaultEssential
                });
                pendingGarnishSourceFood = null;
                await refreshStockDashboard();
                openGarnishStockModal();
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to save yield: " + error.message);
            }
        }
    });

    document.getElementById("garnishYieldSearchFoodBtn")?.addEventListener("click", async () => {
        await openSearchDatabaseModal("foods", {
            mode: "select",
            selectLabel: "Link as source",
            onSelect: async food => {
                pendingGarnishSourceFood = { garnishId: garnish.id, food };
                openGarnishYieldEditModal(garnish);
            },
            onBack: () => {
                openGarnishYieldEditModal(garnish);
            }
        });
    });
}

const bottleCountPlugin = {
    id: 'bottleCounts',
    afterDatasetsDraw(chart, args, pluginOptions) {
        const ingredients = pluginOptions.ingredients || [];
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;

        if (!meta?.data?.length) return;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        meta.data.forEach((bar, index) => {
            const ingredient = ingredients[index];
            const step = ingredient?.baseAmount;
            const amount = Number(ingredient?.amount || 0);

            if (!step || step <= 0) return;

            const count = Math.floor(amount / step);
            if (count <= 0) return;

            ctx.fillText(String(count), bar.x, bar.y - 4);
        });

        ctx.restore();
    }
};

function renderStockChart(stockRows) {
    const canvas = document.getElementById("stockOverviewChart");
    if (!canvas) return;

    if (stockChart) {
        stockChart.destroy();
        stockChart = null;
    }

    if (!stockRows.length) return;

    const labels = stockRows.map(row => `${row.food.name} (${row.unit})`);
    const data = stockRows.map(row => row.amount);
    const chartIngredients = stockRows.map(row => ({
        amount: row.amount,
        unit: row.unit,
        baseAmount: getDisplayBaseAmount(row.food, row.unit)
    }));

    const ctx = canvas.getContext("2d");
    stockChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "In stock",
                data,
                backgroundColor: "rgba(54, 162, 235, 0.8)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                bottleSeparators: { ingredients: chartIngredients },
                bottleCounts: { ingredients: chartIngredients }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%'
                }
            }
        },
        plugins: [bottleSeparatorPlugin, bottleCountPlugin]
    });
}

function openAddStockSearch() {
    openSearchDatabaseModal("foods", {
        mode: "select",
        selectLabel: "Add to stock",
        onSelect: food => openStockAmountModal(food),
        onBack: () => openStockDetailsModal()
    });
}

function openStockAmountModal(food) {
    openFormModal({
        title: `Add stock: ${food.name}`,
        submitLabel: "Add",
        cancelLabel: "Back",
        body: `
            <label class="form-label" for="stockAddAmount">Amount</label>
            <div class="d-flex gap-2">
                <input id="stockAddAmount" class="form-control" type="number" min="0" step="0.1">
                <select id="stockAddUnit" class="form-select" style="max-width: 100px;">
                    ${renderUnitOptions(["ml", "cl", "l", "g", "kg"])}
                </select>
            </div>
        `,
        onCancel: () => openStockDetailsModal(),
        onSubmit: async modal => {
            const amount = Number(modal.querySelector("#stockAddAmount")?.value);
            const unit = modal.querySelector("#stockAddUnit")?.value || "ml";

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Enter a positive amount.");
                return;
            }

            try {
                await StockAPI.add(food.id, { amount, unit });
                await refreshStockDashboard();
                openStockDetailsModal();
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to add stock: " + error.message);
            }
        }
    });
}

function openAdjustModal(stockRow, direction) {
    const label = direction === "add" ? "Add" : "Remove";

    openFormModal({
        title: `${label} stock: ${stockRow.food.name}`,
        submitLabel: label,
        cancelLabel: "Back",
        body: `
            <label class="form-label" for="stockAdjustAmount">Amount (${escapeHtml(stockRow.unit)})</label>
            <input id="stockAdjustAmount" class="form-control" type="number" min="0" step="0.1">
        `,
        onCancel: () => openStockDetailsModal(),
        onSubmit: async modal => {
            const amount = Number(modal.querySelector("#stockAdjustAmount")?.value);

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Enter a positive amount.");
                return;
            }

            try {
                if (direction === "add") {
                    await StockAPI.add(stockRow.food_id, { amount, unit: stockRow.unit });
                } else {
                    await StockAPI.remove(stockRow.food_id, { amount, unit: stockRow.unit });
                }
                await refreshStockDashboard();
                openStockDetailsModal();
                showSaveSuccessToast();
            } catch (error) {
                alert(`Unable to ${direction} stock: ` + error.message);
            }
        }
    });
}

// Returns null for drinks with no ingredients, otherwise the max servings
// makeable from current stock and, when short, what's still missing.
function evaluateDrinkAgainstStock(drink, stockMap) {
    const ingredients = drink.ingredients || [];
    if (!ingredients.length) return null;

    let maxServings = Infinity;
    const shortfalls = [];
    let hasAnyStock = false;

    ingredients.forEach(ingredient => {
        const required = Number(ingredient.amount || 0);
        if (required <= 0) return;

        const stock = stockMap.get(ingredient.food_id);
        const stockAmount = stock
            ? (convertMeasurement(stock.amount, stock.unit, ingredient.unit) ?? 0)
            : 0;

        if (stockAmount > 0) hasAnyStock = true;

        maxServings = Math.min(maxServings, Math.floor(stockAmount / required));

        if (stockAmount < required) {
            shortfalls.push({
                name: ingredient.food?.name || "Ingredient",
                missing: required - stockAmount,
                unit: ingredient.unit
            });
        }
    });

    if (!Number.isFinite(maxServings)) maxServings = 0;

    return { maxServings, shortfalls, hasAnyStock };
}

// Garnish is informational: decorative garnish never limits availability.
// Essential garnish does, unless the bartender chooses to ignore it.
function evaluateDrinkGarnishServings(drink, garnishFoodStockMap) {
    const essentialGarnishes = (drink.garnishes || []).filter(dg => dg.essential);
    if (!essentialGarnishes.length) return { maxServings: Infinity, missing: [] };

    const perGarnish = essentialGarnishes
        .map(dg => {
            const perServing = Number(dg.quantity_per_serving || 0);
            if (perServing <= 0) return null;

            const garnish = dg.garnish;
            // No linked source food means there's nothing to check stock
            // against yet - treat it as untracked rather than "0 in stock"
            // so an unconfigured garnish doesn't silently hide every drink.
            if (!garnish?.source_food_id) return null;

            const stockRow = garnishFoodStockMap.get(garnish.source_food_id);
            const stockAmount = convertGarnishStockToOwnUnit(garnish, stockRow?.amount || 0);
            return {
                name: garnish.name || `Garnish ${dg.garnish_id}`,
                possible: Math.floor(stockAmount / perServing)
            };
        })
        .filter(Boolean);

    if (!perGarnish.length) return { maxServings: Infinity, missing: [] };

    const maxServings = Math.min(...perGarnish.map(g => g.possible));
    // Whichever garnish(es) sit at that ceiling are what's actually holding
    // availability back, whether they're fully out or just running low.
    const missing = perGarnish.filter(g => g.possible === maxServings).map(g => g.name);

    return { maxServings, missing };
}

// Subtracts a drink list's required ingredient totals from current stock,
// returning a stock-row-shaped array reflecting what would be left over.
function computeRemainingStock(stockRows, requiredItems) {
    return stockRows.map(row => {
        const required = requiredItems.find(item => item.foodId === row.food_id);
        if (!required) return row;

        const requiredInStockUnit = convertMeasurement(required.amount, required.unit, row.unit) ?? 0;
        return {
            ...row,
            amount: Math.max(0, row.amount - requiredInStockUnit)
        };
    });
}

async function toggleCompareToList() {
    compareToListMode = !compareToListMode;

    const btn = document.getElementById("availableDrinksCompareBtn");
    if (btn) {
        btn.textContent = compareToListMode ? "Show all stock" : "Compare to list";
        btn.classList.toggle("btn-secondary", compareToListMode);
        btn.classList.toggle("btn-outline-secondary", !compareToListMode);
    }

    await renderAvailableDrinksForCurrentMode();
}

function updateIgnoreGarnishButton() {
    const btn = document.getElementById("ignoreGarnishToggleBtn");
    if (!btn) return;
    btn.classList.toggle("btn-secondary", ignoreGarnishMode);
    btn.classList.toggle("btn-outline-secondary", !ignoreGarnishMode);
    btn.title = ignoreGarnishMode
        ? "Garnish ignored — showing all drinks available from ingredient stock alone. Click to factor essential garnish back in."
        : "Essential garnish shortages count against availability. Click to ignore garnish entirely.";
}

async function toggleIgnoreGarnish() {
    ignoreGarnishMode = !ignoreGarnishMode;
    updateIgnoreGarnishButton();
    await renderAvailableDrinksForCurrentMode();
}

async function renderAvailableDrinksForCurrentMode() {
    if (!compareToListMode) {
        renderAvailableDrinks(latestDrinks, latestStockRows, { compareMode: false });
        return;
    }

    const listId = getSelectedDrinkListId();
    if (!listId) {
        renderAvailableDrinks(latestDrinks, latestStockRows, { compareMode: true, noListSelected: true });
        return;
    }

    try {
        const list = await DrinksAPI.getList(listId);
        const required = computeDrinkListIngredientTotals(list);
        const remainingStock = computeRemainingStock(latestStockRows, required);
        renderAvailableDrinks(latestDrinks, remainingStock, { compareMode: true, listName: list.name });
    } catch (error) {
        console.warn("Unable to compare against current list:", error);
        renderAvailableDrinks(latestDrinks, latestStockRows, { compareMode: false });
    }
}

function renderAvailableDrinks(drinks, stockRows, { compareMode = false, noListSelected = false, listName = "" } = {}) {
    const container = document.getElementById("availableDrinksList");
    if (!container) return;

    if (noListSelected) {
        container.innerHTML = '<div class="text-muted">Select a drink list in Drink Prep first.</div>';
        return;
    }

    const listId = compareMode ? getSelectedDrinkListId() : null;
    const stockMap = buildStockMap(stockRows);
    // Garnish source-item stock always reads from the real current stock,
    // not the "remaining after this list" figures used for ingredients above.
    const garnishFoodStockMap = buildStockMap(latestStockRows);

    const available = drinks
        .map(drink => {
            const ingredientResult = evaluateDrinkAgainstStock(drink, stockMap);
            if (!ingredientResult) return { drink, result: null };

            const garnishResult = ignoreGarnishMode
                ? { maxServings: Infinity, missing: [] }
                : evaluateDrinkGarnishServings(drink, garnishFoodStockMap);

            const maxServings = Math.min(ingredientResult.maxServings, garnishResult.maxServings);
            const garnishLimited = !ignoreGarnishMode && garnishResult.maxServings < ingredientResult.maxServings;

            return {
                drink,
                result: { ...ingredientResult, maxServings, garnishLimited, missingGarnish: garnishResult.missing }
            };
        })
        .filter(({ result }) => result && result.maxServings >= 1)
        .sort((a, b) => b.result.maxServings - a.result.maxServings);

    if (!available.length) {
        container.innerHTML = compareMode
            ? `<div class="text-muted">Nothing extra can be made after covering ${escapeHtml(listName)}.</div>`
            : '<div class="text-muted">No drinks can be fully made from current stock yet.</div>';
        return;
    }

    container.innerHTML = `
        ${compareMode ? `<div class="small text-muted mb-2">Additional drinks possible after <strong>${escapeHtml(listName)}</strong></div>` : ""}
        <div class="list-group">
            ${available.map(({ drink, result }) => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(drink.name)}</span>
                    <div class="d-flex align-items-center gap-2">
                        ${result.garnishLimited ? `
                            <span class="badge bg-warning text-dark" title="Limited by essential garnish: ${escapeHtml(result.missingGarnish.join(', '))}">
                                <i class="bi bi-flower1"></i>
                            </span>
                        ` : ""}
                        <span class="badge bg-success">up to ${result.maxServings} serving${result.maxServings === 1 ? "" : "s"}</span>
                        ${listId ? `
                            <button class="btn btn-sm btn-outline-primary available-drink-add-btn" type="button" data-drink-id="${drink.id}" title="Add to list">
                                <i class="bi bi-plus-lg"></i>
                            </button>
                        ` : ""}
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    container.querySelectorAll(".available-drink-add-btn").forEach(btn => {
        const drinkId = Number(btn.dataset.drinkId);
        const drink = drinks.find(d => d.id === drinkId);
        if (!drink) return;

        btn.addEventListener("click", () => openAddDrinkToListModal(drink));
    });
}

function openAddDrinkToListModal(drink) {
    const listId = getSelectedDrinkListId();
    if (!listId) {
        alert("Select a drink list in Drink Prep first.");
        return;
    }

    openFormModal({
        title: `Add ${drink.name} to list`,
        submitLabel: "Add to list",
        body: `
            <label class="form-label" for="availableDrinkQuantity">Quantity</label>
            <input id="availableDrinkQuantity" class="form-control" type="number" min="1" step="1" value="1">
        `,
        onSubmit: async modal => {
            const quantity = Number(modal.querySelector("#availableDrinkQuantity")?.value || 1);

            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert("Enter a positive quantity.");
                return;
            }

            try {
                await addDrinkListItem(listId, drink.id, quantity);
                closeAppModal();
                await refreshStockDashboard();
                showSaveSuccessToast();
            } catch (error) {
                alert("Unable to add drink: " + error.message);
            }
        }
    });
}

function bindMissingIngredientsControls() {
    const input = document.getElementById("missingIngredientsMaxInput");

    input?.addEventListener("change", () => {
        missingIngredientsMaxFilter = Math.max(1, Math.round(Number(input.value)) || 1);
        input.value = missingIngredientsMaxFilter;
        renderMissingIngredientsForCurrentMode();
    });
}

async function toggleMissingIngredientsCompareMode() {
    missingIngredientsCompareMode = !missingIngredientsCompareMode;

    const btn = document.getElementById("missingIngredientsCompareBtn");
    if (btn) {
        btn.textContent = missingIngredientsCompareMode ? "Show all stock" : "Compare to list";
        btn.classList.toggle("btn-secondary", missingIngredientsCompareMode);
        btn.classList.toggle("btn-outline-secondary", !missingIngredientsCompareMode);
    }

    await renderMissingIngredientsForCurrentMode();
}

async function renderMissingIngredientsForCurrentMode() {
    if (!missingIngredientsCompareMode) {
        renderMissingIngredientsFromStock();
        return;
    }

    const container = document.getElementById("missingIngredientsList");
    const listId = getSelectedDrinkListId();
    if (!listId) {
        if (container) container.innerHTML = '<div class="text-muted">Select a drink list in Drink Prep first.</div>';
        return;
    }

    try {
        const list = await DrinksAPI.getList(listId);
        renderMissingIngredientsFromListOverlap(list);
    } catch (error) {
        console.warn("Unable to compare against current list:", error);
        if (container) container.innerHTML = `<div class="text-danger small">${escapeHtml(error.message)}</div>`;
    }
}

function renderMissingIngredientsFromStock() {
    const container = document.getElementById("missingIngredientsList");
    if (!container) return;

    const stockMap = buildStockMap(latestStockRows);
    const missing = latestDrinks
        .map(drink => ({ drink, result: evaluateDrinkAgainstStock(drink, stockMap) }))
        .filter(({ result }) => result && result.maxServings < 1 && result.hasAnyStock)
        .filter(({ result }) => result.shortfalls.length <= missingIngredientsMaxFilter)
        .sort((a, b) => a.result.shortfalls.length - b.result.shortfalls.length);

    if (!missing.length) {
        container.innerHTML = '<div class="text-muted">Nothing partially stocked within that range right now.</div>';
        return;
    }

    container.innerHTML = `
        <div class="list-group">
            ${missing.map(({ drink, result }) => `
                <div class="list-group-item">
                    <div class="fw-semibold mb-1">${escapeHtml(drink.name)}</div>
                    <div class="small text-muted">
                        Missing: ${result.shortfalls.length} ingredient${result.shortfalls.length === 1 ? "" : "s"}
                    </div>
                    ${result.shortfalls.map(s => `
                        <div class="small text-muted">${escapeHtml(s.name)} (${escapeHtml(formatAmount(s.missing, s.unit))} more)</div>
                    `).join("")}
                </div>
            `).join("")}
        </div>
    `;
}

// Finds drinks NOT already in the list that could be made using the same
// ingredient types the list already requires, plus a handful of new ones.
// This is about ingredient variety overlap, not stock quantities.
function renderMissingIngredientsFromListOverlap(list) {
    const container = document.getElementById("missingIngredientsList");
    if (!container) return;

    const requiredIngredientIds = new Set();
    (list.items || []).forEach(item => {
        (item.drink?.ingredients || []).forEach(ingredient => {
            if (ingredient.food_id != null) requiredIngredientIds.add(ingredient.food_id);
        });
    });

    const listDrinkIds = new Set((list.items || []).map(item => item.drink_id));

    const candidates = latestDrinks
        .filter(drink => !listDrinkIds.has(drink.id) && (drink.ingredients || []).length)
        .map(drink => ({
            drink,
            newIngredients: drink.ingredients.filter(ingredient => !requiredIngredientIds.has(ingredient.food_id))
        }))
        .filter(({ newIngredients }) => newIngredients.length >= 1 && newIngredients.length <= missingIngredientsMaxFilter)
        .sort((a, b) => a.newIngredients.length - b.newIngredients.length);

    const header = `
        <div class="small text-muted mb-2">
            Other drinks makeable using <strong>${escapeHtml(list.name)}</strong>'s ingredients, plus a few new ones
        </div>
    `;

    if (!candidates.length) {
        container.innerHTML = `${header}<div class="text-muted">No nearby drinks found within that range.</div>`;
        return;
    }

    container.innerHTML = `
        ${header}
        <div class="list-group">
            ${candidates.map(({ drink, newIngredients }) => `
                <div class="list-group-item">
                    <div class="fw-semibold mb-1">${escapeHtml(drink.name)}</div>
                    <div class="small text-muted">
                        Needs ${newIngredients.length} new ingredient${newIngredients.length === 1 ? "" : "s"}
                    </div>
                    ${newIngredients.map(ingredient => `
                        <div class="small text-muted">${escapeHtml(ingredient.food?.name || "Ingredient")} (${escapeHtml(formatAmount(ingredient.amount, ingredient.unit))})</div>
                    `).join("")}
                </div>
            `).join("")}
        </div>
    `;
}
