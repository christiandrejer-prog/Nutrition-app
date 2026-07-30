// modals.js responsibilities:
    // 1. Modal management
        // open/close modals, populate with data, handle form submissions
    // 2. Food details modal
        // load and display detailed nutrition info for a food item
    // 3. Drink details modal
        // load and display detailed nutrition info for a drink item
    // 4. Meal details modal
        // load and display detailed nutrition info for a meal item

// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
import { getNutrients } from '../state.js';
import { escapeHtml } from '../utils.js';
import { FoodsAPI } from '../api/foodsAPI.js';
import { confirmAction } from '../ui/components/modal.js';
import { showSaveSuccessToast } from '../ui/components/toast.js';


// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED

// ======================================================
// PUBLIC API
// ======================================================

export function initModals() {
    // optional setup hook for future use
    console.info("Modals initialized");
}

// Holds the callback used by the "Back" button in the food details modal
// (e.g. returning to the search results the food was opened from).
// Cleared whenever the modal is fully closed.
let foodDetailsBackHandler = null;

function attachFoodDetailsBackReset(modal) {
    if (modal.dataset.backListenerAttached) return;
    modal.dataset.backListenerAttached = "true";
    modal.addEventListener('hidden.bs.modal', () => {
        foodDetailsBackHandler = null;
    });
}

export function goBackFromFoodDetails() {
    const handler = foodDetailsBackHandler;
    foodDetailsBackHandler = null;

    if (typeof handler === 'function') {
        handler();
    } else {
        showModalById(null);
    }
}

export function showModalById(modalId) {
    if (typeof bootstrap === 'undefined') return;

    document.querySelectorAll('.modal.show').forEach(activeModal => {
        bootstrap.Modal.getInstance(activeModal)?.hide();
    });

    if (!modalId) return;

    const modal = document.getElementById(modalId);
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

export async function showFoodDetailsModal(foodId, { onBack } = {}) {
    const modal = document.getElementById('modalFoodDetails');
    const content = document.getElementById('modalFoodDetailsContent');
    if (!modal || !content) return;

    if (onBack !== undefined) {
        foodDetailsBackHandler = onBack;
    }
    attachFoodDetailsBackReset(modal);

    content.innerHTML = '<p>Loading food details...</p>';

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    try {
        const macroResponse = await FoodsAPI.getMacros(foodId);
        const macroData = macroResponse || null;

        let html = `
            <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="mb-0">Food Details</h5>
                <button class="btn btn-sm btn-outline-secondary"
                        type="button"
                        data-action="food-edit-macros"
                        data-id="${foodId}">
                    Edit Macros
                </button>
            </div>
        `;

        if (macroData?.macros) {
            html += `
                <div class="macro-summary">
                    <p><strong>Calories:</strong> ${escapeHtml(String(macroData.macros.calories))} kcal</p>
                    <p><strong>Protein:</strong> ${escapeHtml(String(macroData.macros.protein))}g</p>
                    <p><strong>Carbs:</strong> ${escapeHtml(String(macroData.macros.carbs))}g</p>
                    <p><strong>Fat:</strong> ${escapeHtml(String(macroData.macros.fat))}g</p>
                </div>
            `;
        } else {
            html += '<p>No macro data available yet.</p>';
        }

        html += `
            <div class="d-flex mt-3">
                <button class="btn btn-sm btn-outline-secondary"
                        type="button"
                        data-action="food-details-back">
                    Back
                </button>
            </div>
        `;

        content.innerHTML = html;

    } catch (err) {
        console.warn(err);
        content.innerHTML = '<div class="alert alert-danger">Unable to load food details.</div>';
    }
}

export async function showEditFoodMacrosModal(foodId) {
    const modal = document.getElementById('modalFoodDetails');
    const content = document.getElementById('modalFoodDetailsContent');
    if (!modal || !content) return;

    content.innerHTML = '<p>Loading macros editor...</p>';

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    try {
        const nutrients = getNutrients();
        const nutrientResponse = await FoodsAPI.getNutrients(foodId);
        const nutrientData = Array.isArray(nutrientResponse) ? nutrientResponse : [];

        const usedNutrientIds = new Set(nutrientData.map(entry => entry.nutrient_id));
        const availableNutrients = nutrients.filter(n => !usedNutrientIds.has(n.id));

        let html = `
            <h5 class="mb-3">Edit Food Macros</h5>
            <form id="foodMacrosForm">
        `;

        if (!nutrientData.length) {
            html += '<p>No nutrient records found to edit.</p>';
        } else {
            html += '<ul class="list-group mb-3">';

            nutrientData.forEach(entry => {
                const nutrient = nutrients.find(n => n.id === entry.nutrient_id);

                const label = nutrient
                    ? `${nutrient.name} (${nutrient.unit})`
                    : `Nutrient ${entry.nutrient_id}`;

                html += `
                    <li class="list-group-item d-flex align-items-center gap-2">
                        <span class="flex-grow-1">${escapeHtml(label)}</span>
                        <input type="number"
                               step="0.1"
                               class="form-control form-control-sm"
                               style="max-width: 8rem;"
                               id="foodMacroAmount-${entry.nutrient_id}"
                               value="${escapeHtml(String(entry.amount_per_100g))}">
                        <button type="button"
                                class="btn btn-sm btn-outline-danger"
                                data-action="food-delete-nutrient"
                                data-id="${foodId}"
                                data-nutrient-id="${entry.nutrient_id}">
                            Delete
                        </button>
                    </li>
                `;
            });

            html += '</ul>';
        }

        html += `
            <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <select class="form-select form-select-sm" id="foodAddNutrientSelect" style="max-width: 12rem;">
                    <option value="">${availableNutrients.length ? 'Add nutrient...' : 'No more nutrients available'}</option>
                    ${availableNutrients.map(n => `<option value="${n.id}">${escapeHtml(n.name)} (${escapeHtml(n.unit)})</option>`).join('')}
                </select>
                <input type="number"
                       step="0.1"
                       class="form-control form-control-sm"
                       id="foodAddNutrientAmount"
                       placeholder="Amount per 100g"
                       style="max-width: 10rem;">
                <button type="button"
                        class="btn btn-sm btn-outline-primary"
                        data-action="food-add-nutrient"
                        data-id="${foodId}">
                    Add
                </button>
            </div>
        `;

        html += `
            <div class="d-flex gap-2">
                <button type="button"
                        class="btn btn-secondary"
                        data-action="food-details"
                        data-id="${foodId}">
                    Cancel
                </button>

                <button type="button"
                        class="btn btn-primary"
                        data-action="food-save-macros"
                        data-id="${foodId}">
                    Save Macros
                </button>
            </div>
        </form>
        `;

        content.innerHTML = html;

    } catch (err) {
        console.warn(err);
        content.innerHTML = '<div class="alert alert-danger">Unable to load macros editor.</div>';
    }
}

export async function addFoodNutrientFromModal(foodId) {
    const select = document.getElementById('foodAddNutrientSelect');
    const amountInput = document.getElementById('foodAddNutrientAmount');
    const nutrientId = select?.value;
    const amount = parseFloat(amountInput?.value);

    if (!nutrientId) {
        alert('Choose a nutrient to add.');
        return;
    }

    if (!Number.isFinite(amount)) {
        alert('Enter a valid amount.');
        return;
    }

    try {
        await FoodsAPI.addNutrient(foodId, {
            nutrient_id: parseInt(nutrientId, 10),
            amount_per_100g: amount
        });

        await showEditFoodMacrosModal(foodId);
        showSaveSuccessToast();
    } catch (err) {
        console.warn(err);
        alert('Unable to add nutrient: ' + (err.message || err));
    }
}

export async function deleteFoodNutrientFromModal(foodId, nutrientId) {
    if (!await confirmAction('Delete this nutrient from the food?')) return;

    try {
        await FoodsAPI.deleteNutrient(foodId, nutrientId);
        await showEditFoodMacrosModal(foodId);
    } catch (err) {
        console.warn(err);
        alert('Unable to delete nutrient: ' + (err.message || err));
    }
}

export async function saveFoodMacros(foodId) {
    const inputs = document.querySelectorAll(
        '#foodMacrosForm input[id^="foodMacroAmount-"]'
    );

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
        await Promise.all(
            updates.map(update =>
                FoodsAPI.updateNutrient(foodId, update.nutrientId, {
                    amount_per_100g: update.amount
                })
            )
        );

        showFoodDetailsModal(foodId);
        showSaveSuccessToast();

    } catch (err) {
        console.warn(err);
        alert('Unable to save macros: ' + (err.message || err));
    }
}
