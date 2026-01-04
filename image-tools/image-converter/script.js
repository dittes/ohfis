document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const conversionArea = document.getElementById('conversion-area');
    const imagePreview = document.getElementById('image-preview');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const convertBtn = document.getElementById('convertBtn');
    const formatSelect = document.getElementById('formatSelect');
    const resultArea = document.getElementById('result-area');
    const downloadLink = document.getElementById('downloadLink');

    let originalFile = null;
    let originalImage = new Image();

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            originalFile = e.target.files[0];

            // Validate file type
            if (!originalFile.type.startsWith('image/')) {
                alert('Please select a valid image file.');
                return;
            }

            // Display file info
            fileNameEl.textContent = originalFile.name;
            fileSizeEl.textContent = formatBytes(originalFile.size);

            // Preview
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                originalImage.src = event.target.result;
                conversionArea.classList.remove('d-none');
                resultArea.classList.add('d-none');
            };
            reader.readAsDataURL(originalFile);
        }
    });

    convertBtn.addEventListener('click', () => {
        if (!originalImage.src) return;

        const format = formatSelect.value;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;

        // Draw image
        // If converting to JPG (which doesn't support alpha), fill background white
        if (format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(originalImage, 0, 0);

        const downloadBox = document.getElementById('download-box');
        const base64Box = document.getElementById('base64-box');
        const base64Result = document.getElementById('base64Result');

        if (format === 'base64') {
            const dataUrl = canvas.toDataURL('image/png'); // Default to PNG for base64
            base64Result.value = dataUrl;
            downloadBox.classList.add('d-none');
            base64Box.classList.remove('d-none');
        } else {
            // Convert to byte stream format
            const dataUrl = canvas.toDataURL(format, 0.9); // 0.9 quality for lossy formats

            // Setup download
            downloadLink.href = dataUrl;

            // Determine extension
            let ext = 'png';
            if (format === 'image/jpeg') ext = 'jpg';
            if (format === 'image/webp') ext = 'webp';

            let newName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
            downloadLink.download = `${newName}-converted.${ext}`;

            downloadBox.classList.remove('d-none');
            base64Box.classList.add('d-none');
        }

        resultArea.classList.remove('d-none');
        resultArea.scrollIntoView({ behavior: 'smooth' });
    });

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const base64Result = document.getElementById('base64Result');
            base64Result.select();
            document.execCommand('copy');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check me-1"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
