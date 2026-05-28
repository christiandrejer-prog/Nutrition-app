import { DrinksAPI } from '../api/drinksAPI.js';
import { setDrinks } from '../state.js';

export async function loadDrinks() {
    try {
        const data = await DrinksAPI.getAll();
        setDrinks(data);
        return data;
    } catch (err) {
        console.error("Failed to load drinks:", err);
        setDrinks([]);
        return [];
    }
}