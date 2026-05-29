import { escapeHtml } from "../../utils.js";
import {
    getSettings,
    resetSettings,
    saveSetting,
    SETTINGS_DEFINITIONS
} from "../../modules/settings.js";

export function renderSettingsOutput() {
    const out = document.getElementById("appOutputSection");
    if (!out) return;

    const settings = getSettings();
    const sections = groupSettingsBySection();

    out.innerHTML = `
        <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                    <h2 class="mb-1">Settings</h2>
                    <p class="text-muted mb-0">Saved locally on this device.</p>
                </div>
                <button id="settingsResetBtn" class="btn btn-outline-secondary btn-sm" type="button">
                    Reset defaults
                </button>
            </div>

            <div class="settings-grid">
                ${Object.entries(sections).map(([section, items]) => `
                    <section class="settings-section">
                        <h5>${escapeHtml(section)}</h5>
                        <div class="settings-list">
                            ${items.map(setting => renderSettingControl(setting, settings[setting.key])).join("")}
                        </div>
                    </section>
                `).join("")}
            </div>
        </div>
    `;

    bindSettingsControls();
    out.scrollIntoView({ behavior: "smooth" });
}

function groupSettingsBySection() {
    return SETTINGS_DEFINITIONS.reduce((groups, setting) => {
        const section = setting.section || "General";
        groups[section] = groups[section] || [];
        groups[section].push(setting);
        return groups;
    }, {});
}

function renderSettingControl(setting, value) {
    if (setting.type === "toggle") {
        return `
            <div class="settings-row">
                <div>
                    <label class="form-check-label fw-semibold" for="setting-${escapeHtml(setting.key)}">
                        ${escapeHtml(setting.label)}
                    </label>
                    <div class="text-muted small">${escapeHtml(setting.description || "")}</div>
                </div>
                <div class="form-check form-switch m-0">
                    <input
                        class="form-check-input settings-control"
                        type="checkbox"
                        id="setting-${escapeHtml(setting.key)}"
                        data-setting-key="${escapeHtml(setting.key)}"
                        ${value ? "checked" : ""}
                    >
                </div>
            </div>
        `;
    }

    if (setting.type === "select") {
        return `
            <div class="settings-row settings-row-select">
                <div>
                    <label class="fw-semibold" for="setting-${escapeHtml(setting.key)}">
                        ${escapeHtml(setting.label)}
                    </label>
                    <div class="text-muted small">${escapeHtml(setting.description || "")}</div>
                </div>
                <select
                    class="form-select form-select-sm settings-control"
                    id="setting-${escapeHtml(setting.key)}"
                    data-setting-key="${escapeHtml(setting.key)}"
                >
                    ${(setting.options || []).map(option => `
                        <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>
                            ${escapeHtml(option)}
                        </option>
                    `).join("")}
                </select>
            </div>
        `;
    }

    return "";
}

function bindSettingsControls() {
    document.querySelectorAll(".settings-control").forEach(control => {
        control.addEventListener("change", event => {
            const key = event.currentTarget.dataset.settingKey;
            const value = event.currentTarget.type === "checkbox"
                ? event.currentTarget.checked
                : event.currentTarget.value;

            saveSetting(key, value);
        });
    });

    document.getElementById("settingsResetBtn")?.addEventListener("click", () => {
        resetSettings();
        renderSettingsOutput();
    });
}
