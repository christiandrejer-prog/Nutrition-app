// home-view.js responsibilities:
    // Renders the home view in the browser

// ###########################################################

export function renderHomeOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;
    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Home</h3>
                <div class="card mb-3">
                    <div class="card-body">
                        <p>Welcome to the Nutrition App!</p>
                        <p>Use the sidebar to navigate through different sections of the app.</p>
                    </div>
                </div>
            </div>


            <p>This area is still a work in progress. Just as the rest of the app.</p>
            <p>Soon to work on:
                <ul>
                    <li> - Quick add/remove consumed meals and drinks to list <strong><i>(Done - testing)</i></strong></li>
                    <li> - Implement View buttons in all search modals <strong><i>(Done - testing)</i></strong></li>
                    <li> - Create the add ingredients to drink modal <strong><i>(Done - testing)</i></strong></li>
                    <li> - Create the add food to meal modal <strong><i>(Done - testing)</i></strong></li>
                    <li> - Update the modal for food details <strong><i>(Done - testing)</i></strong></li>
                    <li> - Create the edit button when viewing a food/meal/drink/drink-list details <strong><i>(Done - testing)</i></strong></li>
                    <li> - Implement the edit button for each search view <strong><i>(Done - testing)</i></strong></li>
                    <li> - Fix the add nutrients to food modal <strong><i>(W.I.P)</i></strong></li>
                    <li> - Update database to have more data <strong><i>(W.I.P)</i></strong></li>
                    <li> - Make a new sidebar section for maintenance calculations</li>
                    <li> - Make settings placeholder options / buttons and also a way to save the state <strong><i>(Done - testing)</i></strong></li>
                    <li> - Make it possible to change viewing measurements (ml / cl / and so on) <strong><i>(Done - testing)</i></strong></li>
                    <li> - Add an extended details view for drinks - for kcal and price to make</li>
                    <li> - Update the drinks graphs (To show pr liter or per full unit on y-axis. E.g. for vodka a full unit is 70 cl)</li>
                    <li> - Find a better way to select a unit when adding a food to a meal. Now its 'cl' default - dosnt make sense for pasta for exampel. </li>
                    <li> - Update 'Today's intake', 'Maintenance' and 'Activity' card to look better and more minimalistic. </li>
                    <li> - Implement the 'Stock' tab in drinks dashboard</li>
                    <li> - Implement the 'Shopping' tab in drinks dashboard</li>
                    <li> - Add categories for everything in the database for easy filter based searching and later to work with preference recormendations</li>
                </ul>
            </p>
        </div>
        <div class="card mb-3">
            <textarea class="form-control"
                    id="feedbackInput"
                    maxlength="200"
                    rows="3"
                    placeholder="Have feedback or want to contribute? Type it here and press Enter..."
                    onfocus="this.placeholder='Type your feedback and press Enter...';"
                    onblur="this.placeholder='Have feedback or want to contribute?';"
                    onkeydown="if(event.key === 'Enter') submitFeedback();"
                    oninput="updateCount()">
            </textarea>

            <small id="count">0 / 200</small>
        </div>
    `;

    output.scrollIntoView({behavior: 'smooth'});
}
