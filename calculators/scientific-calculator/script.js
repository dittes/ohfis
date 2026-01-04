
const display = document.getElementById('display');
let isResult = false;

function append(val) {
    if (display.value === '0' || isResult) {
        display.value = '';
        isResult = false;
    }
    display.value += val;
}

function clearDisplay() {
    display.value = '0';
    isResult = false;
}

function func(fn) {
    // Only works if a number is currently on screen, technically should wrap
    // Simple implementation: wrap current value in Math.fn()
    // Or just append 'Math.sin('
    // Let's simplify: append the function name and let user type closing
    // But that's hard for standard users.
    // Better: wrap current display value?

    // Simplest usable for layman: operate on LAST number? 
    // Let's just append the JS math function
    if (display.value === '0') {
        display.value = '';
    }

    // Map to JS Math
    // We will parse 'sin(' as 'Math.sin(' before eval
    display.value += fn + '(';
}

function calculate() {
    try {
        let expression = display.value;

        // Sanitize / Map
        expression = expression.replace(/sin/g, 'Math.sin');
        expression = expression.replace(/cos/g, 'Math.cos');
        expression = expression.replace(/tan/g, 'Math.tan');
        expression = expression.replace(/sqrt/g, 'Math.sqrt');
        // Handle Degrees vs Radians? JS is Radians. 
        // For simple usage, most web calcs use Radians or toggle. We'll stick to default (Rad) for now but maybe mention it.

        const result = eval(expression);
        display.value = result;
        isResult = true;
    } catch (e) {
        display.value = 'Error';
        setTimeout(() => { display.value = '0'; }, 1500);
    }
}
