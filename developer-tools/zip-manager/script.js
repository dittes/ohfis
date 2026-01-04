document.addEventListener('DOMContentLoaded', () => {
    // Create ZIP Elements
    const createDropZone = document.getElementById('createDropZone');
    const createInput = document.getElementById('createInput');
    const createList = document.getElementById('createList');
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const zipFilename = document.getElementById('zipFilename');

    // Extract ZIP Elements
    const extractDropZone = document.getElementById('extractDropZone');
    const extractInput = document.getElementById('extractInput');
    const extractList = document.getElementById('extractList');
    const extractInfo = document.getElementById('extractInfo');
    const clearExtractBtn = document.getElementById('clearExtractBtn');
    const statusMsg = document.getElementById('statusMsg');

    let createFiles = [];

    // --- Create ZIP Logic ---
    createDropZone.addEventListener('click', () => createInput.click());
    createDropZone.addEventListener('dragover', (e) => { e.preventDefault(); createDropZone.classList.add('bg-secondary', 'text-white'); });
    createDropZone.addEventListener('dragleave', () => createDropZone.classList.remove('bg-secondary', 'text-white'));
    createDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        createDropZone.classList.remove('bg-secondary', 'text-white');
        addCreateFiles(e.dataTransfer.files);
    });
    createInput.addEventListener('change', (e) => addCreateFiles(e.target.files));

    function addCreateFiles(fileList) {
        for (let file of fileList) {
            createFiles.push(file);
        }
        renderCreateList();
    }

    function renderCreateList() {
        createList.innerHTML = '';
        createFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <span>${file.name} <small class="text-muted">(${(file.size / 1024).toFixed(1)} KB)</small></span>
                <button class="btn btn-sm btn-danger remove-file" data-idx="${index}">&times;</button>
            `;
            createList.appendChild(item);
        });
        downloadZipBtn.disabled = createFiles.length === 0;

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                createFiles.splice(parseInt(btn.dataset.idx), 1);
                renderCreateList();
            });
        });
    }

    downloadZipBtn.addEventListener('click', async () => {
        if (createFiles.length === 0) return;
        downloadZipBtn.disabled = true;
        downloadZipBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Zipping...';

        try {
            const zip = new JSZip();
            createFiles.forEach(file => {
                zip.file(file.name, file);
            });
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, zipFilename.value || 'archive.zip');
        } catch (e) {
            alert('Error creating ZIP: ' + e.message);
        } finally {
            downloadZipBtn.disabled = false;
            downloadZipBtn.innerHTML = '<i class="bi bi-download"></i> Download ZIP';
        }
    });

    // --- Extract ZIP Logic ---
    extractDropZone.addEventListener('click', () => extractInput.click());
    extractDropZone.addEventListener('dragover', (e) => { e.preventDefault(); extractDropZone.classList.add('bg-secondary', 'text-white'); });
    extractDropZone.addEventListener('dragleave', () => extractDropZone.classList.remove('bg-secondary', 'text-white'));
    extractDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        extractDropZone.classList.remove('bg-secondary', 'text-white');
        handleExtractFile(e.dataTransfer.files[0]);
    });
    extractInput.addEventListener('change', (e) => handleExtractFile(e.target.files[0]));

    async function handleExtractFile(file) {
        if (!file) return;

        statusMsg.textContent = 'Reading ZIP...';
        statusMsg.classList.remove('d-none');
        extractList.innerHTML = '';
        extractDropZone.classList.add('d-none');
        extractInfo.classList.remove('d-none');
        clearExtractBtn.classList.remove('d-none');

        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            extractList.innerHTML = ''; // clear previous

            let fileCount = 0;
            zip.forEach((relativePath, zipEntry) => {
                fileCount++;
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                const icon = zipEntry.dir ? '<i class="bi bi-folder text-warning me-2"></i>' : '<i class="bi bi-file-earmark me-2"></i>';

                let actionBtn = '';
                if (!zipEntry.dir) {
                    actionBtn = `<button class="btn btn-sm btn-outline-primary download-entry" data-path="${relativePath}">Download</button>`;
                }

                item.innerHTML = `
                    <div class="text-truncate" style="max-width: 70%;">${icon}${relativePath}</div>
                    <div>${actionBtn}</div>
                `;
                extractList.appendChild(item);
            });

            // Add listener to dynamic buttons
            document.querySelectorAll('.download-entry').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const path = btn.dataset.path;
                    const entry = zip.file(path);
                    if (entry) {
                        const blob = await entry.async('blob');
                        saveAs(blob, path.split('/').pop()); // simple filename
                    }
                });
            });

            statusMsg.classList.add('d-none');

        } catch (e) {
            console.error(e);
            statusMsg.textContent = 'Error reading ZIP: ' + e.message;
            statusMsg.className = 'mt-3 text-center text-danger';
        }
    }

    clearExtractBtn.addEventListener('click', () => {
        extractList.innerHTML = '';
        extractDropZone.classList.remove('d-none');
        extractInfo.classList.add('d-none');
        clearExtractBtn.classList.add('d-none');
        extractInput.value = '';
        statusMsg.classList.add('d-none');
    });
});
