// profile-view.js responsibilities:
    // Renders the profile view in the browser


// ###########################################################

export function renderProfileOutput() {
    const out = document.getElementById('appOutputSection');
    out.innerHTML = `
        <h2>Profile</h2>
        <div class="card mb-3"><div class="card-body">
            <p>Account placeholder output. (Click account in the sidebar for this view)</p>
            <p class="text-muted">(W.I.P.)</p>
        </div></div>
    `;
}