
import { getApiUrl } from "../../config.js";
import { getFoods, getNutrients } from "../../state.js";
import { createFood, loadFoods, loadFoodDetails } from "../foods.js";
import { loadNutrients } from "../nutrients.js";

// Fetch food data from Open Food Facts API
export async function fetchFoodFromAPI(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = data.product;
            const name = product.product_name || "Unknown Product";
            const brand = product.brands || "";
            const productNutrients = product.nutriments || {};

            // Populate the form
            document.getElementById("foodName").value = name;
            document.getElementById("foodBrand").value = brand;

            // Create the food
            await createFood();

            // Get the newly created food ID (assuming it's the last one)
            await loadFoods();
            const foods = getFoods();
            const nutrients = getNutrients();
            const newFood = foods[foods.length - 1];
            if (newFood) {
                // Add nutrients
                const nutrientMap = {
                    "energy-kcal_100g": { name: "Energy", unit: "kcal" },
                    "proteins_100g": { name: "Protein", unit: "g" },
                    "carbohydrates_100g": { name: "Carbohydrates", unit: "g" },
                    "fat_100g": { name: "Fat", unit: "g" },
                    "fiber_100g": { name: "Fiber", unit: "g" },
                    "sugars_100g": { name: "Sugars", unit: "g" },
                    "sodium_100g": { name: "Sodium", unit: "mg" },
                };

                for (const [key, value] of Object.entries(productNutrients)) {
                    if (nutrientMap[key] && value) {
                        let nutrient = nutrients.find(n => n.name.toLowerCase() === nutrientMap[key].name.toLowerCase() && n.unit.toLowerCase() === nutrientMap[key].unit.toLowerCase());
                        if (!nutrient) {
                            const createResponse = await fetch(`${getApiUrl()}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: nutrientMap[key].name, unit: nutrientMap[key].unit })
                            });
                            if (createResponse.ok) {
                                const newNutrient = await createResponse.json();
                                nutrients.push(newNutrient);
                                nutrient = newNutrient;
                                loadNutrients();
                            }
                        }
                        if (nutrient) {
                            await fetch(`${getApiUrl()}/foods/${newFood.id}/nutrients/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ nutrient_id: nutrient.id, amount_per_100g: value })
                            });
                        }
                    }
                }
                const foodSelect = document.getElementById("foodSelect");
                if (foodSelect.value == newFood.id) {
                    loadFoodDetails();
                }
            }
        } else {
            alert("Product not found in database");
        }
    } catch (error) {
        console.error("Error fetching food data:", error);
        alert("Error fetching food data");
    }
}
