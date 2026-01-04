/* global EXIF */
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const metadataArea = document.getElementById('metadata-area');
    const exifResults = document.getElementById('exif-results');
    const stripBtn = document.getElementById('stripBtn');

    let originalFile = null;

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            originalFile = e.target.files[0];
            metadataArea.classList.remove('d-none');
            readMetadata(originalFile);
        }
    });

    function readMetadata(file) {
        exifResults.innerHTML = '<p class="text-muted">Analyzing file...</p>';

        if (file.type !== 'image/jpeg') {
            exifResults.innerHTML = '<div class="alert alert-warning small">Detailed EXIF viewing is only supported for JPEG files. However, you can still strip metadata from this file.</div>';
            return;
        }

        EXIF.getData(file, function () {
            const allMetaData = EXIF.getAllTags(this);
            if (Object.keys(allMetaData).length === 0) {
                exifResults.innerHTML = '<p class="text-muted">No EXIF metadata found in this image.</p>';
                return;
            }

            let html = '<table class="table table-sm table-borderless mb-0"><tbody>';
            for (let tag in allMetaData) {
                if (typeof allMetaData[tag] !== 'object' && typeof allMetaData[tag] !== 'function') {
                    html += `<tr><td class="fw-bold text-muted" style="width: 40%">${tag}</td><td>${allMetaData[tag]}</td></tr>`;
                }
            }
            html += '</tbody></table>';
            exifResults.innerHTML = html;
        });
    }

    stripBtn.addEventListener('click', () => {
        if (!originalFile) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Exporting to canvas and getting dataURL effectively strips all EXIF
            const dataUrl = canvas.toDataURL(originalFile.type);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `cleaned-${originalFile.name}`;
            link.click();
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(originalFile);
    });
});
