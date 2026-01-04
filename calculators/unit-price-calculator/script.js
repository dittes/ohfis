document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');

    const unitPriceAOutput = document.getElementById('unitPriceA');
    const unitPriceBOutput = document.getElementById('unitPriceB');
    const badgeA = document.getElementById('badgeA');
    const badgeB = document.getElementById('badgeB');
    const cardA = document.getElementById('cardA');
    const cardB = document.getElementById('cardB');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const priceA = parseFloat(document.getElementById('priceA').value);
        const qtyA = parseFloat(document.getElementById('qtyA').value);
        const priceB = parseFloat(document.getElementById('priceB').value);
        const qtyB = parseFloat(document.getElementById('qtyB').value);

        if (qtyA === 0 || qtyB === 0) return;

        const unitPriceA = priceA / qtyA;
        const unitPriceB = priceB / qtyB;

        unitPriceAOutput.textContent = '$' + unitPriceA.toFixed(4) + ' / unit';
        unitPriceBOutput.textContent = '$' + unitPriceB.toFixed(4) + ' / unit';

        // Reset Styles
        badgeA.classList.add('d-none');
        badgeB.classList.add('d-none');
        cardA.classList.remove('border-primary', 'border-success', 'border-0');
        cardB.classList.remove('border-primary', 'border-success', 'border-0');

        if (unitPriceA < unitPriceB) {
            badgeA.classList.remove('d-none');
            cardA.classList.add('border-success');
        } else if (unitPriceB < unitPriceA) {
            badgeB.classList.remove('d-none');
            cardB.classList.add('border-success');
        } else {
            // Equal
            cardA.classList.add('border-primary');
            cardB.classList.add('border-primary');
        }

        resultContainer.classList.remove('d-none');
    }
});
