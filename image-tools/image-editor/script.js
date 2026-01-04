document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const editorArea = document.getElementById('editorArea');
    const image = document.getElementById('image');

    let cropper;
    let currentFilter = 'none';

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-secondary', 'text-white'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-secondary', 'text-white'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-secondary', 'text-white');
        handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const url = URL.createObjectURL(file);
        image.src = url;

        dropZone.classList.add('d-none');
        editorArea.classList.remove('d-none');

        // Initialize Cropper
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
            viewMode: 2,
        });
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Cropper.js doesn't natively support CSS filters on the view.
            // We have to apply it to the container or preview, but for download we apply to canvas.
            // For visual feedback, let's apply to the cropper-container?
            // Actually, applying filters to the source image while cropping is tricky.
            // We'll trust the user to select filter, and we verify on download.
            // Visual feedback: apply to .cropper-container img?
            currentFilter = btn.dataset.filter;
            // Very rough visual feedback
            document.querySelector('.cropper-container').style.filter = currentFilter;
        });
    });

    document.getElementById('rotateLeft').addEventListener('click', () => cropper.rotate(-90));
    document.getElementById('rotateRight').addEventListener('click', () => cropper.rotate(90));
    document.getElementById('flipH').addEventListener('click', () => cropper.scaleX(-cropper.getData().scaleX || -1));
    document.getElementById('flipV').addEventListener('click', () => cropper.scaleY(-cropper.getData().scaleY || -1));

    document.getElementById('downloadBtn').addEventListener('click', () => {
        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas();

        // Apply Filters via temporary canvas if needed
        let finalCanvas = canvas;
        if (currentFilter !== 'none') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.filter = currentFilter;
            ctx.drawImage(canvas, 0, 0);
            finalCanvas = tempCanvas;
        }

        finalCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'edited_image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    });

    document.getElementById('newImgBtn').addEventListener('click', () => {
        location.reload();
    });
});
