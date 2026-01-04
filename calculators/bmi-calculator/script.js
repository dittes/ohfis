document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bmiForm');
    const metricInputs = document.getElementById('metric-inputs');
    const imperialInputs = document.getElementById('imperial-inputs');
    const resultDiv = document.getElementById('result');
    const bmiValueEl = document.getElementById('bmi-value');
    const bmiCategoryEl = document.getElementById('bmi-category');

    // Toggle Inputs
    const unitRadios = document.getElementsByName('unit');
    unitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'metric') {
                metricInputs.classList.remove('d-none');
                imperialInputs.classList.add('d-none');
                document.getElementById('height-cm').required = true;
                document.getElementById('weight-kg').required = true;
                document.getElementById('height-ft').required = false;
                document.getElementById('height-in').required = false;
                document.getElementById('weight-lbs').required = false;
            } else {
                metricInputs.classList.add('d-none');
                imperialInputs.classList.remove('d-none');
                document.getElementById('height-cm').required = false;
                document.getElementById('weight-kg').required = false;
                document.getElementById('height-ft').required = true;
                document.getElementById('height-in').required = true;
                document.getElementById('weight-lbs').required = true;
            }
        });
    });

    // Calculate
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        let weight, height; // weight in kg, height in meters
        const unit = document.querySelector('input[name="unit"]:checked').value;

        if (unit === 'metric') {
            const cm = parseFloat(document.getElementById('height-cm').value);
            const kg = parseFloat(document.getElementById('weight-kg').value);
            if (!cm || !kg) return;

            weight = kg;
            height = cm / 100;
        } else {
            const ft = parseFloat(document.getElementById('height-ft').value);
            const inch = parseFloat(document.getElementById('height-in').value);
            const lbs = parseFloat(document.getElementById('weight-lbs').value);
            if ((!ft && ft !== 0) || (!inch && inch !== 0) || !lbs) return;

            // Convert to metric for formula
            weight = lbs * 0.453592;
            const totalInches = (ft * 12) + inch;
            height = totalInches * 0.0254;
        }

        if (height > 0 && weight > 0) {
            const bmi = weight / (height * height);
            displayResult(bmi);
        }
    });

    function displayResult(bmi) {
        const roundedBMI = bmi.toFixed(1);
        bmiValueEl.textContent = roundedBMI;

        let category = '';
        let colorClass = 'bg-secondary';

        if (bmi < 18.5) {
            category = 'Underweight';
            colorClass = 'bg-info';
        } else if (bmi >= 18.5 && bmi <= 24.9) {
            category = 'Normal Weight';
            colorClass = 'bg-success';
        } else if (bmi >= 25 && bmi <= 29.9) {
            category = 'Overweight';
            colorClass = 'bg-warning text-dark';
        } else {
            category = 'Obesity';
            colorClass = 'bg-danger';
        }

        bmiCategoryEl.textContent = category;
        bmiCategoryEl.className = `badge fs-6 px-3 py-2 rounded-pill ${colorClass}`;

        resultDiv.classList.remove('d-none');
    }
});
