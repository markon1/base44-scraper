document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileList = document.getElementById('fileList');
    const scrapeBtn = document.getElementById('scrapeBtn');
    let files = [];

    // Handle file upload button click
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Parse CSV text to array of objects
    function parseCSV(csvText) {
        // Split the CSV into lines
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        // Extract headers (first line)
        const headers = lines[0].split(',').map(header => header.trim());

        // Process data rows
        return lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || ''; // Handle missing values with empty string
            });
            return obj;
        });
    }

    // Convert File object to ArrayBuffer
    function fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Convert ArrayBuffer to base64
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
        files = Array.from(event.target.files);
        updateFileList();

        // Read and process each CSV file
        for (const file of files) {
            try {
                const arrayBuffer = await fileToArrayBuffer(file);
                const base64Content = arrayBufferToBase64(arrayBuffer);
                const textContent = new TextDecoder('utf-8').decode(arrayBuffer);
                const parsedData = parseCSV(textContent);

                console.log(`Content of ${file.name}:`, parsedData);

                // Store the parsed data
                if (!window.uploadedFiles) window.uploadedFiles = {};
                window.uploadedFiles[file.name] = {
                    file: file,
                    rawContent: textContent,
                    parsedData: parsedData,
                    base64Content: base64Content,
                    headers: parsedData.length > 0 ? Object.keys(parsedData[0]) : []
                };
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }
    });

    // Update the file list display
    function updateFileList() {
        if (files.length === 0) {
            fileList.innerHTML = 'No files selected';
            return;
        }

        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.textContent = `${index + 1}. ${file.name} (${formatFileSize(file.size)})`;
            fileList.appendChild(fileItem);
        });
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Handle import button click
    importBtn.addEventListener('click', async () => {
        if (!window.uploadedFiles || Object.keys(window.uploadedFiles).length === 0) {
            console.log('No files to import');
            return;
        }

        // Get all uploaded files as an array of file data
        const filesData = Object.entries(window.uploadedFiles).map(([filename, fileData]) => ({
            name: filename,
            content: fileData.base64Content,
        }));

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                console.error('No active tab found');
                return;
            }

            // Send the files data to the content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: "importCSVs",
                files: filesData
            });

            console.log('Import response:', response);
        } catch (error) {
            console.error('Error sending import message:', error);
        }
    });

    // Handle scrape button click
    scrapeBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" });
            } else {
                console.error('No active tab found');
            }
        });
    });
});
