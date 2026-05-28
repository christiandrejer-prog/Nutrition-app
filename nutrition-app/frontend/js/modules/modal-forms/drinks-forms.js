





async function submitAddDrink() {
    const name = document.getElementById('modalDrinkName').value.trim();
    if (!name) { alert('Enter drink name'); return; }
    const response = await fetch(`${getApiUrl()}/drinks/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateDrink');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalDrinkName').value = '';
        await loadDrinks();
    } else {
        alert('Failed to add drink');
    }
}


async function submitAddDrinkList() {
    const name = document.getElementById('modalDrinkListName').value.trim();
    if (!name) { alert('Enter drink list name'); return; }
    const response = await fetch(`${getApiUrl()}/drink-lists/`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name})
    }).catch(e => ({ok:false, error:e}));
    if (response && response.ok) {
        const m = document.getElementById('modalCreateDrinkList');
        if (m && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(m)?.hide();
        document.getElementById('modalDrinkListName').value = '';
        await loadDrinkLists();
    } else {
        alert('Failed to add drink list');
    }
}