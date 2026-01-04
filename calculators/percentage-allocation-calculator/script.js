document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const addShareBtn = document.getElementById('addShareBtn');
    const sharesContainer = document.getElementById('sharesContainer');
    const resultList = document.getElementById('resultList');

    addShareBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'row g-2 mb-2 share-row';
        div.innerHTML = `
            <div class="col-8"><input type="text" class="form-control" placeholder="Share Name"></div>
            <div class="col-4"><input type="number" class="form-control share-input" placeholder="%"></div>
        `;
        sharesContainer.appendChild(div);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        // Reset to 2 rows? Or keep dynamic? Let's just hide result.
        resultContainer.classList.add('d-none');
    });

    function calculate() {
        const total = parseFloat(document.getElementById('totalValue').value);
        if (isNaN(total)) return;

        const rows = document.querySelectorAll('.share-row');
        let parts = [];
        let totalParts = 0;

        rows.forEach(row => {
            const name = row.querySelector('input[type="text"]').value || 'Untitled';
            const val = parseFloat(row.querySelector('.share-input').value) || 0;
            parts.push({ name, val });
            totalParts += val;
        });

        if (totalParts === 0) return;

        resultList.innerHTML = '';

        parts.forEach(p => {
            const share = (p.val / totalParts) * total;
            const percentage = (p.val / totalParts) * 100;

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${p.name} <small class="text-muted">(${percentage.toFixed(1)}%)</small></span>
                <span class="fw-bold">${share.toFixed(2)}</span>
             `;
            resultList.appendChild(li);
        });

        resultContainer.classList.remove('d-none');
    }
});
