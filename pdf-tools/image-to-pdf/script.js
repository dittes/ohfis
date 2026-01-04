document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusMsg = document.getElementById('statusMsg');

    let files = [];

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
            if (file.type === 'image/jpeg' || file.type === 'image/png') {
                files.push(file);
            }
        }
        renderFiles();
    }

    function renderFiles() {
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <img src="${URL.createObjectURL(file)}" class="card-img-top object-fit-cover" style="height: 120px;" loading="lazy">
                    <div class="card-body p-2 d-flex justify-content-between align-items-center">
                        <small class="text-truncate" style="max-width: 80px;">${file.name}</small>
                        <button class="btn btn-sm btn-danger remove-img" data-idx="${index}">&times;</button>
                    </div>
                </div>
            `;
            fileList.appendChild(col);
        });
        convertBtn.disabled = files.length === 0;

        document.querySelectorAll('.remove-img').forEach(btn => {
            btn.addEventListener('click', () => {
                files.splice(parseInt(btn.dataset.idx), 1);
                renderFiles();
            });
        });
    }

    clearBtn.addEventListener('click', () => {
        files = [];
        renderFiles();
        statusMsg.classList.add('d-none');
    });

    convertBtn.addEventListener('click', async () => {
        if (files.length === 0) return;

        statusMsg.textContent = 'Generating PDF...';
        statusMsg.classList.remove('d-none');
        convertBtn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            for (const file of files) {
                const imgBytes = await file.arrayBuffer();
                let image;
                if (file.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imgBytes);
                } else {
                    image = await pdfDoc.embedPng(imgBytes);
                }

                const page = pdfDoc.addPage([image.width, image.height]); // Match img size
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'images.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMsg.textContent = 'Done! Download started.';
            statusMsg.className = 'mt-3 text-center text-success';
        } catch (error) {
            console.error(error);
            statusMsg.textContent = 'Error: ' + error.message;
            statusMsg.className = 'mt-3 text-center text-danger';
        } finally {
            convertBtn.disabled = false;
        }
    });
});
