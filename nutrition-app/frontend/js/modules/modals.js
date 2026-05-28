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


// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED

// ======================================================
// PUBLIC API
// ======================================================

export function initModals() {
    // optional setup hook for future use
    console.info("Modals initialized");
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

export async function showFoodDetailsModal(foodId) {
    const modal = document.getElementById('modalFoodDetails');
    const content = document.getElementById('modalFoodDetailsContent');
    if (!modal || !content) return;

    content.innerHTML = '<p>Loading food details...</p>';

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    try {
        const nutrients = getNutrients();
        const nutrientResponse = await FoodsAPI.getNutrients(foodId);
        const macroResponse = await FoodsAPI.getMacros(foodId);

        const nutrientData = Array.isArray(nutrientResponse) ? nutrientResponse : [];
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

        if (nutrientData.length) {
            html += '<ul class="list-group mb-3">';

            nutrientData.forEach(entry => {
                const nutrient = nutrients.find(n => n.id === entry.nutrient_id);

                const name = nutrient ? nutrient.name : `Nutrient ${entry.nutrient_id}`;
                const unit = nutrient ? nutrient.unit : '';

                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <strong>${escapeHtml(name)}</strong>
                            ${unit ? ` (${escapeHtml(unit)})` : ''}
                        </span>
                        <span>${escapeHtml(String(entry.amount_per_100g))}</span>
                    </li>
                `;
            });

            html += '</ul>';
        } else {
            html += '<p>No nutrients added yet.</p>';
        }

        if (macroData?.macros) {
            html += `
                <div class="border p-3 rounded bg-light">
                    <p><strong>Calories:</strong> ${escapeHtml(String(macroData.macros.calories))} kcal</p>
                    <p><strong>Protein:</strong> ${escapeHtml(String(macroData.macros.protein))}g</p>
                    <p><strong>Carbs:</strong> ${escapeHtml(String(macroData.macros.carbs))}g</p>
                    <p><strong>Fat:</strong> ${escapeHtml(String(macroData.macros.fat))}g</p>
                </div>
            `;
        }

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

        let html = `
            <h5 class="mb-3">Edit Food Macros</h5>
            <form id="foodMacrosForm">
        `;

        if (!nutrientData.length) {
            html += '<p>No nutrient records found to edit.</p>';
        }

        nutrientData.forEach(entry => {
            const nutrient = nutrients.find(n => n.id === entry.nutrient_id);

            const label = nutrient
                ? `${nutrient.name} (${nutrient.unit})`
                : `Nutrient ${entry.nutrient_id}`;

            html += `
                <div class="mb-3">
                    <label class="form-label">${escapeHtml(label)}</label>
                    <input type="number"
                           step="0.1"
                           class="form-control"
                           id="foodMacroAmount-${entry.nutrient_id}"
                           value="${escapeHtml(String(entry.amount_per_100g))}">
                </div>
            `;
        });

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

    } catch (err) {
        console.warn(err);
        alert('Unable to save macros: ' + (err.message || err));
    }
}
