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
        // Split by comma, space, newline
        const nums = input.split(/[\s,]+/).filter(v => v !== '').map(Number).filter(n => !isNaN(n));

        if (nums.length === 0) return;

        nums.sort((a, b) => a - b);

        // Sum & Mean
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;

        // Median
        let median;
        const mid = Math.floor(nums.length / 2);
        if (nums.length % 2 === 0) {
            median = (nums[mid - 1] + nums[mid]) / 2;
        } else {
            median = nums[mid];
        }

        // Mode
        const counts = {};
        nums.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
        let maxCount = 0;
        let modes = [];
        for (const n in counts) {
            if (counts[n] > maxCount) {
                maxCount = counts[n];
                modes = [n];
            } else if (counts[n] === maxCount) {
                modes.push(n);
            }
        }

        // Output
        document.getElementById('meanOutput').textContent = Number.isInteger(mean) ? mean : mean.toFixed(4);
        document.getElementById('medianOutput').textContent = median;
        document.getElementById('modeOutput').textContent = modes.length === nums.length ? 'None' : modes.join(', ');

        document.getElementById('countOutput').textContent = nums.length;
        document.getElementById('sumOutput').textContent = sum;

        resultContainer.classList.remove('d-none');
    }
});
