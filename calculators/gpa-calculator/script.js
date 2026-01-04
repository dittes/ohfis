
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const gpaOutput = document.getElementById('gpaOutput');
    const totalCreditsOutput = document.getElementById('totalCredits');
    const addRowBtn = document.getElementById('addRowBtn');
    const tableBody = document.querySelector('#coursesTable tbody');

    // Add Row
    addRowBtn.addEventListener('click', () => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm"></td>
            <td><input type="number" class="form-control form-control-sm credits" value="3" min="0" max="10"></td>
            <td>
                <select class="form-select form-select-sm grade">
                    <option value="4.0">A</option>
                    <option value="3.7">A-</option>
                    <option value="3.3">B+</option>
                    <option value="3.0">B</option>
                    <option value="2.7">B-</option>
                    <option value="2.3">C+</option>
                    <option value="2.0">C</option>
                    <option value="1.7">C-</option>
                    <option value="1.0">D</option>
                    <option value="0.0">F</option>
                </select>
            </td>
            <td><button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="removeRow(this)"><i class="bi bi-x-lg"></i></button></td>
        `;
        tableBody.appendChild(row);
    });

    // Remove Row global function (attached to window for onclick attribute)
    window.removeRow = function (btn) {
        btn.closest('tr').remove();
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        // Reset to default 3 rows? Or just clear values? 
        // Default behavior of form.reset() clears inputs but doesn't remove dynamic rows.
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const rows = tableBody.querySelectorAll('tr');
        let totalPoints = 0;
        let totalCredits = 0;

        rows.forEach(row => {
            const credits = parseFloat(row.querySelector('.credits').value) || 0;
            const grade = parseFloat(row.querySelector('.grade').value);

            if (credits > 0) {
                totalPoints += credits * grade;
                totalCredits += credits;
            }
        });

        if (totalCredits === 0) return;

        const gpa = totalPoints / totalCredits;

        gpaOutput.textContent = gpa.toFixed(2);
        totalCreditsOutput.textContent = totalCredits;

        resultContainer.classList.remove('d-none');
    }
});
