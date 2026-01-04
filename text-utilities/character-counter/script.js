const input = document.getElementById('text-input');

function updateCounts() {
    const text = input.value;

    // Characters
    const charCount = text.length;
    document.getElementById('char-count').textContent = charCount;

    // No Spaces
    const noSpaceCount = text.replace(/\s/g, '').length;
    document.getElementById('char-no-space-count').textContent = noSpaceCount;

    // Words
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('word-count').textContent = wordCount;

    // Lines
    const lineCount = text.split(/\r\n|\r|\n/).length;
    // If empty text, lines should be 0? Or 1? Usually 0 if empty.
    document.getElementById('line-count').textContent = text.length === 0 ? 0 : lineCount;

    // Progress Bars
    updateProgress('twitter-prog', charCount, 280);
    updateProgress('sms-prog', charCount, 160);
    updateProgress('seo-prog', charCount, 60);
}

function updateProgress(id, val, max) {
    const bar = document.getElementById(id);
    const pct = Math.min((val / max) * 100, 100);
    bar.style.width = pct + '%';

    // Color logic
    bar.classList.remove('bg-danger', 'bg-warning', 'bg-success', 'bg-primary');
    if (val > max) {
        bar.classList.add('bg-danger');
    } else if (val > max * 0.9) {
        bar.classList.add('bg-warning');
    } else {
        bar.classList.add('bg-primary');
    }
}

input.addEventListener('input', updateCounts);
