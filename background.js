chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const authHeader = details.requestHeaders.find(h => h.name.toLowerCase() === "authorization");
        if (authHeader) {
            chrome.storage.local.set({ base44comAuthHeader: authHeader.value });
        }
    },
    { urls: ["https://app.base44.com/*"] },
    ["requestHeaders"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const authHeader = details.requestHeaders.find(h => h.name.toLowerCase() === "authorization");
        if (authHeader) {
            chrome.storage.local.set({ base44AppAuthHeader: authHeader.value });
        }
    },
    { urls: ["https://base44.app/*"] },
    ["requestHeaders"]
);

