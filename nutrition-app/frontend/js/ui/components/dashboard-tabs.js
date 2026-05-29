import { escapeHtml } from "../../utils.js";

export function renderDashboardTabs({
    id,
    tabs,
    activeTab = tabs[0]?.id
}) {
    return `
        <div class="dashboard-tabs" data-dashboard-tabs="${escapeHtml(id)}">
            <div class="dashboard-tab-list" role="tablist">
                ${tabs.map(tab => `
                    <button
                        id="${escapeHtml(id)}-${escapeHtml(tab.id)}-tab"
                        class="dashboard-tab ${tab.id === activeTab ? "active" : ""}"
                        type="button"
                        role="tab"
                        data-dashboard-tab="${escapeHtml(tab.id)}"
                        aria-selected="${tab.id === activeTab ? "true" : "false"}"
                        aria-controls="${escapeHtml(id)}-${escapeHtml(tab.id)}-panel"
                    >
                        ${tab.icon ? `<i class="${escapeHtml(tab.icon)} me-1"></i>` : ""}
                        ${escapeHtml(tab.label)}
                    </button>
                `).join("")}
            </div>

            <div class="dashboard-tab-panels">
                ${tabs.map(tab => `
                    <div
                        id="${escapeHtml(id)}-${escapeHtml(tab.id)}-panel"
                        class="dashboard-tab-panel ${tab.id === activeTab ? "active" : ""}"
                        role="tabpanel"
                        aria-labelledby="${escapeHtml(id)}-${escapeHtml(tab.id)}-tab"
                        data-dashboard-panel="${escapeHtml(tab.id)}"
                    >
                        ${tab.content}
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

export function initDashboardTabs(root = document) {
    root.querySelectorAll("[data-dashboard-tabs]").forEach(tabRoot => {
        const buttons = tabRoot.querySelectorAll("[data-dashboard-tab]");
        const panels = tabRoot.querySelectorAll("[data-dashboard-panel]");

        buttons.forEach(button => {
            button.addEventListener("click", () => {
                const selectedTab = button.dataset.dashboardTab;

                buttons.forEach(candidate => {
                    const isActive = candidate.dataset.dashboardTab === selectedTab;
                    candidate.classList.toggle("active", isActive);
                    candidate.setAttribute("aria-selected", String(isActive));
                });

                panels.forEach(panel => {
                    panel.classList.toggle("active", panel.dataset.dashboardPanel === selectedTab);
                });
            });
        });
    });
}
