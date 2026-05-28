// events.js responsibilities:
    // 1. Centralized event delegation for UI interactions
        // e.g. click handlers for buttons, links, etc.
    // 2. Dispatches actions to appropriate modules based on data attributes
        // e.g. data-action="food-details" -> show food details modal
    // 3. Optional: handle global keyboard shortcuts or other non-click events
        // e.g. Ctrl+S to save, etc.

// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
import {
    showFoodDetailsModal,
    showEditFoodMacrosModal,
    saveFoodMacros,
    showModalById
} from "../modules/modals.js";

import { openSearchDatabaseModal } from "../modules/search.js";
import { renderRoute } from "./renders.js";
import { selectDrinkListUI, addDrinkListItemUI, toggleDrinkListDeleteMode } from "../modules/drinks/dashboard/drinks-dashboard.js";
import { addConsumedMealUI, toggleConsumedMealDeleteMode } from "../modules/meals/dashboard/consumedMeals.js";


// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
export function initUIEvents() {
    document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;

        const action = el.dataset.action;
        const id = el.dataset.id;

        handleAction(action, id, e);
    });

    document.addEventListener("keydown", (e) => {
    // ENTER triggers primary action
    if (e.key === "Enter") {
        const active = document.activeElement?.closest("[data-action]");
        if (!active) return;

        handleAction(active.dataset.action, active.dataset.id, e);
    }

    // ESC closes modals or cancels
    if (e.key === "Escape") {
        showModalById(null); // or modal close function
    }

});
}


function handleAction(action, id, e) {
    try {
        switch (action) {

            // UI actions
            case "create-nutrient":
                showModalById("modalCreateNutrient");
                break;

            case "create-food":
                showModalById("modalCreateFood");
                break;

            case "create-meal-prep":
                showModalById("modalCreateMealPrep");
                break;

            case "create-drink":
                showModalById("modalCreateDrink");
                break;

            case "create-drink-list":
                showModalById("modalCreateDrinkList");
                break;

            case "search-foods":
                openSearchDatabaseModal("foods");
                break;

            case "search-meals":
                openSearchDatabaseModal("meals");
                break;

            case "search-drinks":
                openSearchDatabaseModal("drinks");
                break;

            case "search-drink-lists":
                openSearchDatabaseModal("drink lists");
                break;

            case "add-consumed-meal-UI":
                addConsumedMealUI();
                break;

            case "add-drink-list-item-UI":
                addDrinkListItemUI();
                break;
            
            case "select-drink-list-UI":
                selectDrinkListUI();
                break;

            // Toggle UI actions
            case "toggle-consumed-meal-delete-mode":
                toggleConsumedMealDeleteMode();
                break;

            case "toggle-drink-list-delete-mode":
                toggleDrinkListDeleteMode();
                break;            

            // views
            case "status":
            case "home":
            case "meal-dashboard":
            case "drink-dashboard":
            case "account":
            case "settings":
                renderRoute(action);
                break;

            // food-specific actions
            case "food-details":
                showFoodDetailsModal(id);
                break;

            case "food-edit-macros":
                showEditFoodMacrosModal(id);
                break;

            case "food-save-macros":
                saveFoodMacros(id);
                break;

            default:
                console.info(`Not implemented: ${action}`);
        }
    } catch (err) {
        console.warn("UI handler error:", err);
    }
}

// eventually change from switch to 
//const ACTIONS = {
//    "create-food": () => showModal("modalCreateFood"),
//    "home": renderHomeView,
//    "settings": renderSettingsView,
//};

// Use case
//ACTIONS[action]?.(id, e);
