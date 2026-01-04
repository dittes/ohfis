document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const editorArea = document.getElementById('editor-area');
    const imagePreview = document.getElementById('image-preview');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    const aspectRatioCheck = document.getElementById('aspect-ratio');
    const qualityRange = document.getElementById('quality-range');
    const qualityVal = document.getElementById('quality-val');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');

    let originalImage = null;
    let originalRatio = 0;
    let fileType = 'image/jpeg';
    let fileName = 'resized-image.jpg';

    // File Selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadImage(e.target.files[0]);
        }
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        fileInput.value = '';
        editorArea.classList.add('d-none');
        uploadArea.classList.remove('d-none');
        originalImage = null;
    });

    // Quality Slider
    qualityRange.addEventListener('input', (e) => {
        qualityVal.textContent = e.target.value + '%';
    });

    function loadImage(file) {
        fileType = file.type;
        fileName = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                // Set initial values
                originalRatio = originalImage.width / originalImage.height;
                widthInput.value = originalImage.width;
                heightInput.value = originalImage.height;
                imagePreview.src = originalImage.src;

                // Show editor
                uploadArea.classList.add('d-none');
                editorArea.classList.remove('d-none');
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Dimension Inputs
    widthInput.addEventListener('input', () => {
        if (aspectRatioCheck.checked && originalRatio) {
            heightInput.value = Math.round(widthInput.value / originalRatio);
        }
    });

    heightInput.addEventListener('input', () => {
        if (aspectRatioCheck.checked && originalRatio) {
            widthInput.value = Math.round(heightInput.value * originalRatio);
        }
    });

    // Download
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);
        const quality = parseInt(qualityRange.value) / 100;

        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(originalImage, 0, 0, width, height);

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Name: prepend 'resized-' to original extension
            const nameParts = fileName.split('.');
            const ext = nameParts.pop();
            const newName = `${nameParts.join('.')}-resized.${ext}`;
            a.download = newName;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, fileType, quality);
    });
});
