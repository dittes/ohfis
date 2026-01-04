document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const pageCountSpan = document.getElementById('pageCount');
    const splitMode = document.getElementById('splitMode');
    const rangeInput = document.getElementById('rangeInput');
    const startPage = document.getElementById('startPage');
    const endPage = document.getElementById('endPage');
    const splitBtn = document.getElementById('splitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMsg = document.getElementById('statusMsg');

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

        statusMsg.textContent = 'Loading PDF...';
        statusMsg.classList.remove('d-none');

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

        fileName.textContent = file.name;
        pageCountSpan.textContent = pdfDoc.getPageCount();
        fileInfo.classList.remove('d-none');
        dropZone.classList.add('d-none');
        splitBtn.disabled = false;
        statusMsg.classList.add('d-none');

        // Reset ranges
        startPage.max = pdfDoc.getPageCount();
        endPage.max = pdfDoc.getPageCount();
        startPage.value = 1;
        endPage.value = pdfDoc.getPageCount();
    }

    splitMode.addEventListener('change', () => {
        if (splitMode.value === 'range') rangeInput.classList.remove('d-none');
        else rangeInput.classList.add('d-none');
    });

    splitBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;

        statusMsg.textContent = 'Processing...';
        statusMsg.classList.remove('d-none');
        splitBtn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const zip = new JSZip();
            const totalPages = pdfDoc.getPageCount();

            if (splitMode.value === 'all') {
                // Extract all as individual files in ZIP
                for (let i = 0; i < totalPages; i++) {
                    const newPdf = await PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(copiedPage);
                    const pdfBytes = await newPdf.save();
                    zip.file(`${currentFile.name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
                }
                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, "split_files.zip");
            } else {
                // Range extraction
                const start = parseInt(startPage.value) - 1;
                const end = parseInt(endPage.value) - 1;

                if (start < 0 || end >= totalPages || start > end) {
                    throw new Error('Invalid page range');
                }

                const newPdf = await PDFDocument.create();
                const indices = [];
                for (let i = start; i <= end; i++) indices.push(i);

                const copiedPages = await newPdf.copyPages(pdfDoc, indices);
                copiedPages.forEach((page) => newPdf.addPage(page));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                saveAs(blob, `${currentFile.name.replace('.pdf', '')}_extracted.pdf`);
            }

            statusMsg.textContent = 'Done! Download started.';
            statusMsg.className = 'mt-3 text-center text-success';
        } catch (error) {
            console.error(error);
            statusMsg.textContent = 'Error: ' + error.message;
            statusMsg.className = 'mt-3 text-center text-danger';
        } finally {
            splitBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        pdfDoc = null;
        fileInfo.classList.add('d-none');
        dropZone.classList.remove('d-none');
        splitBtn.disabled = true;
        statusMsg.classList.add('d-none');
        fileInput.value = '';
    });
});
