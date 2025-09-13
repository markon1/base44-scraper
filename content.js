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
                    const entities = Object.entries(data.entities).map(([name, entity]) => ({ ...entity }));

                    const output = {
                        appId: data.id,
                        appName: data.name,
                        scrapedAt: new Date().toISOString(),
                        version: chrome.runtime.getManifest().version,
                        entities: entities,
                    }

                    const filename = `output-${output.appId}-${output.scrapedAt}.json`;
                    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    console.log(output);
                })
                .catch(error => {
                    console.error(error);
                });
        });
    }
});
