// Content script matching http://localhost:3000/* and Vercel deployments
// Relays window.postMessage events from Pomodoro Web App to extension's background.js service worker

console.log("Pomodoro extension content.js injected and ready!");

// Listen to window.postMessage events
window.addEventListener("message", (event) => {
    // Only trust messages from our own webapp
    if (event.data && event.data.source === "pomodoro-webapp") {
        const { action, state } = event.data;
        if (action === "STATE_CHANGE") {
            // Forward the action & state to background.js
            try {
                chrome.runtime.sendMessage({
                    action: "STATE_CHANGE",
                    state: state
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Silent catch if extension background is waking up or not ready
                    }
                });
            } catch (err) {
                console.error("Failed to relay message to extension background:", err);
            }
        }
    }
});

// Force the Web App to immediately broadcast its current state (authoritative sync) when content script loads
window.postMessage({
    source: "pomodoro-extension",
    action: "REQUEST_SYNC"
}, "*");

// Request initial state from background when loaded to sync extension's state (fallback)
chrome.runtime.sendMessage({ action: "GET_CURRENT_STATE" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.state) {
        // Send state to webapp if needed
        window.postMessage({
            source: "pomodoro-extension",
            action: "SYNC_STATE",
            state: response.state
        }, "*");
    }
});
