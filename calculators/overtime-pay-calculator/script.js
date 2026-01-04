document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const totalPayOutput = document.getElementById('totalPayOutput');
    const overtimePayOutput = document.getElementById('overtimePayOutput');
    const regularPayOutput = document.getElementById('regularPayOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const hourlyRate = parseFloat(document.getElementById('regularPay').value);
        const multiplier = parseFloat(document.getElementById('multiplier').value);
        const regularHours = parseFloat(document.getElementById('regularHours').value);
        const overtimeHours = parseFloat(document.getElementById('overtimeHours').value);

        if (isNaN(hourlyRate) || isNaN(regularHours) || isNaN(overtimeHours)) return;

        const regularTotal = hourlyRate * regularHours;
        const overtimeTotal = hourlyRate * multiplier * overtimeHours;
        const grandTotal = regularTotal + overtimeTotal;

        totalPayOutput.textContent = '$' + grandTotal.toFixed(2);
        overtimePayOutput.textContent = '$' + overtimeTotal.toFixed(2);
        regularPayOutput.textContent = '$' + regularTotal.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
