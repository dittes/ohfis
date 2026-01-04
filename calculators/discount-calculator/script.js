document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const finalPriceOutput = document.getElementById('finalPriceOutput');
    const savingsOutput = document.getElementById('savingsOutput');
    const originalOutput = document.getElementById('originalOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const price = parseFloat(document.getElementById('originalPrice').value);
        const discount = parseFloat(document.getElementById('discountPercent').value);

        if (isNaN(price) || isNaN(discount)) return;

        const savings = price * (discount / 100);
        const finalPrice = price - savings;

        finalPriceOutput.textContent = '$' + finalPrice.toFixed(2);
        savingsOutput.textContent = '$' + savings.toFixed(2);
        originalOutput.textContent = '$' + price.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
