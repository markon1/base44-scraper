// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "buttonClicked") {
        const id = document.location.href.split('/apps/')[1].split('/')[0];
        const apiURL = `https://app.base44.com/api/apps/${id}`;
        
        chrome.storage.local.get('authHeader', (result) => {
            fetch(apiURL, {
                headers: {
                    'Authorization': result.authHeader
                }
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                })
                .catch(error => {
                    console.error(error);
                });
        });
    }
});
