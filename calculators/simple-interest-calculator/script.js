document.getElementById('siForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const principal = parseFloat(document.getElementById('principal').value);
    const ratePercent = parseFloat(document.getElementById('rate').value);
    const timeValue = parseFloat(document.getElementById('time').value);
    const timeUnit = document.getElementById('time-unit').value;

    if (isNaN(principal) || isNaN(ratePercent) || isNaN(timeValue)) {
        alert('Please enter valid numbers.');
        return;
    }

    let timeInYears = timeValue;
    if (timeUnit === 'months') {
        timeInYears = timeValue / 12;
    }

    const interest = principal * (ratePercent / 100) * timeInYears;
    const total = principal + interest;

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });

    document.getElementById('total-interest').textContent = formatter.format(interest);
    document.getElementById('res-principal').textContent = formatter.format(principal);
    document.getElementById('total-amount').textContent = formatter.format(total);

    document.getElementById('placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
