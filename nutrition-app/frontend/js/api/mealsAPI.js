// meals.api.js responsibilities:
    // 1. Handle all API interactions related to meals
        // e.g. fetchMeals(), addMeal(), editMeal(), deleteMeal(), etc.
    // 2. Use consistent API URL handling (e.g. using a base URL from config)
    // 3. Optional: handle any necessary data transformations for the API
        // e.g. converting units, formatting request/response data, etc.

// ###########################################################

// Imports --- DONT KNOW IF THIS IS NEEDED
import { get, post, put, del } from './core.js';

// Exports --- DONT KNOW IF THIS IS NEEDED
export const MealsAPI = {
    getAll: () => get('/meals/'),
    create: (data) => post('/meals/', data),
    update: (id, data) => put(`/meals/${id}`, data),
    delete: (id) => del(`/meals/${id}`),

    getItems: (id) =>
        get(`/meals/${id}/items/detailed`),

    getDetailed: (id) =>
        get(`/meals/${id}/items/detailed`),

    addItem: (mealId, data) =>
        post(`/meals/${mealId}/items`, data),

    updateItem: (mealId, itemId, data) =>
        put(`/meals/${mealId}/items/${itemId}`, data),

    deleteItem: (mealId, itemId) =>
        del(`/meals/${mealId}/items/${itemId}`)
};
