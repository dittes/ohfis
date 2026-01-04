document.addEventListener('DOMContentLoaded', () => {

    // --- Elements ---
    // Encode
    const inputText = document.getElementById('inputText');
    const encodedOutput = document.getElementById('encodedOutput');
    const clearEncodeInputBtn = document.getElementById('clearEncodeInput');
    const copyEncodedBtn = document.getElementById('copyEncoded');

    // Decode
    const inputUrl = document.getElementById('inputUrl');
    const decodedOutput = document.getElementById('decodedOutput');
    const clearDecodeInputBtn = document.getElementById('clearDecodeInput');
    const copyDecodedBtn = document.getElementById('copyDecoded');
    const decodeError = document.getElementById('decodeError');

    // --- Helper Functions ---

    function encodeUrl() {
        const text = inputText.value;
        if (!text) {
            encodedOutput.value = '';
            return;
        }
        try {
            const encoded = encodeURIComponent(text);
            encodedOutput.value = encoded;
        } catch (e) {
            console.error("Encoding error", e);
            encodedOutput.value = "Error computing URL Encode.";
        }
    }

    function decodeUrl() {
        const text = inputUrl.value.trim();
        decodeError.classList.add('d-none');

        if (!text) {
            decodedOutput.value = '';
            return;
        }

        try {
            const decoded = decodeURIComponent(text);
            decodedOutput.value = decoded;
        } catch (e) {
            console.error("Decoding error", e);
            decodedOutput.value = "";
            decodeError.classList.remove('d-none');
        }
    }

    function copyToClipboard(element) {
        element.select();
        element.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(element.value);
    }

    // --- Event Listeners ---

    // Encode
    inputText.addEventListener('input', encodeUrl);

    clearEncodeInputBtn.addEventListener('click', () => {
        inputText.value = '';
        encodedOutput.value = '';
        inputText.focus();
    });

    copyEncodedBtn.addEventListener('click', () => {
        if (encodedOutput.value) {
            copyToClipboard(encodedOutput);
            const originalText = copyEncodedBtn.innerHTML;
            copyEncodedBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
            setTimeout(() => {
                copyEncodedBtn.innerHTML = originalText;
            }, 2000);
        }
    });

    // Decode
    inputUrl.addEventListener('input', decodeUrl);

    clearDecodeInputBtn.addEventListener('click', () => {
        inputUrl.value = '';
        decodedOutput.value = '';
        decodeError.classList.add('d-none');
        inputUrl.focus();
    });

    copyDecodedBtn.addEventListener('click', () => {
        if (decodedOutput.value) {
            copyToClipboard(decodedOutput);
            const originalText = copyDecodedBtn.innerHTML;
            copyDecodedBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
            setTimeout(() => {
                copyDecodedBtn.innerHTML = originalText;
            }, 2000);
        }
    });
});
