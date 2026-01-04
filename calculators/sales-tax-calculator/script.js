document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const totalPriceOutput = document.getElementById('totalPriceOutput');
    const taxAmountOutput = document.getElementById('taxAmountOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const price = parseFloat(document.getElementById('priceBeforeTax').value);
        const rate = parseFloat(document.getElementById('taxRate').value);

        if (isNaN(price) || isNaN(rate)) return;

        const tax = price * (rate / 100);
        const total = price + tax;

        totalPriceOutput.textContent = '$' + total.toFixed(2);
        taxAmountOutput.textContent = '$' + tax.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
