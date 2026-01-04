document.addEventListener('DOMContentLoaded', () => {

    // --- Elements ---
    // Encode Elements
    const inputText = document.getElementById('inputText');
    const encodedOutput = document.getElementById('encodedOutput');
    const clearEncodeInputBtn = document.getElementById('clearEncodeInput');
    const copyEncodedBtn = document.getElementById('copyEncoded');
    const encodeInputCount = document.getElementById('encodeInputCount');

    // Decode Elements
    const inputBase64 = document.getElementById('inputBase64');
    const decodedOutput = document.getElementById('decodedOutput');
    const clearDecodeInputBtn = document.getElementById('clearDecodeInput');
    const copyDecodedBtn = document.getElementById('copyDecoded');
    const decodeInputCount = document.getElementById('decodeInputCount');
    const decodeError = document.getElementById('decodeError');

    // --- Helper Functions ---

    function updateCount(element, countDisplay) {
        const count = element.value.length;
        countDisplay.textContent = `${count.toLocaleString()} chars`;
    }

    function encodeBase64() {
        const text = inputText.value;
        if (!text) {
            encodedOutput.value = '';
            return;
        }

        try {
            // Using btoa for basic strings, but for UTF-8 support we need a workaround
            // btoa only accepts Latin1 range instructions
            const encoded = btoa(unescape(encodeURIComponent(text)));
            encodedOutput.value = encoded;
        } catch (e) {
            console.error("Encoding error", e);
            encodedOutput.value = "Error: Unable to encode text.";
        }
    }

    function decodeBase64() {
        const base64 = inputBase64.value.trim();
        decodeError.classList.add('d-none');

        if (!base64) {
            decodedOutput.value = '';
            return;
        }

        try {
            // Reverse of the UTF-8 workaround
            const decoded = decodeURIComponent(escape(atob(base64)));
            decodedOutput.value = decoded;
        } catch (e) {
            console.error("Decoding error", e);
            decodedOutput.value = "";
            decodeError.classList.remove('d-none');
        }
    }

    function copyToClipboard(element) {
        element.select();
        element.setSelectionRange(0, 99999); // For mobile devices
        navigator.clipboard.writeText(element.value).then(() => {
            // Optional: Feedback
            const originalText = element === encodedOutput ? "Copy" : "Copy"; // Keep button text simple or change temporarily
            // For now, no visual feedback other than standard selection
        });
    }

    // --- Event Listeners ---

    // Encode
    inputText.addEventListener('input', () => {
        updateCount(inputText, encodeInputCount);
        encodeBase64();
    });

    clearEncodeInputBtn.addEventListener('click', () => {
        inputText.value = '';
        encodedOutput.value = '';
        updateCount(inputText, encodeInputCount);
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
    inputBase64.addEventListener('input', () => {
        updateCount(inputBase64, decodeInputCount);
        decodeBase64();
    });

    clearDecodeInputBtn.addEventListener('click', () => {
        inputBase64.value = '';
        decodedOutput.value = '';
        decodeError.classList.add('d-none');
        updateCount(inputBase64, decodeInputCount);
        inputBase64.focus();
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

    // Auto-focus on tab switch
    const triggerTabList = [].slice.call(document.querySelectorAll('#pills-tab button'))
    triggerTabList.forEach(function (triggerEl) {
        triggerEl.addEventListener('shown.bs.tab', function (event) {
            if (event.target.id === 'pills-encode-tab') {
                inputText.focus();
            } else if (event.target.id === 'pills-decode-tab') {
                inputBase64.focus();
            }
        })
    })

});
