




async function submitFeedback() {
    const input = document.getElementById("feedbackInput");
    const message = input.value;

    if (!message.trim()) return;

    await fetch(`${getApiUrl()}/feedback`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message
        })
    });

    console.log("Feedback sent:", message);

    input.value = "";
    alert("Thank you for your feedback!");
    updateCount(); // resets counter to 0
}