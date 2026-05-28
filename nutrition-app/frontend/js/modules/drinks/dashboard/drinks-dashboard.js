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
import { closeAppModal, openFormModal } from "../../../ui/components/modal.js";

let selectedDrinkListId = null;
let hoverBox = null;

export async function initDrinksDashboard() {
    await Promise.all([loadDrinks(), loadDrinkLists()]);
    bindDashboardControls();
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

    await renderDrinkChart(listId);
}

function bindDashboardControls() {
    bindClick("dashboardSelectDrinkListBtn", selectDrinkListUI);
    bindClick("dashboardAddDrinkBtn", addDrinkListItemUI);
    bindClick("dashboardCreateDrinkBtn", handleCreateDrink);
    bindClick("dashboardCreateDrinkListBtn", handleCreateDrinkList);
    bindClick("dashboardAddIngredientBtn", handleAddIngredient);
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
        const item = document.createElement("button");
        item.type = "button";
        item.className = "drink-item";
        item.innerHTML = `
            <div class="drink-name">${escapeHtml(list.name)}</div>
            <div class="small text-muted">${escapeHtml(String(list.item_count ?? 0))} items</div>
        `;

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
            ingredients: ingredientLines.length ? ingredientLines.join(", ") : "No ingredients added yet"
        });

        if (getState().deleteModes.drinkList) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "drink-delete";
            deleteButton.textContent = "x";
            deleteButton.addEventListener("click", async event => {
                event.stopPropagation();
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

    hoverBox = document.createElement("div");
    hoverBox.className = "drink-hover-box";
    hoverBox.innerHTML = `
        <div><strong>Quantity:</strong> ${escapeHtml(String(data.quantity))}</div>
        <div class="mt-1">${escapeHtml(data.ingredients)}</div>
    `;

    document.body.appendChild(hoverBox);

    const rect = event.currentTarget.getBoundingClientRect();
    hoverBox.style.left = `${rect.left}px`;
    hoverBox.style.top = `${rect.bottom + 10}px`;
}

function hideDrinkHover() {
    if (hoverBox) {
        hoverBox.remove();
        hoverBox = null;
    }
}

export function toggleDrinkListDeleteMode() {
    toggleDrinkListDeleteModeState();
    loadDashboardDrinkListsItems(selectedDrinkListId);
}
