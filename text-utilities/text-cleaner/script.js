document.getElementById('clean-btn').addEventListener('click', function () {
    let text = document.getElementById('input-text').value;

    const optSpaces = document.getElementById('opt-spaces').checked;
    const optBreaks = document.getElementById('opt-breaks').checked;
    const optHtml = document.getElementById('opt-html').checked;
    const optTrim = document.getElementById('opt-trim').checked;

    if (optHtml) {
        // Simple HTML strip
        const doc = new DOMParser().parseFromString(text, 'text/html');
        text = doc.body.textContent || "";
    }

    if (optBreaks) {
        text = text.replace(/[\r\n]+/g, ' ');
    }

    if (optSpaces) {
        // Replace multiple spaces with single space
        text = text.replace(/[ \t]+/g, ' ');
    }

    if (optTrim) {
        // Trim each line if line breaks preserved, or just trim total
        if (!optBreaks) {
            text = text.split('\n').map(line => line.trim()).join('\n');
        }
        text = text.trim();
    }

    document.getElementById('output-text').value = text;
});

document.getElementById('copy-btn').addEventListener('click', function () {
    const output = document.getElementById('output-text');
    output.select();
    document.execCommand('copy');
    // Or modern: navigator.clipboard.writeText(output.value);

    const originalText = this.textContent;
    this.textContent = 'Copied!';
    setTimeout(() => {
        this.textContent = originalText;
    }, 2000);
});

document.getElementById('clear-btn').addEventListener('click', function () {
    document.getElementById('input-text').value = '';
    document.getElementById('output-text').value = '';
});
