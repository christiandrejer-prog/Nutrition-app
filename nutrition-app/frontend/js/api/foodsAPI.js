// foods.api.js responsibilities:
    // 1. Handle all API interactions related to foods
        // e.g. fetchFoods(), addFood(), editFood(), deleteFood(), etc.
    // 2. Use consistent API URL handling (e.g. using a base URL from config)
    // 3. Optional: handle any necessary data transformations for the API
        // e.g. converting units, formatting request/response data, etc.

// ###########################################################

// Imports --- DONT KNOW IF THIS IS NEEDED
import { get, post, put, del } from './core.js';

// Exports --- DONT KNOW IF THIS IS NEEDED
export const FoodsAPI = {
    getAll: () => get('/foods/'),
    create: (data) => post('/foods/', data),
    update: (id, data) => put(`/foods/${id}`, data),
    delete: (id) => del(`/foods/${id}`),

    getNutrients: (id) =>
        get(`/foods/${id}/nutrients`),

    getMacros: (id) =>
        get(`/foods/${id}/macros`),

    updateNutrient: (foodId, nutrientId, data) =>
        put(`/foods/${foodId}/nutrients/${nutrientId}`, data)
};