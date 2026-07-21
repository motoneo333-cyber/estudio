// Client-side blocker content script
// Injected on all pages (<all_urls>) to catch bookmarks, cached loads, shortcuts, and navigation links.

(function() {
    // Skip checking if we are on the webapp itself or the extension pages
    const currentUrl = window.location.href;
    if (currentUrl.includes("localhost:3000") || currentUrl.includes(".vercel.app") || currentUrl.startsWith("chrome-extension://")) {
        return;
    }

    const currentHostname = window.location.hostname.toLowerCase();

    // Check storage local for latest state
    chrome.storage.local.get(["extensionState"], (result) => {
        if (chrome.runtime.lastError) return;
        if (!result || !result.extensionState) return;

        const { currentState, blockedDomains } = result.extensionState;

        // Only redirect if state is NOT REWARD and there are domains configured
        const shouldBlock = (currentState === "IDLE" || currentState === "WORK" || currentState === "AWAITING_CONFIRMATION");
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
    });
})();
