document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const sentenceCountEl = document.getElementById('sentence-count');
    const paragraphCountEl = document.getElementById('paragraph-count');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    function updateCounts() {
        const text = textInput.value;

        // Characters
        charCountEl.textContent = text.length;

        // Words
        // Split by whitespace and filter empty strings
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        wordCountEl.textContent = words.length;

        // Sentences
        // Split by . ! or ? followed by space or end of string
        // This is a basic approximation
        const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
        sentenceCountEl.textContent = sentences.length;

        // Paragraphs
        // Split by newlines (at least one)
        const paragraphs = text.split(/\n+/).filter(para => para.trim().length > 0);
        paragraphCountEl.textContent = paragraphs.length;
    }

    textInput.addEventListener('input', updateCounts);

    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCounts(); // Reset counters
        textInput.focus();
    });

    copyBtn.addEventListener('click', () => {
        textInput.select();
        document.execCommand('copy');
        // Visual feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check me-1"></i> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });
});
