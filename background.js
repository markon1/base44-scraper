// Listen for toolbar button click
chrome.action.onClicked.addListener((tab) => {
    // Check if we're on a base44.com page
    if (tab.url && tab.url.includes('app.base44.com')) {
        // Send a message to the content script
        chrome.tabs.sendMessage(tab.id, { action: "buttonClicked" });
    } else {
        console.log("This extension only works on app.base44.com");
    }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const authHeader = details.requestHeaders.find(h => h.name.toLowerCase() === "authorization");
        if (authHeader) {
            chrome.storage.local.set({ authHeader: authHeader.value });
        }
    },
    { urls: ["https://app.base44.com/*", "*://base44.app/apps/*"] },
    ["requestHeaders"]
);

