// Create notification element
function createNotification() {
    const notification = document.createElement('div');
    notification.className = 'base44-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <h3 class="notification-title">Upload Progress</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="notification-content">
            <div class="upload-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar"></div>
                </div>
                <div class="upload-status">Preparing uploads...</div>
            </div>
        </div>
    `;
    
    // Add close button functionality
    const closeButton = notification.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    });
    
    document.body.appendChild(notification);
    // Trigger reflow
    void notification.offsetWidth;
    notification.classList.add('visible');
    
    return {
        element: notification,
        updateProgress: (current, total, message) => {
            const progress = Math.round((current / total) * 100);
            const progressBar = notification.querySelector('.progress-bar');
            const statusText = notification.querySelector('.upload-status');
            
            progressBar.style.width = `${progress}%`;
            statusText.textContent = message || `Uploading ${current} of ${total} files...`;
            
            if (current === total) {
                notification.classList.add('notification-success');
                statusText.textContent = 'All data uploaded successfully!';
                
                // Auto-close after 5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }, 5000);
            }
        },
        showError: (message) => {
            notification.classList.add('notification-error');
            const statusText = notification.querySelector('.upload-status');
            statusText.textContent = message || 'An error occurred during upload.';
            
            // Change close button to red
            const closeButton = notification.querySelector('.close-button');
            closeButton.style.color = '#dc3545';
            
            // Don't auto-close on error
        }
    };
}

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
        // Create notification
        const notification = createNotification();
        let completedUploads = 0;
        const totalFiles = request.files.length;
        
        // Update initial status
        notification.updateProgress(0, totalFiles, 'Starting uploads...');
        
        chrome.storage.local.get('base44AppAuthHeader', (result) => {
            const uploadPromises = request.files.map((file, index) => {
                return new Promise((resolve, reject) => {
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
                        console.log('Upload successful:', data);
                        completedUploads++;
                        notification.updateProgress(
                            completedUploads, 
                            totalFiles, 
                            `Uploaded ${file.name} (${completedUploads}/${totalFiles})`
                        );
                        resolve(data);
                    })
                    .catch(error => {
                        console.error('Upload failed:', error);
                        notification.showError(`Failed to upload ${file.name}: ${error.message}`);
                        reject(error);
                    });
                });
            });
            
            // Process all uploads in parallel but track completion
            Promise.allSettled(uploadPromises)
                .then(results => {
                    const failed = results.filter(r => r.status === 'rejected').length;
                    if (failed > 0) {
                        notification.showError(`${failed} of ${totalFiles} uploads failed. See console for details.`);
                    }
                });
        });
    }
});
