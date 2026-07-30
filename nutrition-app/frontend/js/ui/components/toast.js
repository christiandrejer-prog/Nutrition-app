let stackEl = null;

function ensureToastStack() {
    if (stackEl) return stackEl;

    stackEl = document.createElement("div");
    stackEl.className = "toast-stack";
    stackEl.setAttribute("aria-live", "polite");
    document.body.appendChild(stackEl);
    return stackEl;
}

export function showToast(message, { type = "success", duration = 2500 } = {}) {
    const stack = ensureToastStack();

    const toast = document.createElement("div");
    toast.className = `app-toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    const remove = () => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    };

    setTimeout(remove, duration);
}

export function showSaveSuccessToast(message = "Save successful") {
    showToast(message, { type: "success" });
}
