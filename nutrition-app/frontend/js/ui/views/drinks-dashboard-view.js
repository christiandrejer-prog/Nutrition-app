import {
    initDrinksDashboard,
    loadDashboardDrinkListsItems,
    loadDashboardDrinkChart
} from "../../modules/drinks/dashboard/drinks-dashboard.js";

export async function renderDrinkDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;

    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Drinks Dashboard</h3>
            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Prep Totals</h5>
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
                                    <button class="btn btn-outline-danger" type="button" id="toggle-remove-drink-btn" data-action="toggle-drink-list-delete-mode">Delete</button>
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
                            <h5 class="card-title">Garnish</h5>
                            <p class="card-text">Placeholder for garnish planning and serving notes.</p>
                            <div class="placeholder-glow">
                                <span class="placeholder col-6"></span>
                                <span class="placeholder col-8"></span>
                                <span class="placeholder col-4"></span>
                            </div>
                            <p class="mt-3"><strong><i>(Future feature)</i></strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await initDrinksDashboard();
    await loadDashboardDrinkListsItems();
    await loadDashboardDrinkChart();
    output.scrollIntoView({ behavior: 'smooth' });
}
