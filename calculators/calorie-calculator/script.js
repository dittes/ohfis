document.getElementById('calorieForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const gender = document.querySelector('input[name="gender"]:checked').value;
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const activityInfo = parseFloat(document.getElementById('activity').value);

    if (isNaN(age) || isNaN(height) || isNaN(weight)) {
        alert('Please enter valid measurements.');
        return;
    }

    // BMR Calculation (Mifflin-St Jeor)
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    const tdee = Math.round(bmr * activityInfo);

    // Goals (approximate 500kcal deficit for 0.5kg/week loss)
    const loss = tdee - 500;
    const extremeLoss = tdee - 1000;
    const gain = tdee + 500;

    document.getElementById('tdee-value').textContent = tdee;

    // Safety check: Don't show dangerous calorie levels
    document.getElementById('loss-cal').textContent = loss > 1200 ? loss : "Not Recommended";
    document.getElementById('extreme-loss-cal').textContent = extremeLoss > 1200 ? extremeLoss : "Not Recommended";
    document.getElementById('gain-cal').textContent = gain;

    document.getElementById('placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
