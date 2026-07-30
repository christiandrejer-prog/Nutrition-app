// utils.js responsibilities:
    // 1. Common utility functions
        // escapeHtml, formatDate, etc.
    // 2. Shared UI helpers
        // showAlert, toggleLoading, etc.
    // 3. Data formatting
        // formatNutrients, formatMacros, etc.



// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED
import { getApiUrl } from "./config.js";
import { confirmAction } from "./ui/components/modal.js";

// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED




export function getDatabaseEndpoint(type) {
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


export function buildSearchableText(item) {
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


export function openEntityModal({
    modalId,
    contentId,
    loadingText = 'Loading...'
}) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);

    if (!modal || !content) return null;

    content.innerHTML = `<p>${escapeHtml(loadingText)}</p>`;

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    return { modal, content };
}


export async function fetchJson(url, fallback = null) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.warn(err);
        return fallback;
    }
}


export async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(text || `HTTP ${response.status}`);
    }

    return response;
}


export function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


//export function formatCurrency(value) { ... }


//export function toNumber(value, fallback = 0) { ... }


// CRUD helpers
export function editSearchName({
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

    fetch(`${getApiUrl()}/${endpoint}/${id}`, {
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


export async function deleteEntityByType(type, id) {
    const endpoint = getDatabaseEndpoint(type).replace(/\/$/, "");
    const label = type === "drink lists" ? "drink list" : type.slice(0, -1) || type;

    if (!await confirmAction(`Delete this ${label}?`)) return false;

    const response = await fetch(`${getApiUrl()}/${endpoint}/${id}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        alert("Error deleting: " + (result.detail || JSON.stringify(result)));
        return false;
    }

    return true;
}
