import { MealsAPI } from '../api/mealsAPI.js';
import { setMeals } from '../state.js';

export async function loadMeals() {
    try {
        const data = await MealsAPI.getAll();
        setMeals(data);
        return data;
    } catch (err) {
        console.error("Failed to load meals:", err);
        setMeals([]);
        return [];
    }
}