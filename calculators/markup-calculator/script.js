document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const sellingPriceOutput = document.getElementById('sellingPriceOutput');
    const grossProfitOutput = document.getElementById('grossProfitOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const cost = parseFloat(document.getElementById('costPrice').value);
        const markup = parseFloat(document.getElementById('markupPercent').value);

        if (isNaN(cost) || isNaN(markup)) return;

        // Price = Cost + (Cost * Markup / 100)
        // Profit = Cost * Markup / 100
        const profit = cost * (markup / 100);
        const price = cost + profit;

        sellingPriceOutput.textContent = '$' + price.toFixed(2);
        grossProfitOutput.textContent = '$' + profit.toFixed(2);

        resultContainer.classList.remove('d-none');
    }
});
