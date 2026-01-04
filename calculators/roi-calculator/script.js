document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const roiPercentOutput = document.getElementById('roiPercentOutput');
    const profitOutput = document.getElementById('profitOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const invested = parseFloat(document.getElementById('invested').value);
        const returned = parseFloat(document.getElementById('returned').value);

        if (isNaN(invested) || isNaN(returned)) return;

        const profit = returned - invested;
        const roi = (profit / invested) * 100;

        roiPercentOutput.textContent = roi.toFixed(2) + '%';

        // Color coding for profit logic
        if (profit >= 0) {
            profitOutput.classList.remove('text-danger');
            profitOutput.classList.add('text-success');
            profitOutput.textContent = '+$' + profit.toFixed(2);
        } else {
            profitOutput.classList.remove('text-success');
            profitOutput.classList.add('text-danger');
            profitOutput.textContent = '-$' + Math.abs(profit).toFixed(2);

        }

        resultContainer.classList.remove('d-none');
    }
});
