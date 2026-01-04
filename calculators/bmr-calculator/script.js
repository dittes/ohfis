document.getElementById('bmrForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const gender = document.querySelector('input[name="gender"]:checked').value;
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);

    if (isNaN(age) || isNaN(height) || isNaN(weight)) {
        alert('Please enter valid measurements.');
        return;
    }

    // Mifflin-St Jeor Equation
    // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
    // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);

    if (gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    document.getElementById('bmr-value').textContent = Math.round(bmr);
    document.getElementById('result-container').classList.remove('d-none');
});
