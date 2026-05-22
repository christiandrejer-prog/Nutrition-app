import { getApiUrl, initConfig } from './config.js';
import { initUIEvents } from "./ui/events.js";
import { initModals } from './modules/modals.js';
//import { loadInitialData } from './modules/bootstrap.js'; WILL COME IN THE FUTURE (IS RIGHT NOW IN THIS FILE)
//import { applyStoredTheme } from './theme.js';    WILL COME IN THE FUTURE
import { escapeHtml } from './utils.js'; // Placeholder will be deleted

async function initApp() {
    try {
        await initConfig();
        initModals();
        initUIEvents();

        await loadInitialData();

        console.info("App initialized");
    } catch (err) {
        console.error("Failed to initialize app:", err);
    }
}

initApp();

document.addEventListener('DOMContentLoaded', () => {
    initApp().catch(err => console.error('Failed to initialize app:', err));
});


document.addEventListener('DOMContentLoaded', function() {
    // register sidebar handlers after initial app init
    try { initUIEvents(); } catch (e) { console.warn('sidebar handlers failed', e); }
});



// Initialize the app
async function initAppa() {
    loadStoredApiUrl();
    await loadRuntimeConfig();
    updateApiUrlInput();
    renderHomeOutput()
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





// bootstrap

import { loadNutrients } from "./modules/nutrients.js";
import { loadFoods } from "./modules/foods.js";
import { loadDrinks } from "./modules/drinks.js";
import { loadMeals } from "./modules/meals.js";

async function loadInitialData() {
    try {
        await loadNutrients();
        await loadFoods();
        await loadMeals();
        await loadDrinks();

        console.info("Initial data loaded");
    } catch (err) {
        console.error("Failed loading initial data:", err);
        throw err;
    }
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





async function loadStatus() {
    const statusInfo = document.getElementById("statusInfo");
    if (!statusInfo) {
        return;
    }
    statusInfo.innerHTML = "<p>Checking backend and database status...</p>";

    try {
        let apiUrlObj;
        try {
            apiUrlObj = new URL(getApiUrl());
        } catch (e) {
            apiUrlObj = new URL(getApiUrl(), window.location.href);
        }

        const pageProtocol = window.location.protocol;
        const apiProtocol = apiUrlObj.protocol;

        if (pageProtocol === 'https:' && apiProtocol === 'http:') {
            statusInfo.innerHTML = `
                <div class="status-card">
                    <h3>Protocol warning</h3>
                    <div class="status-error">The page is served over HTTPS but the API is configured as HTTP (${escapeHtml(getApiUrl())}). Browser may block this request (mixed content).<br>Please run the backend with HTTPS or change the getApiUrl() to an HTTPS host, or open the frontend over HTTP for local testing.</div>
                </div>
            `;
        }

        const requestedUrl = `${getApiUrl().replace(/\/*$/,'')}/status/`;
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
                <div class="status-row"><strong>Backend URL</strong>: ${escapeHtml(getApiUrl())}</div>
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


async function submitAddNutrient() {
    const name = document.getElementById('modalNutrientName').value.trim();
    const unit = document.getElementById('modalNutrientUnit').value.trim();
    if (!name || !unit) { alert('Enter name and unit'); return; }
    const response = await fetch(`${getApiUrl()}/nutrients/`, {
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
    const response = await fetch(`${getApiUrl()}/drinks/`, {
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
    const response = await fetch(`${getApiUrl()}/drink-lists/`, {
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
    const response = await fetch(`${getApiUrl()}/foods/`, {
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
    const response = await fetch(`${getApiUrl()}/meals/`, {
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

export function showModalById(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl || typeof bootstrap === 'undefined') return;
    const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
    instance.show();
}

function updateCount() {
    const input = document.getElementById("feedbackInput");
    const count = document.getElementById("count");
    count.innerText = `${input.value.length} / 200`;
}

export function renderHomeOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Home</h3>
                <div class="card mb-3">
                    <div class="card-body">
                        <p>Welcome to the Nutrition App!</p>
                        <p>Use the sidebar to navigate through different sections of the app.</p>
                    </div>
                </div>
            </div>


            <p>This area is still a work in progress. Just as the rest of the app.</p>
            <p>Soon to work on:
                <ul>
                    <li> - Make add/remove consumed meals possible throgh prompts <strong><i>(Done)</i></strong></li>
                    <li> - Quick add/remove consumed meals</li>
                    <li> - Quick add/remove drinks to list</li>
                    <li> - Implement View buttons in all search modals</li>
                    <li> - Create the add ingredients to drink modal <strong><i>(W.I.P)</i></strong></li>
                    <li> - Create the add food to meal modal <strong><i>(W.I.P)</i></strong></li>
                    <li> - Update the modal for food details <strong><i>(W.I.P)</i></strong></li>
                    <li> - Create the edit button when viewing a food/meal/drink/drink-list details</li>
                    <li> - Implement the edit button for each search view</li>
                    <li> - Update database to have more data</li>
                    <li> - Fix 'todays intake' in regards to the manual meal entry</li>
                    <li> - Make a new sidebar section for maintenance calculations</li>
                    <li> - Make settings options / buttons and also a way to save the state</li>
                </ul>
            </p>
        </div>
        <div class="card mb-3">
            <textarea class="form-control"
                    id="feedbackInput"
                    maxlength="200"
                    rows="3"
                    placeholder="Have feedback or want to contribute? Type it here and press Enter..."
                    onfocus="this.placeholder='Type your feedback and press Enter...';"
                    onblur="this.placeholder='Have feedback or want to contribute?';"
                    onkeydown="if(event.key === 'Enter') submitFeedback();"
                    oninput="updateCount()">
            </textarea>

            <small id="count">0 / 200</small>
        </div>
    `;

    output.scrollIntoView({behavior: 'smooth'});
}



export async function renderMealDashboardOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Meal Dashboard</h3>
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
                            <button class="btn btn-primary btn-sm mb-3" type="button" data-action="add-consumed-meal-UI">Add consumed meal</button>
                            <button class="btn btn-danger btn-sm mb-3" type="button" data-action="toggle-consumed-meal-delete-mode">Remove consumed meal</button>
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
        const response = await fetch(`${getApiUrl()}/intake/`);
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

                    const response = await fetch(`${getApiUrl()}/intake/${entry.id}`, {
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
        const response = await fetch(`${getApiUrl()}/intake/summary`);
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


export async function addConsumedMealUI() {
    prompt_asw_MEAL_ID = prompt('Add consumed meal functionality is not implemented yet. This would allow you to add a meal from the database to today\'s intake, specifying quantity and optionally customizing ingredients.', 'OK');
    //openSearchDatabaseModal('meals');
    console.log('Add consumed meal placeholder response:', prompt_asw_MEAL_ID);

    if (!prompt_asw_MEAL_ID) return;
    await addConsumedMeal(prompt_asw_MEAL_ID);
    await loadDashboardConsumedMeals(prompt_asw_MEAL_ID);
    await loadDashboardIntakeSummary(prompt_asw_MEAL_ID);
    
    return prompt_asw_MEAL_ID;
}
var prompt_asw_MEAL_ID = addConsumedMealUI()


async function addConsumedMeal(mealId) {
    // Placeholder function for adding a consumed meal. In a full implementation, this would take the meal ID, quantity, and any customizations, then send a POST request to the backend to add it to today's intake.

    const response = await fetch(
        `${getApiUrl()}/intake/`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meal_id: mealId
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        alert(`Failed to add consumed meal: HTTP ${response.status} ${response.statusText} - ${errorText}`);
        return;
    }

    await loadDashboardConsumedMeals();
    await loadDashboardIntakeSummary();
}

function toggleConsumedMealDeleteMode() {

    consumedMealsDeleteMode = !consumedMealsDeleteMode;

    const btn = document.querySelector('[data-action="toggle-consumed-meal-delete-mode"]');

    if (btn) {
        btn.textContent = consumedMealsDeleteMode
            ? 'Exit delete mode'
            : 'Remove a consumed meal';
    }

    loadDashboardConsumedMeals();
}


export async function renderStatusOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="card mb-4 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h3 class="h5 mb-1">System Status</h3>
                    <p class="text-muted mb-0">Checks backend and database availability.</p>
                </div>
                <input type="text" id="apiUrlInput" class="form-control form-control-sm w-auto" placeholder="API URL" value="${escapeHtml(getApiUrl())}" style="max-width: 300px;" oninput="setApiUrlFromInput()">
                <button class="btn btn-sm btn-outline-primary" type="button" data-action="status">Refresh</button>
            </div>
            <div class="card-body" id="statusInfo">
                <p>Loading backend status...</p>
            </div>
        </div>
    `;
    await loadStatus();
    output.scrollIntoView({behavior: 'smooth'});
}


export async function renderDrinkDashboardOutput() {
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
                                <button class="btn btn-primary btn-sm mb-3" type="button" data-action="select-drink-list-UI">Select drink list</button><br>
                                <button class="btn btn-primary btn-sm mb-3" type="button" data-action="add-drink-list-item-UI">Add drink to list</button>
                                <button class="btn btn-danger btn-sm mb-3" type="button" id="toggle-remove-drink-btn" data-action="toggle-drink-list-delete-mode">Remove drink from list</button>
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
import { loadDashboardDrinkChart, addDrinkListItem } from "./modules/drinks.js";
// Uses placeholder prompt for now, but ideally this would be a sidebar or modal interface allowing you to select a drink from the database, specify quantity and optionally customize ingredients, then add it to the currently selected drink list in the dashboard, and finally reload the list and visualization to reflect changes.
export async function addDrinkListItemUI() {
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
var prompt_asw_DRINK_ID = addDrinkListItemUI()
// Uses placeholder prompt for now, but ideally this would be a sidebar or modal interface allowing you to select from existing drink lists in the database, and then load the selected list into the dashboard for visualization and management.
export async function selectDrinkListUI() {
    prompt_asw_LIST_ID = prompt('Select drink list functionality is not implemented yet. This would allow you to choose from existing drink lists in the database and load them into the dashboard for visualization and management.', 'OK');
    //openSearchDatabaseModal('drink lists');
    console.log('Select drink list UI placeholder:', prompt_asw_LIST_ID);
    
    if (!prompt_asw_LIST_ID) return;
    await loadDashboardDrinkListsItems(prompt_asw_LIST_ID);
    await loadDashboardDrinkChart(prompt_asw_LIST_ID);
    
    return prompt_asw_LIST_ID;
}
var prompt_asw_LIST_ID = addDrinkListItemUI()

async function loadDashboardDrinkListsItems(listId) {

    const container =
        document.getElementById('dashboardDrinkList');

    if (!container) return;

    container.innerHTML =
        '<div class="text-muted">Loading drink lists...</div>';

    try {

        const response =
            await fetch(`${getApiUrl()}/drinks/lists`);

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
            await fetch(`${getApiUrl()}/drinks/lists/${listId}`);

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

import { loadDrinkLists } from "./modules/drinks.js";
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





function createMealPrep() {
    return createMeal();
}







// Meal functions


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

    const response = await fetch(`${getApiUrl()}/meals/${mealId}`, {
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
                            const createResponse = await fetch(`${getApiUrl()}/nutrients/`, {
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
                            await fetch(`${getApiUrl()}/foods/${newFood.id}/nutrients/`, {
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

    const requestedUrl = `${getApiUrl().replace(/\/*$/,'')}/meals/${mealId}/items/detailed`;
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

    const response = await fetch(`${getApiUrl()}/meals/${mealId}/items/${itemId}`, {
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
    const response = await fetch(`${getApiUrl()}/meals/${mealId}/items/${itemId}`, { method: 'DELETE' });
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

    const response = await fetch(`${getApiUrl()}/meals/${mealId}/items`, {
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
    const url = `${getApiUrl().replace(/\/*$/,'')}/status/`;
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
export function renderProfileOutput() {
    const out = document.getElementById('appOutputSection');
    out.innerHTML = `
        <h2>Profile</h2>
        <div class="card mb-3"><div class="card-body">
            <p>Account placeholder output. (Click account in the sidebar for this view)</p>
            <p class="text-muted">(W.I.P.)</p>
        </div></div>
    `;
}

export function renderSettingsOutput() {
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

        // Debugging
        console.log("CANVAS:", chartCanvas);
        console.log("CTX:", chartCanvas?.getContext?.("2d"));
        console.log("DATA LABELS:", labels);
        console.log("DATA VALUES:", data);

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




async function submitFeedback() {
    const input = document.getElementById("feedbackInput");
    const message = input.value;

    if (!message.trim()) return;

    await fetch(`${getApiUrl()}/feedback`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message
        })
    });

    console.log("Feedback sent:", message);

    input.value = "";
    alert("Thank you for your feedback!");
    updateCount(); // resets counter to 0
}

