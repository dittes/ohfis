document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resNum = document.getElementById('resNum');
    const resDen = document.getElementById('resDen');
    const resDecimal = document.getElementById('resDecimal');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const n1 = parseInt(document.getElementById('num1').value);
        const d1 = parseInt(document.getElementById('den1').value);
        const n2 = parseInt(document.getElementById('num2').value);
        const d2 = parseInt(document.getElementById('den2').value);
        const op = document.getElementById('operator').value;

        if (isNaN(n1) || isNaN(d1) || isNaN(n2) || isNaN(d2)) return;
        if (d1 === 0 || d2 === 0) {
            alert('Denominator cannot be zero.');
            return;
        }

        let numRes, denRes;

        switch (op) {
            case '+':
                numRes = n1 * d2 + n2 * d1;
                denRes = d1 * d2;
                break;
            case '-':
                numRes = n1 * d2 - n2 * d1;
                denRes = d1 * d2;
                break;
            case '*':
                numRes = n1 * n2;
                denRes = d1 * d2;
                break;
            case '/':
                numRes = n1 * d2;
                denRes = d1 * n2;
                break;
        }

        if (denRes === 0) {
            alert('Result undefined (division by zero).');
            return;
        }

        // Simpify
        const commonDivisor = gcd(Math.abs(numRes), Math.abs(denRes));
        numRes /= commonDivisor;
        denRes /= commonDivisor;

        // Handle negative denominator
        if (denRes < 0) {
            numRes = -numRes;
            denRes = -denRes;
        }

        resNum.textContent = numRes;
        resDen.textContent = denRes;
        resDecimal.textContent = (numRes / denRes).toFixed(4);

        resultContainer.classList.remove('d-none');
    }

    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }
});
