/* global marked, html2pdf */
document.addEventListener('DOMContentLoaded', () => {
    const markdownInput = document.getElementById('markdownInput');
    const previewOutput = document.getElementById('previewOutput');
    const convertBtn = document.getElementById('convertBtn');

    // Live Preview
    markdownInput.addEventListener('input', () => {
        const markdownText = markdownInput.value;
        previewOutput.innerHTML = marked.parse(markdownText);
    });

    // Handle PDF Export
    convertBtn.addEventListener('click', () => {
        const element = previewOutput;
        if (!markdownInput.value.trim()) {
            alert('Please enter some markdown text first.');
            return;
        }

        const opt = {
            margin: [15, 15],
            filename: 'markdown-export.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Add some temporary styling for PDF export
        element.style.padding = '10px';

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.padding = '0';
        });
    });

    // Default content
    if (!markdownInput.value) {
        markdownInput.value = "# OHFIS Markdown Export\n\nThis is a **live preview** of your markdown.\n\n### Features:\n-   Renders standard Markdown\n-   Professional PDF formatting\n-   Clean typography\n\nEdit this text to see changes immediately.";
        previewOutput.innerHTML = marked.parse(markdownInput.value);
    }
});
