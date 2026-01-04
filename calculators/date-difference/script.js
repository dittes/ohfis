document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dateDiffForm');
    const resultContainer = document.getElementById('result-container');
    const diffDaysEl = document.getElementById('diff-days');
    const diffYearsEl = document.getElementById('diff-years');
    const diffMonthsEl = document.getElementById('diff-months');
    const diffWeeksEl = document.getElementById('diff-weeks');
    const altReadingEl = document.getElementById('alternative-reading');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // Set default dates (Today and Tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    startDateInput.valueAsDate = today;
    endDateInput.valueAsDate = tomorrow;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateDifference();
    });

    function calculateDifference() {
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);
        const includeEnd = document.getElementById('includeEndDay').checked;

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            alert('Please enter valid dates.');
            return;
        }

        // Calculation logic
        // Treat dates as UTC to avoid daylight saving issues affecting day difference roughly
        const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

        let msPerDay = 1000 * 60 * 60 * 24;
        let msDiff = Math.abs(utcEnd - utcStart);
        let daysDiff = Math.floor(msDiff / msPerDay);

        if (includeEnd) {
            daysDiff += 1;
        }

        // Rough breakdowns
        let years = 0;
        let months = 0;
        let days = daysDiff;
        let weeks = Math.floor(daysDiff / 7);

        // Precise Year/Month/Day calculation
        // Start from earlier date and add up
        let tempDate = new Date(Math.min(utcStart, utcEnd));
        let targetDate = new Date(Math.max(utcStart, utcEnd));

        if (includeEnd) {
            // If we include end day, effectively we represent a span, but usually breakdown "1 year 2 months" implies duration between. 
            // Adding 1 day to the total count is easy, but adding it to Y/M/D logic:
            // Let's just calculate difference normally, and say "plus 1 day" or just add to the final days remainder.
            // Simplest: Add 1 day to the target date for the calculation loop
            targetDate.setDate(targetDate.getDate() + 1);
        }

        let y = targetDate.getFullYear() - tempDate.getFullYear();
        let m = targetDate.getMonth() - tempDate.getMonth();
        let d = targetDate.getDate() - tempDate.getDate();

        if (d < 0) {
            m--;
            // Days in previous month
            let prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
            d += prevMonth.getDate();
        }
        if (m < 0) {
            y--;
            m += 12;
        }

        // Display Results
        diffDaysEl.textContent = daysDiff.toLocaleString();

        diffYearsEl.textContent = y;
        diffMonthsEl.textContent = m;
        // For weeks display in the breakdown boxes, it's ambiguous. 
        // The boxes usually show total conversions.
        // Let's make the boxes show "Alternative units"
        diffYearsEl.textContent = (daysDiff / 365.25).toFixed(1); // Approx
        diffMonthsEl.textContent = (daysDiff / 30.44).toFixed(1); // Approx
        diffWeeksEl.textContent = weeks.toLocaleString();

        // But wait, the box labels created in HTML allow for either "Total converted" or "Breakdown".
        // Let's stick to Total Converted approximation for the boxes as they are separate.
        // And use the "Alternative Reading" for the precise string.

        altReadingEl.textContent = `Precise duration: ${y} years, ${m} months, and ${d} days.`;

        resultContainer.classList.remove('d-none');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
});
