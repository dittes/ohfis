document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const waterOutput = document.getElementById('waterOutput');
    const cupsOutput = document.getElementById('cupsOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        let weight = parseFloat(document.getElementById('weight').value);
        const unit = document.getElementById('weightUnit').value;
        const activity = document.getElementById('activity').value;

        if (isNaN(weight) || weight <= 0) return;

        // Convert to kg
        if (unit === 'lb') {
            weight = weight * 0.453592;
        }

        // Base calculation:
        // Commonly cited: 30-35ml per kg body weight?
        // Or weight * 0.033

        let intakeLiters = weight * 0.033;

        // Activity adjustments (roughly +0.35L - 1.0L depending on level)
        // Simple multipliers or additives
        switch (activity) {
            case 'light': intakeLiters += 0.35; break;
            case 'moderate': intakeLiters += 0.7; break;
            case 'active': intakeLiters += 1.0; break;
            case 'extra': intakeLiters += 1.5; break;
        }

        // Display
        // Show in Liters and optionally Oz if user used lbs? 
        // For simplicity, primary in Liters (as science), standard cups as reference.

        // If user used Lbs, maybe show Oz as primary? 
        // Let's show "X L (Y oz)" text

        const intakeOz = intakeLiters * 33.814;
        const cups = intakeLiters / 0.250; // 250ml cups

        let mainText = `${intakeLiters.toFixed(2)} L`;
        if (unit === 'lb') {
            mainText = `${intakeLiters.toFixed(2)} L (${Math.round(intakeOz)} oz)`;
        }

        waterOutput.textContent = mainText;
        cupsOutput.textContent = Math.round(cups);

        resultContainer.classList.remove('d-none');
    }
});
