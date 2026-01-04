document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const breakEvenUnitsOutput = document.getElementById('breakEvenUnitsOutput');
    const breakEvenRevenueOutput = document.getElementById('breakEvenRevenueOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const fixedCosts = parseFloat(document.getElementById('fixedCosts').value);
        const variableCost = parseFloat(document.getElementById('variableCost').value);
        const price = parseFloat(document.getElementById('pricePerUnit').value);

        if (isNaN(fixedCosts) || isNaN(variableCost) || isNaN(price)) return;

        if (price <= variableCost) {
            alert("Price must be greater than Variable Cost per Unit to break even.");
            return;
        }

        // Break Even Units = Fixed Costs / (Price - Variable Cost)
        const units = Math.ceil(fixedCosts / (price - variableCost));
        const revenue = units * price;

        breakEvenUnitsOutput.textContent = units.toLocaleString();
        breakEvenRevenueOutput.textContent = '$' + revenue.toLocaleString('en-US', { minimumFractionDigits: 2 });

        resultContainer.classList.remove('d-none');
    }
});
