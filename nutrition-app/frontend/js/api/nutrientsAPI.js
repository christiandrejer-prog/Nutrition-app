// nutrients.api.js responsibilities:
    // 1. Handle all API interactions related to nutrients
        // e.g. fetchNutrients(), addNutrient(), editNutrient(), deleteNutrient(), etc.
    // 2. Use consistent API URL handling (e.g. using a base URL from config)
    // 3. Optional: handle any necessary data transformations for the API
        // e.g. converting units, formatting request/response data, etc.

// ###########################################################

// Imports --- DONT KNOW IF THIS IS NEEDED
import { get, post, put, del } from './core.js';

// Exports --- DONT KNOW IF THIS IS NEEDED
export const NutrientsAPI = {
    getAll: () => get('/nutrients/'),
    create: (data) => post('/nutrients/', data),
    update: (id, data) => put(`/nutrients/${id}`, data),
    delete: (id) => del(`/nutrients/${id}`)
};