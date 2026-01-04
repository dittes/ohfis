function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

// Add Tax Logic
document.getElementById('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const net = parseFloat(document.getElementById('net-amount').value);
    const rate = parseFloat(document.getElementById('tax-rate-add').value);

    if (isNaN(net) || isNaN(rate)) { alert('Invalid inputs'); return; }

    const taxAmount = net * (rate / 100);
    const gross = net + taxAmount;

    document.getElementById('res-net-add').textContent = formatMoney(net);
    document.getElementById('res-tax-add').textContent = formatMoney(taxAmount);
    document.getElementById('res-gross-add').textContent = formatMoney(gross);
    document.getElementById('result-add').classList.remove('d-none');
});

// Remove Tax Logic
document.getElementById('removeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const gross = parseFloat(document.getElementById('gross-amount').value);
    const rate = parseFloat(document.getElementById('tax-rate-remove').value);

    if (isNaN(gross) || isNaN(rate)) { alert('Invalid inputs'); return; }

    // Net = Gross / (1 + r)
    const net = gross / (1 + (rate / 100));
    const taxAmount = gross - net;

    document.getElementById('res-gross-remove').textContent = formatMoney(gross);
    document.getElementById('res-tax-remove').textContent = formatMoney(taxAmount);
    document.getElementById('res-net-remove').textContent = formatMoney(net);
    document.getElementById('result-remove').classList.remove('d-none');
});
