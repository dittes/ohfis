// Toggle Hip Input based on Gender
document.querySelectorAll('input[name="gender"]').forEach(elem => {
    elem.addEventListener('change', function () {
        if (this.value === 'female') {
            document.getElementById('hip-group').classList.remove('d-none');
            document.getElementById('hip').required = true;
        } else {
            document.getElementById('hip-group').classList.add('d-none');
            document.getElementById('hip').required = false;
        }
    });
});

document.getElementById('bfForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const gender = document.querySelector('input[name="gender"]:checked').value;
    const height = parseFloat(document.getElementById('height').value);
    const neck = parseFloat(document.getElementById('neck').value);
    const waist = parseFloat(document.getElementById('waist').value);
    const weight = parseFloat(document.getElementById('weight').value);

    // Hip only for female
    let hip = 0;
    if (gender === 'female') {
        hip = parseFloat(document.getElementById('hip').value);
        if (isNaN(hip)) { alert('Enter hip circumference'); return; }
    }

    if (isNaN(height) || isNaN(neck) || isNaN(waist) || isNaN(weight)) {
        alert('Please enter valid measurements.');
        return;
    }

    let bodyFatPercentage = 0;

    // US Navy Method (Metric: cm)
    // Men: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    // Women: 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
    // Note: waist-neck must be > 0.

    if (gender === 'male') {
        if (waist <= neck) {
            alert('Waist must be larger than neck for this formula.');
            return;
        }
        bodyFatPercentage = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
        if (waist + hip <= neck) {
            alert('Waist + Hip must be larger than neck.'); // Unlikely
            return;
        }
        bodyFatPercentage = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }

    if (bodyFatPercentage < 0) bodyFatPercentage = 0;

    // Mass calculation
    const fatMass = weight * (bodyFatPercentage / 100);
    const leanMass = weight - fatMass;

    document.getElementById('bf-value').textContent = bodyFatPercentage.toFixed(1);
    document.getElementById('fat-mass').textContent = fatMass.toFixed(1) + ' kg';
    document.getElementById('lean-mass').textContent = leanMass.toFixed(1) + ' kg';

    document.getElementById('placeholder').classList.add('d-none');
    document.getElementById('result-container').classList.remove('d-none');
});
