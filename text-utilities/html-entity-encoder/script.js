document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const encodeBtn = document.getElementById('encodeBtn');
    const decodeBtn = document.getElementById('decodeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyMsg = document.getElementById('copyMsg');

    encodeBtn.addEventListener('click', () => {
        const val = inputText.value;
        outputText.value = encodeHTML(val);
    });

    decodeBtn.addEventListener('click', () => {
        const val = inputText.value;
        outputText.value = decodeHTML(val);
    });

    clearBtn.addEventListener('click', () => {
        inputText.value = '';
        outputText.value = '';
    });

    copyBtn.addEventListener('click', () => {
        if (!outputText.value) return;
        outputText.select();
        outputText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(outputText.value).then(() => {
            copyMsg.classList.remove('d-none');
            setTimeout(() => { copyMsg.classList.add('d-none'); }, 2000);
        });
    });

    function encodeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function decodeHTML(str) {
        const txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }
});
