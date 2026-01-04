document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const num = parseFloat(document.getElementById('numberInput').value);
        const precision = parseInt(document.getElementById('precision').value);
        const mode = document.getElementById('mode').value;

        if (isNaN(num)) return;

        let result;
        const factor = Math.pow(10, precision);

        switch (mode) {
            case 'round':
                result = Math.round(num * factor) / factor;
                break;
            case 'ceil':
                result = Math.ceil(num * factor) / factor;
                break;
            case 'floor':
                result = Math.floor(num * factor) / factor;
                break;
        }

        document.getElementById('originalOutput').textContent = num;
        document.getElementById('roundedOutput').textContent = result; // .toFixed(precision)? Maybe. But standard round behaves naturally.

        resultContainer.classList.remove('d-none');
    }
});
