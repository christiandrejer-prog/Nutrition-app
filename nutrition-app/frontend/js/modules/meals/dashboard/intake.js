
import { getApiUrl } from "../../../config.js";
import { escapeHtml } from "../../../utils.js";
import {
    getDailyTargetKcal,
    getMacroTargets,
    MAINTENANCE_RESULT_EVENT
} from "./maintenance.js?v=20260529-macro-reference";

let intakeSummary = null;

export async function loadDashboardIntakeSummary() {
    const summaryContainer = document.getElementById('dashboardIntakeSummary');
    const chartCanvas = document.getElementById('dashboardIntakeChart');
    if (!summaryContainer || !chartCanvas) return;

    summaryContainer.innerHTML = 'Loading today\'s intake...';
    let chart = null;
    if (!window.Chart) {
        summaryContainer.innerHTML = 'Chart.js not loaded';
    }

    try {
        const response = await fetch(`${getApiUrl()}/intake/summary`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        intakeSummary = await response.json();
    } catch (error) {
        summaryContainer.innerHTML = `<div class="alert alert-warning">Unable to load intake summary: ${escapeHtml(error.message || String(error))}</div>`;
        return;
    }

    const data = intakeSummary || {};
    const protein = data.total_protein || 0;
    const carbs = data.total_carbs || 0;
    const fat = data.total_fat || 0;
    const total = data.total_calories || 0;
    const target = getDailyTargetKcal();

    summaryContainer.innerHTML = `
        <div id="dashboardIntakeTargetSummary">
            ${renderTargetComparison(total, target)}
        </div>
        <div>Protein: ${protein.toFixed(1)} g</div>
        <div>Carbs: ${carbs.toFixed(1)} g</div>
        <div>Fat: ${fat.toFixed(1)} g</div>
        <div class="mt-2"><small>Entries: ${data.entries ?? 0}</small></div>
        <div id="dashboardMacroBalanceSummary" class="mt-3">
            ${renderMacroBalance({ protein, carbs, fat }, getMacroTargets())}
        </div>

        <div id="todays-intake-container" class="mt-3"></div>
    `;

    const chartData = {
        protein,
        carbs,
        fat
    };

    // pass data into intake module
    requestAnimationFrame(() => {
        renderTodaysIntake(chartData);
    });

    window.addEventListener(MAINTENANCE_RESULT_EVENT, () => {
        const targetSummary = document.getElementById("dashboardIntakeTargetSummary");
        if (targetSummary) {
            targetSummary.innerHTML = renderTargetComparison(total, getDailyTargetKcal());
        }

        const macroSummary = document.getElementById("dashboardMacroBalanceSummary");
        if (macroSummary) {
            macroSummary.innerHTML = renderMacroBalance({ protein, carbs, fat }, getMacroTargets());
        }
    });
}

function renderTargetComparison(total, target) {
    const targetValue = Number(target || 0);
    const percent = targetValue > 0 ? (total / targetValue) * 100 : 0;

    return `
        <div class="intake-target-row">
            <div>
                <span>Intake</span>
                <strong>${total.toFixed(0)} kcal</strong>
            </div>
            <div>
                <span>Target</span>
                <strong>${targetValue > 0 ? `${targetValue.toFixed(0)} kcal` : "Not set"}</strong>
            </div>
            <div>
                <span>Progress</span>
                <strong>${targetValue > 0 ? `${percent.toFixed(0)}%` : "-"}</strong>
            </div>
        </div>
    `;
}

function renderMacroBalance(intake, targets) {
    if (!targets) {
        return `
            <div class="macro-balance-empty">
                Calculate maintenance in Planning to show macro targets.
            </div>
        `;
    }

    const rows = [
        {
            key: "protein",
            label: "Protein",
            intake: intake.protein,
            target: targets.protein?.grams || 0
        },
        {
            key: "carbs",
            label: "Carbs",
            intake: intake.carbs,
            target: targets.carbs?.grams || 0
        },
        {
            key: "fat",
            label: "Fat",
            intake: intake.fat,
            target: targets.fat?.grams || 0
        }
    ];

    return `
        <div class="macro-balance">
            <div class="macro-balance-title">Nutritional balance</div>
            ${rows.map(row => {
                const progress = row.target > 0 ? (row.intake / row.target) * 100 : 0;
                return `
                    <div class="macro-balance-row">
                        <span>${row.label}</span>
                        <strong>${row.intake.toFixed(1)} g</strong>
                        <strong>${row.target.toFixed(1)} g</strong>
                        <strong>${progress.toFixed(0)}%</strong>
                    </div>
                `;
            }).join("")}
            <div class="macro-balance-header">
                <span></span>
                <span>Intake</span>
                <span>Target</span>
                <span>Progress</span>
            </div>
            <div class="macro-balance-reference">
                National Academies: protein 10-35%, carbs 45-65%, fat 20-35%.
            </div>
        </div>
    `;
}


function renderTodaysIntake(serverData = null) {
    const out = document.getElementById('todays-intake-container');
    if (!out) return;

    out.innerHTML = `
        <hr>
            <div class="chart-wrapper">
                <canvas id="intakeChart"></canvas>
            </div>

        <h5 class="mt-3">Manual Intake input</h5>

        <div class="card mb-3">
            <div class="card-body">

                <div id="intake-controls" class="mb-3">
                    <button class="btn btn-primary" id="addIntakeRow">
                        Add Entry
                    </button>
                </div>

                <div id="intake-rows"></div>

                <p class="text-muted mt-2"><strong><i>(W.I.P.)</i></strong> This is a simple manual intake tracker for now (will be <i>deleted</i> at some point). <strong>Planned:</strong> save history, load history, and eventually a weekly / monthly graph report.</p>

            </div>
        </div>
    `;

    const rows = document.getElementById('intake-rows');
    const chartCanvas = document.getElementById('intakeChart');

    let intakeChart = null;

    // initial chart values (from backend OR empty)
    const base = serverData || { protein: 0, carbs: 0, fat: 0 };
    const initialData = serverData
        ? [
            (serverData.protein || 0) * 4,
            (serverData.carbs || 0) * 4,
            (serverData.fat || 0) * 9
        ]
        : [0, 0, 0];

    function recalcAndRender() {
        const entries = Array.from(rows.querySelectorAll('.intake-row'));

        let protein = 0, carbs = 0, fat = 0;

        entries.forEach(r => {
            const p = parseFloat(r.querySelector('.iprot')?.value) || 0;
            const c = parseFloat(r.querySelector('.icarb')?.value) || 0;
            const f = parseFloat(r.querySelector('.ifat')?.value) || 0;

            protein += p;
            carbs += c;
            fat += f;
        });

        // 🔥 COMBINE base (API) + manual input
        const totalData = [
            (base.protein + protein) * 4,
            (base.carbs + carbs) * 4,
            (base.fat + fat) * 9
        ];

        const data = [protein * 4, carbs * 4, fat * 9];

        // update chart if exists
        if (intakeChart) {
            intakeChart.data.datasets[0].data = totalData;
            intakeChart.update();
        }
    }

    // CREATE CHART (once)
    requestAnimationFrame(() => {
        if (!window.Chart || !chartCanvas) return;

        const ctx = chartCanvas.getContext('2d');
        if (!ctx) return;
        
        intakeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: initialData,
                    backgroundColor: ['#4e73df', '#1cc88a', '#f6c23e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw || 0;
                                const dataset = context.dataset.data;

                                const total = dataset.reduce((a, b) => a + b, 0) || 1;
                                const pct = ((value / total) * 100).toFixed(1);

                                const macros = ['Protein', 'Carbs', 'Fat'];

                                return `${macros[context.dataIndex]}: ${value.toFixed(0)} kcal (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

    });

    // ADD ROW
    document.getElementById('addIntakeRow').addEventListener('click', () => {
        const row = document.createElement('div');

        row.className = 'intake-row d-flex flex-wrap gap-2 align-items-center mb-2';

        row.innerHTML = `
            <input class="form-control iprot flex-grow-1" placeholder="Protein (g)">
            <input class="form-control icarb flex-grow-1" placeholder="Carbs (g)">
            <input class="form-control ifat flex-grow-1" placeholder="Fat (g)">
            <button class="btn btn-danger btn-sm remove-row">
                Remove
            </button>
        `;

        rows.appendChild(row);

        row.querySelectorAll('input')
            .forEach(i => i.addEventListener('input', recalcAndRender));

        row.querySelector('.remove-row')
            .addEventListener('click', () => {
                row.remove();
                recalcAndRender();
            });

        recalcAndRender();
    });

    // initial row
    document.getElementById('addIntakeRow').click();
}
