import { escapeHtml } from "../../utils.js";

export function renderDashboardActions({
    primary = [],
    grouped = []
}) {
    const primaryButtons = primary.map(action => `
        <button id="${escapeHtml(action.id)}" class="${escapeHtml(action.className || "btn btn-outline-primary btn-sm")}" type="button">
            ${action.icon ? `<i class="${escapeHtml(action.icon)} me-1"></i>` : ""}${escapeHtml(action.label)}
        </button>
    `).join("");

    const groupedButtons = grouped.length
        ? `
            <div class="btn-group btn-group-sm" role="group">
                ${grouped.map(action => `
                    <button id="${escapeHtml(action.id)}" class="${escapeHtml(action.className || "btn btn-outline-secondary")}" type="button">
                        ${escapeHtml(action.label)}
                    </button>
                `).join("")}
            </div>
        `
        : "";

    return `
        <div class="d-grid gap-2 mb-3">
            ${primaryButtons}
            ${groupedButtons}
        </div>
    `;
}
