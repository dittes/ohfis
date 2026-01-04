document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const lengthSlider = document.getElementById('passwordLength');
    const lenVal = document.getElementById('lenVal');
    const copyBtn = document.getElementById('copyBtn');
    const copyMsg = document.getElementById('copyMsg');
    const generatedPassword = document.getElementById('generatedPassword');

    lengthSlider.addEventListener('input', () => {
        lenVal.textContent = lengthSlider.value;
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        generate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        lenVal.textContent = lengthSlider.value; // Reset slider label
        resultContainer.classList.add('d-none');
    });

    copyBtn.addEventListener('click', () => {
        generatedPassword.select();
        generatedPassword.setSelectionRange(0, 99999); // Mobile
        navigator.clipboard.writeText(generatedPassword.value).then(() => {
            copyMsg.classList.remove('d-none');
            setTimeout(() => { copyMsg.classList.add('d-none'); }, 2000);
        });
    });

    function generate() {
        const length = parseInt(lengthSlider.value);
        const hasUpper = document.getElementById('includeUpper').checked;
        const hasLower = document.getElementById('includeLower').checked;
        const hasNum = document.getElementById('includeNumbers').checked;
        const hasSym = document.getElementById('includeSymbols').checked;

        if (!hasUpper && !hasLower && !hasNum && !hasSym) {
            alert('Please select at least one character type.');
            return;
        }

        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const nums = '0123456789';
        const syms = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

        let chars = '';
        if (hasUpper) chars += upper;
        if (hasLower) chars += lower;
        if (hasNum) chars += nums;
        if (hasSym) chars += syms;

        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }

        generatedPassword.value = password;
        resultContainer.classList.remove('d-none');
    }
});
