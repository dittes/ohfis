document.addEventListener('DOMContentLoaded', () => {
    const markdownInput = document.getElementById('markdownInput');
    const htmlPreview = document.getElementById('htmlPreview');
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const msg = document.getElementById('msg');

    // Live preview
    markdownInput.addEventListener('input', () => {
        const mdText = markdownInput.value;
        htmlPreview.innerHTML = marked.parse(mdText);
    });

    // Initialize logic
    markdownInput.value = "# Hello World\n\nStart typing Markdown on the left to see the result on the right.";
    markdownInput.dispatchEvent(new Event('input'));

    copyHtmlBtn.addEventListener('click', () => {
        const html = htmlPreview.innerHTML;
        navigator.clipboard.writeText(html).then(() => {
            showMsg('HTML copied to clipboard!');
        });
    });

    downloadBtn.addEventListener('click', () => {
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Markdown Export</title>
</head>
<body>
${htmlPreview.innerHTML}
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMsg('HTML file downloaded!');
    });

    function showMsg(text) {
        msg.textContent = text;
        msg.classList.remove('d-none');
        setTimeout(() => {
            msg.classList.add('d-none');
        }, 2000);
    }
});
