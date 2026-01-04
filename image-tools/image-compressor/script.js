document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const compressionArea = document.getElementById('compression-area');
    const imagePreview = document.getElementById('image-preview');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const compressBtn = document.getElementById('compressBtn');
    const qualityRange = document.getElementById('qualityRange');
    const qualityValue = document.getElementById('qualityValue');
    const resultArea = document.getElementById('result-area');
    const compressedSizeEl = document.getElementById('compressed-size');
    const savingsBadge = document.getElementById('savings-badge');
    const downloadLink = document.getElementById('downloadLink');

    let originalFile = null;
    let originalImage = new Image();

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            originalFile = e.target.files[0];

            if (!originalFile.type.startsWith('image/')) {
                alert('Please select a valid image file.');
                return;
            }

            fileNameEl.textContent = originalFile.name;
            fileSizeEl.textContent = formatBytes(originalFile.size);

            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                originalImage.src = event.target.result;
                compressionArea.classList.remove('d-none');
                resultArea.classList.add('d-none');
            };
            reader.readAsDataURL(originalFile);
        }
    });

    qualityRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const percent = Math.round(val * 100);
        qualityValue.textContent = `Quality: ${percent}%`;
    });

    compressBtn.addEventListener('click', () => {
        if (!originalImage.src) return;

        const quality = parseFloat(qualityRange.value);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;

        // Draw image (white background for transparency to jpeg conversion safety)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);

        // Compress
        // For compression, we usually stick to JPEG or WEBP as they support quality params well.
        // Let's default to JPEG for maximum compression compatibility or keep original type if supported?
        // To ensure size reduction, JPEG is a safe bet for "compression", but losing transparency.
        // Let's try to preserve type if it is webp/jpeg, else default to jpeg.
        let outputType = 'image/jpeg';
        if (originalFile.type === 'image/webp') outputType = 'image/webp';

        const dataUrl = canvas.toDataURL(outputType, quality);

        // Calculate new size logic (base64 length approx)
        const head = `data:${outputType};base64,`;
        const sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);

        compressedSizeEl.textContent = formatBytes(sizeInBytes);

        // Calculate savings
        const savings = ((originalFile.size - sizeInBytes) / originalFile.size * 100).toFixed(1);
        if (savings > 0) {
            savingsBadge.textContent = `Saved ${savings}%`;
            savingsBadge.className = 'badge bg-success bg-opacity-10 text-success';
        } else {
            savingsBadge.textContent = `Size increased (try lower quality)`;
            savingsBadge.className = 'badge bg-warning bg-opacity-10 text-warning';
        }

        downloadLink.href = dataUrl;

        let ext = 'jpg';
        if (outputType === 'image/webp') ext = 'webp';

        let newName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
        downloadLink.download = `${newName}-compressed.${ext}`;

        resultArea.classList.remove('d-none');
        resultArea.scrollIntoView({ behavior: 'smooth' });
    });

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
