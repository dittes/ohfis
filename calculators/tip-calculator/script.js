document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const totalPerPersonOutput = document.getElementById('totalPerPersonOutput');
    const totalTipOutput = document.getElementById('totalTipOutput');
    const totalBillOutput = document.getElementById('totalBillOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const bill = parseFloat(document.getElementById('billAmount').value);
        const tipPercent = parseFloat(document.getElementById('tipPercent').value);
        const people = parseInt(document.getElementById('peopleCount').value);

        if (isNaN(bill) || isNaN(tipPercent) || isNaN(people) || people < 1) return;

        const tipAmount = bill * (tipPercent / 100);
        const totalBill = bill + tipAmount;
        const perPerson = totalBill / people;

        totalPerPersonOutput.textContent = '$' + perPerson.toFixed(2);
        totalTipOutput.textContent = '$' + tipAmount.toFixed(2);
        totalBillOutput.textContent = '$' + totalBill.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
