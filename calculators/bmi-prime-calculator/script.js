document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const primeOutput = document.getElementById('primeOutput');
    const categoryOutput = document.getElementById('categoryOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        let height = parseFloat(document.getElementById('height').value);
        let weight = parseFloat(document.getElementById('weight').value);
        const heightUnit = document.getElementById('heightUnit').value;
        const weightUnit = document.getElementById('weightUnit').value;

        if (!height || !weight || height <= 0 || weight <= 0) return;

        // Metricize
        if (heightUnit === 'in') {
            height = height * 2.54;
        }
        if (weightUnit === 'lb') {
            weight = weight * 0.453592;
        }

        // BMI = weight(kg) / height(m)^2
        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);

        // BMI Prime = BMI / 25
        const bmiPrime = bmi / 25;

        primeOutput.textContent = bmiPrime.toFixed(2);

        // Category
        let cat = '';
        let colorClass = 'bg-secondary';

        if (bmiPrime < 0.74) {
            cat = 'Underweight';
            colorClass = 'bg-info';
        } else if (bmiPrime < 1.00) {
            cat = 'Healthy Weight';
            colorClass = 'bg-success';
        } else if (bmiPrime < 1.20) {
            cat = 'Overweight';
            colorClass = 'bg-warning text-dark';
        } else {
            cat = 'Obese';
            colorClass = 'bg-danger';
        }

        categoryOutput.textContent = cat;
        categoryOutput.className = `badge fs-6 mt-2 ${colorClass}`;

        resultContainer.classList.remove('d-none');
    }
});
