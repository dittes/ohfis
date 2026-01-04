document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loanForm');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultContainer = document.getElementById('result-container');

    // Result elements
    const monthlyPaymentEl = document.getElementById('monthly-payment');
    const totalPrincipalEl = document.getElementById('total-principal');
    const totalInterestEl = document.getElementById('total-interest');
    const totalCostEl = document.getElementById('total-cost');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('amount').value);
        const ratePercent = parseFloat(document.getElementById('rate').value);
        const termInput = parseFloat(document.getElementById('term').value);
        const termUnit = document.getElementById('term-unit').value;

        if (!amount || !termInput || ratePercent < 0) return;

        // Convert term to months
        const totalMonths = termUnit === 'years' ? termInput * 12 : termInput;

        // Monthly interest rate
        const monthlyRate = (ratePercent / 100) / 12;

        let monthlyPayment = 0;
        let totalCost = 0;
        let totalInterest = 0;

        if (monthlyRate === 0) {
            // Simple division if interest is 0
            monthlyPayment = amount / totalMonths;
        } else {
            // Formula: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
            monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }

        totalCost = monthlyPayment * totalMonths;
        totalInterest = totalCost - amount;

        // Format currency
        const formatCurrency = (num) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
        };

        monthlyPaymentEl.textContent = formatCurrency(monthlyPayment);
        totalPrincipalEl.textContent = formatCurrency(amount);
        totalInterestEl.textContent = formatCurrency(totalInterest);
        totalCostEl.textContent = formatCurrency(totalCost);

        // Show results
        resultPlaceholder.classList.add('d-none');
        resultContainer.classList.remove('d-none');
    });
});
