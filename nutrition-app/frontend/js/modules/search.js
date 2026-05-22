// search.js responsibilities:
    // 1. Handle search input and button
    // 2. Call API with search query
    // 3. Display results in a user-friendly way
    // 4. Optional: support filters (e.g. by type, calories, etc.)



// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
import { getApiUrl } from "../config.js";

// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED



function setDatabaseSearchType(type) {
    databaseSearchState.type = type;
    const buttons = document.querySelectorAll('#databaseSearchTypeButtons [data-search-type]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.searchType === type);
    });
    const createBtn = document.getElementById('databaseSearchCreateBtn');
    if (createBtn) {
        createBtn.textContent = type === 'foods' ? 'Create Food' : type === 'meals' ? 'Create Meal Prep' : type === 'drinks' ? 'Create Drink' : 'Create Drink List';
        createBtn.disabled = false;
    }
}


export async function openSearchDatabaseModal(searchType) {
    const queryField = document.getElementById('databaseSearchQuery');
    const results = document.getElementById('databaseSearchResults');
    if (!queryField || !results) return;
    databaseSearchState.type = searchType;
    databaseSearchState.query = '';
    databaseSearchState.page = 1;
    setDatabaseSearchType(searchType);
    queryField.value = '';
    results.innerHTML = `<div class="alert alert-secondary">Type a search term and press Search to query the backend.</div>`;
    showModalById('modalSearchDatabase');
}


async function doSearchDatabase() {
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

        buttons.forEach(btn => {

            const button =
                document.createElement('button');

            button.type = 'button';

            button.className =
                btn.className;

            button.textContent =
                btn.label;

            button.addEventListener(
                'click',
                () => btn.onClick(item)
            );

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
                    deleteEntityByType("foods", item.id)
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
                    deleteEntityByType("meals", item.id)
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
                    deleteEntityByType("drinks", item.id)
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
                    deleteEntityByType("drink lists", item.id)
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


function openViewSearchFood(foodId) {
    openViewSearchItem({
        itemId: foodId,
        selectId: 'foodSelect',
        loadFunction: loadFoodDetails,
        modalFunction: showFoodDetailsModal
    });
}


function openViewSearchMeal(mealId) {
    openViewSearchItem({
        itemId: mealId,
        selectId: 'mealSelect',
        loadFunction: loadMealDetails,
        modalFunction: showMealDetailsModal
    });
}


function openViewSearchDrink(drinkId) {
    openViewSearchItem({
        itemId: drinkId,
        selectId: 'drinkSelect',
        loadFunction: loadDrinkDetails,
        modalFunction: showDrinkDetailsModal
    });
}


function openViewSearchDrinkList(drinkListId) {
    openViewSearchItem({
        itemId: drinkListId,
        selectId: 'drinkListSelect',
        loadFunction: loadDrinkListDetails,
        modalFunction: showDrinkListDetailsModal
    });
}


function setDatabaseSearchPage(page) {
    const totalPages = Math.max(1, Math.ceil(databaseSearchState.results.length / databaseSearchState.pageSize));
    if (page < 1 || page > totalPages) return;
    databaseSearchState.page = page;
    renderDatabaseSearchResults();
}