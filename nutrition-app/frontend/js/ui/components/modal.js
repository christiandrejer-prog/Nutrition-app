export function ensureAppModal() {
    let modal = document.getElementById("appDynamicModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "appDynamicModal";
        modal.tabIndex = -1;
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="appDynamicModalTitle"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="appDynamicModalBody"></div>
                    <div class="modal-footer" id="appDynamicModalFooter"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    return modal;
}

export function openFormModal({
    title,
    body,
    submitLabel = "Save",
    cancelLabel = "Cancel",
    size = "",
    onCancel,
    onHidden,
    onSubmit
}) {
    const modal = ensureAppModal();
    const dialog = modal.querySelector(".modal-dialog");
    const titleEl = modal.querySelector("#appDynamicModalTitle");
    const bodyEl = modal.querySelector("#appDynamicModalBody");
    const footerEl = modal.querySelector("#appDynamicModalFooter");

    if (modal._appDynamicHiddenHandler) {
        modal.removeEventListener("hidden.bs.modal", modal._appDynamicHiddenHandler);
        modal._appDynamicHiddenHandler = null;
    }

    dialog.className = `modal-dialog ${size}`.trim();
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    footerEl.innerHTML = `
        <button type="button" class="btn btn-secondary" id="appDynamicModalCancel" ${onCancel ? "" : 'data-bs-dismiss="modal"'}>${cancelLabel}</button>
        <button type="button" class="btn btn-primary" id="appDynamicModalSubmit">${submitLabel}</button>
    `;

    const instance = bootstrap.Modal.getOrCreateInstance(modal);
    modal.querySelector("#appDynamicModalCancel").addEventListener("click", async () => {
        await onCancel?.(modal);
    });

    modal.querySelector("#appDynamicModalSubmit").addEventListener("click", async () => {
        await onSubmit?.(modal);
    });

    if (onHidden) {
        modal._appDynamicHiddenHandler = async () => {
            await onHidden(modal);
            modal._appDynamicHiddenHandler = null;
        };
        modal.addEventListener("hidden.bs.modal", modal._appDynamicHiddenHandler, { once: true });
    }

    instance.show();
    return modal;
}

export function closeAppModal() {
    const modal = document.getElementById("appDynamicModal");
    if (modal && typeof bootstrap !== "undefined") {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}
