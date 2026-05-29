// profile-view.js responsibilities:
    // Renders the profile view in the browser


// ###########################################################

const PROFILE_PREFERENCES_KEY = "nutrition_app_profile_preferences";

const DEFAULT_PREFERENCES = {
    bodyGoal: "maintain",
    budgetMealPlanning: false
};

const BODY_GOALS = [
    {
        value: "gain",
        label: "Gaining weight",
        description: "Future meal suggestions will lean toward a kcal surplus."
    },
    {
        value: "lose",
        label: "Losing weight",
        description: "Future meal suggestions will lean toward a kcal deficit."
    },
    {
        value: "maintain",
        label: "Maintaining weight",
        description: "Future meal suggestions will target maintenance."
    }
];

export function renderProfileOutput() {
    const out = document.getElementById('appOutputSection');
    const preferences = getProfilePreferences();

    out.innerHTML = `
        <h2>Profile</h2>
        <div class="row g-3">
            <div class="col-12 col-lg-5">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Account</h5>
                        <p class="card-text text-muted">Account placeholder output. User login and saved nutrition details will live here later.</p>
                        <p class="mt-3"><strong><i>(W.I.P.)</i></strong></p>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-7">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Meal Preferences</h5>
                        <p class="card-text text-muted">These settings are saved locally for now and can later move into the user profile table.</p>

                        <div class="profile-preference-list">
                            ${BODY_GOALS.map(goal => `
                                <label class="profile-preference-option">
                                    <input
                                        class="form-check-input"
                                        type="radio"
                                        name="profileBodyGoal"
                                        value="${goal.value}"
                                        ${preferences.bodyGoal === goal.value ? "checked" : ""}
                                    >
                                    <span>
                                        <strong>${goal.label}</strong>
                                        <small>${goal.description}</small>
                                    </span>
                                </label>
                            `).join("")}

                            <label class="profile-preference-option">
                                <input
                                    id="profileBudgetMealPlanning"
                                    class="form-check-input"
                                    type="checkbox"
                                    ${preferences.budgetMealPlanning ? "checked" : ""}
                                >
                                <span>
                                    <strong>Budget meal planning</strong>
                                    <small>Can be combined with one of the weight goals. Future suggestions can prioritize cheaper meals.</small>
                                </span>
                            </label>
                        </div>

                        <div class="d-flex gap-2 flex-wrap mt-3">
                            <button id="profileSavePreferencesBtn" class="btn btn-primary btn-sm" type="button">
                                <i class="bi bi-save me-1"></i>Save preferences
                            </button>
                            <button id="profileResetPreferencesBtn" class="btn btn-outline-secondary btn-sm" type="button">
                                Reset
                            </button>
                        </div>
                        <div id="profilePreferencesStatus" class="small text-muted mt-2"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    initProfilePreferences(out);
}

function initProfilePreferences(root) {
    root.querySelector("#profileSavePreferencesBtn")?.addEventListener("click", () => {
        const bodyGoal = root.querySelector("input[name='profileBodyGoal']:checked")?.value || DEFAULT_PREFERENCES.bodyGoal;
        const budgetMealPlanning = Boolean(root.querySelector("#profileBudgetMealPlanning")?.checked);

        saveProfilePreferences({
            bodyGoal,
            budgetMealPlanning
        });

        showPreferenceStatus(root, "Preferences saved.");
    });

    root.querySelector("#profileResetPreferencesBtn")?.addEventListener("click", () => {
        localStorage.removeItem(PROFILE_PREFERENCES_KEY);
        renderProfileOutput();
    });
}

function getProfilePreferences() {
    try {
        const stored = localStorage.getItem(PROFILE_PREFERENCES_KEY);
        return {
            ...DEFAULT_PREFERENCES,
            ...(stored ? JSON.parse(stored) : {})
        };
    } catch (error) {
        console.warn("Unable to read profile preferences:", error);
        return { ...DEFAULT_PREFERENCES };
    }
}

function saveProfilePreferences(preferences) {
    localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify({
        ...DEFAULT_PREFERENCES,
        ...preferences
    }));
}

function showPreferenceStatus(root, message) {
    const status = root.querySelector("#profilePreferencesStatus");
    if (status) {
        status.textContent = message;
    }
}
