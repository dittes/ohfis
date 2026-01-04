document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const memeCanvas = document.getElementById('memeCanvas');
    const topTextParams = document.getElementById('topText');
    const bottomTextParams = document.getElementById('bottomText');
    const fontSizeParams = document.getElementById('fontSize');
    const textColorParams = document.getElementById('textColor');
    const downloadBtn = document.getElementById('downloadBtn');
    const placeholderText = document.getElementById('placeholderText');
    const ctx = memeCanvas.getContext('2d');

    let currentImage = null;

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                placeholderText.classList.add('d-none');
                downloadBtn.disabled = false;
                drawMeme();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    [topTextParams, bottomTextParams, fontSizeParams, textColorParams].forEach(el => {
        el.addEventListener('input', drawMeme);
    });

    function drawMeme() {
        if (!currentImage) return;

        // Set canvas size to image size
        memeCanvas.width = currentImage.width;
        memeCanvas.height = currentImage.height;

        // Draw image
        ctx.drawImage(currentImage, 0, 0);

        // Configure text
        const fontSize = parseInt(fontSizeParams.value) * (memeCanvas.width / 500); // Scale font relative to width
        ctx.font = `900 ${fontSize}px sans-serif`; // Impact-like font weight
        ctx.textAlign = 'center';
        ctx.fillStyle = textColorParams.value;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = fontSize / 15;
        ctx.lineJoin = 'round';

        const topText = topTextParams.value.toUpperCase();
        const bottomText = bottomTextParams.value.toUpperCase();

        // Draw Top Text
        if (topText) {
            const x = memeCanvas.width / 2;
            const y = fontSize + (memeCanvas.height * 0.02);
            ctx.strokeText(topText, x, y);
            ctx.fillText(topText, x, y);
        }

        // Draw Bottom Text
        if (bottomText) {
            const x = memeCanvas.width / 2;
            const y = memeCanvas.height - (memeCanvas.height * 0.02);
            ctx.strokeText(bottomText, x, y);
            ctx.fillText(bottomText, x, y);
        }
    }

    downloadBtn.addEventListener('click', () => {
        if (!currentImage) return;
        const link = document.createElement('a');
        link.download = 'meme.png';
        link.href = memeCanvas.toDataURL();
        link.click();
    });
});
