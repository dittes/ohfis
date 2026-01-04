document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const marginPercentOutput = document.getElementById('marginPercentOutput');
    const grossProfitOutput = document.getElementById('grossProfitOutput');
    const markupOutput = document.getElementById('markupOutput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const cost = parseFloat(document.getElementById('costPrice').value);
        const revenue = parseFloat(document.getElementById('sellingPrice').value);

        if (isNaN(cost) || isNaN(revenue)) return;

        const profit = revenue - cost;
        const margin = (profit / revenue) * 100;
        const markup = (profit / cost) * 100;

        marginPercentOutput.textContent = margin.toFixed(2) + '%';
        grossProfitOutput.textContent = '$' + profit.toFixed(2);
        markupOutput.textContent = markup.toFixed(2) + '%';

        resultContainer.classList.remove('d-none');
    }
});
