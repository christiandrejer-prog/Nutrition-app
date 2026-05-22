import { FoodsAPI } from '../api/foodsAPI.js';
import { setFoods } from '../state.js';

export async function loadFoods() {
    try {
        const data = await FoodsAPI.getAll();
        setFoods(data);
        return data;
    } catch (err) {
        console.error("Failed to load foods:", err);
        setFoods([]);
        return [];
    }
}