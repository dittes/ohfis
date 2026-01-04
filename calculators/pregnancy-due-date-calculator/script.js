
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const dueDateOutput = document.getElementById('dueDateOutput');
    const weeksOutput = document.getElementById('weeksOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const lastPeriodInput = document.getElementById('lastPeriod').value;
        const cycleLength = parseInt(document.getElementById('cycleLength').value);

        if (!lastPeriodInput || isNaN(cycleLength)) return;

        const lmp = new Date(lastPeriodInput);

        // Naegele's Rule: LMP + 1 year - 3 months + 7 days
        // Adjusted for cycle length (standard 28 days).
        // If cycle > 28, add (cycle - 28) days.

        // Standard gestation: 280 days from LMP (40 weeks)
        let gestationDays = 280;
        gestationDays += (cycleLength - 28);

        const dueDate = new Date(lmp);
        dueDate.setDate(lmp.getDate() + gestationDays);

        // Calculate current progress
        const today = new Date();
        const diffTime = Math.abs(today - lmp);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;

        // Format Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dueDateOutput.textContent = dueDate.toLocaleDateString('en-US', options);

        if (today < dueDate && today >= lmp) {
            weeksOutput.textContent = `You are approx. ${weeks} weeks and ${days} days pregnant.`;
        } else if (today >= dueDate) {
            weeksOutput.textContent = "Estimated due date has passed.";
        } else {
            weeksOutput.textContent = "";
        }

        resultContainer.classList.remove('d-none');
    }
});
