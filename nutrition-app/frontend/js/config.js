// config.js responsibilities:
    // 1. Centralized configuration values
        // API_URL, default settings, etc.
    // 2. Utility functions related to configuration
        // getDatabaseEndpoint, buildSearchableText, etc.
    // 3. Modal handling utilities
        // openEntityModal, closeEntityModal, etc.

// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED


// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED

const API_URL_OVERRIDE_KEY = "nutrition_app_api_url";
const DEFAULT_API_URL = "http://127.0.0.1:8000";

let API_URL = DEFAULT_API_URL;
let API_URL_SOURCE = "default";



// ======================================================
// PUBLIC API
// ======================================================

export async function initConfig() {
    loadStoredApiUrl();
    await loadRuntimeConfig();
}


export function getApiUrl() {
    return API_URL;
}


export function getApiUrlSource() {
    return API_URL_SOURCE;
}


export function getApiUrlSourceLabel() {
    switch (API_URL_SOURCE) {
        case "manual":
            return "manual override";
        case "localStorage":
            return "saved override";
        case "runtime-config":
            return "runtime-config";
        default:
            return "default";
    }
}


export function setApiUrl(value, source = "manual") {
    try {
        const u = new URL(value, window.location.href);

        API_URL = u.href.replace(/\/$/, "");
        API_URL_SOURCE = source;

        console.info(`API_URL set from ${source}:`, API_URL);

        return true;
    } catch (e) {
        console.warn("Invalid API URL:", value);
        return false;
    }
}


export function clearApiUrlOverride() {
    localStorage.removeItem(API_URL_OVERRIDE_KEY);

    API_URL = DEFAULT_API_URL;
    API_URL_SOURCE = "default";
}


export function updateApiUrlInput() {
    const input = document.getElementById("apiUrlInput");
    if (input) input.value = API_URL;
}


export async function setApiUrlFromInput() {
    const input = document.getElementById("apiUrlInput");
    if (!input) return;

    const url = input.value.trim();

    if (!url) {
        alert("Enter a backend URL to use.");
        return;
    }

    const ok = setApiUrl(url, "manual");

    if (!ok) {
        alert("Invalid URL. Please use http:// or https://");
        return;
    }

    localStorage.setItem(API_URL_OVERRIDE_KEY, API_URL);

    updateApiUrlInput();

    // IMPORTANT:
    // this must exist in app.js or be passed in
    if (typeof window.refreshAppData === "function") {
        await window.refreshAppData();
    }
}



// ======================================================
// INTERNAL FUNCTIONS
// ======================================================

function loadStoredApiUrl() {
    const stored = localStorage.getItem(API_URL_OVERRIDE_KEY);

    if (!stored) return false;

    const ok = setApiUrl(stored, "localStorage");

    if (!ok) {
        localStorage.removeItem(API_URL_OVERRIDE_KEY);
    }

    return ok;
}


async function loadRuntimeConfig() {
    if (API_URL_SOURCE !== "default") return;

    try {
        const res = await fetch("runtime-config.json", {
            cache: "no-store"
        });

        if (!res.ok) return;

        const cfg = await res.json().catch(() => null);

        if (cfg?.API_URL) {
            const ok = setApiUrl(cfg.API_URL, "runtime-config");

            if (!ok) {
                console.warn("Invalid runtime config API_URL:", cfg.API_URL);
            }
        }
    } catch {
        // silent fail
    }
}