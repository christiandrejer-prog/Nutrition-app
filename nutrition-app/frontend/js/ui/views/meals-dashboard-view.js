// meals-dashboard-view.js responsibilities:
    // Renders the meal dashboard view in the browser

// ###########################################################

import { loadDashboardIntakeSummary } from "../../modules/meals/dashboard/intake.js";
import {
    initMealsDashboard,
    loadDashboardConsumedMeals
} from "../../modules/meals/dashboard/consumedMeals.js";
import { renderDashboardActions } from "../components/dashboard-actions.js";

export async function renderMealDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Meal Dashboard</h3>
            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Today's Intake</h5>
                            <div id="dashboardIntakeSummary">
                                <p class="text-muted">Loading today\'s intake summary...</p>
                            </div>
                            <div class="mt-3">
                                <canvas id="dashboardIntakeChart" width="350" height="240"></canvas>
                            </div>
                            <p class="mt-3"><strong><i>(W.I.P)</i></strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Consumed Meals</h5>
                            ${renderDashboardActions({
                                primary: [
                                    {
                                        id: "dashboardAddConsumedMealBtn",
                                        label: "Add consumed meal",
                                        icon: "bi bi-search",
                                        className: "btn btn-primary btn-sm"
                                    },
                                    {
                                        id: "dashboardAddFoodToMealBtn",
                                        label: "Add food to meal",
                                        icon: "bi bi-plus-lg",
                                        className: "btn btn-outline-primary btn-sm"
                                    }
                                ],
                                grouped: [
                                    {
                                        id: "dashboardCreateMealBtn",
                                        label: "New meal",
                                        className: "btn btn-outline-success"
                                    },
                                    {
                                        id: "dashboardCreateFoodBtn",
                                        label: "New food",
                                        className: "btn btn-outline-success"
                                    },
                                    {
                                        id: "dashboardRemoveConsumedMealBtn",
                                        label: "Delete",
                                        className: "btn btn-outline-danger"
                                    }
                                ]
                            })}
                            <div id="dashboardConsumedMealsList" class="mb-2">
                                <div class="text-muted">Loading today's consumed meals...</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Activity / Workouts</h5>
                            <p class="card-text">Placeholder for activity logging and daily tracking.</p>
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

    await loadDashboardIntakeSummary();
    await initMealsDashboard();
    await loadDashboardConsumedMeals();
    output.scrollIntoView({behavior: 'smooth'});
}
