// Calc 1: X% of Y
document.getElementById('calc1').addEventListener('submit', function (e) {
    e.preventDefault();
    const p = parseFloat(document.getElementById('c1-num').value);
    const y = parseFloat(document.getElementById('c1-total').value);
    if (isNaN(p) || isNaN(y)) return;
    const res = (p / 100) * y;
    document.getElementById('c1-result').textContent = parseFloat(res.toFixed(2));
});

// Calc 2: X is what % of Y
document.getElementById('calc2').addEventListener('submit', function (e) {
    e.preventDefault();
    const x = parseFloat(document.getElementById('c2-num').value);
    const y = parseFloat(document.getElementById('c2-total').value);
    if (isNaN(x) || isNaN(y)) return;
    if (y === 0) { alert('Cannot divide by zero'); return; }
    const res = (x / y) * 100;
    document.getElementById('c2-result').textContent = parseFloat(res.toFixed(2)) + '%';
});

// Calc 3: Change
document.getElementById('calc3').addEventListener('submit', function (e) {
    e.preventDefault();
    const from = parseFloat(document.getElementById('c3-from').value);
    const to = parseFloat(document.getElementById('c3-to').value);
    if (isNaN(from) || isNaN(to)) return;
    if (from === 0) { alert('Start value cannot be zero'); return; }
    const res = ((to - from) / from) * 100;
    const sign = res > 0 ? '+' : '';
    document.getElementById('c3-result').textContent = sign + parseFloat(res.toFixed(2)) + '%';
});
