// renders.js responsibilities:
    // 1. Render data to the UI
        // e.g. renderDrinksTable(), renderDrinkLists(), etc.
    // 2. Handle UI interactions related to rendering
        // e.g. show/hide elements, update tables, etc.
    // 3. Optional: handle any necessary data formatting for display
        // e.g. formatting nutrient values, dates, etc.

// ###########################################################

// Imports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED


// Exports --- IN THE WORKS, DONT KNOW IF THIS IS NEEDED





// ??? --- Maybe centralizing renders ---
const routes = {
    dashboard: renderDashboard,
    'drink-dashboard': renderDrinkDashboard,
    settings: renderSettingsOutput,
    status: renderStatusOutput
};

routes[action]?.();