// meals-dashboard-view.js responsibilities:
    // Renders the meal dashboard view in the browser

// ###########################################################

import { loadDashboardIntakeSummary } from "../../modules/meals/dashboard/intake.js";
import {
    initMealsDashboard,
    loadDashboardConsumedMeals
} from "../../modules/meals/dashboard/consumedMeals.js";
import { renderDashboardActions } from "../components/dashboard-actions.js";
import {
    initDashboardTabs,
    renderDashboardTabs
} from "../components/dashboard-tabs.js";
import {
    initEnergyTargetSummary,
    initMaintenanceCalculator
} from "../../modules/meals/dashboard/maintenance.js";
import { initEnergyTargetChart } from "../../modules/meals/dashboard/energy-target-chart.js";
import { initWeightLog } from "../../modules/meals/dashboard/weight-log.js";
import { initHistoryTab } from "../../modules/meals/dashboard/history.js";

export async function renderMealDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Meal Dashboard</h3>
            ${renderDashboardTabs({
                id: "mealsDashboard",
                activeTab: "today",
                tabs: [
                    {
                        id: "today",
                        label: "Today",
                        icon: "bi bi-egg-fried",
                        content: renderTodayCards()
                    },
                    {
                        id: "history",
                        label: "History",
                        icon: "bi bi-graph-up",
                        content: renderHistoryCards()
                    },
                    {
                        id: "planning",
                        label: "Planning",
                        icon: "bi bi-calendar2-week",
                        content: renderPlanningCards()
                    }
                ]
            })}
        </div>
    `;

    initDashboardTabs(output);
    initMaintenanceCalculator();
    initEnergyTargetSummary();
    initEnergyTargetChart();
    initWeightLog();
    initHistoryTab();
    await loadDashboardIntakeSummary();
    await initMealsDashboard();
    await loadDashboardConsumedMeals();
    output.scrollIntoView({behavior: 'smooth'});
}

function renderTodayCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Today's Intake</h5>
                        <div id="dashboardIntakeSummary">
                            <p class="text-muted">Loading today's intake summary...</p>
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
                        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <h5 class="card-title mb-0">Energy Target</h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button id="energyTargetDailyBtn" class="btn btn-outline-primary active" type="button">Daily</button>
                                <button id="energyTargetWeeklyBtn" class="btn btn-outline-primary" type="button">Weekly</button>
                            </div>
                        </div>
                        <div id="energyTargetSummary" class="mt-2">
                            <p class="text-muted mb-0">Use the Planning tab to calculate maintenance and energy target.</p>
                        </div>
                        <div class="form-check form-switch mt-2 mb-0">
                            <input class="form-check-input" type="checkbox" id="energyTargetConfidenceToggle">
                            <label class="form-check-label small" for="energyTargetConfidenceToggle">
                                Show confidence interval
                            </label>
                        </div>
                        <div class="mt-2 dashboard-chart-shell">
                            <canvas id="energyTargetChart" width="350" height="220"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPlanningCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm" id="dashboardMaintenanceCard">
                    <div class="card-body">
                        <h5 class="card-title">Maintenance</h5>
                        <div id="weightLogWidget" class="weight-log-widget mb-3">
                            <label class="form-label small mb-1">Log today's weight</label>
                            <div class="d-flex gap-2">
                                <input id="weightLogInput" class="form-control form-control-sm" type="number" min="1" max="500" step="0.1" placeholder="kg">
                                <button id="weightLogBtn" class="btn btn-outline-primary btn-sm flex-shrink-0" type="button">Log</button>
                            </div>
                            <div id="weightLogList" class="mt-2">
                                <div class="text-muted small">Loading weight history...</div>
                            </div>
                        </div>
                        <div class="maintenance-form">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label small">Age</label>
                                    <input id="maintenanceAge" class="form-control form-control-sm" type="number" value="30" min="10" max="120">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Sex</label>
                                    <select id="maintenanceSex" class="form-select form-select-sm">
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Weight kg</label>
                                    <input id="maintenanceWeight" class="form-control form-control-sm" type="number" value="80" min="1" max="500" step="0.1">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Height cm</label>
                                    <input id="maintenanceHeight" class="form-control form-control-sm" type="number" value="180" min="1" max="300" step="0.1">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Daily living</label>
                                    <select id="maintenanceBaselineActivity" class="form-select form-select-sm">
                                        <option value="sedentary">Sedentary</option>
                                        <option value="light">Light</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="active">Active</option>
                                    </select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Goal</label>
                                    <select id="maintenanceGoal" class="form-select form-select-sm">
                                        <option value="maintain">Maintain</option>
                                        <option value="lose">Lose</option>
                                        <option value="gain">Gain</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small">Protein g/day</label>
                                    <input id="maintenanceProtein" class="form-control form-control-sm" type="number" value="120" min="0" max="1000" step="1">
                                </div>
                            </div>

                            <button id="maintenanceCalculateBtn" class="btn btn-primary btn-sm w-100 mt-3" type="button">
                                Calculate maintenance
                            </button>
                        </div>
                        <div id="maintenanceResult" class="mt-3">
                            <p class="text-muted mb-0">Calculate to update the Daily Target card.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Activity</h5>
                        <div id="activityKcalSummary" class="activity-kcal-summary mb-3">
                            <span>Total activity</span>
                            <strong>0 kcal / week</strong>
                        </div>
                        <p class="text-muted small mb-2">Scheduled weekly activity used in the maintenance estimate.</p>
                        <div id="maintenanceActivityRows"></div>
                        <div class="d-grid gap-2 mt-2">
                            <button id="maintenanceAddActivityBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                <i class="bi bi-plus-lg me-1"></i>Add scheduled activity
                            </button>
                            <button id="maintenanceAddDirectKcalBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                <i class="bi bi-watch me-1"></i>Add kcal burned
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Meal Suggestions</h5>
                        <p class="card-text text-muted">Future recommendations based on preferences, goals, and budget.</p>
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

function renderHistoryCards() {
    return `
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Energy Balance</h5>
                        <p class="card-text text-muted small mb-2">
                            Rolling 7-day average intake vs. maintenance - a surplus one day and a deficit the
                            next cancel out here, instead of being judged day by day.
                        </p>
                        <div id="energyBalanceText">
                            <p class="text-muted mb-0">Loading...</p>
                        </div>
                        <div class="mt-3 dashboard-chart-shell">
                            <canvas id="energyBalanceChart" width="350" height="220"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Goal Balance</h5>
                        <p class="card-text text-muted small mb-2">
                            How your rolling average balance compares to your stated goal.
                        </p>
                        <div id="goalBalanceText">
                            <p class="text-muted mb-0">Loading...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Macro Trend</h5>
                        <p class="card-text text-muted">
                            Planned next: protein/carbs/fat as a % of target, trended over the same rolling window.
                        </p>
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
