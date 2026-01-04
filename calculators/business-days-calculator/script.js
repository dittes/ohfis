document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const bizDaysOutput = document.getElementById('bizDaysOutput');
    const totalDaysOutput = document.getElementById('totalDaysOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const startInput = document.getElementById('startDate').value;
        const endInput = document.getElementById('endDate').value;
        const includeEnd = document.getElementById('includeEnd').checked;

        if (!startInput || !endInput) return;

        const start = new Date(startInput);
        const end = new Date(endInput);

        if (start > end) {
            alert('Start date must be before end date');
            return;
        }

        let current = new Date(start);
        let bizDays = 0;
        let totalDays = 0;

        // Simple Loop - okay for reasonable date ranges
        // End date inclusive check
        const finalDate = new Date(end);
        if (includeEnd) {
            finalDate.setDate(finalDate.getDate() + 1);
        }

        // Loop until current < finalDate (if includeEnd added 1 day, it covers end date)
        // If not includeEnd, we stop before end date? Standard is usually [start, end) or [start, end]
        // Let's assume user wants to know days worked.

        while (current < finalDate) {
            const day = current.getDay();
            totalDays++;
            if (day !== 0 && day !== 6) { // 0 Sun, 6 Sat
                bizDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        // If user unchecked includeEnd but start=end, loop might run 0 times. 
        // Logic above handles range correctly.

        bizDaysOutput.textContent = bizDays;
        totalDaysOutput.textContent = totalDays;

        resultContainer.classList.remove('d-none');
    }
});
