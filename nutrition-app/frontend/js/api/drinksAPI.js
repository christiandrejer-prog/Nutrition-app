// drinks.api.js responsibilities:
    // 1. Handle all API interactions related to drinks and drink lists
        // e.g. fetchDrinks(), addDrink(), editDrink(), deleteDrink(), etc.
    // 2. Use consistent API URL handling (e.g. using a base URL from config)
    // 3. Optional: handle any necessary data transformations for the API
        // e.g. converting units, formatting request/response data, etc.

// ###########################################################

// Imports --- DONT KNOW IF THIS IS NEEDED
import { get, post, put, del } from './core.js';

// Exports --- DONT KNOW IF THIS IS NEEDED
export const DrinksAPI = {
    // Drinks:
    getAll: () => get('/drinks/'),
    getAllDetails: () => get('/drinks/details'),
    getDetail: (id) => get(`/drinks/details/${id}`),
    create: (data) => post('/drinks/', data),
    update: (id, data) => put(`/drinks/${id}`, data),
    delete: (id) => del(`/drinks/${id}`),

    getIngredients: (id) =>
        get(`/drinks/${id}/ingredients`),

    getMacros: (id) =>
        get(`/drinks/${id}/macros`),

    addIngredient: (id, data) =>
        post(`/drinks/${id}/ingredients`, data),

    updateIngredient: (drinkId, ingredientId, data) =>
        put(`/drinks/${drinkId}/ingredients/${ingredientId}`, data),

    deleteIngredient: (drinkId, ingredientId) =>
        del(`/drinks/${drinkId}/ingredients/${ingredientId}`),

    getGarnishes: (id) =>
        get(`/drinks/${id}/garnishes`),

    addGarnish: (id, data) =>
        post(`/drinks/${id}/garnishes`, data),

    updateGarnish: (drinkId, garnishId, data) =>
        put(`/drinks/${drinkId}/garnishes/${garnishId}`, data),

    deleteGarnish: (drinkId, garnishId) =>
        del(`/drinks/${drinkId}/garnishes/${garnishId}`),


    // Lists:
    getLists: () =>
        get('/drinks/lists'),

    createList: (data) =>
        post('/drinks/lists', data),

    getList: (id) =>
        get(`/drinks/lists/${id}`),

    updateList: (id, data) =>
        put(`/drinks/lists/${id}`, data),

    deleteList: (id) =>
        del(`/drinks/lists/${id}`),

    addListItem: (listId, data) =>
        post(`/drinks/lists/${listId}/items`, data),

    updateListItem: (listId, itemId, data) =>
        put(`/drinks/lists/${listId}/items/${itemId}`, data),

    deleteListItem: (listId, itemId) =>
        del(`/drinks/lists/${listId}/items/${itemId}`)
};
