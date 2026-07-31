import {
    getDrinks,
    getDrinkLists,
    getState,
    setSelectedDrinkListId
} from "../../../state.js";
import { escapeHtml } from "../../../utils.js";
import { DrinksAPI } from "../../../api/drinksAPI.js";
import {
    addDrinkListItem,
    loadDashboardDrinkChart as renderDrinkChart,
    loadDrinkLists,
    loadDrinks,
    showDrinkDetailsModal,
    toggleDrinkListDeleteMode as toggleDrinkListDeleteModeState
} from "../../drinks.js";
import { openSearchDatabaseModal } from "../../search.js";
import { closeAppModal, confirmAction, openFormModal } from "../../../ui/components/modal.js";
import { showHoverBox, hideHoverBox } from "../../../ui/components/hoverBox.js";

let selectedDrinkListId = null;
let recipeDrinksCache = [];

export async function initDrinksDashboard() {
    await Promise.all([loadDrinks(), loadDrinkLists()]);
    bindDashboardControls();
    updateDeleteToggleButtonLabel();
}

function updateDeleteToggleButtonLabel() {
    const btn = document.getElementById("toggle-remove-drink-btn");
    if (!btn) return;

    if (getState().deleteModes.drinkList) {
        btn.textContent = "Exit delete mode";
    } else {
        btn.textContent = selectedDrinkListId ? "Remove drink" : "Remove drinks list";
    }
}

export async function selectDrinkListUI() {
    await openSearchDatabaseModal("drink lists", {
        mode: "select",
        selectLabel: "Use list",
        onSelect: item => selectDrinkList(item.id)
    });
}

export async function addDrinkListItemUI() {
    if (!selectedDrinkListId) {
        alert("Select a drink list first.");
        return;
    }

    await openSearchDatabaseModal("drinks", {
        mode: "select",
        selectLabel: "Add drink",
        onSelect: drink => openQuantityModal(drink)
    });
}

export async function loadDashboardDrinkListsItems(listId = selectedDrinkListId) {
    const container = document.getElementById("dashboardDrinkList");
    if (!container) return;

    const lists = getDrinkLists();

    if (!lists.length) {
        container.innerHTML = '<div class="text-muted">No drink lists yet.</div>';
        return;
    }

    if (!listId) {
        renderListPicker(container, lists);
        return;
    }

    try {
        const selectedList = await DrinksAPI.getList(listId);
        selectedDrinkListId = selectedList.id;
        setSelectedDrinkListId(selectedList.id);

        renderSelectedList(container, selectedList);
    } catch (error) {
        container.innerHTML = `
            <div class="text-danger">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}

let stockCountingEnabled = false;

export async function loadDashboardDrinkChart(listId = selectedDrinkListId) {
    const summaryContainer = document.getElementById("dashboardDrinkSummary");
    const chartCanvas = document.getElementById("dashboardDrinkChart");

    if (!listId) {
        if (summaryContainer) {
            summaryContainer.innerHTML = '<div class="text-muted">Select a drink list to show totals.</div>';
        }
        if (chartCanvas) {
            const ctx = chartCanvas.getContext("2d");
            ctx?.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        }
        return;
    }

    await renderDrinkChart(listId, { showStock: stockCountingEnabled });
}

function bindDashboardControls() {
    bindClick("dashboardSelectDrinkListBtn", selectDrinkListUI);
    bindClick("dashboardAddDrinkBtn", addDrinkListItemUI);
    bindClick("dashboardCreateDrinkBtn", handleCreateDrink);
    bindClick("dashboardCreateDrinkListBtn", handleCreateDrinkList);
    bindClick("dashboardAddIngredientBtn", handleAddIngredient);
    bindClick("dashboardToggleStockBtn", toggleStockCounting);

    document.getElementById("recipeDrinkSelect")?.addEventListener("change", event => {
        const drinkId = Number(event.target.value);
        const drink = recipeDrinksCache.find(d => d.id === drinkId);
        renderRecipeSteps(drink || null);
    });
}

export async function refreshRecipeCard(listId = selectedDrinkListId) {
    const select = document.getElementById("recipeDrinkSelect");
    const stepsContainer = document.getElementById("recipeSteps");
    if (!select || !stepsContainer) return;

    if (!listId) {
        recipeDrinksCache = [];
        select.innerHTML = '<option value="">Select a drink list first</option>';
        stepsContainer.innerHTML = '<div class="text-muted small">Select a drink list to see recipes.</div>';
        return;
    }

    try {
        const list = await DrinksAPI.getList(listId);
        const uniqueDrinks = [];
        const seen = new Set();

        (list.items || []).forEach(item => {
            if (item.drink && !seen.has(item.drink.id)) {
                seen.add(item.drink.id);
                uniqueDrinks.push(item.drink);
            }
        });

        recipeDrinksCache = uniqueDrinks;

        if (!uniqueDrinks.length) {
            select.innerHTML = '<option value="">No drinks in this list yet</option>';
            stepsContainer.innerHTML = '<div class="text-muted small">Add a drink to this list to see its recipe.</div>';
            return;
        }

        const previousValue = select.value;
        select.innerHTML = '<option value="">Select a drink</option>' +
            uniqueDrinks.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");

        if (previousValue && uniqueDrinks.some(d => String(d.id) === previousValue)) {
            select.value = previousValue;
            renderRecipeSteps(uniqueDrinks.find(d => String(d.id) === previousValue));
        } else {
            stepsContainer.innerHTML = '<div class="text-muted small">Select a drink to see its recipe.</div>';
        }
    } catch (error) {
        stepsContainer.innerHTML = `<div class="text-danger small">${escapeHtml(error.message)}</div>`;
    }
}

function renderRecipeSteps(drink) {
    const stepsContainer = document.getElementById("recipeSteps");
    if (!stepsContainer) return;

    if (!drink) {
        stepsContainer.innerHTML = '<div class="text-muted small">Select a drink to see its recipe.</div>';
        return;
    }

    const steps = (drink.instructions || "").split("\n").map(s => s.trim()).filter(Boolean);

    if (!steps.length) {
        stepsContainer.innerHTML = `
            <div class="text-muted small mb-2">No recipe steps added yet.</div>
            <button class="btn btn-sm btn-outline-primary" id="recipeEditBtn" type="button">Add steps</button>
        `;
    } else {
        stepsContainer.innerHTML = `
            <ol class="ps-3 mb-2 small">
                ${steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}
            </ol>
            <button class="btn btn-sm btn-outline-secondary" id="recipeEditBtn" type="button">Edit recipe</button>
        `;
    }

    document.getElementById("recipeEditBtn")?.addEventListener("click", () => {
        showDrinkDetailsModal(drink.id, {
            edit: true,
            onChanged: () => refreshRecipeCard(selectedDrinkListId)
        });
    });
}

async function toggleStockCounting() {
    stockCountingEnabled = !stockCountingEnabled;

    const btn = document.getElementById("dashboardToggleStockBtn");
    if (btn) {
        btn.innerHTML = stockCountingEnabled
            ? '<i class="bi bi-box-seam me-1"></i>Hide stock'
            : '<i class="bi bi-box-seam me-1"></i>Show stock';
        btn.classList.toggle("btn-secondary", stockCountingEnabled);
        btn.classList.toggle("btn-outline-secondary", !stockCountingEnabled);
    }

    await loadDashboardDrinkChart();
}

function bindClick(id, handler) {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener("click", handler);
}

async function selectDrinkList(listId) {
    selectedDrinkListId = listId;
    setSelectedDrinkListId(listId);
    await loadDashboardDrinkListsItems(listId);
    await loadDashboardDrinkChart(listId);
    await refreshRecipeCard(listId);
    updateDeleteToggleButtonLabel();
}

async function handleCreateDrink() {
    openFormModal({
        title: "Create Drink",
        submitLabel: "Create",
        body: `
            <label class="form-label" for="dynamicDrinkName">Drink name</label>
            <input id="dynamicDrinkName" class="form-control" placeholder="e.g. Amaretto Sour">
        `,
        onSubmit: async modal => {
            const name = modal.querySelector("#dynamicDrinkName")?.value?.trim();
            if (!name) {
                alert("Enter drink name.");
                return;
            }

            await DrinksAPI.create({ name });
            await loadDrinks();
            closeAppModal();
        }
    });
}

async function handleCreateDrinkList() {
    openFormModal({
        title: "Create Drink List",
        submitLabel: "Create",
        body: `
            <label class="form-label" for="dynamicDrinkListName">List name</label>
            <input id="dynamicDrinkListName" class="form-control" placeholder="e.g. Weekend cocktails">
        `,
        onSubmit: async modal => {
            const name = modal.querySelector("#dynamicDrinkListName")?.value?.trim();
            if (!name) {
                alert("Enter list name.");
                return;
            }

            const created = await DrinksAPI.createList({ name });
            await loadDrinkLists();
            closeAppModal();
            await selectDrinkList(created.id);
        }
    });
}

async function handleAddIngredient() {
    await openSearchDatabaseModal("drinks", {
        mode: "select",
        selectLabel: "View drink",
        onSelect: drink => showDrinkDetailsModal(drink.id, {
            edit: true,
            onChanged: refreshSelectedList
        })
    });
}

async function refreshSelectedList() {
    await loadDrinkLists();
    if (selectedDrinkListId) {
        await loadDashboardDrinkListsItems(selectedDrinkListId);
        await loadDashboardDrinkChart(selectedDrinkListId);
        await refreshRecipeCard(selectedDrinkListId);
    }
}

function openQuantityModal(drink) {
    openFormModal({
        title: `Add ${drink.name}`,
        submitLabel: "Add to list",
        body: `
            <label class="form-label" for="dynamicDrinkQuantity">Quantity</label>
            <input id="dynamicDrinkQuantity" class="form-control" type="number" min="1" step="1" value="1">
        `,
        onSubmit: async modal => {
            const quantity = Number(modal.querySelector("#dynamicDrinkQuantity")?.value || 1);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert("Enter a positive quantity.");
                return;
            }

            await addDrinkListItem(selectedDrinkListId, drink.id, quantity);
            closeAppModal();
            await refreshSelectedList();
        }
    });
}

function renderListPicker(container, lists) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "drink-grid";

    lists.forEach(list => {
        const item = document.createElement("div");
        item.className = "drink-item";
        item.innerHTML = `
            <div class="drink-name">${escapeHtml(list.name)}</div>
            <div class="small text-muted">${escapeHtml(String(list.item_count ?? 0))} items</div>
        `;

        if (getState().deleteModes.drinkList) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "drink-delete";
            deleteButton.textContent = "x";
            deleteButton.addEventListener("click", async event => {
                event.stopPropagation();
                if (!await confirmAction(`Delete the drink list "${list.name}"?`)) return;
                await DrinksAPI.deleteList(list.id);
                await loadDrinkLists();
                await loadDashboardDrinkListsItems(null);
            });
            item.appendChild(deleteButton);
        }

        item.addEventListener("click", () => selectDrinkList(list.id));
        grid.appendChild(item);
    });

    container.appendChild(grid);
}

function renderSelectedList(container, selectedList) {
    const entries = selectedList.items || [];

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>${escapeHtml(selectedList.name)}</strong>
            <span class="text-muted small">${entries.length} entries</span>
        </div>
    `;

    if (!entries.length) {
        container.innerHTML += '<div class="text-muted">This list is empty.</div>';
        return;
    }

    const grid = document.createElement("div");
    grid.className = "drink-grid";

    entries.forEach(entry => {
        const drink = entry.drink || getDrinks().find(d => d.id === entry.drink_id);
        const item = document.createElement("div");
        item.className = "drink-item";

        const ingredientLines = (drink?.ingredients || [])
            .map(ingredient => `${ingredient.amount}${ingredient.unit || ""} ${ingredient.food?.name || "Ingredient"}`);

        item.innerHTML = `
            <div class="drink-name">${escapeHtml(drink?.name || `Drink ${entry.drink_id}`)}</div>
            <div class="small text-muted">x ${escapeHtml(String(entry.quantity || 1))}</div>
        `;

        item.dataset.details = JSON.stringify({
            quantity: entry.quantity || 1,
            ingredients: ingredientLines.length ? ingredientLines : ["No ingredients added yet"]
        });

        if (getState().deleteModes.drinkList) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "drink-delete";
            deleteButton.textContent = "x";
            deleteButton.addEventListener("click", async event => {
                event.stopPropagation();
                if (!await confirmAction(`Remove ${drink?.name || "this drink"} from the list?`)) return;
                await DrinksAPI.deleteListItem(selectedList.id, entry.id);
                await refreshSelectedList();
            });
            item.appendChild(deleteButton);
        }

        item.addEventListener("mouseenter", showDrinkHover);
        item.addEventListener("mouseleave", hideDrinkHover);
        item.addEventListener("click", () => {
            if (!drink?.id) return;
            showDrinkDetailsModal(drink.id, { onChanged: refreshSelectedList });
        });

        grid.appendChild(item);
    });

    container.appendChild(grid);
}

function showDrinkHover(event) {
    const data = JSON.parse(event.currentTarget.dataset.details);
    const lines = [`Quantity: ${data.quantity}`, ...data.ingredients];

    showHoverBox(event.currentTarget, lines);
}

function hideDrinkHover() {
    hideHoverBox();
}

export function toggleDrinkListDeleteMode() {
    toggleDrinkListDeleteModeState();
    loadDashboardDrinkListsItems(selectedDrinkListId);
    updateDeleteToggleButtonLabel();
}
