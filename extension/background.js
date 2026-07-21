// Background script for Pomodoro Lock & Reward (Service Worker V3)
// Jules

let cachedState = {
    currentState: "IDLE",
    blockedDomains: ["youtube.com", "facebook.com", "twitter.com", "instagram.com"]
};

// Listen to extension installs or service worker startup
chrome.runtime.onInstalled.addListener(() => {
    console.log("Pomodoro Extension Installed!");
    chrome.storage.local.get(["extensionState"], (result) => {
        if (result.extensionState) {
            cachedState = result.extensionState;
        }
        updateBlockingRules();
    });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["extensionState"], (result) => {
        if (result.extensionState) {
            cachedState = result.extensionState;
        }
        updateBlockingRules();
    });
});

// Listen to incoming messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "STATE_CHANGE") {
        cachedState = message.state;
        chrome.storage.local.set({ extensionState: cachedState }, () => {
            updateBlockingRules();
        });
        sendResponse({ success: true });
    } else if (message.action === "GET_CURRENT_STATE") {
        sendResponse({ state: cachedState });
    }
    return true; // async sendResponse
});

// Update blocking rules based on state
function updateBlockingRules() {
    // If declarativeNetRequest is not supported or not present, return early
    if (!chrome.declarativeNetRequest) {
        console.warn("declarativeNetRequest API not available.");
        return;
    }

    const domainsToBlock = cachedState.blockedDomains || [];
    const currentState = cachedState.currentState;

    // Rules logic:
    // If state is REWARD -> Free internet access! (No rules applied).
    // If state is IDLE, WORK, or AWAITING_CONFIRMATION -> block the domains.
    const shouldBlock = (currentState === "IDLE" || currentState === "WORK" || currentState === "AWAITING_CONFIRMATION");

    if (!shouldBlock || domainsToBlock.length === 0) {
        // Remove all rules
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const existingIds = rules.map(r => r.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingIds
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error removing rules:", chrome.runtime.lastError);
                } else {
                    console.log("All blocking rules removed (Internet access unrestricted). State:", currentState);
                }
            });
        });
    } else {
        // Block the domains
        // Clear existing rules first and add the new ones using clean requestDomains matching
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const existingIds = rules.map(r => r.id);

            // Generate rules using standard requestDomains (which automatically matches subdomains)
            const newRules = domainsToBlock.map((domain, index) => {
                const ruleId = index + 1; // rule IDs must be >= 1

                return {
                    id: ruleId,
                    priority: 1,
                    action: {
                        type: "redirect",
                        redirect: { extensionPath: "/blocked.html" }
                    },
                    condition: {
                        requestDomains: [domain],
                        resourceTypes: ["main_frame", "sub_frame"]
                    }
                };
            });

            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingIds,
                addRules: newRules
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error updating rules:", chrome.runtime.lastError);
                } else {
                    console.log(`Redirecting ${domainsToBlock.length} domains to blocked.html. State:`, currentState, "Rules added:", newRules.length);
                }
            });
        });
    }
}
