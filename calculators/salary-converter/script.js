document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');

    // Outputs
    const annualOutput = document.getElementById('annualOutput');
    const monthlyOutput = document.getElementById('monthlyOutput');
    const biweeklyOutput = document.getElementById('biweeklyOutput');
    const weeklyOutput = document.getElementById('weeklyOutput');
    const dailyOutput = document.getElementById('dailyOutput');
    const hourlyOutput = document.getElementById('hourlyOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function formatCurrency(num) {
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function calculate() {
        const amount = parseFloat(document.getElementById('salaryAmount').value);
        const period = document.getElementById('salaryPeriod').value;
        const hoursPerWeek = parseFloat(document.getElementById('hoursPerWeek').value);

        if (isNaN(amount) || isNaN(hoursPerWeek)) return;

        let annual = 0;
        const weeksPerYear = 52;
        const daysPerWeek = 5; // Standard Assumption? Or hoursPerWeek / 8? using standard 5 for simplicity

        switch (period) {
            case 'hour':
                annual = amount * hoursPerWeek * weeksPerYear;
                break;
            case 'day':
                annual = amount * daysPerWeek * weeksPerYear;
                break;
            case 'week':
                annual = amount * weeksPerYear;
                break;
            case 'month':
                annual = amount * 12;
                break;
            case 'year':
                annual = amount;
                break;
        }

        const monthly = annual / 12;
        const biweekly = annual / 26;
        const weekly = annual / 52;
        const daily = annual / (weeksPerYear * daysPerWeek);
        const hourly = annual / (weeksPerYear * hoursPerWeek);

        annualOutput.textContent = formatCurrency(annual);
        monthlyOutput.textContent = formatCurrency(monthly);
        biweeklyOutput.textContent = formatCurrency(biweekly);
        weeklyOutput.textContent = formatCurrency(weekly);
        dailyOutput.textContent = formatCurrency(daily);
        hourlyOutput.textContent = formatCurrency(hourly);

        resultContainer.classList.remove('d-none');
    }
});
