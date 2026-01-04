function setStatus(msg, type) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = 'text-center small fw-bold ' + (type === 'error' ? 'text-danger' : 'text-success');

    if (type === 'error') {
        document.getElementById('json-input').classList.add('is-invalid');
    } else {
        document.getElementById('json-input').classList.remove('is-invalid');
    }
}

document.getElementById('format-btn').addEventListener('click', function () {
    const input = document.getElementById('json-input').value;
    if (!input.trim()) return;

    try {
        const obj = JSON.parse(input);
        const formatted = JSON.stringify(obj, null, 4);
        document.getElementById('json-output').value = formatted;
        setStatus('Valid JSON', 'success');
    } catch (e) {
        setStatus('Invalid JSON: ' + e.message, 'error');
        document.getElementById('json-output').value = "";
    }
});

document.getElementById('minify-btn').addEventListener('click', function () {
    const input = document.getElementById('json-input').value;
    if (!input.trim()) return;

    try {
        const obj = JSON.parse(input);
        const minified = JSON.stringify(obj);
        document.getElementById('json-output').value = minified;
        setStatus('Valid JSON', 'success');
    } catch (e) {
        setStatus('Invalid JSON: ' + e.message, 'error');
        document.getElementById('json-output').value = "";
    }
});

document.getElementById('clear-btn').addEventListener('click', function () {
    document.getElementById('json-input').value = '';
    document.getElementById('json-output').value = '';
    setStatus('', '');
    document.getElementById('json-input').classList.remove('is-invalid');
});

document.getElementById('copy-btn').addEventListener('click', function () {
    const output = document.getElementById('json-output');
    if (!output.value) return;

    output.select();
    document.execCommand('copy');

    const originalText = this.textContent;
    this.textContent = 'Copied!';
    setTimeout(() => {
        this.textContent = originalText;
    }, 2000);
});
