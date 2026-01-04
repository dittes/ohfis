document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusMsg = document.getElementById('statusMsg');

    let files = [];

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-secondary', 'text-white'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-secondary', 'text-white'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-secondary', 'text-white');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(newFiles) {
        for (let file of newFiles) {
            if (file.type === 'application/pdf') {
                files.push(file);
            }
        }
        renderFiles();
    }

    function renderFiles() {
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.draggable = true;
            item.innerHTML = `
                <span><i class="bi bi-file-pdf me-2 text-danger"></i>${file.name}</span>
                <div>
                    <button class="btn btn-sm btn-outline-secondary move-up" data-idx="${index}" ${index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
                    <button class="btn btn-sm btn-outline-secondary move-down" data-idx="${index}" ${index === files.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
                    <button class="btn btn-sm btn-danger remove-file" data-idx="${index}"><i class="bi bi-x"></i></button>
                </div>
            `;
            fileList.appendChild(item);
        });

        mergeBtn.disabled = files.length < 2;

        // Add event listeners for buttons
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx);
                files.splice(idx, 1);
                renderFiles();
            });
        });
        document.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx);
                if (idx > 0) {
                    [files[idx], files[idx - 1]] = [files[idx - 1], files[idx]];
                    renderFiles();
                }
            });
        });
        document.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx);
                if (idx < files.length - 1) {
                    [files[idx], files[idx + 1]] = [files[idx + 1], files[idx]];
                    renderFiles();
                }
            });
        });
    }

    clearBtn.addEventListener('click', () => {
        files = [];
        renderFiles();
        statusMsg.classList.add('d-none');
    });

    mergeBtn.addEventListener('click', async () => {
        if (files.length < 2) return;

        statusMsg.textContent = 'Merging...';
        statusMsg.className = 'mt-3 text-center text-primary';
        statusMsg.classList.remove('d-none');
        mergeBtn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged_document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMsg.textContent = 'Done! Download started.';
            statusMsg.className = 'mt-3 text-center text-success';
        } catch (error) {
            console.error(error);
            statusMsg.textContent = 'Error merging files.';
            statusMsg.className = 'mt-3 text-center text-danger';
        } finally {
            mergeBtn.disabled = false;
        }
    });
});
