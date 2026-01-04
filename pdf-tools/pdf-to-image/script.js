document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const controls = document.getElementById('controls');
    const convertBtn = document.getElementById('convertBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMsg = document.getElementById('statusMsg');
    const imgFormat = document.getElementById('imgFormat');
    const quality = document.getElementById('quality');
    const previewArea = document.getElementById('previewArea');

    let currentFile = null;
    let pdfDoc = null;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-secondary', 'text-white'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-secondary', 'text-white'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-secondary', 'text-white');
        handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    async function handleFile(file) {
        if (!file || file.type !== 'application/pdf') return;
        currentFile = file;
        fileName.textContent = file.name;

        statusMsg.textContent = 'Loading...';
        statusMsg.classList.remove('d-none');

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;

        fileInfo.classList.remove('d-none');
        dropZone.classList.add('d-none');
        controls.classList.remove('d-none');
        statusMsg.classList.add('d-none');
    }

    convertBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;

        statusMsg.textContent = 'Converting pages...';
        statusMsg.classList.remove('d-none');
        convertBtn.disabled = true;
        previewArea.innerHTML = '';

        try {
            const totalPages = pdfDoc.numPages;
            const zip = new JSZip();
            const format = imgFormat.value;
            const qual = parseFloat(quality.value);

            for (let i = 1; i <= totalPages; i++) {
                statusMsg.textContent = `Converting page ${i} of ${totalPages}...`;

                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Good quality

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, qual));

                // Add to ZIP
                const ext = format === 'jpeg' ? 'jpg' : 'png';
                zip.file(`page_${i}.${ext}`, blob);

                // Add Preview (small)
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'img-thumbnail';
                const col = document.createElement('div');
                col.className = 'col-6 col-md-3';
                col.appendChild(img);
                previewArea.appendChild(col);
            }

            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `${currentFile.name.replace('.pdf', '')}_images.zip`);

            statusMsg.textContent = 'Conversion complete! ZIP downloaded.';
            statusMsg.className = 'mt-3 text-center text-success';

        } catch (error) {
            console.error(error);
            statusMsg.textContent = 'Error: ' + error.message;
            statusMsg.className = 'mt-3 text-center text-danger';
        } finally {
            convertBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        location.reload();
    });
});
