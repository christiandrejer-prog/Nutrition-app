import { NutrientsAPI } from '../api/nutrientsAPI.js';
import { setNutrients } from '../state.js';

export async function loadNutrients() {
    try {
        const data = await NutrientsAPI.getAll();
        setNutrients(data);
        return data;
    } catch (err) {
        console.error("Failed to load nutrients:", err);
        setNutrients([]);
        return [];
    }
}