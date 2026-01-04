document.getElementById('ageForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const dobVal = document.getElementById('dob').value;
    const targetVal = document.getElementById('targetDate').value;

    if (!dobVal) { alert('Please enter Date of Birth'); return; }

    const dob = new Date(dobVal);
    const target = targetVal ? new Date(targetVal) : new Date();

    if (dob > target) {
        alert('Date of Birth cannot be in the future relative to the target date.');
        return;
    }

    // Age Calculation
    let years = target.getFullYear() - dob.getFullYear();
    let months = target.getMonth() - dob.getMonth();
    let days = target.getDate() - dob.getDate();

    // Adjust for negative days/months
    if (days < 0) {
        months--;
        // Days in previous month
        const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    // Totals
    const diffTime = Math.abs(target - dob);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;
    // Total months approx (years * 12 + months)
    const totalMonths = (years * 12) + months;

    // Next Birthday
    const currentYear = new Date().getFullYear(); // Use real today for next bday relative to now
    let nextBday = new Date(dob);
    nextBday.setFullYear(currentYear);
    if (nextBday < new Date()) {
        nextBday.setFullYear(currentYear + 1);
    }
    const daysToNext = Math.ceil((nextBday - new Date()) / (1000 * 60 * 60 * 24));

    // Update UI
    document.getElementById('age-main').textContent = `${years} Years`;
    document.getElementById('age-details').textContent = `${months} Months, ${days} Days`;

    document.getElementById('total-months').textContent = totalMonths.toLocaleString();
    document.getElementById('total-weeks').textContent = totalWeeks.toLocaleString();
    document.getElementById('total-days').textContent = totalDays.toLocaleString();
    document.getElementById('total-hours').textContent = totalHours.toLocaleString();

    // Only show next bday if target is today
    if (!targetVal || targetVal === new Date().toISOString().split('T')[0]) {
        document.getElementById('next-bday').textContent = `Next Birthday in ${daysToNext} days`;
        document.getElementById('next-bday').classList.remove('d-none');
    } else {
        document.getElementById('next-bday').classList.add('d-none');
    }

    document.getElementById('result-container').classList.remove('d-none');
});

// Set calculate button to today on load ? No, leave empty is fine.
