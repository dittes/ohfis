document.getElementById('invForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const initial = parseFloat(document.getElementById('initial').value);
    const contribution = parseFloat(document.getElementById('contribution').value) || 0;
    const freq = document.getElementById('contrib-freq').value; // month or year
    const ratePercent = parseFloat(document.getElementById('rate').value);
    const years = parseFloat(document.getElementById('years').value);

    if (isNaN(initial) || isNaN(ratePercent) || isNaN(years)) {
        alert('Please enter valid numbers.');
        return;
    }

    const r = ratePercent / 100;
    let balance = initial;
    let totalInvested = initial;

    // We'll iterate by year for simplicity and clarity of Annual Compounding
    // Or iterate monthly if Monthly contribution?
    // Let's assume Annual Compounding for simplicity as standard for "Investment Return" 
    // unless strictly specified (usually investments compound effectively annually or continuously).
    // If Contribution is Monthly, we add it each month.

    // To be consistent with "Investment Return" apps, usually:
    // Monthly deposits earn interest within the year? Or Simple add then compound at end?
    // Let's do Monthly Iteration with Monthly Compounding (r/12) for best precision if users expect standard bank-like growth.
    // Or use Annual Compounding: Add monthly contributions, but they only compound at end of year?
    // Monthly Compounding is safer/generic.

    const steps = years * 12;
    const monthlyRate = r / 12;

    for (let i = 0; i < steps; i++) {
        // Interest First? Or Deposit First?
        // Let's do Deposit at End of Month.
        balance = balance * (1 + monthlyRate);

        // Add Contribution
        if (freq === 'month') {
            balance += contribution;
            totalInvested += contribution;
        } else if (freq === 'year') {
            // Add on the 12th month
            if ((i + 1) % 12 === 0) {
                balance += contribution;
                totalInvested += contribution;
            }
        }
    }

    const totalProfit = balance - totalInvested;

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    document.getElementById('total-value').textContent = formatter.format(balance);
    document.getElementById('total-invested').textContent = formatter.format(totalInvested);
    document.getElementById('total-profit').textContent = formatter.format(totalProfit);

    document.getElementById('placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
