// state.js responsibilities:
    // 1. Centralized application state management
    // 2. Shared UI + data state
    // 3. Safe access via getters/setters

// ###########################################################

// ======================================================
// INTERNAL STATE (NOT DIRECTLY MUTATED FROM OUTSIDE)
// ======================================================

// state.js — reactive store (lightweight)

const state = {
    nutrients: [],
    foods: [],
    meals: [],

    drinks: [],
    drinkLists: [],
    selectedDrinkListId: null,
    selectedDrinkListItems: [],

    intakeSummary: null,

    editing: {
        nutrients: false,
        foods: false,
        meals: false,
        mealItems: false,
        foodDetails: false,
        drinks: false,
        drinkLists: false
    },

    deleteModes: {
        consumedMeals: false,
        drinkList: false
    },

    databaseSearch: {
        type: "foods",
        query: "",
        page: 1,
        pageSize: 10,
        results: []
    }
};

// ======================================================
// SUBSCRIBERS (reactivity engine)
// ======================================================

const listeners = new Set();

/**
 * Subscribe to ANY state change
 * @param {Function} callback
 */
export function subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback); // unsubscribe
}

/**
 * Notify all listeners
 */
function notify() {
    listeners.forEach(fn => fn(structuredClone(state)));
}

// ======================================================
// STATE UPDATER (CORE API)
// ======================================================

export function setState(path, value) {
    const keys = path.split('.');
    let obj = state;

    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
    notify();
}

// ======================================================
// BULK UPDATES (API LOADERS)
// ======================================================

export function setNutrients(data) {
    state.nutrients = data;
    notify();
}

export function setFoods(data) {
    state.foods = data;
    notify();
}

export function setMeals(data) {
    state.meals = data;
    notify();
}

export function setDrinks(data) {
    state.drinks = data;
    notify();
}

export function setDrinkLists(data) {
    state.drinkLists = data;
    notify();
}

export function setSelectedDrinkListId(id) {
    state.selectedDrinkListId = id;
    notify();
}

export function setSelectedDrinkListItems(data) {
    state.selectedDrinkListItems = data;
    notify();
}

// ======================================================
// GETTERS
// ======================================================

export function getState() {
    return state;
}

export function getFoods() {
    return state.foods;
}

export function getNutrients() {
    return state.nutrients;
}

export function getMeals() {
    return state.meals;
}

export function getDrinks() {
    return state.drinks;
}

export function getDrinkLists() {
    return state.drinkLists;
}

export function getSelectedDrinkListItems() {
    return state.selectedDrinkListItems;
}

export function getSelectedDrinkListId() {
    return state.selectedDrinkListId;
}

// ======================================================
// EDITING + FLAGS
// ======================================================

export function setEditing(type, value) {
    if (type in state.editing) {
        state.editing[type] = Boolean(value);
        notify();
    }
}

export function setDeleteMode(type, value) {
    if (type in state.deleteModes) {
        state.deleteModes[type] = Boolean(value);
        notify();
    }
}

export function setSearchState(patch) {
    state.databaseSearch = {
        ...state.databaseSearch,
        ...patch
    };
    notify();
}