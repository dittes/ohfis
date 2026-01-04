document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const statusMsg = document.getElementById('status-msg');

    // Buttons
    const upperBtn = document.getElementById('upper-btn');
    const lowerBtn = document.getElementById('lower-btn');
    const titleBtn = document.getElementById('title-btn');
    const sentenceBtn = document.getElementById('sentence-btn');
    const capitalBtn = document.getElementById('capital-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Helper to update status
    const updateStatus = (msg) => {
        statusMsg.textContent = msg;
        setTimeout(() => statusMsg.textContent = 'Ready to convert', 2000);
    };

    // Uppercase
    upperBtn.addEventListener('click', () => {
        textInput.value = textInput.value.toUpperCase();
        updateStatus('Converted to UPPERCASE');
    });

    // Lowercase
    lowerBtn.addEventListener('click', () => {
        textInput.value = textInput.value.toLowerCase();
        updateStatus('Converted to lowercase');
    });

    // Capitalized Case (Start of every word)
    capitalBtn.addEventListener('click', () => {
        textInput.value = textInput.value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        updateStatus('Converted to Capitalized Case');
    });

    // Sentence Case
    sentenceBtn.addEventListener('click', () => {
        // Lowercase everything first
        let text = textInput.value.toLowerCase();
        // Regex to capitalize first letter of string and any letter after a (.!?) and space
        text = text.replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
        textInput.value = text;
        updateStatus('Converted to Sentence case');
    });

    // Title Case (Simple version - Capitalize all except small words, but valid for most uses)
    titleBtn.addEventListener('click', () => {
        const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v|vs|via)$/i;
        let text = textInput.value.toLowerCase();
        text = text.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (match, index, title) {
            if (index > 0 && index + match.length !== title.length &&
                match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
                (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
                title.charAt(index - 1).search(/[^\s-]/) < 0) {
                return match.toLowerCase();
            }
            if (match.substr(1).search(/[A-Z]|\../) > -1) {
                return match;
            }
            return match.charAt(0).toUpperCase() + match.substr(1);
        });
        textInput.value = text;
        updateStatus('Converted to Title Case');
    });

    // Clear
    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        textInput.focus();
        updateStatus('Text cleared');
    });

    // Copy
    copyBtn.addEventListener('click', () => {
        textInput.select();
        document.execCommand('copy');

        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check me-1"></i> Copied!';
        copyBtn.classList.remove('btn-primary');
        copyBtn.classList.add('btn-success');

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.add('btn-primary');
            copyBtn.classList.remove('btn-success');
        }, 2000);
    });
});
