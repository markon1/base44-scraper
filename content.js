// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
        const id = document.location.href.split('/apps/')[1].split('/')[0];
        const apiURL = `https://app.base44.com/api/apps/${id}`;

        chrome.storage.local.get('base44comAuthHeader', (result) => {
            fetch(apiURL, {
                headers: {
                    'Authorization': result.base44comAuthHeader
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
    } else if (request.action === "importCSVs") {
        chrome.storage.local.get('base44AppAuthHeader', (result) => {
            request.files.forEach(file => {
                const id = document.location.href.split('/apps/')[1].split('/')[0];
                const entityId = file.name.replace("SecureFiles__", "").replace('.csv', '');
                const apiURL = `https://base44.app/api/apps/${id}/entities/${entityId}/import`;

                const formData = new FormData();
                const blob = new Blob([atob(file.content)], { type: 'text/csv' });
                formData.append('file', blob, file.name);

                fetch(apiURL, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': result.base44AppAuthHeader
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(data);
                })
                .catch(error => {
                    console.error(error);
                });
                
            });
        });
    }
});
