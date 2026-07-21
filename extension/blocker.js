// Client-side blocker content script
// Injected on all pages (<all_urls>) to catch bookmarks, cached loads, shortcuts, and navigation links.

(function() {
    // Skip checking if we are on the webapp itself or the extension pages
    const currentUrl = window.location.href;
    if (currentUrl.includes("localhost:3000") || currentUrl.includes(".vercel.app") || currentUrl.startsWith("chrome-extension://")) {
        return;
    }

    const currentHostname = window.location.hostname.toLowerCase();

    function checkAndRedirect(extensionState) {
        if (!extensionState) return;

        const { currentState, blockedDomains } = extensionState;

        // Block under IDLE, WORK, AWAITING_CONFIRMATION, and BREAK
        const shouldBlock = (currentState === "IDLE" || currentState === "WORK" || currentState === "AWAITING_CONFIRMATION" || currentState === "BREAK");
        if (!shouldBlock || !blockedDomains || blockedDomains.length === 0) {
            return;
        }

        // Check if current hostname is or is a subdomain of a blocked domain
        const isBlocked = blockedDomains.some((domain) => {
            const cleanDomain = domain.trim().toLowerCase();
            return currentHostname === cleanDomain || currentHostname.endsWith("." + cleanDomain);
        });

        if (isBlocked) {
            console.warn("Pomodoro Blocker: Access denied. Redirecting to concentration screen.");
            // Stop page execution by immediately redirecting
            window.location.replace(chrome.runtime.getURL("blocked.html?original=" + encodeURIComponent(currentUrl)));
        }
    }

    // Check immediately on script load
    chrome.storage.local.get(["extensionState"], (result) => {
        if (chrome.runtime.lastError) return;
        if (result && result.extensionState) {
            checkAndRedirect(result.extensionState);
        }
    });

    // Listen for storage changes in real-time to block open tabs instantly when state transitions
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.extensionState) {
            const newState = changes.extensionState.newValue;
            if (newState) {
                checkAndRedirect(newState);
            }
        }
    });
})();
