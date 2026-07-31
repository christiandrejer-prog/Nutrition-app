import {
    initDrinksDashboard,
    loadDashboardDrinkListsItems,
    loadDashboardDrinkChart
} from "../../modules/drinks/dashboard/drinks-dashboard.js";
import {
    initStockDashboard,
    renderStockCards
} from "../../modules/drinks/dashboard/stock-dashboard.js";
import {
    initShoppingDashboard,
    renderShoppingCards
} from "../../modules/drinks/dashboard/shopping-dashboard.js";
import {
    initDashboardTabs,
    renderDashboardTabs
} from "../components/dashboard-tabs.js";

export async function renderDrinkDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;

    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Drinks Dashboard</h3>
            ${renderDashboardTabs({
                id: "drinksDashboard",
                activeTab: "prep",
                tabs: [
                    {
                        id: "prep",
                        label: "Drink Prep",
                        icon: "bi bi-cup-straw",
                        content: renderDrinkPrepCards()
                    },
                    {
                        id: "stock",
                        label: "Stock",
                        icon: "bi bi-box-seam",
                        content: renderStockCards()
                    },
                    {
                        id: "shopping",
                        label: "Shopping",
                        icon: "bi bi-basket3",
                        content: renderShoppingCards()
                    }
                ]
            })}
        </div>
    `;

    initDashboardTabs(output);
    await initDrinksDashboard();
    await loadDashboardDrinkListsItems();
    await loadDashboardDrinkChart();
    await initStockDashboard();
    await initShoppingDashboard();
    output.scrollIntoView({ behavior: 'smooth' });
}

function renderDrinkPrepCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">Prep Totals</h5>
                            <button id="dashboardToggleStockBtn" class="btn btn-outline-secondary btn-sm flex-shrink-0" type="button" style="min-width: 7.5rem;">
                                <i class="bi bi-box-seam me-1"></i>Show stock
                            </button>
                        </div>
                        <div id="dashboardDrinkSummary">
                            <p class="text-muted">Select a drink list to show totals.</p>
                        </div>
                        <div class="mt-3 dashboard-chart-shell">
                            <canvas id="dashboardDrinkChart" width="300" height="240"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Drink Prep</h5>

                        <div class="d-grid gap-2 mb-3">
                            <button id="dashboardSelectDrinkListBtn" class="btn btn-primary btn-sm" type="button">
                                <i class="bi bi-search me-1"></i>Select drink list
                            </button>
                            <button id="dashboardAddDrinkBtn" class="btn btn-outline-primary btn-sm" type="button">
                                <i class="bi bi-plus-lg me-1"></i>Add drink to list
                            </button>
                            <button id="dashboardAddIngredientBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                <i class="bi bi-plus-lg me-1"></i>Add ingredient to drink
                            </button>
                            <div class="btn-group btn-group-sm" role="group">
                                <button id="dashboardCreateDrinkListBtn" class="btn btn-outline-success" type="button">New list</button>
                                <button id="dashboardCreateDrinkBtn" class="btn btn-outline-success" type="button">New drink</button>
                                <button class="btn btn-outline-danger" type="button" id="toggle-remove-drink-btn" data-action="toggle-drink-list-delete-mode">Remove drinks list</button>
                            </div>
                        </div>

                        <div id="dashboardDrinkList" class="mb-2">
                            <div class="text-muted">Loading drinks list...</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title mb-2">Recipe</h5>
                        <select id="recipeDrinkSelect" class="form-select form-select-sm mb-2">
                            <option value="">Select a drink list first</option>
                        </select>
                        <div id="recipeSteps">
                            <div class="text-muted small">Select a drink list to see recipes.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

