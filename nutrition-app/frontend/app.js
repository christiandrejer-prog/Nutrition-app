const API_URL_OVERRIDE_KEY = "nutrition_app_api_url";
// Default API URL (can be overridden by runtime-config.json or manual override)
const DEFAULT_API_URL = "http://127.0.0.1:8000";
let API_URL = DEFAULT_API_URL;
let API_URL_SOURCE = "default";

function setApiUrl(value, source) {
    try {
        const u = new URL(value, window.location.href);
        API_URL = u.href.replace(/\/$/, '');
        API_URL_SOURCE = source;
        console.info(`API_URL set from ${source}:`, API_URL);
        return true;
    } catch (e) {
        return false;
    }
}

function loadStoredApiUrl() {
    const stored = localStorage.getItem(API_URL_OVERRIDE_KEY);
    if (stored && setApiUrl(stored, 'localStorage')) {
        return true;
    }
    if (stored) {
        localStorage.removeItem(API_URL_OVERRIDE_KEY);
    }
    return false;
}

async function loadRuntimeConfig() {
    if (API_URL_SOURCE !== 'default') {
        return;
    }

    try {
        const res = await fetch('runtime-config.json', {cache: 'no-store'});
        if (!res.ok) return;
        const cfg = await res.json().catch(() => null);
        if (cfg && cfg.API_URL) {
            if (!setApiUrl(cfg.API_URL, 'runtime-config')) {
                console.warn('Invalid API_URL in runtime-config.json, using default', cfg.API_URL);
            }
        }
    } catch (e) {
        // no runtime config available - silently fallback to default
    }
}

function updateApiUrlInput() {
    const input = document.getElementById('apiUrlInput');
    if (input) {
        input.value = API_URL;
    }
}

async function setApiUrlFromInput() {
    const input = document.getElementById('apiUrlInput');
    if (!input) {
        return;
    }

    const url = input.value.trim();
    if (!url) {
        alert('Enter a backend URL to use.');
        return;
    }

    if (!setApiUrl(url, 'manual')) {
        alert('Invalid URL. Please use a valid http:// or https:// address.');
        return;
    }

    localStorage.setItem(API_URL_OVERRIDE_KEY, API_URL);
    updateApiUrlInput();
    await refreshAppData();
}

async function clearApiUrlOverride() {
    localStorage.removeItem(API_URL_OVERRIDE_KEY);
    API_URL_SOURCE = 'default';
    API_URL = DEFAULT_API_URL;
    await initApp();
}

function getApiUrlSourceLabel() {
    if (API_URL_SOURCE === 'manual') {
        return 'manual override';
    }
    if (API_URL_SOURCE === 'localStorage') {
        return 'saved override';
    }
    if (API_URL_SOURCE === 'runtime-config') {
        return 'runtime-config';
    }
    return 'default';
}

function refreshAppData() {
    updateApiUrlInput();
    if (document.getElementById('statusInfo')) {
        loadStatus();
    }
    loadNutrients();
    loadFoods();
    loadMeals();
    loadDrinks();
    loadDrinkLists();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global variables to store data
let nutrients = [];
let foods = [];
let meals = [];
let drinks = [];
let intakeSummary = null;
let hoverBox = null;

// Edit mode flags
let editingNutrients = false;
let editingFoods = false;
let editingMeals = false;
let editingMealItems = false;
let editingFoodDetails = false;

// Delete mode flags
let consumedMealsDeleteMode = false;
let drinkListDeleteMode = false;

// State for database search modals
let databaseSearchState = { type: 'foods', query: '', page: 1, pageSize: 10, results: [] };

// Initialize the app
async function initApp() {
    loadStoredApiUrl();
    await loadRuntimeConfig();
    updateApiUrlInput();
    loadNutrients();
    loadFoods();
    loadMeals();
    loadDrinks();
    loadDrinkLists();
    applyStoredTheme();
}

document.addEventListener('DOMContentLoaded', function() {
    initApp().catch(err => console.error('initApp failed', err));
});

async function loadStatus() {
    const statusInfo = document.getElementById("statusInfo");
    if (!statusInfo) {
        return;
    }
    statusInfo.innerHTML = "<p>Checking backend and database status...</p>";

    try {
        let apiUrlObj;
        try {
            apiUrlObj = new URL(API_URL);
        } catch (e) {
            apiUrlObj = new URL(API_URL, window.location.href);
        }

        const pageProtocol = window.location.protocol;
        const apiProtocol = apiUrlObj.protocol;

        if (pageProtocol === 'https:' && apiProtocol === 'http:') {
            statusInfo.innerHTML = `
                <div class="status-card">
                    <h3>Protocol warning</h3>
                    <div class="status-error">The page is served over HTTPS but the API is configured as HTTP (${escapeHtml(API_URL)}). Browser may block this request (mixed content).<br>Please run the backend with HTTPS or change the API_URL to an HTTPS host, or open the frontend over HTTP for local testing.</div>
                </div>
            `;
        }

        const requestedUrl = `${API_URL.replace(/\/*$/,'')}/status/`;
        const response = await fetch(requestedUrl);
        let status;
        try {
            status = await response.json();
        } catch (parseErr) {
            const text = await response.text().catch(() => '(no body)');
            statusInfo.innerHTML = `<p class="status-error">Status endpoint returned non-JSON response (HTTP ${response.status})</p><p>Requested URL: ${escapeHtml(requestedUrl)}</p><pre>${escapeHtml(text)}</pre>`;
            return;
        }

        if (!response.ok) {
            statusInfo.innerHTML = `<p class="status-error">Status endpoint returned HTTP ${response.status} ${escapeHtml(response.statusText)}</p><p>Requested URL: ${escapeHtml(requestedUrl)}</p><pre>${escapeHtml(JSON.stringify(status, null, 2))}</pre>`;
            return;
        }

        const backend = status.backend || {};
        const database = status.database || {};
        const api = status.api || {};

        const apiHtml = Object.entries(api).map(([key, value]) => {
            const ok = value.available ? "OK" : "FAIL";
            return `<div class="status-row"><strong>${escapeHtml(key)}</strong>: ${ok} <span>${escapeHtml(value.url)}</span></div>`;
        }).join("");

        const dbCounts = database.counts || {};
        const dbCountHtml = Object.entries(dbCounts).map(([key, count]) => `<div class="status-row"><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(count))}</div>`).join("");

        statusInfo.innerHTML = `
            <div class="status-card">
                <h3>Backend</h3>
                <div class="status-row"><strong>Backend URL</strong>: ${escapeHtml(API_URL)}</div>
                <div class="status-row"><strong>URL Source</strong>: ${escapeHtml(getApiUrlSourceLabel())}</div>
                <div class="status-row"><strong>Message</strong>: ${escapeHtml(backend.message || "Unknown")}</div>
                <div class="status-row"><strong>Checked At</strong>: ${escapeHtml(status.checked_at || "-")}</div>
            </div>
            <div class="status-card">
                <h3>API Endpoints</h3>
                ${apiHtml}
            </div>
            <div class="status-card">
                <h3>Database</h3>
                <div class="status-row"><strong>File</strong>: ${escapeHtml(database.file || "Unknown")}</div>
                <div class="status-row"><strong>Reachable</strong>: ${database.reachable ? "OK" : "FAIL"}</div>
                <div class="status-row"><strong>Tables</strong>: ${escapeHtml((database.tables || []).join(", "))}</div>
                ${dbCountHtml}
                ${database.error ? `<pre class="status-error">${escapeHtml(database.error)}</pre>` : ""}
            </div>
        `;
    } catch (error) {
        const errText = `${error.name || 'Error'}: ${error.message || String(error)}`;
        statusInfo.innerHTML = `<p class="status-error">Unable to reach backend: ${escapeHtml(errText)}</p><pre class="status-error">${escapeHtml(JSON.stringify({stack: error.stack || null}, null, 2))}</pre>`;
    }
}

// Toggle edit functions
function toggleNutrientEdit() {
    editingNutrients = !editingNutrients;
    const btn = document.getElementById("nutrient-edit-btn");
    btn.textContent = editingNutrients ? "Stop Editing Nutrients" : "Edit Nutrients";
    loadNutrients();
}

function toggleFoodEdit() {
    editingFoods = !editingFoods;
    const btn = document.getElementById("food-edit-btn");
    btn.textContent = editingFoods ? "Stop Editing Foods" : "Edit Foods";
    loadFoods();
}

function toggleMealEdit() {
    editingMeals = !editingMeals;
    const btn = document.getElementById("meal-edit-btn");
    btn.textContent = editingMeals ? "Stop Editing Meals" : "Edit Meals";
    loadMeals();
}

function toggleMealDetailsEdit() {
    editingMealItems = !editingMealItems;
    const btn = document.getElementById("meal-details-edit-btn");
    if (btn) btn.textContent = editingMealItems ? "Stop Editing Meal Items" : "Edit Meal Items";
    // reload details if a meal is selected
    const sel = document.getElementById('mealSelect');
    if (sel && sel.value) loadMealDetails();
}

function toggleFoodDetailsEdit() {
    editingFoodDetails = !editingFoodDetails;
    const btn = document.getElementById("food-details-edit-btn");
    btn.textContent = editingFoodDetails ? "Stop Editing Nutrients in Food" : "Edit Nutrients in Food";
    // Reload if a food is selected
    const foodSelect = document.getElementById("foodSelect");
    if (foodSelect.value) {
        loadFoodDetails();
    }
}

// Nutrient functions
async function createNutrient() {
    const name = document.getElementById("nutrientName").value.trim();
    const unit = document.getElementById("nutrientUnit").value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    if (nutrients.some(n => n.name.trim().toLowerCase() === name.toLowerCase() && n.unit.trim().toLowerCase() === unit.toLowerCase())) {
        alert("This nutrient already exists");
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            unit: unit
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        document.getElementById("nutrientName").value = "";
        document.getElementById("nutrientUnit").value = "";
        await loadNutrients();
    } else {
        alert("Error saving nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function loadNutrients() {
    const nutrientList = document.getElementById("nutrientList");
    const nutrientSelect = document.getElementById("nutrientSelect");

    nutrientList.innerHTML = "<li>Loading nutrients...</li>";
    nutrientSelect.innerHTML = '<option value="">Select nutrient</option>';

    const requestedUrl = `${API_URL}/nutrients/`;
    try {
        const response = await fetch(requestedUrl);
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            nutrientList.innerHTML = `<li class="status-error">Unable to load nutrients: HTTP ${response.status} ${escapeHtml(response.statusText)} - ${escapeHtml(errorText)}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
            return;
        }
        nutrients = await response.json();
    } catch (error) {
        nutrientList.innerHTML = `<li class="status-error">Unable to load nutrients: ${escapeHtml(error.message || String(error))}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
        return;
    }

    nutrientList.innerHTML = "";
    nutrientSelect.innerHTML = '<option value="">Select nutrient</option>';

    nutrients.forEach(nutrient => {
        const li = document.createElement("li");
        li.id = `nutrient-row-${nutrient.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = `${nutrient.name} (${nutrient.unit})`;
        li.appendChild(textSpan);

        if (editingNutrients) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditNutrient(nutrient.id, nutrient.name, nutrient.unit);
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteNutrient(nutrient.id);
            });
            li.appendChild(deleteButton);
        }

        nutrientList.appendChild(li);

        const option = document.createElement("option");
        option.value = nutrient.id;
        option.text = `${nutrient.name} (${nutrient.unit})`;
        nutrientSelect.appendChild(option);
    });
}

function showEditNutrient(nutrientId, currentName, currentUnit) {
    const row = document.getElementById(`nutrient-row-${nutrientId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `nutrient-name-edit-${nutrientId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Nutrient name";
    row.appendChild(nameInput);

    const unitInput = document.createElement("input");
    unitInput.type = "text";
    unitInput.id = `nutrient-unit-edit-${nutrientId}`;
    unitInput.value = currentUnit;
    unitInput.placeholder = "Unit (e.g., g)";
    row.appendChild(unitInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveNutrient(nutrientId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadNutrients();
    });
    row.appendChild(cancelButton);
}

// Sidebar / UI placeholder handlers
function registerSidebarHandlers() {
    const actionElements = document.querySelectorAll('[data-action]');

    actionElements.forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const action = el.dataset.action;
            try {
                switch (action) {
                    case 'create-nutrient':
                        showModalById('modalCreateNutrient');
                        break;
                    case 'create-food':
                        showModalById('modalCreateFood');
                        break;
                    case 'create-meal-prep':
                        showModalById('modalCreateMealPrep');
                        break;
                    case 'create-drink':
                        showModalById('modalCreateDrink');
                        break;
                    case 'create-drink-list':
                        showModalById('modalCreateDrinkList');
                        break;
                    case 'create-drink-prep':
                        renderDrinkPrepOutput();
                        break;
                    case 'search-foods':
                        openSearchDatabaseModal('foods');
                        break;
                    case 'search-meals':
                        openSearchDatabaseModal('meals');
                        break;
                    case 'search-drinks':
                        openSearchDatabaseModal('drinks');
                        break;
                    case 'status':
                        renderStatusOutput();
                        break;
                    case 'home':
                        renderHomeOutput();
                        break;
                    case 'dashboard':
                        renderMealDashboardOutput();
                        break;
                    case 'drink-dashboard':
                        renderDrinkDashboardOutput();
                        break;
                    case 'account':
                        renderProfileOutput();
                        break;
                    case 'settings':
                        renderSettingsOutput();
                        break;
                    default:
                        // generic feedback
                        console.info('UI action clicked:', action);
                        const msg = document.createElement('div');
                        msg.className = 'alert alert-info';
                        msg.style.position = 'fixed';
                        msg.style.right = '20px';
                        msg.style.bottom = '20px';
                        msg.style.zIndex = 1050;
                        msg.textContent = `Not implemented: ${action}`;
                        document.body.appendChild(msg);
                        setTimeout(() => msg.remove(), 1400);
                }
            } catch (err) {
                console.warn('sidebar handler error', err);
            } finally {
                    // on small screens, close the mobile nav if it is open
                    try {
                        if (window.innerWidth < 768 && typeof bootstrap !== 'undefined') {
                            const sidebarEl = document.getElementById('sidebar');
                            if (sidebarEl) {
                                const bs = bootstrap.Collapse.getOrCreateInstance(sidebarEl);
                                if (bs) bs.hide();
                            }
                            const offcanvasEl = document.getElementById('mobileMenu');
                            if (offcanvasEl) {
                                const oc = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
                                if (oc) oc.hide();
                            }
                        }
                    } catch (closeErr) {
                        // ignore
                    }
                }
            });
        });
}

async function submitAddNutrient() {
    const name = document.getElementById('modalNutrientName').value.trim();
    const unit = document.getElementById('modalNutrientUnit').value.trim();
    if (!name || !unit) { alert('Enter name and unit'); return; }
    const response = await fetch(`${API_URL}/nutrients/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, unit})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        // hide modal
        const m = document.getElementById('modalAddNutrient');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        await loadNutrients();
    } else {
        alert('Failed to add nutrient');
    }
}

async function submitAddDrink() {
    const name = document.getElementById('modalDrinkName').value.trim();
    if (!name) { alert('Enter drink name'); return; }
    const response = await fetch(`${API_URL}/drinks/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateDrink');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalDrinkName').value = '';
        await loadDrinks();
    } else {
        alert('Failed to add drink');
    }
}

async function submitAddDrinkList() {
    const name = document.getElementById('modalDrinkListName').value.trim();
    if (!name) { alert('Enter drink list name'); return; }
    const response = await fetch(`${API_URL}/drink-lists/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateDrinkList');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalDrinkListName').value = '';
        await loadDrinkLists();
    } else {
        alert('Failed to add drink list');
    }
}

async function submitAddFood() {
    const name = document.getElementById('modalFoodName').value.trim();
    const brand = document.getElementById('modalFoodBrand').value.trim();
    const price = parseFloat(document.getElementById('modalFoodPrice').value) || 0;
    if (!name) { alert('Enter food name'); return; }
    const response = await fetch(`${API_URL}/foods/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, brand, price})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalAddFood');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        await loadFoods();
    } else {
        alert('Failed to add food');
    }
}

async function submitAddMealPrep() {
    const name = document.getElementById('modalMealPrepName').value.trim();
    if (!name) { alert('Enter meal prep name'); return; }
    const response = await fetch(`${API_URL}/meals/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateMealPrep');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalMealPrepName').value = '';
        await loadMeals();
    } else {
        alert('Failed to add meal prep');
    }
}

function openCreateFromSearch() {
    const type = databaseSearchState.type || 'foods';

    const searchModalEl = document.getElementById('modalSearchDatabase');

    if (searchModalEl) {
        const modal = bootstrap.Modal.getInstance(searchModalEl);

        searchModalEl.addEventListener('hidden.bs.modal', function handler() {

            searchModalEl.removeEventListener('hidden.bs.modal', handler);

            if (type === 'foods') {
                openCreateFoodModal();
            } else if (type === 'meals') {
                openCreateMealPrepModal();
            } else if (type === 'drinks') {
                openCreateDrinkModal();
            } else {
                openCreateDrinkListModal();
            }
        });

        modal.hide();
    }
}

function showModalById(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl || typeof bootstrap === 'undefined') return;
    const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
    instance.show();
}

function renderHomeOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="alert alert-info">
            <h3 class="h5 mb-2">Home</h3>
            <p>This area is still a work in progress. Displaying home output placeholder.</p>
            <p><strong>(W.I.P)</strong></p>
        </div>
    `;
    output.scrollIntoView({behavior: 'smooth'});
}

async function renderMealDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Dashboard</h3>
            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Today's Intake</h5>
                            <div id="dashboardIntakeSummary">
                                <p class="text-muted">Loading today\'s intake summary...</p>
                            </div>
                            <div class="mt-3">
                                <canvas id="dashboardIntakeChart" width="350" height="240"></canvas>
                            </div>
                            <p class="mt-3"><strong><i>(W.I.P)</i></strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Consumed Meals</h5>
                            <div class="mb-3">
                                <p class="form-label">Choose a meal from the database</p>
                            </div>
                            <button class="btn btn-primary btn-sm mb-3" type="button" onclick="addConsumedMealUI()">Add consumed meal</button>
                            <button class="btn btn-danger btn-sm mb-3" type="button" onclick="toggleConsumedMealDeleteMode()">Remove consumed meal</button>
                            <div id="dashboardConsumedMealsList" class="mb-2">
                                <div class="text-muted">Loading today's consumed meals...</div>
                            </div>
                            <p class="mt-3 text-muted small">Add meals created in the database directly to today's intake.</p>
                            <p class="mt-3 text-muted small"><strong><i>(W.I.P.)</i></strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Activity / Workouts</h5>
                            <p class="card-text">Placeholder for activity logging and daily tracking.</p>
                            <div class="placeholder-glow">
                                <span class="placeholder col-6"></span>
                                <span class="placeholder col-8"></span>
                                <span class="placeholder col-4"></span>
                            </div>
                            <p class="mt-3"><strong><i>(Future feature)</i></strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadDashboardIntakeSummary();
    await loadDashboardConsumedMeals();
    output.scrollIntoView({behavior: 'smooth'});
}

async function loadDashboardConsumedMeals() {
    const container = document.getElementById('dashboardConsumedMealsList');
    if (!container) return;
    container.innerHTML = '<div class="text-muted">Loading today\'s consumed meals...</div>';

    try {
        const response = await fetch(`${API_URL}/intake/`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const entries = await response.json();
        if (!Array.isArray(entries) || entries.length === 0) {
            container.innerHTML = '<div class="text-muted">No consumed meals recorded today.</div>';
            return;
        }

        container.innerHTML = '';
        entries.forEach(entry => {
            const mealName = entry.meal_id ? (meals.find(m => m.id === entry.meal_id)?.name || `Meal ${entry.meal_id}`) : 'Custom entry';
            const entryItem = document.createElement('div');
            entryItem.className = 'mb-3 p-2 border rounded d-flex justify-content-between align-items-start flex-wrap gap-2';
            entryItem.innerHTML = `
                <div class="fw-semibold">${escapeHtml(mealName)}</div>
                <div class="small text-muted mb-1">${escapeHtml(entry.description || 'Meal consumed')}</div>
                <div>Protein ${escapeHtml(String(entry.protein))} g · Carbs ${escapeHtml(String(entry.carbs))} g · Fat ${escapeHtml(String(entry.fat))} g · ${escapeHtml(String(entry.calories))} kcal</div>
            `;
        if (consumedMealsDeleteMode) {

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn-danger';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', async () => {

                try {

                    const response = await fetch(`${API_URL}/intake/${entry.id}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    // reload list after delete
                    loadDashboardConsumedMeals();

                    // OPTIONAL: refresh summary too
                    loadDashboardIntakeSummary();

                } catch (error) {

                    console.error('Unable to delete consumed meal', error);

                    alert(`Unable to delete entry: ${error.message}`);
                }
            });

            entryItem.appendChild(deleteButton);
        }

        container.appendChild(entryItem);
        });
    } catch (error) {
        container.innerHTML = `<div class="text-danger">Unable to load consumed meals: ${escapeHtml(error.message || String(error))}</div>`;
    }
}


async function loadDashboardIntakeSummary() {
    const summaryContainer = document.getElementById('dashboardIntakeSummary');
    const chartCanvas = document.getElementById('dashboardIntakeChart');
    if (!summaryContainer || !chartCanvas) return;

    summaryContainer.innerHTML = 'Loading today\'s intake...';
    let chart = null;
    if (!window.Chart) {
        summaryContainer.innerHTML = 'Chart.js not loaded';
    }

    try {
        const response = await fetch(`${API_URL}/intake/summary`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        intakeSummary = await response.json();
    } catch (error) {
        summaryContainer.innerHTML = `<div class="alert alert-warning">Unable to load intake summary: ${escapeHtml(error.message || String(error))}</div>`;
        return;
    }

    const data = intakeSummary || {};
    const protein = data.total_protein || 0;
    const carbs = data.total_carbs || 0;
    const fat = data.total_fat || 0;
    const total = data.total_calories || 0;

    summaryContainer.innerHTML = `
        <div><strong>${total.toFixed(0)} kcal</strong></div>
        <div>Protein: ${protein.toFixed(1)} g</div>
        <div>Carbs: ${carbs.toFixed(1)} g</div>
        <div>Fat: ${fat.toFixed(1)} g</div>
        <div class="mt-2"><small>Entries: ${data.entries ?? 0}</small></div>

        <div id="todays-intake-container" class="mt-3"></div>
    `;

    const chartData = {
        protein,
        carbs,
        fat
    };

    // pass data into intake module
    requestAnimationFrame(() => {
        renderTodaysIntake(chartData);
    });
}


function addConsumedMealUI() {
    openSearchDatabaseModal('meals');
}
    


async function addConsumedMeal() {
    
}

function toggleConsumedMealDeleteMode() {

    consumedMealsDeleteMode = !consumedMealsDeleteMode;

    const btn = document.querySelector('[onclick="toggleConsumedMealDeleteMode()"]');

    if (btn) {
        btn.textContent = consumedMealsDeleteMode
            ? 'Exit delete mode'
            : 'Remove a consumed meal';
    }

    loadDashboardConsumedMeals();
}


async function renderStatusOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="card mb-4 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h3 class="h5 mb-1">System Status</h3>
                    <p class="text-muted mb-0">Checks backend and database availability.</p>
                </div>
                <input type="text" id="apiUrlInput" class="form-control form-control-sm w-auto" placeholder="API URL" value="${escapeHtml(API_URL)}" style="max-width: 300px;" oninput="setApiUrlFromInput()">
                <button class="btn btn-sm btn-outline-primary" type="button" onclick="renderStatusOutput()">Refresh</button>
            </div>
            <div class="card-body" id="statusInfo">
                <p>Loading backend status...</p>
            </div>
        </div>
    `;
    await loadStatus();
    output.scrollIntoView({behavior: 'smooth'});
}


async function renderDrinkDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Drinks Dashboard</h3>
            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Visualization</h5>
                            <div id="dashboardDrinkSummary">
                                <p class="text-muted">Loading visualization summary...</p>
                            </div>
                            <div class="mt-3">
                                <canvas id="dashboardDrinkChart" width="300" height="240"></canvas>
                            </div>
                            <p class="mt-3"><strong><i>(W.I.P)</i></strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Drinks list</h5>
                            <div class="mb-3">
                                <p class="form-label">Choose a drinks list from the database</p>
                            </div>
                                <button class="btn btn-primary btn-sm mb-3" type="button" onclick="selectDrinkListUI()">Select drink list</button><br>
                                <button class="btn btn-primary btn-sm mb-3" type="button" onclick="addDrinkListItemUI()">Add drink to list</button>
                                <button class="btn btn-danger btn-sm mb-3" type="button" id="toggle-remove-drink-btn" onclick="toggleDrinkListDeleteMode()">Remove drink from list</button>
                            <div id="dashboardDrinkList" class="mb-2">
                                <div class="text-muted">Loading drinks list...</div>
                            </div>
                            <p class="mt-3 text-muted small">Add drinks directly to a drinks list.</p>
                            <p class="mt-3 text-muted small"><strong><i>(W.I.P.)</i></strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Undecided</h5>
                            <p class="card-text">Placeholder for a future feature, maybe something related to drink preferences / recommendations or even just garnishes.</p>
                            <div class="placeholder-glow">
                                <span class="placeholder col-6"></span>
                                <span class="placeholder col-8"></span>
                                <span class="placeholder col-4"></span>
                            </div>
                            <p class="mt-3"><strong><i>(Future feature)</i></strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;


    await loadDashboardDrinkListsItems(prompt_asw_LIST_ID);
    await loadDashboardDrinkChart(prompt_asw_LIST_ID);
    output.scrollIntoView({behavior: 'smooth'});
}

// Uses placeholder prompt for now, but ideally this would be a sidebar or modal interface allowing you to select a drink from the database, specify quantity and optionally customize ingredients, then add it to the currently selected drink list in the dashboard, and finally reload the list and visualization to reflect changes.
async function addDrinkListItemUI() {
    prompt_asw_DRINK_ID = prompt('Add drink to list functionality is not implemented yet. This would allow you to add a drink from the database to the currently selected drink list, specifying quantity and optionally customizing ingredients.', 'OK');
    //openSearchDatabaseModal('drinks');
    console.log('Add drink to list UI placeholder:', prompt_asw_DRINK_ID);

    if (!prompt_asw_DRINK_ID) return;
    // For now, just reload the list to reflect changes after "adding" a drink
    await addDrinkListItem(prompt_asw_LIST_ID, prompt_asw_DRINK_ID);
    await loadDashboardDrinkListsItems(prompt_asw_LIST_ID);
    await loadDashboardDrinkChart(prompt_asw_LIST_ID);

    return prompt_asw_DRINK_ID;
}
// Uses placeholder prompt for now, but ideally this would be a sidebar or modal interface allowing you to select from existing drink lists in the database, and then load the selected list into the dashboard for visualization and management.
async function selectDrinkListUI() {
    prompt_asw_LIST_ID = prompt('Select drink list functionality is not implemented yet. This would allow you to choose from existing drink lists in the database and load them into the dashboard for visualization and management.', 'OK');
    //openSearchDatabaseModal('drink lists');
    console.log('Select drink list UI placeholder:', prompt_asw_LIST_ID);
    
    if (!prompt_asw_LIST_ID) return;
    await loadDashboardDrinkListsItems(prompt_asw_LIST_ID);
    await loadDashboardDrinkChart(prompt_asw_LIST_ID);
    
    return prompt_asw_LIST_ID;
}


async function loadDashboardDrinkListsItems(listId) {

    const container =
        document.getElementById('dashboardDrinkList');

    if (!container) return;

    container.innerHTML =
        '<div class="text-muted">Loading drink lists...</div>';

    try {

        const response =
            await fetch(`${API_URL}/drinks/lists`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const lists =
            await response.json();

        if (!lists.length) {

            container.innerHTML =
                '<div class="text-muted">No drink lists.</div>';

            return;
        }

        container.innerHTML = '';

        // =========================
        // CASE 1: NO LIST SELECTED → show list picker
        // =========================
        if (!listId) {

            const grid =
                document.createElement('div');

            grid.className = 'drink-grid';

            lists.forEach(list => {

                const item =
                    document.createElement('div');

                item.className = 'drink-item';

                item.innerHTML = `
                    <div class="drink-name">
                        ${escapeHtml(list.name)}
                    </div>
                    <div class="small text-muted">
                        ${list.item_count} items
                    </div>
                `;

                item.addEventListener('click', async () => {

                    // FUTURE IMPROVEMENT:
                    // replace click with sidebar / modal selector

                    await loadDashboardDrinkListsItems(list.id);
                    await loadDashboardDrinkChart(list.id);
                });

                grid.appendChild(item);
            });

            container.appendChild(grid);

            return;
        }

        // =========================
        // CASE 2: LIST SELECTED → fetch items
        // =========================

        const listResponse =
            await fetch(`${API_URL}/drinks/lists/${listId}`);

        if (!listResponse.ok) {
            throw new Error(`HTTP ${listResponse.status}`);
        }

        const selectedList =
            await listResponse.json();

        const entries =
            selectedList.items || [];

        if (!entries.length) {

            container.innerHTML =
                '<div class="text-muted">This list is empty.</div>';

            return;
        }

        const grid =
            document.createElement('div');

        grid.className = 'drink-grid';

        entries.forEach(entry => {

            const drink =
                entry.drink ||
                drinks.find(d => d.id === entry.drink_id);

            const item =
                document.createElement('div');

            item.className = 'drink-item';

            item.innerHTML = `
                <div class="drink-name">
                    ${escapeHtml(
                        drink?.name ||
                        `Drink ${entry.drink_id}`
                    )}
                </div>
            `;

            // reuse your hover system
            item.dataset.details = JSON.stringify({
                quantity: entry.quantity || 1,
                description: drink?.description || 'No description',
                alcohol: drink?.alcohol_percentage || 'N/A',
                category: drink?.category || 'Unknown'
            });

            item.addEventListener('mouseenter', showDrinkHover);
            item.addEventListener('mouseleave', hideDrinkHover);

            grid.appendChild(item);
        });

        container.appendChild(grid);

    } catch (error) {

        container.innerHTML = `
            <div class="text-danger">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}

///// FUTURE IMPROVEMENTS --- 
// MAKE THIS A REUSABLE COMPONENT FOR ANY ITEM WITH DETAILS, NOT JUST DRINKS
function showDrinkHover(event) {

    const data =
        JSON.parse(
            event.currentTarget.dataset.details
        );

    hoverBox =
        document.createElement('div');

    hoverBox.className =
        'drink-hover-box';

    hoverBox.innerHTML = `
        <div><strong>Quantity:</strong> ${data.quantity}</div>
        <div><strong>Category:</strong> ${data.category}</div>
        <div><strong>Alcohol:</strong> ${data.alcohol}</div>
        <div class="mt-1 text-muted">
            ${escapeHtml(data.description)}
        </div>
    `;

    document.body.appendChild(hoverBox);

    const rect =
        event.currentTarget.getBoundingClientRect();

    hoverBox.style.left =
        `${rect.left}px`;

    hoverBox.style.top =
        `${rect.bottom + 10}px`;
}
// MAKE THIS A REUSABLE COMPONENT FOR ANY ITEM WITH DETAILS, NOT JUST DRINKS
function hideDrinkHover() {

    if (hoverBox) {

        hoverBox.remove();

        hoverBox = null;
    }
}

async function loadDashboardDrinkChart(listId) {

    const summaryContainer =
        document.getElementById('dashboardDrinkSummary');

    const chartCanvas =
        document.getElementById('dashboardDrinkChart');

    if (!summaryContainer || !chartCanvas) return;

    const response =
        await fetch(`${API_URL}/drinks/lists/${listId}`);

    if (!response.ok) return;

    const list =
        await response.json();

    const entries =
        list.items || [];

    if (!entries.length) {

        summaryContainer.innerHTML =
            '<div class="text-muted">No drinks added to list.</div>';

        return;
    }

    const ingredientTotals = {};
    const ingredientCosts = {};

    entries.forEach(entry => {

        const drink =
            entry.drink;

        if (!drink?.ingredients?.length) return;

        const quantity =
            Number(entry.quantity || 1);

        drink.ingredients.forEach(ingredient => {

            const name =
                ingredient.food?.name ||
                ingredient.name ||
                'Unknown';

            const amount =
                Number(ingredient.amount || 0);

            const food =
                ingredient.food;

            // IMPORTANT: price is not per_unit anymore in your API
            const unitPrice =
                Number(food?.price || 0);

            const totalAmount =
                amount * quantity;

            const base_amount =
                Number(ingredient.food.base_amount || 1);

            const totalCost =
                (totalAmount/base_amount) * unitPrice;

            ingredientTotals[name] =
                (ingredientTotals[name] || 0)
                + totalAmount;

            ingredientCosts[name] =
                (ingredientCosts[name] || 0)
                + totalCost;
        });
    });

    const labels =
        Object.keys(ingredientTotals);

    const quantityData =
        labels.map(n => ingredientTotals[n]);

    const costData =
        labels.map(n => ingredientCosts[n]);

    summaryContainer.innerHTML = `
        <div>
            To make: <strong>${entries.reduce((sum, entry) => sum + (Number(entry.quantity) || 1), 0)}</strong> drinks
        </div>
        <div class="small text-muted">
            Ingredient usage overview
        </div>
    `;

    if (window.dashboardDrinkChart instanceof Chart) {
        window.dashboardDrinkChart.destroy();
    }

    const ctx =
        chartCanvas.getContext('2d');

    window.dashboardDrinkChart =
        new Chart(ctx, {
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
}









async function loadDrinks() {
    const requestedUrl = `${API_URL}/drinks/`;
    try {
        const response = await fetch(requestedUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        drinks = await response.json();
    } catch (error) {
        console.warn('Unable to load drinks:', error);
        drinks = [];
    }
}

async function loadDrinkLists() {
    const requestedUrl = `${API_URL}/drinks/lists`;
    try {
        const response = await fetch(requestedUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        drinkLists = await response.json();
    } catch (error) {
        console.warn('Unable to load drink lists:', error);
        drinkLists = [];
    }
}

// Utility to map search types to their corresponding API endpoints
function getDatabaseEndpoint(type) {
    // This function maps the user-friendly search type to the actual API endpoint. 
    // It allows us to keep the UI labels separate from the backend structure, 
    // and makes it easier to manage any differences in naming conventions or endpoint paths.
    const endpointMap = {
        'foods': 'foods/',
        'meals': 'meals/',
        'drinks': 'drinks/',
        'drink lists': 'drinks/lists'
    };

    return endpointMap[type] || type;
}



////// --- FUTURE FUNCTION PLACEHOLDERS --- //////
// -----------------------------------------------
// Load api data functions [GET]

    // MISSING LOAD FUNCTIONS:
    // NOT DONE MORE TO COME HERE, JUST A PLACEHOLDER FOR NOW TO SHOW INTENT AND GENERAL STRUCTURE OF HOW THESE FUNCTIONS WOULD BE IMPLEMENTED.



////// Create functions [POST]


    // Similar to the submitAddNutrient and submitAddFood functions, create functions for meals, drinks, and drink lists would involve gathering input from the user through modals or forms, validating that input, sending a POST request to the appropriate API endpoint with the new item data, and then refreshing the relevant data in the UI to include the newly created item. Each type of item would have its own specific fields and validation requirements, but they would all follow this general pattern for consistency across the application.
    // NOT DONE MORE TO COME HERE, JUST A PLACEHOLDER FOR NOW TO SHOW INTENT AND GENERAL STRUCTURE OF HOW THESE FUNCTIONS WOULD BE IMPLEMENTED.



////// Add to functions [POST]    
// Work in progress \/\/\/
async function addDrinkListItem(listId, drinkId, quantity = prompt('Enter quantity (default 1):', '1')) {

    const response = await fetch(
        `${API_URL}/drinks/lists/${listId}/items`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drink_id: parseInt(drinkId, 10),
                quantity
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} ${response.statusText}`
        );
    }

    await loadDrinkLists();
    await loadDashboardDrinkListsItems(listId);
    await loadDashboardDrinkChart(listId);
}


    // For example, the addDrinkListItem function would allow users to add a drink to a specific drink list by sending a POST request to the backend with the drink ID and quantity. This function would be called from the UI when a user selects a drink and specifies how many they want to add to the list. After successfully adding the item, it would refresh the drink lists data to reflect the new addition in the UI.
    // NOT DONE MORE TO COME HERE, JUST A PLACEHOLDER FOR NOW TO SHOW INTENT AND GENERAL STRUCTURE OF HOW THESE FUNCTIONS WOULD BE IMPLEMENTED.



////// Edit functions [PUT]
// Edit name in search functions
function editSearchName({
    id,
    collection,
    array,
    endpoint,
    title = 'Name',
    buildBody,
    reload,
    successMessage
}) {
    const item = array.find(i => String(i.id) === String(id));
    if (!item) return;

    const name = prompt(title, item.name);
    if (name === null) return;

    const body = buildBody ? buildBody(item, name.trim()) : { name: name.trim() };

    fetch(`${API_URL}/${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(async response => {
        if (response.ok) {
            await reload();
            alert(successMessage || 'Updated.');
        } else {
            const error = await response.json().catch(() => ({}));
            alert('Update failed: ' + (error.detail || response.statusText));
        }
    });
}


function editSearchFood(foodId) {
    editSearchName({
        id: foodId,
        array: foods,
        endpoint: 'foods',
        title: 'Food name',
        reload: loadFoods,
        successMessage: 'Food updated.',
        buildBody: (food, name) => ({
            name,
            brand: food.brand || null,
            price: food.price
        })
    });
}


function editSearchMeal(mealId) {
    editSearchName({
        id: mealId,
        array: meals,
        endpoint: 'meals',
        title: 'Meal prep name',
        reload: loadMeals,
        successMessage: 'Meal prep updated.'
    });
}


function editSearchDrink(drinkId) {
    editSearchName({
        id: drinkId,
        array: drinks,
        endpoint: 'drinks',
        title: 'Drink name',
        reload: loadDrinks,
        successMessage: 'Drink updated.'
    });
}


function editSearchDrinkList(listId) {
    editSearchName({
        id: listId,
        array: drinkLists,
        endpoint: 'drinks/lists',
        title: 'Drink list name',
        reload: loadDrinkLists,
        successMessage: 'Drink list updated.'
    });
}

    //for database items (foods, meals, drinks, drink lists) would go here, following a similar pattern to the nutrient edit functions. They would typically involve fetching the current item data, displaying it in a modal form for editing, and then submitting the updated data back to the backend API. 
    // NOT DONE MORE TO COME HERE, JUST A PLACEHOLDER FOR NOW TO SHOW INTENT AND GENERAL STRUCTURE OF HOW THESE FUNCTIONS WOULD BE IMPLEMENTED.




////// Delete functions [DELETE]

// Delete type mapping to avoid repetitive code for each entity type
const ENTITY_CONFIG = {
    "foods": {
        confirm: "Delete this food item?",
        reload: loadFoods,
        details: "foodDetails"
    },
    "meals": {
        confirm: "Delete this meal?",
        reload: loadMeals,
        details: "mealDetails"
    },
    "drinks": {
        confirm: "Delete this drink?",
        reload: loadDrinks,
        details: "drinkDetails"
    },
    "drink lists": {
        confirm: "Delete this drink list?",
        reload: loadDrinkLists,
        details: "drinkListDetails"
    }
};

async function deleteEntityByType(type, id) {
    const config = ENTITY_CONFIG[type];
    if (!config) throw new Error("Unknown entity type: " + type);

    if (!confirm(config.confirm)) return;
    api = getDatabaseEndpoint(type);
    const response = await fetch(`${API_URL}/${api}${api === "drinks/lists" ? "/" : ""}${id}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        config.reload?.();
        if (config.details) {
            document.getElementById(config.details)?.replaceChildren();
        }
    } else {
        alert("Error deleting: " + (result.detail || JSON.stringify(result)));
    }
}

// Work in progress \/\/\/
async function deleteDrinkListItem(item_id) {
    if (!confirm('Are you sure you want to remove this drink from the list?')) {
        return;
    }
    if (!prompt_asw_LIST_ID) {
        alert('No drink list selected.');
        return;
    }
    try {

        const response = await fetch(
            `${API_URL}/drinks/lists/${prompt_asw_LIST_ID}/items/${item_id}`, // Replace ITEM_ID with the actual item ID to delete
            {
                method: 'DELETE'
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await loadDrinkLists();
        await loadDashboardDrinkListsItems(prompt_asw_LIST_ID);
        await loadDashboardDrinkChart(prompt_asw_LIST_ID);

    } catch (error) {

        console.error(
            'Unable to delete drink list item',
            error
        );

        alert(
            `Unable to delete item: ${error.message}`
        );
    }
}

    // Similar to the edit functions, delete functions for database items would involve confirming the user's intent to delete, sending a DELETE request to the appropriate API endpoint, and then refreshing the relevant data in the UI to reflect the deletion.
    // NOT DONE MORE TO COME HERE, JUST A PLACEHOLDER FOR NOW TO SHOW INTENT AND GENERAL STRUCTURE OF HOW THESE FUNCTIONS WOULD BE IMPLEMENTED.


////// Toggle functions for buttons

// Work in progress \/\/\/
function toggleDrinkListDeleteMode() {
                // Not in use until the delete functionality for drink list items 
                // is implemented, but this would toggle a mode in the UI where 
                // delete buttons appear next to each drink in the selected drink list, 
                // allowing the user to remove drinks from the list. It would likely involve 
                // setting a state variable (like drinkListDeleteMode) and then conditionally 
                // rendering delete buttons in the drink list items based on that state. 
                // When a delete button is clicked, it would call the deleteDrinkListItem function 
                // to remove that item from the backend and refresh the list.
    deleteDrinkListItem(item_id=prompt('Remove drink from list functionality is not implemented yet. This would allow you to remove a drink from the currently selected drink list in the dashboard.', 'OK'));

    //drinkListDeleteMode = !drinkListDeleteMode;
    const btn = document.getElementById("toggle-remove-drink-btn");
    btn.textContent = drinkListDeleteMode ? "Exit delete mode" : "Remove drink from list";

    loadDrinkLists();
}




// Database search handlers:
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


async function openSearchDatabaseModal(searchType) {
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


function buildSearchableText(item) {
    // Universal search fields across ALL database types
    return [
        item.name,
        item.brand,
        item.description,
        item.type,
        item.category,
        item.tags ? item.tags.join(' ') : ''
    ]
    .filter(Boolean)
    .join(' ');
}


async function doSearchDatabase() {
    const query = (document.getElementById('databaseSearchQuery').value || '').trim().toLowerCase();
    const type = databaseSearchState.type || 'foods';
    databaseSearchState.type = type;
    databaseSearchState.query = query;
    databaseSearchState.page = 1;
    databaseSearchState.results = [];



    const requestedUrl = `${API_URL}/${getDatabaseEndpoint(type)}`;
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

function setDatabaseSearchPage(page) {
    const totalPages = Math.max(1, Math.ceil(databaseSearchState.results.length / databaseSearchState.pageSize));
    if (page < 1 || page > totalPages) return;
    databaseSearchState.page = page;
    renderDatabaseSearchResults();
}


// Database search results rendering:
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
    createButton = '',
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

            ${createButton}
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

        createButton: `
            <button
                class="btn btn-sm btn-success mt-2"
                onclick="openCreateFoodModal()"
            >
                Create Food
            </button>
        `,

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
                    openSearchFood(item.id)
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

        createButton: `
            <button
                class="btn btn-sm btn-success mt-2"
                onclick="openCreateMealPrepModal()"
            >
                Create Meal
            </button>
        `,
        
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
                    alert("Meal details view not implemented yet.")
                    //openSearchMeal(item.id)
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

        createButton: `
            <button
                class="btn btn-sm btn-success mt-2"
                onclick="openCreateDrinkModal()"
            >
                Create Drink
            </button>
        `,

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
                    alert("Drink details view not implemented yet.")
                    //openSearchDrink(item.id)
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

        createButton: `
            <button
                class="btn btn-sm btn-success mt-2"
                onclick="openCreateDrinkListModal()"
            >
                Create Drink List
            </button>
        `,

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
                    alert("Drink list details view not implemented yet.")
                    //openDrinkList(item.id)
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



function openSearchFood(foodId) {
    const select = document.getElementById('foodSelect');
    if (select) {
        select.value = foodId;
        loadFoodDetails();
    } else {
        showFoodDetailsModal(foodId);
    }
    const modal = document.getElementById('modalSearchDatabase');
    if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal)?.hide();
}

async function showFoodDetailsModal(foodId) {
    const modal = document.getElementById('modalFoodDetails');
    const content = document.getElementById('modalFoodDetailsContent');
    if (!modal || !content) return;
    content.innerHTML = '<p>Loading food details...</p>';
    if (typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modal).show();

    try {
        const nutrientResponse = await fetch(`${API_URL}/foods/${foodId}/nutrients`);
        const macroResponse = await fetch(`${API_URL}/foods/${foodId}/macros`);
        const nutrientData = nutrientResponse.ok ? await nutrientResponse.json() : [];
        const macroData = macroResponse.ok ? await macroResponse.json() : null;

        let html = '<div class="d-flex justify-content-between align-items-start mb-3">';
        html += '<h5 class="mb-0">Food Details</h5>';
        html += `<button class="btn btn-sm btn-outline-secondary" type="button" onclick="showEditFoodMacrosModal(${foodId})">Edit Macros</button>`;
        html += '</div>';

        if (nutrientData.length) {
            html += '<ul class="list-group mb-3">';
            nutrientData.forEach(entry => {
                const nutrient = nutrients.find(n => n.id === entry.nutrient_id);
                const name = nutrient ? nutrient.name : `Nutrient ${entry.nutrient_id}`;
                const unit = nutrient ? nutrient.unit : '';
                html += `<li class="list-group-item d-flex justify-content-between align-items-center"><span><strong>${escapeHtml(name)}</strong>${unit ? ` (${escapeHtml(unit)})` : ''}</span><span>${escapeHtml(String(entry.amount_per_100g))}</span></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>No nutrients added yet.</p>';
        }

        if (macroData && macroData.macros) {
            html += '<div class="border p-3 rounded bg-light">';
            html += `<p><strong>Calories:</strong> ${escapeHtml(String(macroData.macros.calories))} kcal</p>`;
            html += `<p><strong>Protein:</strong> ${escapeHtml(String(macroData.macros.protein))}g</p>`;
            html += `<p><strong>Carbs:</strong> ${escapeHtml(String(macroData.macros.carbs))}g</p>`;
            html += `<p><strong>Fat:</strong> ${escapeHtml(String(macroData.macros.fat))}g</p>`;
            html += '</div>';
        }

        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = '<div class="alert alert-danger">Unable to load food details.</div>';
        console.warn(err);
    }
}

async function showEditFoodMacrosModal(foodId) {
    const modal = document.getElementById('modalFoodDetails');
    const content = document.getElementById('modalFoodDetailsContent');
    if (!modal || !content) return;
    content.innerHTML = '<p>Loading macros editor...</p>';
    if (typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modal).show();

    try {
        const nutrientResponse = await fetch(`${API_URL}/foods/${foodId}/nutrients`);
        const nutrientData = nutrientResponse.ok ? await nutrientResponse.json() : [];
        if (!Array.isArray(nutrientData)) throw new Error('Invalid response');

        let html = '<h5 class="mb-3">Edit Food Macros</h5>';
        html += '<form id="foodMacrosForm">';
        if (!nutrientData.length) {
            html += '<p>No nutrient records found to edit.</p>';
        }

        nutrientData.forEach(entry => {
            const nutrient = nutrients.find(n => n.id === entry.nutrient_id);
            const label = nutrient ? `${nutrient.name} (${nutrient.unit})` : `Nutrient ${entry.nutrient_id}`;
            html += `
                <div class="mb-3">
                    <label class="form-label">${escapeHtml(label)}</label>
                    <input type="number" step="0.1" class="form-control" id="foodMacroAmount-${entry.nutrient_id}" value="${escapeHtml(String(entry.amount_per_100g))}">
                </div>
            `;
        });

        html += '<div class="d-flex gap-2">';
        html += `<button type="button" class="btn btn-secondary" onclick="showFoodDetailsModal(${foodId})">Cancel</button>`;
        html += `<button type="button" class="btn btn-primary" onclick="saveFoodMacros(${foodId})">Save Macros</button>`;
        html += '</div>';
        html += '</form>';

        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = '<div class="alert alert-danger">Unable to load macros editor.</div>';
        console.warn(err);
    }
}

async function saveFoodMacros(foodId) {
    const inputs = document.querySelectorAll('#foodMacrosForm input[id^="foodMacroAmount-"]');
    if (!inputs.length) {
        alert('No macros to save.');
        return;
    }

    const updates = Array.from(inputs).map(input => {
        const nutrientId = input.id.replace('foodMacroAmount-', '');
        const amount = parseFloat(input.value);
        return {
            nutrientId,
            amount: Number.isFinite(amount) ? amount : 0
        };
    });

    try {
        await Promise.all(updates.map(update => fetch(`${API_URL}/foods/${foodId}/nutrients/${update.nutrientId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({amount_per_100g: update.amount})
        }).then(async res => {
            if (!res.ok) {
                const body = await res.text().catch(() => res.statusText);
                throw new Error(body || `HTTP ${res.status}`);
            }
        })));

        showFoodDetailsModal(foodId);
    } catch (err) {
        alert('Unable to save macros: ' + (err.message || String(err)));
        console.warn(err);
    }
}

function openSearchMeal(mealId) {
    const select = document.getElementById('mealSelect');
    if (select) {
        select.value = mealId;
        loadMealDetails();
    } else {
        showMealDetailsModal(mealId);
    }
    const modal = document.getElementById('modalSearchDatabase');
    if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal)?.hide();
}

async function showMealDetailsModal(mealId) {
    const modal = document.getElementById('modalMealDetails');
    const content = document.getElementById('modalMealDetailsContent');
    if (!modal || !content) return;
    content.innerHTML = '<p>Loading meal details...</p>';
    if (typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modal).show();

    try {
        const response = await fetch(`${API_URL}/meals/${mealId}/items/detailed`);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const data = await response.json();

        let html = '<div class="d-flex justify-content-between align-items-start mb-3">';
        html += `<h5 class="mb-0">Meal: ${escapeHtml(data.meal_name || data.meal || 'Meal')}</h5>`;
        html += '</div>';

        if (!Array.isArray(data.items) || !data.items.length) {
            html += '<div class="alert alert-warning">No items found for this meal.</div>';
            content.innerHTML = html;
            return;
        }

        html += '<div class="list-group mb-3">';
        data.items.forEach(item => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start flex-column flex-md-row gap-3">
                        <div>
                            <strong>${escapeHtml(item.food_name)}</strong>${item.food_brand ? ` <em>(${escapeHtml(item.food_brand)})</em>` : ''}
                            <div class="text-muted small">${escapeHtml(String(item.grams))} g</div>
                            <div class="mt-2">
                                <span class="badge bg-info text-dark">Protein ${escapeHtml(String(item.protein))}g</span>
                                <span class="badge bg-warning text-dark">Carbs ${escapeHtml(String(item.carbs))}g</span>
                                <span class="badge bg-danger text-light">Fat ${escapeHtml(String(item.fat))}g</span>
                                <span class="badge bg-secondary text-light">Calories ${escapeHtml(String(item.calories))}</span>
                            </div>
                        </div>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editMealItem(${mealId}, ${item.id}, ${item.grams})">Edit Item</button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteMealItem(${mealId}, ${item.id})">Delete Item</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        if (data.totals) {
            html += '<div class="border p-3 rounded bg-light">';
            html += `<p><strong>Total Calories:</strong> ${escapeHtml(String(data.totals.calories))}</p>`;
            html += `<p><strong>Total Protein:</strong> ${escapeHtml(String(data.totals.protein))}g</p>`;
            html += `<p><strong>Total Carbs:</strong> ${escapeHtml(String(data.totals.carbs))}g</p>`;
            html += `<p><strong>Total Fat:</strong> ${escapeHtml(String(data.totals.fat))}g</p>`;
            if (data.totals.price !== undefined && data.totals.price !== null) {
                html += `<p><strong>Estimated Price:</strong> ${escapeHtml(String(data.totals.price))} DKK</p>`;
            }
            html += '</div>';
        }

        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = '<div class="alert alert-danger">Unable to load meal details.</div>';
        console.warn(err);
    }
}


async function editMealItem(mealId, itemId, currentGrams) {
    const gramsInput = prompt('Enter new grams amount', String(currentGrams));
    if (gramsInput === null) return;
    const grams = parseFloat(gramsInput);
    if (!Number.isFinite(grams) || grams <= 0) {
        alert('Enter a valid grams amount.');
        return;
    }
    const response = await fetch(`${API_URL}/meals/${mealId}/items/${itemId}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({grams})
    });
    if (response.ok) {
        showMealDetailsModal(mealId);
    } else {
        const error = await response.json().catch(() => ({}));
        alert('Unable to update meal item: ' + (error.detail || response.statusText));
    }
}

async function deleteMealItem(mealId, itemId) {
    if (!confirm('Delete this meal item?')) return;
    const response = await fetch(`${API_URL}/meals/${mealId}/items/${itemId}`, {
        method: 'DELETE'
    });
    if (response.ok) {
        showMealDetailsModal(mealId);
    } else {
        const error = await response.json().catch(() => ({}));
        alert('Unable to delete meal item: ' + (error.detail || response.statusText));
    }
}

function openCreateFoodModal() {
    showModalById('modalCreateFood');
}

function openCreateMealPrepModal() {
    showModalById('modalCreateMealPrep');
}

function openCreateDrinkModal() {
    showModalById('modalCreateDrink');
}

function openCreateDrinkListModal() {
    showModalById('modalCreateDrinkList');
}

function openAddMealItemModal() {
    const mealId = document.getElementById('mealSelect')?.value;
    if (!mealId) {
        alert('Select a meal prep first to add items.');
        return;
    }
    document.getElementById('mealItemSearchQuery').value = '';
    document.getElementById('mealItemSearchResults').innerHTML = '';
    document.getElementById('mealItemFoodName').value = '';
    document.getElementById('mealItemFoodId').value = '';
    document.getElementById('mealItemGrams').value = '';
    const modal = document.getElementById('modalAddMealItem');
    if (modal && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

function searchMealItemFoods() {
    const query = (document.getElementById('mealItemSearchQuery').value || '').trim().toLowerCase();
    const container = document.getElementById('mealItemSearchResults');
    const results = foods.filter(food => {
        const text = `${food.name} ${food.brand || ''}`.toLowerCase();
        return !query || text.includes(query);
    });
    if (!results.length) {
        container.innerHTML = '<div class="alert alert-warning">No foods found. You can create one first.</div>';
        return;
    }
    const list = document.createElement('div');
    list.className = 'list-group';
    results.forEach(food => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center gap-2';
        item.innerHTML = `<div><strong>${escapeHtml(food.name)}</strong>${food.brand ? ` <em>(${escapeHtml(food.brand)})</em>` : ''}${food.price !== undefined && food.price !== null ? ` - ${food.price} DKK` : ''}</div>`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = 'Select';
        btn.addEventListener('click', () => selectMealItemFood(food));
        item.appendChild(btn);
        list.appendChild(item);
    });
    container.innerHTML = '';
    container.appendChild(list);
}

function selectMealItemFood(food) {
    document.getElementById('mealItemFoodId').value = food.id;
    document.getElementById('mealItemFoodName').value = `${food.name}${food.brand ? ` (${food.brand})` : ''}`;
}

async function addMealItemToSelectedMeal() {
    const mealId = document.getElementById('mealSelect')?.value;
    const foodId = document.getElementById('mealItemFoodId').value;
    const grams = parseFloat(document.getElementById('mealItemGrams').value);
    if (!mealId || !foodId || !grams || grams <= 0) {
        alert('Select a food and enter a valid gram amount.');
        return;
    }
    const response = await fetch(`${API_URL}/meals/${mealId}/items`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({food_id: parseInt(foodId, 10), grams})
    });
    if (response.ok) {
        const modal = document.getElementById('modalAddMealItem');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal)?.hide();
        await loadMealDetails();
    } else {
        const error = await response.json().catch(() => ({}));
        alert('Unable to add item: ' + (error.detail || response.statusText));
    }
}

function createMealPrep() {
    return createMeal();
}


document.addEventListener('DOMContentLoaded', function() {
    // register sidebar handlers after initial app init
    try { registerSidebarHandlers(); } catch (e) { console.warn('sidebar handlers failed', e); }
});

async function saveNutrient(nutrientId) {
    const nameInput = document.getElementById(`nutrient-name-edit-${nutrientId}`);
    const unitInput = document.getElementById(`nutrient-unit-edit-${nutrientId}`);

    if (!nameInput || !unitInput) {
        return;
    }

    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/${nutrientId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            unit: unit
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadNutrients();
    } else {
        alert("Error updating nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteNutrient(nutrientId) {
    if (!confirm("Delete this nutrient?")) {
        return;
    }

    const response = await fetch(`${API_URL}/nutrients/${nutrientId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadNutrients();
    } else {
        alert("Error deleting nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

// Food functions
async function createFood() {
    const name = document.getElementById("foodName").value.trim();
    const brand = document.getElementById("foodBrand").value.trim();
    const priceRaw = document.getElementById("foodPrice").value;
    const price = priceRaw === undefined || priceRaw === null || priceRaw === '' ? null : parseFloat(priceRaw);

    if (!name) {
        alert("Please enter a food name");
        return;
    }

    if (foods.some(f => f.name.trim().toLowerCase() === name.toLowerCase() && (f.brand || "").trim().toLowerCase() === brand.toLowerCase())) {
        alert("This food already exists");
        return;
    }

    const response = await fetch(`${API_URL}/foods/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            brand: brand || null
            ,
            price: price
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        document.getElementById("foodName").value = "";
        document.getElementById("foodBrand").value = "";
        document.getElementById("foodPrice").value = "";
        await loadFoods();
    } else {
        alert("Error saving food: " + (result.detail || JSON.stringify(result)));
    }
}

async function loadFoods() {
    const foodList = document.getElementById("foodList");
    const foodSelect = document.getElementById("foodSelect");
    const mealFoodSelect = document.getElementById("mealFoodSelect");

    foodList.innerHTML = "<li>Loading foods...</li>";
    foodSelect.innerHTML = '<option value="">Select food</option>';
    mealFoodSelect.innerHTML = '<option value="">Select food</option>';

    const requestedUrl = `${API_URL}/foods/`;
    try {
        const response = await fetch(requestedUrl);
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            foodList.innerHTML = `<li class="status-error">Unable to load foods: HTTP ${response.status} ${escapeHtml(response.statusText)} - ${escapeHtml(errorText)}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
            return;
        }
        foods = await response.json();
    } catch (error) {
        foodList.innerHTML = `<li class="status-error">Unable to load foods: ${escapeHtml(error.message || String(error))}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
        return;
    }

    foodList.innerHTML = "";
    foodSelect.innerHTML = '<option value="">Select food</option>';
    mealFoodSelect.innerHTML = '<option value="">Select food</option>';

    foods.forEach(food => {
        const li = document.createElement("li");
        li.id = `food-row-${food.id}`;

        const textSpan = document.createElement("span");
        const priceText = (food.price !== undefined && food.price !== null) ? ` - ${food.price} DKK` : '';
        textSpan.textContent = `${food.name}${food.brand ? ` (${food.brand})` : ''}${priceText}`;
        li.appendChild(textSpan);

        if (editingFoods) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditFood(food.id, food.name, food.brand || "");
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteFood(food.id);
            });
            li.appendChild(deleteButton);
        }

        foodList.appendChild(li);

        const option1 = document.createElement("option");
        option1.value = food.id;
        option1.text = `${food.name}${food.brand ? ` (${food.brand})` : ''}${priceText}`;
        foodSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = food.id;
        option2.text = `${food.name}${food.brand ? ` (${food.brand})` : ''}${priceText}`;
        mealFoodSelect.appendChild(option2);
    });
}

function showEditFood(foodId, currentName, currentBrand) {
    const row = document.getElementById(`food-row-${foodId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `food-name-edit-${foodId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Food name";
    row.appendChild(nameInput);

    const brandInput = document.createElement("input");
    brandInput.type = "text";
    brandInput.id = `food-brand-edit-${foodId}`;
    brandInput.value = currentBrand;
    brandInput.placeholder = "Brand (optional)";
    row.appendChild(brandInput);

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.step = "0.01";
    priceInput.id = `food-price-edit-${foodId}`;
    priceInput.placeholder = "Price (e.g., 1.99)";
    // try to prefill if available in foods[]
    const foodObj = foods.find(f => String(f.id) === String(foodId) || f.id === foodId);
    if (foodObj && foodObj.price !== undefined && foodObj.price !== null) {
        priceInput.value = foodObj.price;
    }
    row.appendChild(priceInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveFood(foodId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadFoods();
    });
    row.appendChild(cancelButton);
}

async function saveFood(foodId) {
    const nameInput = document.getElementById(`food-name-edit-${foodId}`);
    const brandInput = document.getElementById(`food-brand-edit-${foodId}`);
    const priceInput = document.getElementById(`food-price-edit-${foodId}`);

    if (!nameInput) {
        return;
    }

    const name = nameInput.value.trim();
    const brand = brandInput ? brandInput.value.trim() : null;
    const priceRaw = priceInput ? priceInput.value : null;
    const price = priceRaw === undefined || priceRaw === null || priceRaw === '' ? null : parseFloat(priceRaw);
    if (!name) {
        alert("Please enter a food name");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            brand: brand || null,
            price: price
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadFoods();
    } else {
        alert("Error updating food: " + (result.detail || JSON.stringify(result)));
    }
}



// Food details functions
async function loadFoodDetails() {
    const foodId = document.getElementById("foodSelect").value;
    if (!foodId) {
        alert("Please select a food");
        return;
    }

    const [nutrientResponse, macroResponse] = await Promise.all([
        fetch(`${API_URL}/foods/${foodId}/nutrients`),
        fetch(`${API_URL}/foods/${foodId}/macros`)
    ]);

    const nutrientData = nutrientResponse.ok ? await nutrientResponse.json() : [];
    const macroData = macroResponse.ok ? await macroResponse.json() : null;

    const detailsDiv = document.getElementById("foodDetails");
    detailsDiv.innerHTML = "<h3>Food Nutrients</h3>";

    if (nutrientData.length === 0) {
        detailsDiv.innerHTML += "<p>No nutrients added yet.</p>";
    } else {
        const list = document.createElement("ul");

        nutrientData.forEach(entry => {
            const nutrient = nutrients.find(n => n.id === entry.nutrient_id);
            const name = nutrient ? nutrient.name : `Nutrient ${entry.nutrient_id}`;
            const unit = nutrient ? nutrient.unit : "";

            const li = document.createElement("li");
            li.id = `food-detail-nutrient-row-${entry.nutrient_id}`;

            const strong = document.createElement("strong");
            strong.textContent = `${name}: `;
            li.appendChild(strong);

            const span = document.createElement("span");
            span.id = `food-detail-nutrient-amt-${entry.nutrient_id}`;
            span.textContent = entry.amount_per_100g;
            li.appendChild(span);

            const unitText = document.createTextNode(` ${unit} `);
            li.appendChild(unitText);

            if (editingFoodDetails) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "green-button";
                editButton.textContent = "Edit";
                editButton.addEventListener("click", () => {
                    showEditNutrientAmount(foodId, entry.nutrient_id, entry.amount_per_100g, name);
                });
                li.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "red-button";
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener("click", () => {
                    deleteFoodNutrient(foodId, entry.nutrient_id);
                });
                li.appendChild(deleteButton);
            }

            list.appendChild(li);
        });

        detailsDiv.appendChild(list);
    }

    if (macroResponse.ok && macroData && macroData.macros) {
        const macroBlock = document.createElement("div");
        macroBlock.innerHTML = `
            <h4>Macro summary</h4>
            <p>Protein: ${macroData.macros.protein}g</p>
            <p>Carbs: ${macroData.macros.carbs}g</p>
            <p>Fat: ${macroData.macros.fat}g</p>
            <p>Calories: ${macroData.macros.calories} kcal</p>
        `;
        detailsDiv.appendChild(macroBlock);
    }
}

function showEditNutrientAmount(foodId, nutrientId, currentAmount, nutrientName) {
    const row = document.getElementById(`food-detail-nutrient-row-${nutrientId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const strong = document.createElement("strong");
    strong.textContent = `${nutrientName}: `;
    row.appendChild(strong);

    const input = document.createElement("input");
    input.id = `editAmount-${nutrientId}`;
    input.type = "number";
    input.step = "0.1";
    input.value = currentAmount;
    row.appendChild(input);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveNutrientAmount(foodId, nutrientId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadFoodDetails();
    });
    row.appendChild(cancelButton);
}

async function saveNutrientAmount(foodId, nutrientId) {
    const input = document.getElementById(`editAmount-${nutrientId}`);
    if (!input) {
        return;
    }

    const amount = parseFloat(input.value);
    if (Number.isNaN(amount)) {
        alert("Please enter a valid amount");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients/${nutrientId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount_per_100g: amount
        })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        loadFoodDetails();
    } else {
        alert("Error updating nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function deleteFoodNutrient(foodId, nutrientId) {
    if (!confirm("Delete this nutrient entry?")) {
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients/${nutrientId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
        loadFoodDetails();
    } else {
        alert("Error deleting nutrient: " + (result.detail || JSON.stringify(result)));
    }
}

async function addNutrientToFood() {
    const foodId = document.getElementById("foodSelect").value;
    const nutrientId = document.getElementById("nutrientSelect").value;
    const amount = document.getElementById("amountPer100g").value;

    if (!foodId || !nutrientId || !amount) {
        alert("Please fill all fields");
        return;
    }

    const response = await fetch(`${API_URL}/foods/${foodId}/nutrients`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nutrient_id: parseInt(nutrientId),
            amount_per_100g: parseFloat(amount)
        })
    });

    if (response.ok) {
        document.getElementById("amountPer100g").value = "";
        loadFoodDetails();
    } else {
        const error = await response.json();
        alert("Error: " + error.detail);
    }
}

// Meal functions
async function createMeal() {
    const name = document.getElementById("mealName").value;

    if (!name) {
        alert("Please enter a meal name");
        return;
    }

    if (meals.some(m => m.name.trim().toLowerCase() === name.toLowerCase())) {
        alert("This meal already exists");
        return;
    }

    const response = await fetch(`${API_URL}/meals/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    });

    if (response.ok) {
        document.getElementById("mealName").value = "";
        loadMeals();
    }
}

async function loadMeals() {
    const mealList = document.getElementById("mealList");
    const mealSelect = document.getElementById("mealSelect");

    mealList.innerHTML = "<li>Loading meals...</li>";
    mealSelect.innerHTML = '<option value="">Select meal</option>';

    const requestedUrl = `${API_URL}/meals/`;
    try {
        const response = await fetch(requestedUrl);
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            mealList.innerHTML = `<li class="status-error">Unable to load meals: HTTP ${response.status} ${escapeHtml(response.statusText)} - ${escapeHtml(errorText)}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
            return;
        }
        meals = await response.json();
    } catch (error) {
        mealList.innerHTML = `<li class="status-error">Unable to load meals: ${escapeHtml(error.message || String(error))}<br><strong>URL:</strong> ${escapeHtml(requestedUrl)}</li>`;
        return;
    }

    mealList.innerHTML = "";
    mealSelect.innerHTML = '<option value="">Select meal</option>';

    meals.forEach(meal => {
        const li = document.createElement("li");
        li.id = `meal-row-${meal.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = meal.name;
        li.appendChild(textSpan);

        if (editingMeals) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                showEditMeal(meal.id, meal.name);
            });
            li.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteMeal(meal.id);
            });
            li.appendChild(deleteButton);
        }

        mealList.appendChild(li);

        const option = document.createElement("option");
        option.value = meal.id;
        option.text = meal.name;
        mealSelect.appendChild(option);
    });
}

function showEditMeal(mealId, currentName) {
    const row = document.getElementById(`meal-row-${mealId}`);
    if (!row) {
        return;
    }

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `meal-name-edit-${mealId}`;
    nameInput.value = currentName;
    nameInput.placeholder = "Meal name";
    row.appendChild(nameInput);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "green-button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        saveMeal(mealId);
    });
    row.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        loadMeals();
    });
    row.appendChild(cancelButton);
}

async function saveMeal(mealId) {
    const nameInput = document.getElementById(`meal-name-edit-${mealId}`);
    if (!nameInput) {
        return;
    }

    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a meal name");
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        loadMeals();
    } else {
        alert("Error updating meal: " + (result.detail || JSON.stringify(result)));
    }
}


// Barcode scanning functions
function scanBarcode() {
    const scannerDiv = document.getElementById("barcode-scanner");
    scannerDiv.style.display = "block";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.log(err);
            alert("Error initializing camera: " + err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        stopScanning();
        fetchFoodFromAPI(code);
    });
}

function stopScanning() {
    Quagga.stop();
    const scannerDiv = document.getElementById("barcode-scanner");
    scannerDiv.style.display = "none";
}

// Fetch food data from Open Food Facts API
async function fetchFoodFromAPI(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = data.product;
            const name = product.product_name || "Unknown Product";
            const brand = product.brands || "";
            const productNutrients = product.nutriments || {};

            // Populate the form
            document.getElementById("foodName").value = name;
            document.getElementById("foodBrand").value = brand;

            // Create the food
            await createFood();

            // Get the newly created food ID (assuming it's the last one)
            await loadFoods();
            const newFood = foods[foods.length - 1];
            if (newFood) {
                // Add nutrients
                const nutrientMap = {
                    "energy-kcal_100g": { name: "Energy", unit: "kcal" },
                    "proteins_100g": { name: "Protein", unit: "g" },
                    "carbohydrates_100g": { name: "Carbohydrates", unit: "g" },
                    "fat_100g": { name: "Fat", unit: "g" },
                    "fiber_100g": { name: "Fiber", unit: "g" },
                    "sugars_100g": { name: "Sugars", unit: "g" },
                    "sodium_100g": { name: "Sodium", unit: "mg" },
                };

                for (const [key, value] of Object.entries(productNutrients)) {
                    if (nutrientMap[key] && value) {
                        let nutrient = nutrients.find(n => n.name.toLowerCase() === nutrientMap[key].name.toLowerCase() && n.unit.toLowerCase() === nutrientMap[key].unit.toLowerCase());
                        if (!nutrient) {
                            const createResponse = await fetch(`${API_URL}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: nutrientMap[key].name, unit: nutrientMap[key].unit })
                            });
                            if (createResponse.ok) {
                                const newNutrient = await createResponse.json();
                                nutrients.push(newNutrient);
                                nutrient = newNutrient;
                                loadNutrients();
                            }
                        }
                        if (nutrient) {
                            await fetch(`${API_URL}/foods/${newFood.id}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ nutrient_id: nutrient.id, amount_per_100g: value })
                            });
                        }
                    }
                }
                const foodSelect = document.getElementById("foodSelect");
                if (foodSelect.value == newFood.id) {
                    loadFoodDetails();
                }
            }
        } else {
            alert("Product not found in database");
        }
    } catch (error) {
        console.error("Error fetching food data:", error);
        alert("Error fetching food data");
    }
}

// Meal details functions (uses the new detailed items endpoint)
async function loadMealDetails() {
    const mealId = document.getElementById("mealSelect").value;
    if (!mealId) {
        alert("Please select a meal");
        return;
    }

    const requestedUrl = `${API_URL.replace(/\/*$/,'')}/meals/${mealId}/items/detailed`;
    let response;
    try {
        response = await fetch(requestedUrl);
    } catch (err) {
        alert('Unable to reach backend: ' + err.message);
        return;
    }

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        alert(`Error loading meal details: HTTP ${response.status} - ${text}`);
        return;
    }

    const data = await response.json();
    const detailsDiv = document.getElementById("mealDetails");
    detailsDiv.innerHTML = "";

    const title = document.createElement('h3');
    title.textContent = `${data.meal || 'Meal'} - Items`;
    detailsDiv.appendChild(title);

    const items = data.items || [];
    const totals = data.totals || {};

    if (items.length === 0) {
        detailsDiv.innerHTML += '<p>No items in this meal yet.</p>';
    } else {
        const list = document.createElement('ul');
        list.id = 'meal-items-list';

        items.forEach(item => {
            const li = document.createElement('li');
            li.id = `meal-item-${item.id}`;

            const name = document.createElement('strong');
            const brandText = item.food_brand ? ` (${item.food_brand})` : '';
            name.textContent = `${item.food_name || 'Food'}${brandText}`;
            li.appendChild(name);

            const info = document.createElement('div');
            info.className = 'meal-item-info';
            const priceText = (item.food_price !== undefined && item.food_price !== null) ? ` | price/100g: ${item.food_price} DKK` : '';
            info.innerHTML = ` grams: ${item.grams}g${priceText} - protein: ${item.protein}g, carbs: ${item.carbs}g, fat: ${item.fat}g, calories: ${item.calories} kcal`;
            li.appendChild(info);

            if (editingMealItems) {
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'green-button';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => showEditMealItem(mealId, item));
                li.appendChild(editBtn);

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'red-button';
                delBtn.textContent = 'Delete';
                delBtn.addEventListener('click', () => deleteMealItem(mealId, item.id));
                li.appendChild(delBtn);
            }

            list.appendChild(li);
        });

        detailsDiv.appendChild(list);
    }

    // Totals and macro percentages for the meal
    const totalsBlock = document.createElement('div');
    totalsBlock.className = 'meal-totals';
    const totalCalories = totals.calories || 0;
    const protKcal = (totals.protein || 0) * 4;
    const carbKcal = (totals.carbs || 0) * 4;
    const fatKcal = (totals.fat || 0) * 9;

    const protPct = totalCalories ? Math.round((protKcal / totalCalories) * 1000) / 10 : 0;
    const carbPct = totalCalories ? Math.round((carbKcal / totalCalories) * 1000) / 10 : 0;
    const fatPct = totalCalories ? Math.round((fatKcal / totalCalories) * 1000) / 10 : 0;

    totalsBlock.innerHTML = `
        <h4>Totals</h4>
        <p>Protein: ${totals.protein || 0} g (${protPct}%)</p>
        <p>Carbs: ${totals.carbs || 0} g (${carbPct}%)</p>
        <p>Fat: ${totals.fat || 0} g (${fatPct}%)</p>
        <p>Calories: ${totalCalories} kcal</p>
        ${totals.price !== undefined && totals.price !== null ? `<p>Total price: ${totals.price} DKK</p>` : ''}
    `;

    detailsDiv.appendChild(totalsBlock);
}

function showEditMealItem(mealId, item) {
    const row = document.getElementById(`meal-item-${item.id}`);
    if (!row) return;
    row.innerHTML = '';

    const title = document.createElement('strong');
    title.textContent = `${item.food_name || 'Food'}`;
    row.appendChild(title);

    const gramsInput = document.createElement('input');
    gramsInput.type = 'number';
    gramsInput.step = '1';
    gramsInput.value = item.grams;
    gramsInput.id = `edit-mealitem-grams-${item.id}`;
    row.appendChild(gramsInput);

    const foodSelect = document.createElement('select');
    foodSelect.id = `edit-mealitem-food-${item.id}`;
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.text = 'Swap food (optional)';
    foodSelect.appendChild(emptyOpt);
    foods.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.text = `${f.name}${f.brand ? ` (${f.brand})` : ''}${(f.price !== undefined && f.price !== null) ? ` - ${f.price} DKK` : ''}`;
        if (String(f.id) === String(item.food_id)) opt.selected = true;
        foodSelect.appendChild(opt);
    });
    row.appendChild(foodSelect);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'green-button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => saveMealItem(mealId, item.id));
    row.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => loadMealDetails());
    row.appendChild(cancelBtn);
}

async function saveMealItem(mealId, itemId) {
    const gramsEl = document.getElementById(`edit-mealitem-grams-${itemId}`);
    const foodEl = document.getElementById(`edit-mealitem-food-${itemId}`);
    if (!gramsEl) return;
    const grams = parseFloat(gramsEl.value);
    const foodId = foodEl && foodEl.value ? parseInt(foodEl.value) : undefined;
    if (Number.isNaN(grams)) { alert('Please enter a valid grams value'); return; }

    const payload = {};
    payload.grams = grams;
    if (foodId) payload.food_id = foodId;

    const response = await fetch(`${API_URL}/meals/${mealId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        await loadMealDetails();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Error updating item: ' + (err.detail || JSON.stringify(err)));
    }
}

async function deleteMealItem(mealId, itemId) {
    if (!confirm('Delete this item from meal?')) return;
    const response = await fetch(`${API_URL}/meals/${mealId}/items/${itemId}`, { method: 'DELETE' });
    if (response.ok) {
        await loadMealDetails();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Error deleting item: ' + (err.detail || JSON.stringify(err)));
    }
}

async function addFoodToMeal() {
    const mealId = document.getElementById("mealSelect").value;
    const foodId = document.getElementById("mealFoodSelect").value;
    const grams = document.getElementById("foodGrams").value;

    if (!mealId || !foodId || !grams) {
        alert("Please fill all fields");
        return;
    }

    const response = await fetch(`${API_URL}/meals/${mealId}/items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            items: [{
                food_id: parseInt(foodId),
                grams: parseFloat(grams)
            }]
        })
    });

    if (response.ok) {
        document.getElementById("foodGrams").value = "";
        loadMealDetails();
    } else {
        const error = await response.json();
        alert("Error: " + error.detail);
    }
}

// Test fetch: show raw response, headers and timing for debugging
async function testFetch() {
    const outEl = document.getElementById('testFetchOutput');
    outEl.innerHTML = 'Testing...';
    const url = `${API_URL.replace(/\/*$/,'')}/status/`;
    const start = performance.now();
    let resp, text;
    try {
        resp = await fetch(url, {cache: 'no-store'});
        const duration = Math.round(performance.now() - start);
        try {
            text = await resp.text();
        } catch (e) {
            text = '(unable to read body)';
        }

        // Build headers object
        const headers = {};
        resp.headers.forEach((v, k) => headers[k] = v);

        const pretty = {
            url: url,
            status: resp.status,
            ok: resp.ok,
            duration_ms: duration,
            headers: headers,
            body_snippet: text.slice(0, 10000)
        };

        outEl.innerHTML = `<pre>${escapeHtml(JSON.stringify(pretty, null, 2))}</pre>`;
    } catch (err) {
        const duration = Math.round(performance.now() - start);
        outEl.innerHTML = `<pre class="status-error">Fetch failed after ${duration}ms:\n${escapeHtml(String(err))}\n${escapeHtml(err.stack || '')}</pre>`;
    }
}

// --- Profile, Settings, Today's Intake and Drink Prep UI ---
function renderProfileOutput() {
    const out = document.getElementById('appOutputSection');
    out.innerHTML = `
        <h2>Profile</h2>
        <div class="card mb-3"><div class="card-body">
            <p>Account placeholder output. (Click account in the sidebar for this view)</p>
            <p class="text-muted">(W.I.P.)</p>
        </div></div>
    `;
}

function renderSettingsOutput() {
    const out = document.getElementById('appOutputSection');
    const dark = localStorage.getItem('app_dark_mode') === '1';
    out.innerHTML = `
        <h2>Settings</h2>
        <div class="card mb-3"><div class="card-body">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="darkModeToggle" ${dark ? 'checked' : ''}>
                <label class="form-check-label" for="darkModeToggle">Dark mode</label>
            </div>
            <p class="text-muted mt-2">Settings are work-in-progress. Changes stored locally.</p>
        </div></div>
    `;

    const toggle = document.getElementById('darkModeToggle');
    toggle.addEventListener('change', (e) => {
        const on = e.target.checked;
        if (on) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('app_dark_mode', '1');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.removeItem('app_dark_mode');
        }
    });
}

function applyStoredTheme() {
    if (localStorage.getItem('app_dark_mode') === '1') {
        document.body.classList.add('dark-mode');
    }
}

// Today's Intake: simple client-side intake that accepts macronutrient inputs per entry
function renderTodaysIntake(serverData = null) {
    applyStoredTheme();

    const out = document.getElementById('todays-intake-container');
    if (!out) return;

    out.innerHTML = `
        <hr>
            <div class="chart-wrapper">
                <canvas id="intakeChart"></canvas>
            </div>

        <h5 class="mt-3">Manual Intake input</h5>

        <div class="card mb-3">
            <div class="card-body">

                <div id="intake-controls" class="mb-3">
                    <button class="btn btn-primary" id="addIntakeRow">
                        Add Entry
                    </button>
                </div>

                <div id="intake-rows"></div>

                <p class="text-muted mt-2"><strong><i>(W.I.P.)</i></strong> This is a simple manual intake tracker for now (will be <i>deleted</i> at some point). <strong>Planned:</strong> save history, load history, and eventually a weekly / monthly graph report.</p>

            </div>
        </div>
    `;

    const rows = document.getElementById('intake-rows');
    const chartCanvas = document.getElementById('intakeChart');

    let intakeChart = null;

    // initial chart values (from backend OR empty)
    const base = serverData || { protein: 0, carbs: 0, fat: 0 };
    const initialData = serverData
        ? [
            (serverData.protein || 0) * 4,
            (serverData.carbs || 0) * 4,
            (serverData.fat || 0) * 9
        ]
        : [0, 0, 0];

    function recalcAndRender() {
        const entries = Array.from(rows.querySelectorAll('.intake-row'));

        let protein = 0, carbs = 0, fat = 0;

        entries.forEach(r => {
            const p = parseFloat(r.querySelector('.iprot')?.value) || 0;
            const c = parseFloat(r.querySelector('.icarb')?.value) || 0;
            const f = parseFloat(r.querySelector('.ifat')?.value) || 0;

            protein += p;
            carbs += c;
            fat += f;
        });

        // 🔥 COMBINE base (API) + manual input
        const totalData = [
            (base.protein + protein) * 4,
            (base.carbs + carbs) * 4,
            (base.fat + fat) * 9
        ];

        const data = [protein * 4, carbs * 4, fat * 9];

        // update chart if exists
        if (intakeChart) {
            intakeChart.data.datasets[0].data = totalData;
            intakeChart.update();
        }
    }

    // CREATE CHART (once)
    requestAnimationFrame(() => {
        if (!window.Chart || !chartCanvas) return;

        const ctx = chartCanvas.getContext('2d');
        if (!ctx) return;
        
        // Debugging
        console.log("CANVAS:", chartCanvas);
        console.log("CTX:", chartCanvas?.getContext?.("2d"));
        console.log("DATA LABELS:", labels);
        console.log("DATA VALUES:", data);

        intakeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: initialData,
                    backgroundColor: ['#4e73df', '#1cc88a', '#f6c23e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw || 0;
                                const dataset = context.dataset.data;

                                const total = dataset.reduce((a, b) => a + b, 0) || 1;
                                const pct = ((value / total) * 100).toFixed(1);

                                const macros = ['Protein', 'Carbs', 'Fat'];

                                return `${macros[context.dataIndex]}: ${value.toFixed(0)} kcal (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    });

    // ADD ROW
    document.getElementById('addIntakeRow').addEventListener('click', () => {
        const row = document.createElement('div');

        row.className = 'intake-row d-flex flex-wrap gap-2 align-items-center mb-2';

        row.innerHTML = `
            <input class="form-control iprot flex-grow-1" placeholder="Protein (g)">
            <input class="form-control icarb flex-grow-1" placeholder="Carbs (g)">
            <input class="form-control ifat flex-grow-1" placeholder="Fat (g)">
            <button class="btn btn-danger btn-sm remove-row">
                Remove
            </button>
        `;

        rows.appendChild(row);

        row.querySelectorAll('input')
            .forEach(i => i.addEventListener('input', recalcAndRender));

        row.querySelector('.remove-row')
            .addEventListener('click', () => {
                row.remove();
                recalcAndRender();
            });

        recalcAndRender();
    });

    // initial row
    document.getElementById('addIntakeRow').click();
}

// Drink prep UI: client-side create and aggregate ingredients using loaded `foods` list
function renderDrinkPrepOutput() {
    applyStoredTheme();
    const out = document.getElementById('appOutputSection');
    out.innerHTML = `
        <h2>Drink Prep</h2>
        <div class="card mb-3"><div class="card-body">
            <div class="mb-2 d-flex gap-2 align-items-center">
                <input id="drinkName" class="form-control" placeholder="Drink name" style="max-width:240px">
                <button id="addIngredientBtn" class="btn btn-outline-primary">Add Ingredient</button>
                <input id="drinkQuantity" type="number" class="form-control" placeholder="Quantity" style="max-width:120px">
            </div>
            <div id="drinkIngredients"></div>
            <div class="mt-3"><button id="calcDrinkBtn" class="btn btn-success">Calculate Required Ingredients</button></div>
            <div id="drinkPrepResults" class="mt-3"></div>
            <p class="text-muted mt-2">(W.I.P.) Garnish support planned.</p>
        </div></div>
    `;

    const ingredientsEl = document.getElementById('drinkIngredients');

    function addIngredientRow(prefill) {
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 align-items-center mb-2';
        const select = document.createElement('select');
        select.className = 'form-select ing-food';
        select.style.maxWidth = '240px';
        const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.text='Select food ingredient'; select.appendChild(emptyOpt);
        foods.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.text = `${f.name} ${f.brand?('('+f.brand+')'):''}`; select.appendChild(o); });
        const amount = document.createElement('input'); amount.type='number'; amount.className='form-control ing-amt'; amount.placeholder='Amount per drink'; amount.style.maxWidth='180px';
        const unit = document.createElement('input'); unit.className='form-control ing-unit'; unit.placeholder='unit (ml/g)'; unit.style.maxWidth='100px';
        const rem = document.createElement('button'); rem.className='btn btn-danger btn-sm'; rem.textContent='Remove';
        row.appendChild(select); row.appendChild(amount); row.appendChild(unit); row.appendChild(rem);
        ingredientsEl.appendChild(row);
        rem.addEventListener('click', () => { row.remove(); });
        if (prefill) { select.value = prefill.food_id; amount.value = prefill.amount; unit.value = prefill.unit; }
    }

    document.getElementById('addIngredientBtn').addEventListener('click', () => addIngredientRow());

    document.getElementById('calcDrinkBtn').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('drinkQuantity').value) || 1;
        const rows = Array.from(ingredientsEl.querySelectorAll(':scope > div'));
        const agg = {};
        let totalPrice = 0;
        rows.forEach(r => {
            const foodId = parseInt(r.querySelector('.ing-food').value);
            const amtPer = parseFloat(r.querySelector('.ing-amt').value) || 0;
            const unitVal = r.querySelector('.ing-unit').value || 'ml';
            if (!foodId || !amtPer) return;
            if (!agg[foodId]) agg[foodId] = { amount: 0, unit: unitVal };
            agg[foodId].amount += amtPer * qty;
        });

        const results = Object.entries(agg).map(([fid, info]) => {
            const food = foods.find(f => f.id == fid);
            let price = null;
            if (food && food.price) {
                if (food.base_amount && food.base_unit && info.unit === food.base_unit) {
                    price = (food.price * (info.amount / food.base_amount));
                } else if (food.base_amount && food.base_unit && info.unit === 'g' && food.base_unit === 'g') {
                    price = (food.price * (info.amount / food.base_amount));
                } else {
                    // fallback treat as per 100g
                    price = (food.price * (info.amount / 100));
                }
                totalPrice += price;
            }
            return { food: food ? food.name : `id:${fid}`, required: info.amount, unit: info.unit, price: price };
        });

        const outDiv = document.getElementById('drinkPrepResults');
        outDiv.innerHTML = `<h5>Ingredients required for ${qty} drink(s)</h5>` +
            '<ul>' + results.map(r => `<li>${escapeHtml(r.food)} — ${r.required}${r.unit}${r.price?(' — ' + r.price.toFixed(2) + ' DKK'):''}</li>`).join('') + '</ul>' +
            `<div><strong>Total price:</strong> ${totalPrice>0?totalPrice.toFixed(2)+' DKK':'N/A'}</div>`;
    });

    // add an initial ingredient row
    addIngredientRow();
}
