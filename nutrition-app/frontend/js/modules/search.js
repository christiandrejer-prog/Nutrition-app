// search.js responsibilities:
    // 1. Handle search input and button
    // 2. Call API with search query
    // 3. Display results in a user-friendly way
    // 4. Optional: support filters (e.g. by type, calories, etc.)



// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
import { getApiUrl } from "../config.js";
import {
    buildSearchableText,
    deleteEntityByType,
    escapeHtml,
    getDatabaseEndpoint
} from "../utils.js";
import { showModalById, showFoodDetailsModal } from "./modals.js";
import { loadFoods } from "./foods.js";
import { loadMeals, loadMealDetails, showMealDetailsModal } from "./meals.js";
import { loadDrinks, loadDrinkLists, showDrinkDetailsModal, showDrinkListDetailsModal } from "./drinks.js";
import { FoodsAPI } from "../api/foodsAPI.js";
import { MealsAPI } from "../api/mealsAPI.js";
import { DrinksAPI } from "../api/drinksAPI.js";
import { closeAppModal, openFormModal } from "../ui/components/modal.js";

// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED



const databaseSearchState = {
    type: "foods",
    query: "",
    page: 1,
    pageSize: 10,
    results: [],
    mode: "browse",
    lockedType: null,
    selectLabel: "Select",
    onSelect: null,
    onBack: null
};

let pendingSearchReturn = null;
let searchModalBackListenerAttached = false;

function attachSearchModalBackReset() {
    const modal = document.getElementById('modalSearchDatabase');
    if (!modal || searchModalBackListenerAttached) return;
    searchModalBackListenerAttached = true;
    modal.addEventListener('hidden.bs.modal', () => {
        databaseSearchState.onBack = null;
    });
}

export async function goBackFromSearchDatabase() {
    const onBack = databaseSearchState.onBack;
    databaseSearchState.onBack = null;

    await closeSearchModal();
    resetSearchMode();

    if (typeof onBack === 'function') {
        await onBack();
    }
}

export function setDatabaseSearchType(type) {
    if (
        databaseSearchState.mode === "select" &&
        databaseSearchState.lockedType &&
        type !== databaseSearchState.lockedType
    ) {
        return;
    }

    databaseSearchState.type = type;
    const buttons = document.querySelectorAll('#databaseSearchTypeButtons [data-search-type]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.searchType === type);
        btn.disabled = Boolean(
            databaseSearchState.mode === "select" &&
            databaseSearchState.lockedType &&
            btn.dataset.searchType !== databaseSearchState.lockedType
        );
    });
    const createBtn = document.getElementById('databaseSearchCreateBtn');
    if (createBtn) {
        createBtn.textContent = type === 'foods' ? 'Create Food' : type === 'meals' ? 'Create Meal Prep' : type === 'drinks' ? 'Create Drink' : 'Create Drink List';
        createBtn.disabled = false;
    }
}


export async function openSearchDatabaseModal(searchType, options = {}) {
    const queryField = document.getElementById('databaseSearchQuery');
    const results = document.getElementById('databaseSearchResults');
    if (!queryField || !results) return;
    databaseSearchState.type = searchType;
    databaseSearchState.query = '';
    databaseSearchState.page = 1;
    databaseSearchState.mode = options.mode || "browse";
    databaseSearchState.lockedType = databaseSearchState.mode === "select" ? searchType : null;
    databaseSearchState.selectLabel = options.selectLabel || "Select";
    databaseSearchState.onSelect = typeof options.onSelect === "function" ? options.onSelect : null;
    databaseSearchState.onBack = typeof options.onBack === "function" ? options.onBack : null;
    setDatabaseSearchType(searchType);
    queryField.value = '';
    attachSearchModalBackReset();
    showModalById('modalSearchDatabase');

    if (databaseSearchState.mode === "select") {
        await doSearchDatabase();
    } else {
        results.innerHTML = `
            <div class="alert alert-secondary">
                Type a search term and press Search to query the backend.
            </div>
        `;
    }
}


export async function doSearchDatabase() {
    const query = (document.getElementById('databaseSearchQuery').value || '').trim().toLowerCase();
    const type = databaseSearchState.type || 'foods';
    databaseSearchState.type = type;
    databaseSearchState.query = query;
    databaseSearchState.page = 1;
    databaseSearchState.results = [];



    const requestedUrl = `${getApiUrl()}/${getDatabaseEndpoint(type)}`;
    console.log('Fetching from URL:', requestedUrl);

    try {
        const response = await fetch(requestedUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        databaseSearchState.results = Array.isArray(data) ? data : [];

    } catch (error) {
        const container = document.getElementById('databaseSearchResults');

        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    Unable to load ${type} from backend:
                    ${escapeHtml(error.message || String(error))}
                </div>`;
        }
        return;
    }

    // ✅ UNIFIED FILTER LOGIC (ALL TYPES)
    databaseSearchState.results = databaseSearchState.results.filter(item => {

        const text = buildSearchableText(item).toLowerCase();

        if (!query) return true;

        const words = query.split(' ').filter(Boolean);
        return words.every(w => text.includes(w));
    });

    renderDatabaseSearchResults();
}


function renderDatabaseSearchResults() {
    // This function will render the search results based on the current state of the database search, including the type of items being searched, the query, pagination, and the results themselves. It will delegate to specific rendering functions for each type (foods, drinks, meals, drink lists) and handle cases where there are no results or if an unknown type is somehow set.
    console.log('Rendering search results with state:', databaseSearchState);
    const container = document.getElementById('databaseSearchResults');
    if (!container) return;
    const {type, query, page, pageSize, results} = databaseSearchState;

    switch(type) {

        case 'foods':
            renderFoods({
                container,
                results,
                query,
                page,
                pageSize
            });
            break;

        case 'meals':
            renderMeals({
                container,
                results,
                query,
                page,
                pageSize
            });
            break;

        case 'drinks':
            renderDrinks({
                container,
                results,
                query,
                page,
                pageSize
            });
            break;

        case 'drink lists':
            renderDrinkLists({
                container,
                results,
                query,
                page,
                pageSize
            });
            break;

        default:

            container.innerHTML = `
                <div class="alert alert-danger">
                    Unknown search type
                </div>
            `;
    }
}


function renderSearchResults({
    container,
    results,
    query,
    page,
    pageSize,
    type,
    buttons = [],
    itemRenderer
}) {

    const totalCount =
        results.length;

    if (!totalCount) {

        container.innerHTML = `
            <div class="alert alert-warning">
                No ${escapeHtml(type)} found
                ${query ? ` for "${escapeHtml(query)}"` : ''}
            </div>

            <div class="text-muted small mb-2">
                0 results
            </div>
        `;

        return;
    }

    const startIndex =
        (page - 1) * pageSize;

    const pageResults =
        results.slice(
            startIndex,
            startIndex + pageSize
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(totalCount / pageSize)
        );

    const header =
        document.createElement('div');

    header.className =
        'd-flex justify-content-between mb-3';

    header.innerHTML = `
        <div>
            <strong>${totalCount}</strong>
            results found
        </div>

        <div class="text-muted">
            <small>
                Showing
                ${startIndex + 1}
                -
                ${Math.min(totalCount, startIndex + pageSize)}
            </small>
        </div>
    `;

    const list =
        document.createElement('div');

    list.className =
        'list-group';

    pageResults.forEach(item => {

        const entry =
            document.createElement('div');

        entry.className =
            'list-group-item d-flex justify-content-between align-items-start gap-2 flex-wrap';

        entry.innerHTML =
            itemRenderer(item);

        const actions =
            document.createElement('div');

        actions.className =
            'btn-toolbar gap-2';

        const activeButtons = [...buttons];

        if (databaseSearchState.mode === "select" && databaseSearchState.onSelect) {
            activeButtons.unshift({
                label: databaseSearchState.selectLabel,
                className: "btn btn-sm btn-primary",
                onClick: async item => {
                    const onSelect = databaseSearchState.onSelect;
                    await closeSearchModal();
                    resetSearchMode();
                    await onSelect(item);
                }
            });
        }

        activeButtons.forEach(btn => {

            const button =
                document.createElement('button');

            button.type = 'button';

            button.className =
                btn.className;

            button.textContent =
                btn.label;

            button.onclick = async () => {
                try {
                    await btn.onClick(item);
                } catch (error) {
                    console.error(error);
                    alert(error.message || String(error));
                }
            };

            actions.appendChild(button);
        });

        entry.appendChild(actions);

        list.appendChild(entry);
    });

    container.innerHTML = '';

    container.appendChild(header);

    container.appendChild(list);

    renderPagination({
        container,
        page,
        totalPages
    });
}


function renderPagination({
    container,
    page,
    totalPages
}) {

    if (totalPages <= 1)
        return;

    const pagination =
        document.createElement('nav');

    pagination.className =
        'mt-3';

    const pagList =
        document.createElement('ul');

    pagList.className =
        'pagination pagination-sm';

    const prev =
        document.createElement('li');

    prev.className =
        `page-item ${page <= 1 ? 'disabled' : ''}`;

    prev.innerHTML = `
        <button class="page-link">
            Previous
        </button>
    `;

    if (page > 1) {

        prev.querySelector('button')
            .addEventListener(
                'click',
                () => setDatabaseSearchPage(page - 1)
            );
    }

    pagList.appendChild(prev);

    const next =
        document.createElement('li');

    next.className =
        `page-item ${page >= totalPages ? 'disabled' : ''}`;

    next.innerHTML = `
        <button class="page-link">
            Next
        </button>
    `;

    if (page < totalPages) {

        next.querySelector('button')
            .addEventListener(
                'click',
                () => setDatabaseSearchPage(page + 1)
            );
    }

    pagList.appendChild(next);

    pagination.appendChild(pagList);

    container.appendChild(pagination);
}


function renderFoods(data) {

    renderSearchResults({

        ...data,

        type: 'foods',

        itemRenderer: item => `
            <div>
                <strong>
                    ${escapeHtml(item.name)}
                </strong>

                ${item.brand
                    ? `<em>(${escapeHtml(item.brand)})</em>`
                    : ''
                }
            </div>
        `,

        buttons: [

            {
                label: 'View',
                className:
                    'btn btn-sm btn-outline-primary',

                onClick: item =>
                    openViewSearchFood(item.id)
            },

            {
                label: 'Edit',
                className:
                    'btn btn-sm btn-outline-success',

                onClick: item =>
                    editSearchFood(item.id)
            },

            {
                label: 'Delete',
                className:
                    'btn btn-sm btn-outline-danger',

                onClick: item =>
                    deleteSearchEntity("foods", item.id)
            }
        ]
    });
}


function renderMeals(data) {

    renderSearchResults({

        ...data,

        type: 'meals',

        itemRenderer: item => `
            <div>
                <strong>
                    ${escapeHtml(item.name)}
                </strong>
                <em>
                    Quantity: ${item.item_count}
                </em>
            </div>
        `,

        buttons: [

            {
                label: 'View',
                className:
                    'btn btn-sm btn-outline-primary',

                onClick: item =>
                    //alert("Meal details view not implemented yet.")
                    openViewSearchMeal(item.id)
            },

            {
                label: 'Edit',
                className:
                    'btn btn-sm btn-outline-success',

                onClick: item =>
                    editSearchMeal(item.id)
            },

            {
                label: 'Delete',
                className:
                    'btn btn-sm btn-outline-danger',

                onClick: item =>
                    deleteSearchEntity("meals", item.id)
            }
        ]
    });
}


function renderDrinks(data) {

    renderSearchResults({

        ...data,

        type: 'drinks',

        itemRenderer: item => `
            <div>
                <strong>
                    ${escapeHtml(item.name)}
                </strong>
            </div>
        `,

        buttons: [

            {
                label: 'View',
                className:
                    'btn btn-sm btn-outline-primary',

                onClick: item =>
                    //alert("Drink details view not implemented yet.")
                    openViewSearchDrink(item.id)
            },

            {
                label: 'Edit',
                className:
                    'btn btn-sm btn-outline-success',

                onClick: item =>
                    editSearchDrink(item.id)
            },

            {
                label: 'Delete',
                className:
                    'btn btn-sm btn-outline-danger',

                onClick: item =>
                    deleteSearchEntity("drinks", item.id)
            }
        ]
    });
}


function renderDrinkLists(data) {

    renderSearchResults({

        ...data,

        type: 'drink lists',

        itemRenderer: item => `
            <div>
                <strong>
                    ${escapeHtml(item.name)}
                </strong>
                <em>
                    Quantity: ${item.item_count}
                </em>
            </div>
        `,

        buttons: [

            {
                label: 'View',
                className:
                    'btn btn-sm btn-outline-primary',

                onClick: item =>
                    //alert("Drink list details view not implemented yet.")
                    openViewSearchDrinkList(item.id)
            },

            {
                label: 'Edit',
                className:
                    'btn btn-sm btn-outline-success',

                onClick: item =>
                    editSearchDrinkList(item.id)
            },

            {
                label: 'Delete',
                className:
                    'btn btn-sm btn-outline-danger',

                onClick: item =>
                    deleteSearchEntity("drink lists", item.id)
            }
        ]
    });
}


function openViewSearchItem({
    itemId,
    selectId,
    loadFunction,
    modalFunction
}) {
    const select = document.getElementById(selectId);

    if (select) {
        select.value = itemId;

        if (typeof loadFunction === 'function') {
            loadFunction();
        }
    } else {
        if (typeof modalFunction === 'function') {
            modalFunction(itemId);
        }
    }

    // Close search modal
    const modal = document.getElementById('modalSearchDatabase');

    if (modal && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}


async function openViewSearchFood(foodId) {
    const searchReturn = getCurrentSearchReturn();
    await closeSearchModal();
    await showFoodDetailsModal(foodId, {
        onBack: () => returnToSearchState(searchReturn)
    });
}


async function openViewSearchMeal(mealId) {
    const searchReturn = getCurrentSearchReturn();
    await closeSearchModal();
    await showMealDetailsModal(mealId, {
        onBack: () => returnToSearchState(searchReturn)
    });
}


async function openViewSearchDrink(drinkId) {
    const searchReturn = getCurrentSearchReturn();
    await closeSearchModal();
    await showDrinkDetailsModal(drinkId, {
        onBack: () => returnToSearchState(searchReturn)
    });
}

function resetSearchMode() {
    databaseSearchState.mode = "browse";
    databaseSearchState.lockedType = null;
    databaseSearchState.selectLabel = "Select";
    databaseSearchState.onSelect = null;
    databaseSearchState.onBack = null;
    document.querySelectorAll('#databaseSearchTypeButtons [data-search-type]').forEach(btn => {
        btn.disabled = false;
    });
}


async function openViewSearchDrinkList(drinkListId) {
    const searchReturn = getCurrentSearchReturn();
    await closeSearchModal();
    await showDrinkListDetailsModal(drinkListId, {
        onBack: () => returnToSearchState(searchReturn)
    });
}


function setDatabaseSearchPage(page) {
    const totalPages = Math.max(1, Math.ceil(databaseSearchState.results.length / databaseSearchState.pageSize));
    if (page < 1 || page > totalPages) return;
    databaseSearchState.page = page;
    renderDatabaseSearchResults();
}


export function openCreateFromSearch() {
    const type = databaseSearchState.type;
    pendingSearchReturn = {
        type,
        query: databaseSearchState.query,
        mode: databaseSearchState.mode,
        selectLabel: databaseSearchState.selectLabel,
        onSelect: databaseSearchState.onSelect
    };

    const modalByType = {
        foods: "modalCreateFood",
        meals: "modalCreateMealPrep",
        drinks: "modalCreateDrink",
        "drink lists": "modalCreateDrinkList"
    };

    showModalById(modalByType[type] || "modalCreateFood");
}


export async function returnToSearchAfterCreate() {
    if (!pendingSearchReturn) return false;

    const next = pendingSearchReturn;
    pendingSearchReturn = null;

    await openSearchDatabaseModal(next.type, {
        mode: next.mode,
        selectLabel: next.selectLabel,
        onSelect: next.onSelect
    });

    const queryField = document.getElementById('databaseSearchQuery');
    if (queryField) {
        queryField.value = next.query || '';
    }

    await doSearchDatabase();
    return true;
}


function getCurrentSearchReturn() {
    return {
        type: databaseSearchState.type,
        query: databaseSearchState.query,
        mode: databaseSearchState.mode,
        selectLabel: databaseSearchState.selectLabel,
        onSelect: databaseSearchState.onSelect
    };
}


function closeSearchModal() {
    const modal = document.getElementById('modalSearchDatabase');

    if (!modal || typeof bootstrap === 'undefined' || !modal.classList.contains("show")) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        bootstrap.Modal.getOrCreateInstance(modal).hide();
        window.setTimeout(resolve, 250);
    });
}


async function returnToSearchState(searchReturn) {
    await openSearchDatabaseModal(searchReturn.type, {
        mode: searchReturn.mode,
        selectLabel: searchReturn.selectLabel,
        onSelect: searchReturn.onSelect
    });

    const queryField = document.getElementById('databaseSearchQuery');
    if (queryField) {
        queryField.value = searchReturn.query || '';
    }

    await doSearchDatabase();
}


function findSearchItem(id) {
    return databaseSearchState.results.find(item => Number(item.id) === Number(id));
}


function renderTextInput({ id, label, value = "", type = "text", step = "" }) {
    return `
        <div class="mb-3">
            <label class="form-label" for="${id}">${label}</label>
            <input id="${id}" class="form-control" type="${type}" ${step ? `step="${step}"` : ""} value="${escapeHtml(String(value ?? ""))}">
        </div>
    `;
}


function editSearchFood(foodId) {
    const food = findSearchItem(foodId);
    if (!food) return;

    const searchReturn = getCurrentSearchReturn();
    awaitCloseSearchThenOpen(() => openFormModal({
        title: "Edit food",
        submitLabel: "Save",
        cancelLabel: "Back",
        body: `
            ${renderTextInput({ id: "searchEditFoodName", label: "Food name", value: food.name })}
            ${renderTextInput({ id: "searchEditFoodBrand", label: "Brand", value: food.brand || "" })}
            ${renderTextInput({ id: "searchEditFoodPrice", label: "Price", value: food.price ?? "", type: "number", step: "0.01" })}
        `,
        onCancel: async () => {
            await returnToSearchState(searchReturn);
        },
        onSubmit: async () => {
            const name = document.getElementById("searchEditFoodName")?.value.trim();
            const brand = document.getElementById("searchEditFoodBrand")?.value.trim() || null;
            const priceValue = document.getElementById("searchEditFoodPrice")?.value;
            const price = priceValue === "" ? null : Number(priceValue);

            if (!name) {
                alert("Food name is required.");
                return;
            }

            if (priceValue !== "" && (!Number.isFinite(price) || price < 0)) {
                alert("Price must be zero or higher.");
                return;
            }

            try {
                await FoodsAPI.update(food.id, {
                    name,
                    brand,
                    price,
                    base_amount: food.base_amount ?? null,
                    base_unit: food.base_unit ?? null
                });
                await loadFoods();
                closeAppModal();
                await returnToSearchState(searchReturn);
            } catch (error) {
                alert("Unable to update food: " + error.message);
            }
        }
    }));
}


function editSearchMeal(mealId) {
    const meal = findSearchItem(mealId);
    if (!meal) return;

    openSimpleNameEdit({
        title: "Edit meal",
        inputId: "searchEditMealName",
        item: meal,
        update: data => MealsAPI.update(meal.id, data),
        reload: loadMeals
    });
}


function editSearchDrink(drinkId) {
    const drink = findSearchItem(drinkId);
    if (!drink) return;

    openSimpleNameEdit({
        title: "Edit drink",
        inputId: "searchEditDrinkName",
        item: drink,
        update: data => DrinksAPI.update(drink.id, data),
        reload: loadDrinks
    });
}


function editSearchDrinkList(drinkListId) {
    const drinkList = findSearchItem(drinkListId);
    if (!drinkList) return;

    openSimpleNameEdit({
        title: "Edit drink list",
        inputId: "searchEditDrinkListName",
        item: drinkList,
        update: data => DrinksAPI.updateList(drinkList.id, data),
        reload: loadDrinkLists
    });
}


function openSimpleNameEdit({
    title,
    inputId,
    item,
    update,
    reload
}) {
    const searchReturn = getCurrentSearchReturn();
    awaitCloseSearchThenOpen(() => openFormModal({
        title,
        submitLabel: "Save",
        cancelLabel: "Back",
        body: renderTextInput({ id: inputId, label: "Name", value: item.name }),
        onCancel: async () => {
            await returnToSearchState(searchReturn);
        },
        onSubmit: async () => {
            const name = document.getElementById(inputId)?.value.trim();

            if (!name) {
                alert("Name is required.");
                return;
            }

            try {
                await update({ name });
                await reload();
                closeAppModal();
                await returnToSearchState(searchReturn);
            } catch (error) {
                alert("Unable to update: " + error.message);
            }
        }
    }));
}


async function awaitCloseSearchThenOpen(openNext) {
    await closeSearchModal();
    openNext();
}


async function deleteSearchEntity(type, id) {
    const deleted = await deleteEntityByType(type, id);
    if (!deleted) return;

    await Promise.all([
        loadFoods(),
        loadMeals(),
        loadDrinks(),
        loadDrinkLists()
    ]);

    await doSearchDatabase();
}
