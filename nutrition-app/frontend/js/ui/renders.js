import { renderHomeOutput } from "./views/home-view.js";
import { renderMealDashboardOutput } from "./views/meals-dashboard-view.js";
import { renderDrinkDashboardOutput } from "./views/drinks-dashboard-view.js";
import { renderProfileOutput } from "./views/profile-view.js";
import { renderSettingsOutput } from "./views/settings-view.js";
import { renderStatusOutput } from "./views/status-view.js";

const routes = {
    home: renderHomeOutput,
    "meal-dashboard": renderMealDashboardOutput,
    "drink-dashboard": renderDrinkDashboardOutput,
    account: renderProfileOutput,
    settings: renderSettingsOutput,
    status: renderStatusOutput
};

export function renderRoute(action) {
    return routes[action]?.();
}
