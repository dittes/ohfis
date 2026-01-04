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
        const input = document.getElementById('numberList').value;
        const isPopulation = document.getElementById('pop').checked;

        const nums = input.split(/[\s,]+/).filter(v => v !== '').map(Number).filter(n => !isNaN(n));

        if (nums.length < 2) {
            alert('Please enter at least 2 numbers.');
            return;
        }

        const n = nums.length;
        const mean = nums.reduce((a, b) => a + b, 0) / n;

        const sumSquareDiffs = nums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);

        // Variance denominator: N for population, N-1 for sample
        const variance = sumSquareDiffs / (isPopulation ? n : n - 1);
        const stdDev = Math.sqrt(variance);

        document.getElementById('stdDevOutput').textContent = stdDev.toFixed(4);
        document.getElementById('varianceOutput').textContent = variance.toFixed(4);
        document.getElementById('meanOutput').textContent = mean.toFixed(4);

        resultContainer.classList.remove('d-none');
    }
});
