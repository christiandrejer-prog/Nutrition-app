// status-view.js responsibilities:
    // Renders the status view in the browser


// ###########################################################

import { getApiUrl, setApiUrlFromInput } from "../../config.js";
import { escapeHtml } from "../../utils.js";
import { loadStatus } from "../../modules/status.js";

export async function renderStatusOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="card mb-4 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h3 class="h5 mb-1">System Status</h3>
                    <p class="text-muted mb-0">Checks backend and database availability.</p>
                </div>
                <input type="text" id="apiUrlInput" class="form-control form-control-sm w-auto" placeholder="API URL" value="${escapeHtml(getApiUrl())}" style="max-width: 300px;" oninput="setApiUrlFromInput()">
                <button class="btn btn-sm btn-outline-primary" type="button" data-action="status">Refresh</button>
            </div>
            <div class="card-body" id="statusInfo">
                <p>Loading backend status...</p>
            </div>
        </div>
    `;
    await loadStatus();
    output.scrollIntoView({behavior: 'smooth'});
}
