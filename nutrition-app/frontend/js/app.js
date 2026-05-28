import { initConfig, updateApiUrlInput, setApiUrlFromInput, getApiUrl } from "./config.js";
import { initUIEvents } from "./ui/events.js";
import { initModals, showModalById } from "./modules/modals.js";
import { renderRoute } from "./ui/renders.js";

import { loadNutrients, createNutrient, toggleNutrientEdit } from "./modules/nutrients.js";
import { loadFoods, createFood, toggleFoodEdit } from "./modules/foods.js";
import {
    loadMeals,
    createMeal,
    toggleMealEdit,
    loadMealDetails,
    toggleMealDetailsEdit,
    openAddMealItemModal,
    searchMealItemFoods,
    addMealItemToSelectedMeal
} from "./modules/meals.js";
import { loadDrinks, loadDrinkLists, createDrink, createDrinkList } from "./modules/drinks.js";
import {
    openSearchDatabaseModal,
    setDatabaseSearchType,
    doSearchDatabase,
    openCreateFromSearch,
    returnToSearchAfterCreate
} from "./modules/search.js";
import { scanBarcode, stopScanning } from "./modules/barcode/scanner.js";

async function loadInitialData() {
    await Promise.all([
        loadNutrients(),
        loadFoods(),
        loadMeals(),
        loadDrinks(),
        loadDrinkLists()
    ]);
}

export async function refreshAppData() {
    updateApiUrlInput();
    await loadInitialData();
}

async function submitFeedback() {
    const input = document.getElementById("feedbackInput");
    const message = input?.value?.trim();
    if (!message) return;

    await fetch(`${getApiUrl()}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });

    input.value = "";
    updateCount();
    alert("Thank you for your feedback!");
}

function updateCount() {
    const input = document.getElementById("feedbackInput");
    const count = document.getElementById("count");
    if (input && count) {
        count.textContent = `${input.value.length} / 200`;
    }
}

async function submitCreatedFromModal(createFn) {
    const created = await createFn();
    if (created) {
        const returnedToSearch = await returnToSearchAfterCreate();
        if (!returnedToSearch) {
            showModalById(null);
        }
    }
}

async function initApp() {
    try {
        await initConfig();

        updateApiUrlInput();
        initModals();
        initUIEvents();

        await loadInitialData();
        await renderRoute("home");

        window.refreshAppData = refreshAppData;
        Object.assign(window, {
            createNutrient,
            createFood,
            createMealPrep: createMeal,
            createMeal,
            toggleNutrientEdit,
            toggleFoodEdit,
            toggleMealEdit,
            loadMealDetails,
            toggleMealDetailsEdit,
            openAddMealItemModal,
            searchMealItemFoods,
            addMealItemToSelectedMeal,
            scanBarcode,
            stopScanning,
            openSearchDatabaseModal,
            setDatabaseSearchType,
            doSearchDatabase,
            openCreateFromSearch,
            setApiUrlFromInput,
            submitAddNutrient: () => submitCreatedFromModal(createNutrient),
            submitAddFood: () => submitCreatedFromModal(createFood),
            submitAddMealPrep: () => submitCreatedFromModal(createMeal),
            submitAddDrink: () => submitCreatedFromModal(createDrink),
            submitAddDrinkList: () => submitCreatedFromModal(createDrinkList),
            submitFeedback,
            updateCount
        });

        console.info("App initialized");
    } catch (err) {
        console.error("Failed to initialize app:", err);
        alert(`App failed to initialize: ${err.message}`);
    }
}

document.addEventListener("DOMContentLoaded", initApp);
