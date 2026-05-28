



async function submitAddMealPrep() {
    const name = document.getElementById('modalMealPrepName').value.trim();
    if (!name) { alert('Enter meal prep name'); return; }
    const response = await fetch(`${getApiUrl()}/meals/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateMealPrep');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalMealPrepName').value = '';
        await loadMeals();
    } else {
        alert('Failed to add meal prep');
    }
}