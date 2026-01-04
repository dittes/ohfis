document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const paceMileOutput = document.getElementById('paceMileOutput');
    const paceKmOutput = document.getElementById('paceKmOutput');

    // Auto fill distance presets
    const distInput = document.getElementById('distance');
    const distUnit = document.getElementById('distUnit');

    distUnit.addEventListener('change', () => {
        const val = distUnit.value;
        if (val === 'marathon') {
            distInput.value = 26.2188;
            distUnit.value = 'miles'; // switch logic? No, keep marathon selected but fill value? 
            // Better: just handle calculation logic. But nice UI touch: fill 26.2
            distInput.value = '26.219';
        } else if (val === 'half') {
            distInput.value = '13.109';
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function formatTime(minutesFloat) {
        const mins = Math.floor(minutesFloat);
        const secs = Math.round((minutesFloat - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function calculate() {
        // Get Total Time in Minutes
        const h = parseFloat(document.getElementById('timeHours').value) || 0;
        const m = parseFloat(document.getElementById('timeMinutes').value) || 0;
        const s = parseFloat(document.getElementById('timeSeconds').value) || 0;

        let totalMinutes = (h * 60) + m + (s / 60);

        let dist = parseFloat(distInput.value);
        let unit = distUnit.value;

        // Handle presets if user selected them but didn't change input logic
        if (unit === 'marathon') { dist = 26.219; unit = 'miles'; }
        if (unit === 'half') { dist = 13.109; unit = 'miles'; }

        if (dist === 0 || totalMinutes === 0) return;

        let distMiles = dist;
        let distKm = dist;

        if (unit === 'miles') {
            distKm = dist * 1.60934;
        } else if (unit === 'km') {
            distMiles = dist / 1.60934;
        } else if (unit === 'meters') {
            distKm = dist / 1000;
            distMiles = distKm / 1.60934;
        }

        const paceMileMin = totalMinutes / distMiles;
        const paceKmMin = totalMinutes / distKm;

        paceMileOutput.textContent = formatTime(paceMileMin);
        paceKmOutput.textContent = formatTime(paceKmMin);

        resultContainer.classList.remove('d-none');
    }
});
