const SETTINGS_STORAGE_KEY = "nutrition_app_settings";
const LEGACY_DARK_MODE_KEY = "app_dark_mode";

export const UNIT_OPTIONS = ["cl", "ml", "g", "kg", "l"];

export const SETTINGS_DEFINITIONS = [
    {
        key: "darkMode",
        label: "Dark mode",
        description: "Use the dark interface by default.",
        type: "toggle",
        defaultValue: true,
        section: "Display"
    },
    {
        key: "measurementUnit",
        label: "Preferred measurement unit",
        description: "Default unit shown first in food, meal, and drink controls.",
        type: "select",
        options: UNIT_OPTIONS,
        defaultValue: "cl",
        section: "Units"
    },
    {
        key: "compactDashboardCards",
        label: "Compact dashboard cards",
        description: "Placeholder for making dashboard lists denser on mobile.",
        type: "toggle",
        defaultValue: true,
        section: "Dashboard"
    },
    {
        key: "hoverDetails",
        label: "Hover details",
        description: "Placeholder for controlling macro/detail hover boxes.",
        type: "toggle",
        defaultValue: true,
        section: "Dashboard"
    },
    {
        key: "defaultSearchType",
        label: "Default search category",
        description: "Placeholder for choosing what search opens first.",
        type: "select",
        options: ["foods", "meals", "drinks", "drink lists"],
        defaultValue: "foods",
        section: "Search"
    },
    {
        key: "barcodeAutoOpen",
        label: "Open barcode result automatically",
        description: "Placeholder for barcode scan behavior.",
        type: "toggle",
        defaultValue: true,
        section: "Barcode"
    },
    {
        key: "calorieConfidence",
        label: "95% calorie confidence interval",
        description: "Placeholder for showing calorie uncertainty in summaries.",
        type: "toggle",
        defaultValue: false,
        section: "Nutrition"
    },
    {
        key: "microNutrients",
        label: "Micro nutrient tracking",
        description: "Placeholder for sodium, caffeine, creatine, and vitamins.",
        type: "toggle",
        defaultValue: false,
        section: "Nutrition"
    },
    {
        key: "budgetTracking",
        label: "Budget tracking",
        description: "Placeholder for price-aware meals, drinks, and shopping lists.",
        type: "toggle",
        defaultValue: false,
        section: "Planning"
    },
    {
        key: "mealSharing",
        label: "Meal sharing",
        description: "Placeholder for viewing and sharing meals with other users.",
        type: "toggle",
        defaultValue: false,
        section: "Social"
    }
];

export function getDefaultSettings() {
    return Object.fromEntries(
        SETTINGS_DEFINITIONS.map(setting => [setting.key, setting.defaultValue])
    );
}

export function getSettings() {
    const defaults = getDefaultSettings();
    const stored = readStoredSettings();
    const legacyDarkMode = localStorage.getItem(LEGACY_DARK_MODE_KEY);

    if (!stored && legacyDarkMode !== null) {
        defaults.darkMode = legacyDarkMode === "1";
    }

    return {
        ...defaults,
        ...(stored || {})
    };
}

export function saveSetting(key, value) {
    const settings = {
        ...getSettings(),
        [key]: value
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
    return settings;
}

export function resetSettings() {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DARK_MODE_KEY);
    const settings = getDefaultSettings();
    applySettings(settings);
    return settings;
}

export function applySettings(settings = getSettings()) {
    document.body.classList.toggle("dark-mode", Boolean(settings.darkMode));
    document.documentElement.dataset.measurementUnit = settings.measurementUnit || "cl";
    localStorage.setItem(LEGACY_DARK_MODE_KEY, settings.darkMode ? "1" : "0");
}

export function getPreferredMeasurementUnit() {
    return getSettings().measurementUnit || "cl";
}

export function renderUnitOptions(units = UNIT_OPTIONS, selectedUnit = getPreferredMeasurementUnit()) {
    const orderedUnits = [
        selectedUnit,
        ...units.filter(unit => unit !== selectedUnit)
    ];

    return orderedUnits.map(unit => `
        <option value="${unit}" ${unit === selectedUnit ? "selected" : ""}>${unit}</option>
    `).join("");
}

export function convertMeasurement(amount, fromUnit, toUnit) {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    const numericAmount = Number(amount || 0);

    if (!Number.isFinite(numericAmount)) return null;
    if (!from || !to || from === to) return numericAmount;

    const volumeUnits = {
        ml: 1,
        cl: 10,
        l: 1000
    };

    const weightUnits = {
        g: 1,
        kg: 1000
    };

    if (from in volumeUnits && to in volumeUnits) {
        return (numericAmount * volumeUnits[from]) / volumeUnits[to];
    }

    if (from in weightUnits && to in weightUnits) {
        return (numericAmount * weightUnits[from]) / weightUnits[to];
    }

    return null;
}

export function getCompatibleDisplayUnit(sourceUnit, preferredUnit = getPreferredMeasurementUnit()) {
    if (convertMeasurement(1, sourceUnit, preferredUnit) !== null) {
        return normalizeUnit(preferredUnit);
    }

    return normalizeUnit(sourceUnit) || preferredUnit || "cl";
}

export function formatAmount(value, unit) {
    const number = Number(value || 0);
    const rounded = Math.round(number * 10) / 10;
    return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

function normalizeUnit(unit) {
    return String(unit || "").trim().toLowerCase();
}

function readStoredSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("Unable to read settings:", error);
        return null;
    }
}
