document.getElementById('ciForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const principal = parseFloat(document.getElementById('principal').value);
    const monthlyContribution = parseFloat(document.getElementById('monthly-contribution').value) || 0;
    const ratePercent = parseFloat(document.getElementById('rate').value);
    const years = parseFloat(document.getElementById('years').value);
    const frequency = parseInt(document.getElementById('frequency').value);

    if (isNaN(principal) || isNaN(ratePercent) || isNaN(years)) {
        alert('Please fill in all required fields properly.');
        return;
    }

    const r = ratePercent / 100;
    const n = frequency;
    const t = years;

    // Formula: FV = P(1 + r/n)^(nt) + PMT * [ (1 + r/n)^(nt) - 1 ] / (r/n)
    // PMT is adjusted if contribution is monthly but compounding is different.
    // Simplifying assumption: User contributes 'frequency' times? No, UI says "Monthly Contribution".
    // If Compounding is Annually but Contribution is Monthly, strict calculation is complex (Iterative).
    // Standard approach for simple calculators:
    // 1. Calculate FV of Principal: P * (1 + r/n)^(nt)
    // 2. Calculate FV of Contributions:
    // If Contribution freq == Compounding freq: Simple annuity formula.
    // If not, we iterate month by month for accuracy. I'll use iteration for robustness.

    let currentBalance = principal;
    const totalMonths = years * 12;
    const ratePerMonth = r / 12; // Nominal monthly rate?
    // Actually, if compounding is n, effective rate per period is r/n.
    // But if we iterate monthly, we need to apply interest based on the compounding schedule.

    // Iterative Simulation
    let totalContributed = principal;

    // Convert 'frequency' to months interval (12/frequency). 
    // e.g. freq=1 (Annual) -> interval=12 months.
    // freq=12 (Monthly) -> interval=1 month.
    // This is approximate if freq=365. Let's stick to standard annuity formulas for clean math if possible, 
    // or just assume Monthly Compounding for the Contributions part if user selected Monthly?
    // Let's do the standard generic formula assuming contributions are made at the END of each MONTH, 
    // and interest compounds according to Frequency.
    // Actually, most simple calculators assume Monthly Compounding if Monthly Contributions.

    // Let's try flexible iteration:
    let balance = principal;

    const compoundingIntervalMonths = 12 / frequency; // e.g. 12/12 = 1, 12/1 = 12.
    // If Daily, it is small.

    // Let's use days for maximum precision? No, too slow maybe? No, 30 years is 10k days. JS is fast.
    // Let's Stick to Monthly iterations for contributions, and apply interest when needed.

    // Actually, let's simplify: Standard Compound Interest Formula usually matches the compounding freq.
    // If user selects "Annually", we assume contributions happen annually? 
    // Label says "Monthly Contribution".
    // So we have:
    // 1. Initial Principal growing at (1 + r/n)^(nt)
    // 2. Stream of Monthly Payments.
    // Future Value of a Series: FV = PMT * [ (1 + r/k)^(kt) - 1 ] / (r/k) ?
    // Where k is compounding freq? No.
    // Let's use a Month-by-Month loop. It's safe and easy to debug.

    let simBalance = principal;
    let interestAccrued = 0;

    // We step through every month
    for (let m = 1; m <= totalMonths; m++) {
        // Add contribution at end of month (or beginning? let's say End)
        simBalance += monthlyContribution;
        totalContributed += monthlyContribution;

        // Apply Interest?
        // Interest applies continuosly or periodically?
        // Standard definition: Compounded 'frequency' times per year.
        // If Frequency = 12 (Monthly), we apply r/12 each month.
        // If Frequency = 1 (Annually), we apply r/1 at month 12, 24, etc.
        // What happens to the money sitting successfully in months 1-11? It earns nothing until month 12?
        // Yes, that's strict discrete compounding.

        if (m % (12 / frequency) === 0) { // e.g. if freq=1, 12/1=12. remainder 0 at m=12.
            // Apply interest for the period.
            // Rate for the period = r / frequency.
            // Apply to specific balance?
            // Wait, if I added contribution at m=1, 2...11, they sit there.
            // At m=12, we apply interest to the WHOLE balance?
            // Yes.
            const periodRate = r / frequency;
            simBalance = simBalance * (1 + periodRate);
            // Caution: handling non-integer intervals (Daily = 365) via month loop is tricky.
            // For Daily, 12/365 is fractional.
        }
    }

    // Special handling for Daily/Continuous or if Loop is imprecise for Frequency > 12
    if (frequency > 12) {
        // Fallback to Formula for Principal + Formula for Annuity (assuming freq=12 for annuity compounding approx or just Daily logic)
        // Let's use the formula approach assuming M=12 contributions allow partial compounding?
        // Let's simplify: Assume Frequency = 12 for the contribution part effectively, 
        // OR just treat the Monthly Contribution as (Monthly * 12 / Frequency) per period? No.

        // BETTER APPROACH:
        // Use the precise FV formula for Monthly Contributions with N-compounding.
        // FV = P * (1 + r/n)^(n*t) + (PMT * 12 / n) * ... This gets messy.

        // Let's stick to the Loop but step by DAY if freq > 12?
        /*
        simBalance = principal;
        totalContributed = principal;
        const totalDays = years * 365;
        const dailyRate = r / frequency; // if freq=365
        // but contrib is monthly...
        // This is getting over-engineered for a generic web tool.
        */

        // REVERT TO: Effective Annual Rate (EAR) method?
        // Let's just use the Loop with Monthly Steps. 
        // If Frequency=365, we apply (1+r/365)^(365/12) each month?
        // Yes! Effective monthly rate.
        // Effective monthly multiplier = (1 + r/n)^(n/12)
    }

    // Refined Loop Calculation
    simBalance = principal;
    totalContributed = principal;
    const effectiveMonthlyMultiplier = Math.pow(1 + r / frequency, frequency / 12);

    for (let i = 0; i < totalMonths; i++) {
        // Add monthly contribution
        simBalance += monthlyContribution;
        totalContributed += monthlyContribution;

        // Apply "effective" monthly interest
        // Use multiply logic
        simBalance = simBalance * effectiveMonthlyMultiplier;

        // Wait, interest is usually applied to the balance BEFORE the contribution if BoM vs EoM.
        // Let's assume EoM: Contribution happens, then Interest?
        // Usually Interest First on existing balance, THEN contribution adds to it for next month?
        // Or Contribution earns interest in that first month?
        // Let's do: NEW_BAL = (OLD_BAL * RATE) + CONTRIB.
        // If Contrib is EoM, it doesn't earn interest in that month.
    }

    // Let's retry the loop cleanly
    simBalance = principal;
    totalContributed = principal;

    for (let i = 0; i < totalMonths; i++) {
        // 1. Interest grows on existing money
        simBalance = simBalance * effectiveMonthlyMultiplier;

        // 2. Add contribution (EoM)
        simBalance += monthlyContribution;
        totalContributed += monthlyContribution;
    }

    const totalInterest = simBalance - totalContributed;

    // Formatting
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });

    document.getElementById('future-value').textContent = formatter.format(simBalance);
    document.getElementById('total-contributions').textContent = formatter.format(totalContributed);
    document.getElementById('total-interest').textContent = formatter.format(totalInterest);

    // Show results
    document.getElementById('result-placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
