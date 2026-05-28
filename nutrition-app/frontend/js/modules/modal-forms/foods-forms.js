





async function submitAddFood() {
    const name = document.getElementById('modalFoodName').value.trim();
    const brand = document.getElementById('modalFoodBrand').value.trim();
    const price = parseFloat(document.getElementById('modalFoodPrice').value) || 0;
    if (!name) { alert('Enter food name'); return; }
    const response = await fetch(`${getApiUrl()}/foods/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, brand, price})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalAddFood');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        await loadFoods();
    } else {
        alert('Failed to add food');
    }
}