document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const uuidOutput = document.getElementById('uuidOutput');
    const copyBtn = document.getElementById('copyBtn');
    const copyMsg = document.getElementById('copyMsg');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        generate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    copyBtn.addEventListener('click', () => {
        uuidOutput.select();
        uuidOutput.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(uuidOutput.value).then(() => {
            copyMsg.classList.remove('d-none');
            setTimeout(() => { copyMsg.classList.add('d-none'); }, 2000);
        });
    });

    function generate() {
        const qty = parseInt(document.getElementById('quantity').value);
        if (isNaN(qty) || qty < 1) return;

        const count = Math.min(qty, 50); // Cap at 50

        let uuids = [];
        for (let i = 0; i < count; i++) {
            uuids.push(crypto.randomUUID());
        }

        uuidOutput.value = uuids.join('\n');
        resultContainer.classList.remove('d-none');
    }
});
