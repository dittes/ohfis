document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const futureValueOutput = document.getElementById('futureValueOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const amount = parseFloat(document.getElementById('initialAmount').value);
        const rate = parseFloat(document.getElementById('inflationRate').value);
        const years = parseFloat(document.getElementById('years').value);

        if (isNaN(amount) || isNaN(rate) || isNaN(years)) return;

        // Future Value = P * (1 + r)^t
        const futureValue = amount * Math.pow((1 + (rate / 100)), years);

        futureValueOutput.textContent = '$' + futureValue.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
