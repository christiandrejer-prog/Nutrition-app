import { getApiUrl } from "../../../config.js";
import { escapeHtml } from "../../../utils.js";

export function initWeightLog() {
    const root = document.getElementById("weightLogWidget");
    if (!root) return;

    document.getElementById("weightLogBtn")?.addEventListener("click", logWeight);

    refreshWeightLog();
    autofillMaintenanceWeight();
}

async function logWeight() {
    const input = document.getElementById("weightLogInput");
    const weight_kg = Number(input?.value);

    if (!Number.isFinite(weight_kg) || weight_kg <= 0) {
        alert("Enter a positive weight in kg.");
        return;
    }

    try {
        await fetch(`${getApiUrl()}/weight/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weight_kg })
        });

        await refreshWeightLog();
        autofillMaintenanceWeight(true);
    } catch (error) {
        alert("Unable to log weight: " + error.message);
    }
}

async function refreshWeightLog() {
    const list = document.getElementById("weightLogList");
    if (!list) return;

    try {
        const response = await fetch(`${getApiUrl()}/weight/`);
        if (!response.ok) throw new Error(response.statusText);
        const entries = await response.json();

        const recent = entries.slice(-7).reverse();
        if (!recent.length) {
            list.innerHTML = `<div class="text-muted small">No weight logged yet.</div>`;
            return;
        }

        list.innerHTML = recent.map(entry => `
            <div class="d-flex justify-content-between small">
                <span>${escapeHtml(entry.logged_date)}</span>
                <strong>${escapeHtml(String(entry.weight_kg))} kg</strong>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = `<div class="text-danger small">Unable to load weight history.</div>`;
    }
}

async function autofillMaintenanceWeight(force = false) {
    const weightField = document.getElementById("maintenanceWeight");
    if (!weightField) return;

    // Don't clobber a value the user is actively editing, unless they just logged one.
    if (!force && document.activeElement === weightField) return;

    try {
        const response = await fetch(`${getApiUrl()}/weight/latest`);
        if (!response.ok) return;
        const latest = await response.json();
        if (latest?.weight_kg) {
            weightField.value = latest.weight_kg;
        }
    } catch (error) {
        // No weight logged yet - leave the default in place.
    }
}
