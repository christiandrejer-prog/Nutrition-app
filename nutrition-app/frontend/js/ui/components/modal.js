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

function ensureConfirmModal() {
    let modal = document.getElementById("appConfirmModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "appConfirmModal";
        modal.tabIndex = -1;
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="appConfirmModalBody"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="appConfirmModalCancel">Cancel</button>
                        <button type="button" class="btn btn-danger" id="appConfirmModalConfirm">Delete</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    return modal;
}

// In-app replacement for window.confirm() so delete actions get a real,
// reliable dialog instead of a native browser confirm() (which some
// automated/embedded browser contexts silently auto-answer).
export function confirmAction(message, { confirmLabel = "Delete", cancelLabel = "Cancel" } = {}) {
    const modal = ensureConfirmModal();
    const body = modal.querySelector("#appConfirmModalBody");
    const cancelBtn = modal.querySelector("#appConfirmModalCancel");
    const confirmBtn = modal.querySelector("#appConfirmModalConfirm");

    body.textContent = message;
    cancelBtn.textContent = cancelLabel;
    confirmBtn.textContent = confirmLabel;

    const instance = bootstrap.Modal.getOrCreateInstance(modal, { backdrop: "static" });

    // Bootstrap doesn't raise z-index for a modal opened on top of another
    // already-open modal, so force this one (and its backdrop) above any
    // modal it may be layered over.
    modal.style.zIndex = 1070;
    const raiseBackdrop = () => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const topBackdrop = backdrops[backdrops.length - 1];
        if (topBackdrop) topBackdrop.style.zIndex = 1065;
    };
    modal.addEventListener('shown.bs.modal', raiseBackdrop, { once: true });

    return new Promise(resolve => {
        let settled = false;

        const onCancel = () => {
            settled = true;
            resolve(false);
            instance.hide();
        };

        const onConfirm = () => {
            settled = true;
            resolve(true);
            instance.hide();
        };

        const onHidden = () => {
            if (!settled) resolve(false);
            cancelBtn.removeEventListener("click", onCancel);
            confirmBtn.removeEventListener("click", onConfirm);
        };

        cancelBtn.addEventListener("click", onCancel);
        confirmBtn.addEventListener("click", onConfirm);
        modal.addEventListener("hidden.bs.modal", onHidden, { once: true });

        instance.show();
    });
}
