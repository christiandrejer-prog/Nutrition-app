import { getApiUrl } from "../../../config.js";
import { escapeHtml } from "../../../utils.js";
import { getDailyMaintenanceKcal, getMaintenanceResult } from "./maintenance.js";

const WINDOW_DAYS = 7;
let historyInitialized = false;

export function initHistoryTab() {
    const tabButton = document.getElementById("mealsDashboard-history-tab");
    if (!tabButton) return;

    tabButton.addEventListener("click", () => {
        if (historyInitialized) return;
        historyInitialized = true;
        renderHistoryTab();
    });

    // Already-active on first load (e.g. after a page refresh with a saved tab state).
    if (tabButton.classList.contains("active")) {
        historyInitialized = true;
        renderHistoryTab();
    }
}

async function renderHistoryTab() {
    const maintenanceKcal = getDailyMaintenanceKcal();
    if (!maintenanceKcal) {
        setUnavailable("Calculate your maintenance in the Planning tab first.");
        return;
    }

    try {
        const response = await fetch(
            `${getApiUrl()}/intake/energy-balance?daily_maintenance_kcal=${maintenanceKcal}&window_days=${WINDOW_DAYS}`
        );
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();

        renderEnergyBalanceChart(data);
        renderEnergyBalanceText(data);
        renderGoalBalanceText(data);
    } catch (error) {
        setUnavailable(`Unable to load history: ${escapeHtml(error.message || String(error))}`);
    }
}

function setUnavailable(message) {
    const energyBalanceText = document.getElementById("energyBalanceText");
    const goalBalanceText = document.getElementById("goalBalanceText");
    if (energyBalanceText) energyBalanceText.innerHTML = `<p class="text-muted mb-0">${message}</p>`;
    if (goalBalanceText) goalBalanceText.innerHTML = `<p class="text-muted mb-0">${message}</p>`;
}

function renderEnergyBalanceChart(data) {
    const canvas = document.getElementById("energyBalanceChart");
    if (!canvas) return;

    const labels = data.daily_totals.map(day => formatShortDate(day.intake_date));
    const consumed = data.daily_totals.map(day => day.total_calories);
    const target = labels.map(() => data.daily_maintenance_kcal);

    if (window.energyBalanceChart instanceof Chart) {
        window.energyBalanceChart.destroy();
    }

    window.energyBalanceChart = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Consumed",
                    data: consumed,
                    backgroundColor: consumed.map(kcal =>
                        kcal >= data.daily_maintenance_kcal ? "rgba(220, 53, 69, 0.75)" : "rgba(25, 135, 84, 0.75)"
                    )
                },
                {
                    type: "line",
                    label: "Maintenance",
                    data: target,
                    borderColor: "#adb5bd",
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: "kcal" } }
            }
        }
    });
}

function renderEnergyBalanceText(data) {
    const container = document.getElementById("energyBalanceText");
    if (!container) return;

    const direction = data.average_daily_balance_kcal >= 0 ? "surplus" : "deficit";
    const rateDirection = data.projected_weekly_rate_kg >= 0 ? "gain" : "loss";

    container.innerHTML = `
        <p class="mb-1">
            Averaging <strong>${formatKcal(data.average_daily_calories)}</strong>/day over the last
            ${data.window_days} days vs. your <strong>${formatKcal(data.daily_maintenance_kcal)}</strong> maintenance
            &rarr; a ${Math.abs(data.average_daily_balance_kcal).toFixed(0)} kcal/day ${direction}.
        </p>
        <p class="small text-muted mb-0">
            Rough estimate: roughly ${Math.abs(data.projected_weekly_rate_kg).toFixed(2)} kg/week ${rateDirection}
            if this trend continues. Your body responds to sustained trends, not single days.
        </p>
    `;
}

function renderGoalBalanceText(data) {
    const container = document.getElementById("goalBalanceText");
    if (!container) return;

    const result = getMaintenanceResult();
    const goalAdjustment = Number(result?.goal_adjustment_kcal_per_day || 0);

    if (goalAdjustment === 0) {
        container.innerHTML = `
            <p class="mb-0">
                Your goal is to maintain weight. You're averaging a
                ${Math.abs(data.average_daily_balance_kcal).toFixed(0)} kcal/day
                ${data.average_daily_balance_kcal >= 0 ? "surplus" : "deficit"} over the last ${data.window_days} days.
            </p>
        `;
        return;
    }

    const sameDirection = Math.sign(goalAdjustment) === Math.sign(data.average_daily_balance_kcal);
    const pace = sameDirection ? Math.abs(data.average_daily_balance_kcal / goalAdjustment) * 100 : 0;

    container.innerHTML = `
        <p class="mb-0">
            Your goal calls for a ${Math.abs(goalAdjustment).toFixed(0)} kcal/day
            ${goalAdjustment < 0 ? "deficit" : "surplus"}. You're averaging
            ${Math.abs(data.average_daily_balance_kcal).toFixed(0)} kcal/day
            ${data.average_daily_balance_kcal < 0 ? "deficit" : "surplus"} over the last ${data.window_days} days
            &mdash; ${sameDirection ? `tracking at about ${pace.toFixed(0)}% of your goal pace.` : "currently moving the opposite direction from your goal."}
        </p>
    `;
}

function formatKcal(value) {
    return `${Math.round(Number(value || 0)).toLocaleString()} kcal`;
}

function formatShortDate(intakeDate) {
    const date = new Date(`${intakeDate}T00:00:00`);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
