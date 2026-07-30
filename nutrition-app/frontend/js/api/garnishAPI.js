// garnishAPI.js responsibilities:
    // 1. CRUD for garnish types (name, unit, linked source food, yield, default essential)
    // Garnish source-item stock is tracked via the regular StockAPI against
    // the garnish's source_food_id, not a separate endpoint.

import { get, post, put, del } from './core.js';

export const GarnishAPI = {
    getAll: () => get('/garnishes/'),
    create: (data) => post('/garnishes/', data),
    update: (id, data) => put(`/garnishes/${id}`, data),
    delete: (id) => del(`/garnishes/${id}`)
};
