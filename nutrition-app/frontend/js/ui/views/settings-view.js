// settings-view.js responsibilities:
    // Renders the settings view in the browser

// ###########################################################

export function renderSettingsOutput() {
    const out = document.getElementById('appOutputSection');
    const dark = localStorage.getItem('app_dark_mode') === '1';
    out.innerHTML = `
        <h2>Settings</h2>
        <div class="card mb-3"><div class="card-body">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="darkModeToggle" ${dark ? 'checked' : ''}>
                <label class="form-check-label" for="darkModeToggle">Dark mode</label>
            </div>
            <p class="text-muted mt-2">Settings are work-in-progress. Changes stored locally.</p>
        </div></div>
    `;

    const toggle = document.getElementById('darkModeToggle');
    toggle.addEventListener('change', (e) => {
        const on = e.target.checked;
        if (on) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('app_dark_mode', '1');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.removeItem('app_dark_mode');
        }
    });
}