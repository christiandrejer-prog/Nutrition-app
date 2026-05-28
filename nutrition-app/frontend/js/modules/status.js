// status.js responsibilities:
    // 1. Load and display the system status panel

// ###########################################################
import { getApiUrl, getApiUrlSourceLabel } from "../config.js";
import { escapeHtml } from "../utils.js";

export async function loadStatus() {
    const statusInfo = document.getElementById("statusInfo");
    if (!statusInfo) {
        return;
    }
    statusInfo.innerHTML = "<p>Checking backend and database status...</p>";

    try {
        let apiUrlObj;
        try {
            apiUrlObj = new URL(getApiUrl());
        } catch (e) {
            apiUrlObj = new URL(getApiUrl(), window.location.href);
        }

        const pageProtocol = window.location.protocol;
        const apiProtocol = apiUrlObj.protocol;

        if (pageProtocol === 'https:' && apiProtocol === 'http:') {
            statusInfo.innerHTML = `
                <div class="status-card">
                    <h3>Protocol warning</h3>
                    <div class="status-error">The page is served over HTTPS but the API is configured as HTTP (${escapeHtml(getApiUrl())}). Browser may block this request (mixed content).<br>Please run the backend with HTTPS or change the getApiUrl() to an HTTPS host, or open the frontend over HTTP for local testing.</div>
                </div>
            `;
        }

        const requestedUrl = `${getApiUrl().replace(/\/*$/,'')}/status/`;
        const response = await fetch(requestedUrl);
        let status;
        try {
            status = await response.json();
        } catch (parseErr) {
            const text = await response.text().catch(() => '(no body)');
            statusInfo.innerHTML = `<p class="status-error">Status endpoint returned non-JSON response (HTTP ${response.status})</p><p>Requested URL: ${escapeHtml(requestedUrl)}</p><pre>${escapeHtml(text)}</pre>`;
            return;
        }

        if (!response.ok) {
            statusInfo.innerHTML = `<p class="status-error">Status endpoint returned HTTP ${response.status} ${escapeHtml(response.statusText)}</p><p>Requested URL: ${escapeHtml(requestedUrl)}</p><pre>${escapeHtml(JSON.stringify(status, null, 2))}</pre>`;
            return;
        }

        const backend = status.backend || {};
        const database = status.database || {};
        const api = status.api || {};

        const apiHtml = Object.entries(api).map(([key, value]) => {
            const ok = value.available ? "OK" : "FAIL";
            return `<div class="status-row"><strong>${escapeHtml(key)}</strong>: ${ok} <span>${escapeHtml(value.url)}</span></div>`;
        }).join("");

        const dbCounts = database.counts || {};
        const dbCountHtml = Object.entries(dbCounts).map(([key, count]) => `<div class="status-row"><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(count))}</div>`).join("");

        statusInfo.innerHTML = `
            <div class="status-card">
                <h3>Backend</h3>
                <div class="status-row"><strong>Backend URL</strong>: ${escapeHtml(getApiUrl())}</div>
                <div class="status-row"><strong>URL Source</strong>: ${escapeHtml(getApiUrlSourceLabel())}</div>
                <div class="status-row"><strong>Message</strong>: ${escapeHtml(backend.message || "Unknown")}</div>
                <div class="status-row"><strong>Checked At</strong>: ${escapeHtml(status.checked_at || "-")}</div>
            </div>
            <div class="status-card">
                <h3>API Endpoints</h3>
                ${apiHtml}
            </div>
            <div class="status-card">
                <h3>Database</h3>
                <div class="status-row"><strong>File</strong>: ${escapeHtml(database.file || "Unknown")}</div>
                <div class="status-row"><strong>Reachable</strong>: ${database.reachable ? "OK" : "FAIL"}</div>
                <div class="status-row"><strong>Tables</strong>: ${escapeHtml((database.tables || []).join(", "))}</div>
                ${dbCountHtml}
                ${database.error ? `<pre class="status-error">${escapeHtml(database.error)}</pre>` : ""}
            </div>
        `;
    } catch (error) {
        const errText = `${error.name || 'Error'}: ${error.message || String(error)}`;
        statusInfo.innerHTML = `<p class="status-error">Unable to reach backend: ${escapeHtml(errText)}</p><pre class="status-error">${escapeHtml(JSON.stringify({stack: error.stack || null}, null, 2))}</pre>`;
    }
}
