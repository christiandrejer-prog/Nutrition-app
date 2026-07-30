import { get, post, del } from './core.js';

export const StockAPI = {
    getAll: () => get('/stock/'),

    add: (foodId, data) =>
        post(`/stock/${foodId}/add`, data),

    remove: (foodId, data) =>
        post(`/stock/${foodId}/remove`, data),

    delete: (foodId) =>
        del(`/stock/${foodId}`)
};
