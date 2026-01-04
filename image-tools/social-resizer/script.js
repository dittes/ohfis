document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const resizerArea = document.getElementById('resizer-area');
    const imagePreview = document.getElementById('imagePreview');
    const platformSelect = document.getElementById('platformSelect');
    const customSizeInputs = document.getElementById('custom-size-inputs');
    const fitMode = document.getElementById('fitMode');
    const resizeBtn = document.getElementById('resizeBtn');
    const sourceInfo = document.getElementById('source-info');

    let originalImg = new Image();
    let fileName = '';

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            fileName = file.name;
            const reader = new FileReader();
            reader.onload = (event) => {
                originalImg.onload = () => {
                    sourceInfo.textContent = `${originalImg.naturalWidth} x ${originalImg.naturalHeight} Pixels`;
                    imagePreview.src = event.target.result;
                    imagePreview.classList.remove('d-none');
                    resizerArea.classList.remove('d-none');
                };
                originalImg.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    platformSelect.addEventListener('change', () => {
        if (platformSelect.value === 'custom') {
            customSizeInputs.classList.remove('d-none');
        } else {
            customSizeInputs.classList.add('d-none');
        }
    });

    resizeBtn.addEventListener('click', () => {
        let targetWidth, targetHeight;
        if (platformSelect.value === 'custom') {
            targetWidth = parseInt(document.getElementById('customWidth').value);
            targetHeight = parseInt(document.getElementById('customHeight').value);
        } else {
            const [w, h] = platformSelect.value.split('x').map(v => parseInt(v));
            targetWidth = w;
            targetHeight = h;
        }

        if (isNaN(targetWidth) || isNaN(targetHeight)) {
            alert('Please enter valid dimensions.');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill background white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const mode = fitMode.value;
        const sourceAspect = originalImg.naturalWidth / originalImg.naturalHeight;
        const targetAspect = targetWidth / targetHeight;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (mode === 'cover') {
            if (sourceAspect > targetAspect) {
                drawHeight = targetHeight;
                drawWidth = targetHeight * sourceAspect;
                offsetX = (targetWidth - drawWidth) / 2;
            } else {
                drawWidth = targetWidth;
                drawHeight = targetWidth / sourceAspect;
                offsetY = (targetHeight - drawHeight) / 2;
            }
        } else { // contain
            if (sourceAspect > targetAspect) {
                drawWidth = targetWidth;
                drawHeight = targetWidth / sourceAspect;
                offsetY = (targetHeight - drawHeight) / 2;
            } else {
                drawHeight = targetHeight;
                drawWidth = targetHeight * sourceAspect;
                offsetX = (targetWidth - drawWidth) / 2;
            }
        }

        ctx.drawImage(originalImg, offsetX, offsetY, drawWidth, drawHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `resized-${platformSelect.value}-${fileName}`;
        link.click();
    });
});
