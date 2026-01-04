document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const costOutput = document.getElementById('costOutput');
    const fuelOutput = document.getElementById('fuelOutput');
    const fuelUnitLabel = document.getElementById('fuelUnitLabel');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const distance = parseFloat(document.getElementById('distance').value);
        const distUnit = document.getElementById('distUnit').value;
        const efficiency = parseFloat(document.getElementById('efficiency').value);
        const effUnit = document.getElementById('effUnit').value;
        const price = parseFloat(document.getElementById('price').value);

        if (isNaN(distance) || isNaN(efficiency) || isNaN(price)) return;

        let fuelNeeded = 0;
        let unitLabel = '';

        // Normalize logic
        // If MPG: Fuel = Distance (Miles) / MPG
        // If L/100km: Fuel = Distance (km) * (L_per_100 / 100)

        // Handle Unit Mismatch Logic? 
        // We'll assume sensible inputs: Miles with MPG, Km with L/100km.
        // If they mix (Miles with L/100km), we should convert distance to km first.

        let distKm = distance;
        let distMiles = distance;
        if (distUnit === 'miles') {
            distKm = distance * 1.60934;
        } else {
            distMiles = distance / 1.60934;
        }

        if (effUnit === 'mpg') {
            // Use miles
            fuelNeeded = distMiles / efficiency;
            unitLabel = 'gallons';
        } else {
            // Use km, L/100km
            fuelNeeded = (distKm / 100) * efficiency;
            unitLabel = 'liters';
        }

        const totalCost = fuelNeeded * price;

        costOutput.textContent = '$' + totalCost.toFixed(2);
        fuelOutput.textContent = fuelNeeded.toFixed(2);
        fuelUnitLabel.textContent = unitLabel;

        resultContainer.classList.remove('d-none');
    }
});
