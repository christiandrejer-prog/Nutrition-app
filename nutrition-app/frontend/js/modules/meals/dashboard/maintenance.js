import { getApiUrl } from "../../../config.js";
import { escapeHtml } from "../../../utils.js";

export const MAINTENANCE_RESULT_EVENT = "nutrition:maintenance-result";
const MAINTENANCE_RESULT_KEY = "nutrition_app_maintenance_result";

const ACTIVITY_OPTIONS = [
    { name: "Brisk walking", met: 4.0 },
    { name: "Cycling, moderate", met: 7.5 },
    { name: "Running, easy", met: 8.3 },
    { name: "Strength training", met: 5.0 },
    { name: "Swimming, moderate", met: 6.0 },
    { name: "Football/soccer", met: 7.0 },
    { name: "Yoga", met: 2.5 },
    { name: "Housework", met: 3.3 },
];

const DEFAULT_ACTIVITY = {
    name: "Brisk walking",
    minutes_per_week: 150,
    met: 4.0
};

export function initMaintenanceCalculator() {
    const root = document.getElementById("dashboardMaintenanceCard");
    if (!root) return;

    const addActivityButton = document.getElementById("maintenanceAddActivityBtn");
    const addDirectKcalButton = document.getElementById("maintenanceAddDirectKcalBtn");
    const calculateButton = root.querySelector("#maintenanceCalculateBtn");

    addActivityButton?.addEventListener("click", () => {
        addActivityRow();
    });

    addDirectKcalButton?.addEventListener("click", () => {
        addDirectKcalRow();
    });

    calculateButton?.addEventListener("click", () => {
        calculateMaintenance();
    });

    document.getElementById("maintenanceWeight")?.addEventListener("input", updateActivitySummary);

    if (!document.querySelector(".maintenance-activity-row, .maintenance-direct-kcal-row")) {
        addActivityRow(DEFAULT_ACTIVITY);
    }
    updateActivitySummary();

    const savedResult = getSavedMaintenanceResult();
    if (savedResult) {
        renderMaintenanceResult(savedResult);
        updateDailyTargetSummary(savedResult);
    }
}

function addActivityRow(activity = {}) {
    const rows = document.getElementById("maintenanceActivityRows");
    if (!rows) return;

    const row = document.createElement("div");
    row.className = "maintenance-activity-row d-flex gap-2 align-items-start flex-wrap mb-2";
    row.innerHTML = `
        <select class="form-select maintenance-activity-name">
            ${renderActivityOptions(activity.name || DEFAULT_ACTIVITY.name)}
        </select>
        <input class="form-control maintenance-activity-minutes" type="number" min="0" max="10080" step="1" value="${activity.minutes_per_week ?? ""}" placeholder="Min/week">
        <input class="maintenance-activity-met" type="hidden" value="${activity.met ?? DEFAULT_ACTIVITY.met}">
        <div class="maintenance-activity-meta">
            <span class="maintenance-activity-met-label">MET ${activity.met ?? DEFAULT_ACTIVITY.met}</span>
            <small class="maintenance-activity-kcal">0 kcal/week</small>
        </div>
        <button class="btn btn-outline-danger btn-sm maintenance-remove-activity" type="button">
            <i class="bi bi-trash"></i>
        </button>
    `;

    row.querySelector(".maintenance-activity-name")?.addEventListener("change", event => {
        const selected = findActivityOption(event.target.value);
        const metInput = row.querySelector(".maintenance-activity-met");
        if (metInput && selected) {
            metInput.value = selected.met;
        }
        updateActivityRowMeta(row);
        updateActivitySummary();
    });
    row.querySelector(".maintenance-activity-minutes")?.addEventListener("input", () => {
        updateActivityRowMeta(row);
        updateActivitySummary();
    });

    row.querySelector(".maintenance-remove-activity")?.addEventListener("click", () => {
        row.remove();
        updateActivitySummary();
    });

    rows.appendChild(row);
    updateActivityRowMeta(row);
    updateActivitySummary();
}

function addDirectKcalRow(value = "") {
    const rows = document.getElementById("maintenanceActivityRows");
    if (!rows) return;

    const row = document.createElement("div");
    row.className = "maintenance-direct-kcal-row d-flex gap-2 align-items-start flex-wrap mb-2";
    row.innerHTML = `
        <input class="form-control maintenance-direct-kcal-label" value="Watch / device" placeholder="Source">
        <input class="form-control maintenance-direct-kcal-value" type="number" min="0" max="100000" step="1" value="${value}" placeholder="kcal/week">
        <button class="btn btn-outline-danger btn-sm maintenance-remove-activity" type="button">
            <i class="bi bi-trash"></i>
        </button>
    `;

    row.querySelector(".maintenance-direct-kcal-value")?.addEventListener("input", updateActivitySummary);
    row.querySelector(".maintenance-remove-activity")?.addEventListener("click", () => {
        row.remove();
        updateActivitySummary();
    });

    rows.appendChild(row);
    updateActivitySummary();
}

async function calculateMaintenance() {
    const result = document.getElementById("maintenanceResult");
    if (!result) return;

    const payload = getMaintenancePayload();
    result.innerHTML = `<div class="text-muted">Calculating...</div>`;

    try {
        const response = await fetch(`${getApiUrl()}/nutrition/maintenance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.detail ? JSON.stringify(data.detail) : response.statusText);
        }

        saveMaintenanceResult(data);
        renderMaintenanceResult(data);
        updateDailyTargetSummary(data);
        window.dispatchEvent(new CustomEvent(MAINTENANCE_RESULT_EVENT, { detail: data }));
    } catch (error) {
        result.innerHTML = `
            <div class="alert alert-warning mb-0">
                Unable to calculate maintenance: ${escapeHtml(error.message || String(error))}
            </div>
        `;
    }
}

function getMaintenancePayload() {
    return {
        age: readNumber("maintenanceAge", 30),
        sex: readValue("maintenanceSex", "male"),
        weight_kg: readNumber("maintenanceWeight", 80),
        height_cm: readNumber("maintenanceHeight", 180),
        baseline_activity_level: readValue("maintenanceBaselineActivity", "sedentary"),
        protein_grams_per_day: readNumber("maintenanceProtein", 120),
        goal: readValue("maintenanceGoal", "maintain"),
        activity_sessions: Array.from(document.querySelectorAll(".maintenance-activity-row"))
            .map(row => ({
                name: row.querySelector(".maintenance-activity-name")?.value || "Activity",
                minutes_per_week: Number(row.querySelector(".maintenance-activity-minutes")?.value || 0),
                met: Number(row.querySelector(".maintenance-activity-met")?.value || 1)
            }))
            .filter(activity => activity.minutes_per_week > 0),
        direct_activity_kcal_per_week: getDirectActivityKcalPerWeek()
    };
}

function renderMaintenanceResult(data) {
    const result = document.getElementById("maintenanceResult");
    if (!result) return;

    const activities = data.activity_sessions || [];

    result.innerHTML = `
        <div class="maintenance-result-grid">
            <div>
                <span>Daily target</span>
                <strong>${formatKcal(data.daily_target_kcal)}</strong>
            </div>
            <div>
                <span>Maintenance</span>
                <strong>${formatKcal(data.daily_maintenance_kcal)}</strong>
            </div>
            <div>
                <span>Weekly target</span>
                <strong>${formatKcal(data.weekly_target_kcal)}</strong>
            </div>
            <div>
                <span>BMR</span>
                <strong>${formatKcal(data.bmr_kcal_per_day)}</strong>
            </div>
        </div>

        <div class="small text-muted mt-2">
            Living: ${formatKcal(data.baseline_living_kcal_per_day)} / day |
            Activity: ${formatKcal(data.total_activity_kcal_per_week ?? data.scheduled_activity_kcal_per_week)} / week |
            Protein TEF: ${formatKcal(data.protein_thermic_effect_kcal_per_day)} / day
        </div>

        <div class="maintenance-breakdown mt-3">
            <div class="maintenance-breakdown-title">Calculation breakdown</div>
            <div class="maintenance-breakdown-row">
                <span>BMR</span>
                <strong>${formatKcal(data.bmr_kcal_per_day)} / day</strong>
            </div>
            <div class="maintenance-breakdown-row">
                <span>Living activity</span>
                <strong>${formatKcal(data.baseline_living_kcal_per_day)} / day</strong>
            </div>
            <div class="maintenance-breakdown-note">
                BMR x ${Number(data.baseline_activity_factor || 0).toFixed(2)} baseline factor
            </div>
            <div class="maintenance-breakdown-row">
                <span>Scheduled activity</span>
                <strong>${formatKcal(data.total_activity_kcal_per_day ?? data.scheduled_activity_kcal_per_day)} / day</strong>
            </div>
            <div class="maintenance-breakdown-note">
                ${formatKcal(data.scheduled_activity_kcal_per_week)} scheduled + ${formatKcal(data.direct_activity_kcal_per_week)} direct / week
            </div>
            <div class="maintenance-breakdown-row">
                <span>Protein digestion</span>
                <strong>${formatKcal(data.protein_thermic_effect_kcal_per_day)} / day</strong>
            </div>
            <div class="maintenance-breakdown-row">
                <span>Goal adjustment</span>
                <strong>${formatSignedKcal(data.goal_adjustment_kcal_per_day)} / day</strong>
            </div>
            <div class="maintenance-breakdown-total">
                <span>Target</span>
                <strong>${formatKcal(data.daily_target_kcal)} / day</strong>
            </div>
        </div>

        ${activities.length ? `
            <div class="small mt-2">
                ${activities.map(activity => `
                    <div>${escapeHtml(activity.name)}: ${formatKcal(activity.kcal_per_week)} / week</div>
                `).join("")}
            </div>
        ` : ""}
    `;
}

export function initDailyTargetSummary() {
    const savedResult = getSavedMaintenanceResult();
    updateDailyTargetSummary(savedResult);

    window.addEventListener(MAINTENANCE_RESULT_EVENT, event => {
        updateDailyTargetSummary(event.detail);
    });
}

export function getDailyTargetKcal() {
    return Number(getSavedMaintenanceResult()?.daily_target_kcal || 0);
}

export function getMacroTargets() {
    return getSavedMaintenanceResult()?.macro_targets || null;
}

function updateDailyTargetSummary(data) {
    const summary = document.getElementById("dailyTargetSummary");
    if (!summary) return;

    if (!data) {
        summary.innerHTML = `<p class="text-muted mb-0">Use the Planning tab to calculate maintenance and daily target.</p>`;
        return;
    }

    summary.innerHTML = `
        <div class="maintenance-result-grid">
            <div>
                <span>Daily target</span>
                <strong>${formatKcal(data.daily_target_kcal)}</strong>
            </div>
            <div>
                <span>Maintenance</span>
                <strong>${formatKcal(data.daily_maintenance_kcal)}</strong>
            </div>
            <div>
                <span>Weekly target</span>
                <strong>${formatKcal(data.weekly_target_kcal)}</strong>
            </div>
            <div>
                <span>Protein TEF</span>
                <strong>${formatKcal(data.protein_thermic_effect_kcal_per_day)}</strong>
            </div>
        </div>
    `;
}

function saveMaintenanceResult(data) {
    localStorage.setItem(MAINTENANCE_RESULT_KEY, JSON.stringify(data));
}

function getSavedMaintenanceResult() {
    try {
        const raw = localStorage.getItem(MAINTENANCE_RESULT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("Unable to read maintenance result:", error);
        return null;
    }
}

function renderActivityOptions(selectedName) {
    return ACTIVITY_OPTIONS.map(option => `
        <option value="${escapeHtml(option.name)}" ${option.name === selectedName ? "selected" : ""}>
            ${escapeHtml(option.name)}
        </option>
    `).join("");
}

function findActivityOption(name) {
    return ACTIVITY_OPTIONS.find(option => option.name === name) || ACTIVITY_OPTIONS[0];
}

function updateActivitySummary() {
    const summary = document.getElementById("activityKcalSummary");
    if (!summary) return;

    const weightKg = readNumber("maintenanceWeight", 80);
    const scheduledKcal = getScheduledActivityKcalPerWeek(weightKg);
    const directKcal = getDirectActivityKcalPerWeek();
    const totalKcal = scheduledKcal + directKcal;

    summary.innerHTML = `
        <span>Total activity</span>
        <strong>${formatKcal(totalKcal)} / week</strong>
        <small>${formatKcal(scheduledKcal)} scheduled + ${formatKcal(directKcal)} direct</small>
    `;
}

function updateActivityRowMeta(row) {
    const met = Number(row.querySelector(".maintenance-activity-met")?.value || 1);
    const minutes = Number(row.querySelector(".maintenance-activity-minutes")?.value || 0);
    const weightKg = readNumber("maintenanceWeight", 80);
    const kcal = Math.max(met - 1, 0) * 3.5 * weightKg / 200 * minutes;

    const metLabel = row.querySelector(".maintenance-activity-met-label");
    const kcalLabel = row.querySelector(".maintenance-activity-kcal");

    if (metLabel) metLabel.textContent = `MET ${met.toFixed(1).replace(".0", "")}`;
    if (kcalLabel) kcalLabel.textContent = `${formatKcal(kcal)}/week`;
}

function getScheduledActivityKcalPerWeek(weightKg) {
    return Array.from(document.querySelectorAll(".maintenance-activity-row"))
        .reduce((total, row) => {
            const minutes = Number(row.querySelector(".maintenance-activity-minutes")?.value || 0);
            const met = Number(row.querySelector(".maintenance-activity-met")?.value || 1);
            const netMet = Math.max(met - 1, 0);
            return total + (netMet * 3.5 * weightKg / 200 * minutes);
        }, 0);
}

function getDirectActivityKcalPerWeek() {
    return Array.from(document.querySelectorAll(".maintenance-direct-kcal-value"))
        .reduce((total, input) => total + (Number(input.value || 0) || 0), 0);
}

function readNumber(id, fallback) {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? value : fallback;
}

function readValue(id, fallback) {
    return document.getElementById(id)?.value || fallback;
}

function formatKcal(value) {
    return `${Math.round(Number(value || 0)).toLocaleString()} kcal`;
}

function formatSignedKcal(value) {
    const number = Math.round(Number(value || 0));
    const prefix = number > 0 ? "+" : "";
    return `${prefix}${number.toLocaleString()} kcal`;
}
