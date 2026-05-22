// api.js responsibilities:

    // 1. Base request wrapper (VERY IMPORTANT)
        // one function for all HTTP calls

    // 2. GET / POST / PUT / DELETE helpers
        // optional convenience wrappers

    // 3. JSON parsing + error handling
        // no more duplicated try/catch everywhere

    // 4. API URL handling
        // consistent ${API_URL} usage

// ###########################################################

// Imports --- DONT KNOW IF THIS IS NEEDED
import { getApiUrl } from '../config.js';



// Assumes API_URL is defined in config.js or runtime-config.json loader
// Example: const API_URL = "http://localhost:8000";


// === Base request layer (core engine) ===
// ----------------------------------------
export async function apiRequest(endpoint, options = {}) {

    const url = `${getApiUrl()}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    if (
        (!config.method || config.method === 'GET') &&
        config.body
    ) {
        delete config.body;
    }

    let response;

    try {

        response = await fetch(url, config);

    } catch (err) {

        console.error(err);

        throw new Error(
            `Network error: ${err.message || 'Unknown network error'}`
        );
    }

    const isJson =
        response.headers
            .get('content-type')
            ?.includes('application/json');

    const data = isJson
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

    if (!response.ok) {

        console.error('API ERROR:', data);

        let message = 'Request failed';

        if (typeof data === 'string') {

            message = data;

        } else if (data?.detail) {

            message =
                typeof data.detail === 'string'
                    ? data.detail
                    : JSON.stringify(data.detail);

        } else if (data?.message) {

            message =
                typeof data.message === 'string'
                    ? data.message
                    : JSON.stringify(data.message);

        } else if (data) {

            message = JSON.stringify(data);
        }

        throw new Error(message);
    }

    return data;
}



// === Generic HTTP helpers (GET/POST/PUT/DELETE) ===
// ---------------------------------------------
// For GET
export function get(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}


// For POST
export function post(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}


// For PUT
export function put(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}


// For DELETE
export function del(endpoint) {
    return apiRequest(endpoint, {
        method: 'DELETE'
    });
}


