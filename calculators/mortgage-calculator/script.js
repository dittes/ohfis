document.getElementById('mortgageForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const amountInput = parseFloat(document.getElementById('amount').value);
    const rateInput = parseFloat(document.getElementById('rate').value);
    const termYears = parseFloat(document.getElementById('term').value);
    const downPaymentInput = parseFloat(document.getElementById('down-payment').value) || 0;

    if (isNaN(amountInput) || isNaN(rateInput) || isNaN(termYears)) {
        alert('Please enter valid numbers for Amount, Rate, and Term.');
        return;
    }

    const principal = amountInput - downPaymentInput;
    if (principal <= 0) {
        alert('Down payment cannot be greater than or equal to the loan amount.');
        return;
    }

    const monthlyRate = (rateInput / 100) / 12;
    const numberOfPayments = termYears * 12;

    let monthlyPayment = 0;

    // If interest rate is 0
    if (rateInput === 0) {
        monthlyPayment = principal / numberOfPayments;
    } else {
        monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }

    const totalCost = monthlyPayment * numberOfPayments;
    const totalInterest = totalCost - principal;

    // Formatting
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });

    document.getElementById('monthly-payment').textContent = formatter.format(monthlyPayment);
    document.getElementById('total-principal').textContent = formatter.format(principal);
    document.getElementById('total-interest').textContent = formatter.format(totalInterest);
    document.getElementById('total-cost').textContent = formatter.format(totalCost);

    // Show results
    document.getElementById('result-placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
