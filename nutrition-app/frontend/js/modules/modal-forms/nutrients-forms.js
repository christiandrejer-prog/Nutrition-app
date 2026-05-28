





async function submitAddNutrient() {
    const name = document.getElementById('modalNutrientName').value.trim();
    const unit = document.getElementById('modalNutrientUnit').value.trim();
    if (!name || !unit) { alert('Enter name and unit'); return; }
    const response = await fetch(`${getApiUrl()}/nutrients/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, unit})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        // hide modal
        const m = document.getElementById('modalAddNutrient');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        await loadNutrients();
    } else {
        alert('Failed to add nutrient');
    }
}