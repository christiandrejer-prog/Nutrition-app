// drinks.js responsibilities:
    // 1. Load and display drinks
    // 2. Handle drink list operations
    // 3. Dashboard aggregation + chart rendering

// ###########################################################



// ======================================================
// IMPORTS
// ======================================================

import { setDrinks, getState } from '../state.js';
import { DrinksAPI } from '../api/drinksAPI.js';
import { escapeHtml } from '../utils.js';

// ======================================================
// LOAD DRINKS
// ======================================================

export async function loadDrinks() {
    try {
        const data = await DrinksAPI.getAll();
        setDrinks(data);
    } catch (err) {
        console.warn("Unable to load drinks", err);
        setDrinks([]);
    }
}

// ======================================================
// LOAD DRINK LISTS
// ======================================================

export async function loadDrinkLists() {
    const drinkListsCache = [];
    try {
        drinkListsCache = await DrinksAPI.getLists();
    } catch (error) {
        console.warn("Unable to load drink lists:", error);
        drinkListsCache = [];
    }
}

// ======================================================
// ADD DRINK TO LIST
// ======================================================

export async function addDrinkListItem(listId, drinkId, quantity = 1) {
    const qty = Number(prompt('Enter quantity (default 1):', String(quantity)) || 1);

    if (!listId || !drinkId || qty <= 0) {
        alert("Invalid input");
        return;
    }

    try {
        await DrinksAPI.addListItem(listId, {
            drink_id: parseInt(drinkId, 10),
            quantity: qty
        });

        await loadDrinkLists();
        await loadDashboardDrinkChart(listId);

    } catch (error) {
        alert("Unable to add drink: " + error.message);
    }
}

// ======================================================
// DELETE DRINK LIST ITEM
// ======================================================

export async function deleteDrinkListItem(listId, itemId) {
    if (!confirm("Remove this drink from the list?")) return;

    try {
        await DrinksAPI.deleteListItem(listId, itemId);

        await loadDrinkLists();
        await loadDashboardDrinkChart(listId);

    } catch (error) {
        console.error(error);
        alert("Unable to delete item: " + error.message);
    }
}

// ======================================================
// TOGGLE DELETE MODE (optional UI feature)
// ======================================================

export function toggleDrinkListDeleteMode() {
    drinkListDeleteMode = !drinkListDeleteMode;

    const btn = document.getElementById("toggle-remove-drink-btn");
    if (btn) {
        btn.textContent = drinkListDeleteMode
            ? "Exit delete mode"
            : "Remove drink from list";
    }
}

// ======================================================
// DASHBOARD CHART
// ======================================================

export async function loadDashboardDrinkChart(listId) {
    const summaryContainer = document.getElementById('dashboardDrinkSummary');
    const chartCanvas = document.getElementById('dashboardDrinkChart');

    if (!summaryContainer || !chartCanvas) return;

    try {
        const list = await DrinksAPI.getList(listId);
        const entries = list.items || [];

        if (!entries.length) {
            summaryContainer.innerHTML =
                '<div class="text-muted">No drinks added to list.</div>';
            return;
        }

        const ingredientTotals = {};
        const ingredientCosts = {};

        entries.forEach(entry => {
            const drink = entry.drink;
            if (!drink?.ingredients?.length) return;

            const quantity = Number(entry.quantity || 1);

            drink.ingredients.forEach(ingredient => {
                const name =
                    ingredient.food?.name ||
                    ingredient.name ||
                    'Unknown';

                const amount = Number(ingredient.amount || 0);
                const baseAmount = Number(ingredient.food?.base_amount || 1);
                const unitPrice = Number(ingredient.food?.price || 0);

                const totalAmount = amount * quantity;
                const totalCost = (totalAmount / baseAmount) * unitPrice;

                ingredientTotals[name] =
                    (ingredientTotals[name] || 0) + totalAmount;

                ingredientCosts[name] =
                    (ingredientCosts[name] || 0) + totalCost;
            });
        });

        const labels = Object.keys(ingredientTotals);

        const quantityData = labels.map(n => ingredientTotals[n]);
        const costData = labels.map(n => ingredientCosts[n]);

        summaryContainer.innerHTML = `
            <div>
                To make: <strong>${
                    entries.reduce((s, e) => s + (Number(e.quantity) || 1), 0)
                }</strong> drinks
            </div>
            <div class="small text-muted">
                Ingredient usage overview
            </div>
        `;

        if (window.dashboardDrinkChart instanceof Chart) {
            window.dashboardDrinkChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');

        window.dashboardDrinkChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Quantity',
                        data: quantityData
                    },
                    {
                        label: 'Cost (DKK)',
                        data: costData
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

    } catch (err) {
        console.warn(err);
        summaryContainer.innerHTML =
            '<div class="text-danger">Failed to load chart.</div>';
    }
}