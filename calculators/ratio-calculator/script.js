document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const A = parseFloat(document.getElementById('valA').value);
        const B = parseFloat(document.getElementById('valB').value);
        const C = parseFloat(document.getElementById('valC').value);

        if (isNaN(A) || isNaN(B) || isNaN(C)) return;
        if (A === 0) {
            alert('Value A cannot be zero in A:B = C:X relation (division by zero).');
            return;
        }

        // A/B = C/X => X = (B*C)/A
        // Wait, ratio usually A:B = C:X means A/B = C/X. Yes.

        const X = (B * C) / A;

        document.getElementById('dispA').textContent = A;
        document.getElementById('dispB').textContent = B;
        document.getElementById('dispC').textContent = C;
        document.getElementById('resX').textContent = Number.isInteger(X) ? X : X.toFixed(4);

        resultContainer.classList.remove('d-none');
    }
});
