// home-view.js responsibilities:
    // Renders the home view in the browser

// ###########################################################

const STATUS = {
    done: { label: "Done", badge: "bg-success" },
    fixed: { label: "Fixed", badge: "bg-success" },
    wip: { label: "W.I.P", badge: "bg-warning text-dark" },
    bug: { label: "Bug", badge: "bg-danger" },
    planned: { label: "Planned", badge: "bg-secondary" },
    idea: { label: "Idea", badge: "bg-info text-dark" }
};

const CHECKLIST = [
    {
        title: "General",
        items: [
            { text: "Quick add/remove consumed meals and drinks to list", status: "done" },
            { text: "Implement View buttons in all search modals", status: "done" },
            { text: "Create the edit button when viewing a food/meal/drink/drink-list details", status: "done" },
            { text: "Implement the edit button for each search view", status: "done" },
            { text: "Reliable delete-confirmation flow (custom confirm dialog) across the app", status: "done" },
            { text: "Save-success toast notifications", status: "done" },
            { text: "Make settings placeholder options / buttons and also a way to save the state", status: "done" },
            { text: "Make it possible to change viewing measurements (ml / cl / and so on)", status: "done" },
            { text: "Dark mode as the default theme", status: "done" },
            { text: "Update database to have more data", status: "wip" },
            { text: "Bug: negative macro values can be entered on a food", status: "bug" },
            { text: "Bug: more than 100g combined of protein/carbs/fat can be entered per 100g (should cap at 100g total)", status: "bug" },
            { text: "Fix non-functional Create/Edit/View buttons in Meals and Drinks search - should behave like the Foods ones. Also: details on top, edit-macros view only on click, Delete is missing in Foods, and calories should show first followed by a fixed nutrient order matching food labels.", status: "bug" },
            { text: "Fix modal layering: clicking Create from a search modal should close the search modal and open Create, then return to search afterwards - not stack underneath it", status: "bug" },
            { text: "General code/error-handling pass once user-facing bugs are found", status: "planned" },
            { text: "System Status page layout: labels and values should sit side by side, not stacked in two separate columns", status: "planned" },
            { text: "Find a better way to select a unit when adding a food to a meal. Now its 'cl' default - doesn't make sense for pasta for example.", status: "planned" },
            { text: "Add categories for everything in the database for easy filter based searching and later to work with preference recommendations", status: "planned" },
            { text: "Maybe add a way to edit foods inside the meal editing and same for drinks and drink-lists?", status: "idea" },
            { text: "Split the single-page frontend into separate pages instead of everything in one place", status: "planned" },
            { text: "Add a way to view the history of a food, meal, drink, or drink-list (when it was created, when it was edited, and what changed)", status: "planned" },
            { text: "When deleting an item, show the item that is being deleted - now its just delete this drink / food / meal", status: "planned" },
            { text: "Make the edit modals more user-friendly. No big layout change, more intuitive interactions and more simplistic/minimalistic", status: "planned"},
            { text: "Fix Cancel buttons actually being back buttons", status: "planned" },
            { text: "When viewing items in seach then it should say what item is being viewed on the modal", status: "planned" },
            { text: "Make a toast notification for when something isnt posstible e.g. adding over 100g of a nutrient to a food pr. 100 grams", status: "planned" },
            { text: "Keep future per-unit/per-liter graph plans in mind while coding new chart features", status: "planned" }
        ]
    },
    {
        title: "Meal Dashboard",
        items: [
            { text: "Create the add food to meal modal", status: "done" },
            { text: "Update the modal for food details", status: "done" },
            { text: "Nutrient editor: show the actual nutrient name (not 'nutrient x'), and add an 'Add nutrient' button next to Save Macros to pick one from the database or create a new nutrient entry", status: "wip" },
            { text: "Consumed meals list: show just the meal name + HH:MM timestamp, reveal macros/kcal on hover for a more compact card", status: "planned" },
            { text: "Swap the sidebar's meal-add button icon from a plus to a meal icon", status: "planned" },
            { text: "Today's Intake: replace 'view intake details' with a macro pie chart underneath, hover a wedge for its numeric + percentage value", status: "planned" },
            { text: "Make the nutrient viewing better, so its looks more like a food label", status: "planned" },
            { text: "Renamed 'Daily Target' to 'Energy Target' with a Daily/Weekly toggle, a 24-hour cumulative-intake chart (daily) and a 7-day today±3 chart (weekly)", status: "done" },
            { text: "Confidence interval band around the energy target line, toggle on the dashboard + width configurable in Settings", status: "done" },
            { text: "TEF is now calculated from actually-logged macros (protein+carbs+fat) once >=3 days are logged, falling back to the manual protein input otherwise", status: "done" },
            { text: "History tab: replaced the placeholder 'Kcal History' with a real rolling 7-day Energy Balance card (surplus one day cancels a deficit the next, instead of judging each day alone) and a real Goal Balance card", status: "done" },
            { text: "Added basic weight logging (Planning tab) as groundwork for a future fully-adaptive, weight-trend-calibrated maintenance estimate", status: "done" },
            { text: "Planned: true adaptive TDEE calibration - use logged weight trend vs. logged intake to correct the Mifflin-St Jeor estimate over time, once enough weight history exists", status: "planned" },
            { text: "Macro Trend (History tab): protein/carbs/fat as a % of target, trended over the same rolling window - still a placeholder", status: "planned" }
        ]
    },
    {
        title: "Drinks Dashboard",
        items: [
            { text: "Create the add ingredients to drink modal", status: "done" },
            { text: "Add an extended details view for drinks - for kcal and price to make", status: "done" },
            { text: "Update the drinks graphs to show bottle/unit boundaries on the y-axis (e.g. a full 70cl bottle of vodka)", status: "done" },
            { text: "Implement the 'Stock' tab in drinks dashboard", status: "done" },
            { text: "Implement the 'Shopping' tab in drinks dashboard", status: "done" },
            { text: "Recipe card with step-by-step instructions per drink", status: "done" },
            { text: "'Compare to list' modes for Available Drinks and Missing Ingredients", status: "done" },
            { text: "Original 3-panel Drink Prep spec (totals/graph, create drink + add ingredients, third panel reserved for garnish) - fully realized via Prep Totals, Drink Prep, and the Garnish System", status: "done" },
            { text: "Drinks feature to calculate what to buy for a list and find other drinks sharing the same ingredients", status: "done" },
            { text: "Predicted Drinks card (Shopping tab) - suggest what to buy based on past usage", status: "planned" },
            { text: "Budget card (Shopping tab) - budget-based shopping predictions / optimize purchases against a budget", status: "planned" },
            { text: "Maybe a color coding system for the different drinks in the bar chart for Prep totals?", status: "idea" },
            { text: "Maybe change the recipe card design to have icons and sections for glass and ice type, build or shake instructions and garnish (PS style)?", status: "idea"},
            { text: "Add more drinks and their recipes and for existing drinks update the recipes", status: "done"},
            { text: "In Drink Prep, the delete button should not change the layout when clicked in relation to the text on the button", status: "fixed"},
            { text: "In Drink Prep, the 'add drink to list' button uses a browser display message. Should be a custom modal or toast notification - and made universal", status: "bug"},
            { text: "In Drink Prep, when deleting through the delete button, no confirmation is shown", status: "fixed"},
            { text: "Update drinks so a drink can take different types of spirits - not just the specific one used in the drink editor. E.g. Gin and Gin 40% can both be used for a drink needing Gin", status: "planned"},
            { text: "Fixed: Aperol Spritz was missing Aperol itself as an ingredient", status: "fixed"},
            { text: "Add a 'Maritime Party' drink list (nautical/rum-forward theme: Painkiller, Navy Grog, Hurricane, Rum Runner, Bahama Mama, Blue Hawaiian, plus Dark 'n Stormy, Sea Breeze, Blue Lagoon, Salty Dog, Mai Tai, Zombie)", status: "done"},
            { text: "Maybe add a way to deselect a drinks list", status: "idea"}
        ]
    },
    {
        title: "Garnish System",
        items: [
            { text: "Garnish data model: per-drink essential vs. decorative, with suggested per-type defaults", status: "done" },
            { text: "Add/edit/remove garnishes on a drink from the drink edit modal", status: "done" },
            { text: "Prep Totals: garnish-needed summary for the selected list", status: "done" },
            { text: "Stock Overview: garnish stock tracking, add/remove/clear", status: "done" },
            { text: "Garnish source items are real Foods (brand + price, reusable in the Meal Dashboard)", status: "done" },
            { text: "Shopping List: garnish purchases priced and folded into the estimated cost to buy", status: "done" },
            { text: "\"Ignore garnish\" override toggle for Available Drinks, for when garnish isn't essential to serve", status: "done" }
        ]
    },
    {
        title: "Barcode Scanning & Product Database",
        items: [
            { text: "Check/extend barcode scanning functionality", status: "planned" },
            { text: "Find a database of Danish products with barcodes and metadata for the general database", status: "planned" }
        ]
    },
    {
        title: "Nutrition & Calculations",
        items: [
            { text: "Build a 'Calculate maintenance' sidebar page: weekly-averaged (not just daily) kcal calculation, science-based, accounting for activity level and protein intake", status: "planned" },
            { text: "Expand 'nutrients' to include micro nutrients (sodium, caffeine, creatine, etc.) and implement throughout the app", status: "planned" },
            { text: "Add fiber's nutritional value", status: "planned" }
        ]
    },
    {
        title: "User Accounts & Personalization",
        items: [
            { text: "User accounts: save personal nutrition details/history between sessions", status: "planned" },
            { text: "Let users view and share other users' meals and meal-prep ideas", status: "planned" },
            { text: "Personal goals: budget target, weight loss/gain, weight maintenance, etc., with personalized suggestions", status: "planned" }
        ]
    },
    {
        title: "Deployment & Infrastructure",
        items: [
            { text: "Bug: check Render backend logs for the current deploy error - likely a missing DB column/migration", status: "bug" },
            { text: "Learn GitHub Actions + Render workflow for smoother debugging and deploys", status: "planned" },
            { text: "Test the live site from other devices", status: "planned" },
            { text: "Look into mobile app support", status: "planned" },
            { text: "Make the app database persistent - now it resets after becoming idle", status: "planned" }
        ]
    },
    {
        title: "Product Vision",
        items: [
            { text: "Two-tier food database: a flexible user-editable database plus a separately verified one, with a promotion path between them", status: "planned" },
            { text: "App is primarily mobile-first long term, with web as a secondary experience", status: "idea" }
        ]
    }
];

function slugify(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function renderChecklistItem({ text, status }) {
    const meta = STATUS[status] || STATUS.planned;
    const textClass = status === "done" || status === "fixed" ? "text-decoration-line-through text-muted" : "";

    return `
        <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent gap-3">
            <span class="${textClass}">${text}</span>
            <span class="badge ${meta.badge} flex-shrink-0">${meta.label}</span>
        </li>
    `;
}

function renderChecklistSection({ title, items }) {
    const doneCount = items.filter(item => item.status === "done" || item.status === "fixed").length;
    const sectionId = `checklist-section-${slugify(title)}`;

    return `
        <div class="card mb-3">
            <div class="card-body">
                <button
                    class="checklist-section-toggle btn btn-link text-decoration-none w-100 d-flex justify-content-between align-items-center p-0 collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#${sectionId}"
                    aria-expanded="false"
                    aria-controls="${sectionId}"
                >
                    <span class="fw-semibold">${title}</span>
                    <span class="small text-muted d-flex align-items-center gap-1">
                        ${doneCount}/${items.length} done
                        <i class="bi bi-chevron-down"></i>
                    </span>
                </button>
                <div class="collapse" id="${sectionId}">
                    <ul class="list-group list-group-flush mt-2">
                        ${items.map(renderChecklistItem).join("")}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

export function renderHomeOutput() {
    const output = document.getElementById('appOutputSection');
    if (!output) return;

    const totalDone = CHECKLIST.reduce((sum, section) => sum + section.items.filter(i => i.status === "done" || i.status === "fixed").length, 0);
    const totalItems = CHECKLIST.reduce((sum, section) => sum + section.items.length, 0);

    output.innerHTML = `
        <div class="mb-4">
            <h3 class="mb-3">Home</h3>
                <div class="card mb-3">
                    <div class="card-body">
                        <p>Welcome to the Nutrition App!</p>
                        <p>Use the sidebar to navigate through different sections of the app.</p>
                        <p>This area is still a work in progress. Just as the rest of the app.</p>
                    </div>
                </div>
        </div>


        <div class="card mb-3">
            <div class="card-body">
                <p>We are constantly working to improve the app and add new features. Your feedback is valuable to us!</p>
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
        </div>

        <div>
            <p class="small text-muted">
                Soon to work on (${totalDone}/${totalItems} done overall). Click a section to expand it.
                <span class="badge bg-success">Done</span> is finished and tested - safe to delete from this list.
                <span class="badge bg-danger">Bug</span> is a known issue to fix.
            </p>

            ${CHECKLIST.map(renderChecklistSection).join("")}
        </div>

    `;

    output.scrollIntoView({behavior: 'smooth'});
}
