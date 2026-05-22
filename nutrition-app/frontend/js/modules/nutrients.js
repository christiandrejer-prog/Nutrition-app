// nutrients.js responsibilities:
    // 1. Load and display nutrients
    // 2. Handle nutrient CRUD operations
    // 3. Maintain local cache

// ###########################################################



// ======================================================
// IMPORTS
// ======================================================

import { setNutrients, getState } from '../state.js';
import { NutrientsAPI } from '../api/nutrientsAPI.js';
import { escapeHtml } from '../utils.js';

// ======================================================
// CREATE
// ======================================================

export async function createNutrient() {
    const name = document.getElementById("nutrientName")?.value.trim();
    const unit = document.getElementById("nutrientUnit")?.value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    if (nutrientsCache.some(n =>
        n.name.trim().toLowerCase() === name.toLowerCase() &&
        n.unit.trim().toLowerCase() === unit.toLowerCase()
    )) {
        alert("This nutrient already exists");
        return;
    }

    try {
        await NutrientsAPI.create({ name, unit });

        document.getElementById("nutrientName").value = "";
        document.getElementById("nutrientUnit").value = "";

        await loadNutrients();

    } catch (err) {
        alert("Error saving nutrient: " + err.message);
    }
}

// ======================================================
// READ
// ======================================================

export async function loadNutrients() {
    const nutrientList = document.getElementById("nutrientList");
    //const nutrientSelect = document.getElementById("nutrientSelect");

    //if (!nutrientList || //!nutrientSelect)
    if (!nutrientList) {
        console.warn("Nutrient DOM not found on this page");
        return;
    }

    nutrientList.innerHTML = "<li>Loading nutrients...</li>";
    //nutrientSelect.innerHTML = '<option value="">Select nutrient</option>';

    try {
        const data = await NutrientsAPI.getAll();
        setNutrients(data);
    } catch (error) {
        nutrientList.innerHTML = `
            <li class="status-error">
                Unable to load nutrients: ${escapeHtml(error.message)}
            </li>
        `;
        return;
    }

    const { nutrients, editing } = getState();

    nutrientList.innerHTML = "";

    nutrients.forEach(nutrient => {
        const li = document.createElement("li");
        li.id = `nutrient-row-${nutrient.id}`;

        const textSpan = document.createElement("span");
        textSpan.textContent = `${nutrient.name} (${nutrient.unit})`;
        li.appendChild(textSpan);

        if (editing.nutrients) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "green-button";
            editButton.textContent = "Edit";
            editButton.onclick = () =>
                showEditNutrient(nutrient.id, nutrient.name, nutrient.unit);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "red-button";
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () =>
                deleteNutrient(nutrient.id);

            li.appendChild(editButton);
            li.appendChild(deleteButton);
        }

        nutrientList.appendChild(li);

        const option = document.createElement("option");
        option.value = nutrient.id;
        option.text = `${nutrient.name} (${nutrient.unit})`;
        //nutrientSelect.appendChild(option);
    });
}

// ======================================================
// EDIT UI
// ======================================================

export function showEditNutrient(nutrientId, currentName, currentUnit) {
    const row = document.getElementById(`nutrient-row-${nutrientId}`);
    if (!row) return;

    row.innerHTML = "";

    const nameInput = document.createElement("input");
    nameInput.id = `nutrient-name-edit-${nutrientId}`;
    nameInput.value = currentName;

    const unitInput = document.createElement("input");
    unitInput.id = `nutrient-unit-edit-${nutrientId}`;
    unitInput.value = currentUnit;

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.className = "green-button";
    saveButton.onclick = () => saveNutrient(nutrientId);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.onclick = () => loadNutrients();

    row.appendChild(nameInput);
    row.appendChild(unitInput);
    row.appendChild(saveButton);
    row.appendChild(cancelButton);
}

// ======================================================
// UPDATE
// ======================================================

export async function saveNutrient(nutrientId) {
    const nameInput = document.getElementById(`nutrient-name-edit-${nutrientId}`);
    const unitInput = document.getElementById(`nutrient-unit-edit-${nutrientId}`);

    if (!nameInput || !unitInput) return;

    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();

    if (!name || !unit) {
        alert("Please enter both name and unit");
        return;
    }

    try {
        await NutrientsAPI.update(nutrientId, { name, unit });
        await loadNutrients();

    } catch (err) {
        alert("Error updating nutrient: " + err.message);
    }
}

// ======================================================
// DELETE
// ======================================================

export async function deleteNutrient(nutrientId) {
    if (!confirm("Delete this nutrient?")) return;

    try {
        await NutrientsAPI.delete(nutrientId);
        await loadNutrients();

    } catch (err) {
        alert("Error deleting nutrient: " + err.message);
    }
}