




function applyStoredTheme() {
    if (localStorage.getItem('app_dark_mode') === '1') {
        document.body.classList.add('dark-mode');
    }
}