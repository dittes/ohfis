document.getElementById('rngForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const min = parseInt(document.getElementById('min').value);
    const max = parseInt(document.getElementById('max').value);
    const count = parseInt(document.getElementById('count').value);

    if (isNaN(min) || isNaN(max) || isNaN(count)) {
        alert('Please enter valid numbers.');
        return;
    }

    if (max < min) {
        alert('Max must be greater than or equal to Min.');
        return;
    }

    const results = [];
    for (let i = 0; i < count; i++) {
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        results.push(val);
    }

    document.getElementById('result-values').textContent = results.join(', ');
    document.getElementById('result-container').classList.remove('d-none');
});
