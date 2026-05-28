import { escapeHtml } from "../../utils.js";

let activeHoverBox = null;

export function showHoverBox(anchor, lines = []) {
    hideHoverBox();

    activeHoverBox = document.createElement("div");
    activeHoverBox.className = "drink-hover-box";
    activeHoverBox.innerHTML = lines
        .map(line => `<div>${escapeHtml(String(line))}</div>`)
        .join("");

    document.body.appendChild(activeHoverBox);

    const rect = anchor.getBoundingClientRect();
    activeHoverBox.style.left = `${rect.left}px`;
    activeHoverBox.style.top = `${rect.bottom + 10}px`;
}

export function hideHoverBox() {
    if (!activeHoverBox) return;
    activeHoverBox.remove();
    activeHoverBox = null;
}
