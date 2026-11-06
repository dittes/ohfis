// calc.js — UI for the everyday calculators. Formulas: lib/calc.js (unit-tested).
import { tr, fmtNum } from './kit.js';
import { calcTool, money, pct } from './calctool.js';
import * as C from './lib/calc.js';

const need = (v, ...keys) => { for (const k of keys) if (v[k] === null || !Number.isFinite(v[k])) throw new Error(tr('Fill in all fields')); };
const nums = s => String(s).split(/[\s;]+/).map(x => x.trim().replace(',', '.')).filter(Boolean).map(Number);
const num = (s, d = 4) => fmtNum(s, d);
const today = () => new Date().toISOString().slice(0, 10);
const ymd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) throw new Error(tr('Enter a valid date')); return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); };
const fmtDate = d => d.toISOString().slice(0, 10);
const units = { key: 'u', label: 'Units', type: 'select', value: 'metric', choices: [['metric', 'Metric (kg, cm)'], ['imperial', 'Imperial (lb, in)']] };
const sexF = { key: 'sex', label: 'Sex', type: 'select', value: 'm', choices: [['m', 'Male'], ['f', 'Female']] };
const body = v => ({ kg: v.u === 'imperial' ? v.w * 0.45359237 : v.w, cm: v.u === 'imperial' ? v.h * 2.54 : v.h });

export const tools = {
  'percentage-calculator'(root) {
    calcTool(root, { fields: [
      { key: 'mode', label: 'Question', type: 'select', value: 'of', choices: [['of', 'What is X % of Y?'], ['is', 'X is what % of Y?'], ['whole', 'X is Y % of what?'], ['change', 'Percentage change from X to Y'], ['add', 'Y increased by X %'], ['sub', 'Y decreased by X %']] },
      { key: 'x', label: 'X', type: 'number', value: 15 }, { key: 'y', label: 'Y', type: 'number', value: 200 }, { key: 'd', label: 'Decimals', type: 'number', value: 2, min: 0, max: 10, step: 1 }],
      run: v => { need(v, 'x', 'y'); const d = v.d ?? 2; const r = { of: () => C.percentOf(v.x, v.y), is: () => C.percentIs(v.x, v.y), whole: () => C.percentWhole(v.x, v.y), change: () => C.percentChange(v.x, v.y), add: () => C.addPercent(v.y, v.x), sub: () => C.subPercent(v.y, v.x) }[v.mode]();
        const isPct = v.mode === 'is' || v.mode === 'change'; return { cards: [['Result', isPct ? pct(r, d) : fmtNum(r, d), 'good']], notes: [{ of: `${num(v.x)} % × ${num(v.y)} ÷ 100`, is: `${num(v.x)} ÷ ${num(v.y)} × 100`, whole: `${num(v.x)} ÷ ${num(v.y)} × 100`, change: `(${num(v.y)} − ${num(v.x)}) ÷ |${num(v.x)}| × 100`, add: `${num(v.y)} × (1 + ${num(v.x)} ÷ 100)`, sub: `${num(v.y)} × (1 − ${num(v.x)} ÷ 100)` }[v.mode]] }; } });
  },
  'percentage-allocation-calculator'(root) {
    calcTool(root, { fields: [{ key: 'total', label: 'Total amount', type: 'number', value: 1000 }, { key: 'lines', label: 'Shares: one per line, "Name: 50" or just 50', type: 'textarea', value: 'Rent: 50\nFood: 30\nSavings: 20', rows: 6 }, { key: 'cur', label: 'Currency symbol', type: 'text', value: '€' }],
      run: v => { need(v, 'total'); const rows = v.lines.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = /^(.*?)[:;]\s*([\d.,]+)\s*%?$/.exec(l) || [null, '', l.replace('%', '').replace(',', '.')]; return { name: m[1] || '', w: Number(String(m[2]).replace(',', '.')) }; }); if (rows.some(r => !Number.isFinite(r.w))) throw new Error(tr('Check the shares'));
        const parts = C.allocate(v.total, rows.map(r => r.w)); return { rows: [['Name', 'Share', 'Amount'], ...rows.map((r, i) => [r.name || String(i + 1), pct(parts[i].share, 2), money(parts[i].amount, v.cur)]), ['Total', '100 %', money(v.total, v.cur)]] }; } });
  },
  'fraction-calculator'(root) {
    calcTool(root, { fields: [{ key: 'a', label: 'First fraction (3/4, 1 1/2, 0.75)', type: 'text', value: '1 1/2' }, { key: 'op', label: 'Operation', type: 'select', value: '+', choices: [['+', '+  add'], ['−', '−  subtract'], ['×', '×  multiply'], ['÷', '÷  divide']] }, { key: 'b', label: 'Second fraction', type: 'text', value: '3/4' }],
      run: v => { const a = C.parseFrac(v.a), b = C.parseFrac(v.b), r = C.fracOp(a, v.op, b); return { cards: [['Result', C.fracText(r), 'good'], ['Decimal', num(r.n / r.d, 8)], ['Percent', pct(r.n / r.d * 100, 4)]], notes: [`${C.fracText(a)} ${v.op} ${C.fracText(b)} = ${C.fracText(r)}`] }; } });
  },
  'ratio-calculator'(root) {
    calcTool(root, { fields: [{ key: 'a', label: 'A', type: 'number', value: 2 }, { key: 'b', label: 'B', type: 'number', value: 3 }, { key: 'c', label: 'C', type: 'number', value: 10 }, { key: 'd', label: 'D (leave empty to solve)', type: 'number', value: null }, { key: 'p', label: 'Simplify: first number', type: 'number', value: 1920 }, { key: 'q', label: 'Simplify: second number', type: 'number', value: 1080 }],
      run: v => { const cards = []; const given = [v.a, v.b, v.c, v.d]; if (given.filter(x => x === null).length === 1) { const r = C.solveRatio(...given); const lab = ['A', 'B', 'C', 'D'][given.indexOf(null)]; cards.push([`Result (${lab})`, num(r, 6), 'good']); }
        else if (given.some(x => x !== null)) throw new Error(tr('Leave exactly one field empty')); if (v.p !== null && v.q !== null) { const [x, y] = C.simplifyRatio(v.p, v.q); cards.push(['Simplified ratio', `${x} : ${y}`]); } if (!cards.length) throw new Error(tr('Fill in all fields')); return { cards }; } });
  },
  'average-calculator'(root) {
    calcTool(root, { fields: [{ key: 'xs', label: 'Numbers (separated by spaces, commas or lines)', type: 'textarea', value: '12, 7, 9, 12, 20, 3', rows: 5 }],
      run: v => { const s = C.stats(nums(v.xs).filter(Number.isFinite)); return { cards: [['Mean', num(s.mean), 'good'], ['Median', num(s.median)], ['Mode', s.mode.length ? s.mode.map(x => num(x)).join(', ') : tr('none')], ['Count', String(s.n)], ['Sum', num(s.sum)], ['Minimum', num(s.min)], ['Maximum', num(s.max)], ['Range', num(s.range)]] }; } });
  },
  'standard-deviation-calculator'(root) {
    calcTool(root, { fields: [{ key: 'xs', label: 'Numbers (separated by spaces, commas or lines)', type: 'textarea', value: '2 4 4 4 5 5 7 9', rows: 5 }],
      run: v => { const s = C.stats(nums(v.xs).filter(Number.isFinite)); return { cards: [['Sample standard deviation', s.sampSd === null ? '–' : num(s.sampSd), 'good'], ['Population standard deviation', num(s.popSd)], ['Sample variance', s.sampVar === null ? '–' : num(s.sampVar)], ['Population variance', num(s.popVar)], ['Mean', num(s.mean)], ['Count', String(s.n)]] }; } });
  },
  'rounding-calculator'(root) {
    calcTool(root, { fields: [{ key: 'xs', label: 'Numbers (one per line)', type: 'textarea', value: '2.5\n3.14159\n17\n1234.5678', rows: 5 }, { key: 'mode', label: 'Method', type: 'select', value: 'nearest', choices: [['nearest', 'Nearest (half up)'], ['even', 'Half to even (banker\'s)'], ['up', 'Always up'], ['down', 'Always down'], ['toward-zero', 'Toward zero']] },
      { key: 'by', label: 'Round to', type: 'select', value: 'places', choices: [['places', 'Decimal places'], ['step', 'A step (5, 0.5, 0.05…)']] }, { key: 'places', label: 'Decimal places (negative = tens, hundreds)', type: 'number', value: 2, step: 1, show: v => v.by === 'places' }, { key: 'step', label: 'Step', type: 'number', value: 5, show: v => v.by === 'step' }],
      run: v => { const xs = nums(v.xs).filter(Number.isFinite); if (!xs.length) throw new Error(tr('Enter at least one number')); const opts = v.by === 'step' ? { mode: v.mode, step: v.step } : { mode: v.mode, places: v.places ?? 0 }; const rows = xs.map(x => [num(x, 10), num(C.roundTo(x, opts), 10)]); return { rows: [['Number', 'Rounded'], ...rows], copy: rows.map(r => r[1]).join('\n') }; } });
  },
  'scientific-calculator'(root) {
    calcTool(root, { fields: [{ key: 'e', label: 'Expression', type: 'text', value: '(2+3)*4^2 - sqrt(81) + sin(30)', placeholder: '2*(3+4)^2/7' }, { key: 'deg', label: 'Angles in', type: 'select', value: 'deg', choices: [['deg', 'Degrees'], ['rad', 'Radians']] }],
      presets: [{ label: 'sin(30)', values: { e: 'sin(30)' } }, { label: '√2', values: { e: 'sqrt(2)' } }, { label: '10!', values: { e: '10!' } }, { label: 'ln(e^3)', values: { e: 'ln(e^3)' } }, { label: 'π × 5²', values: { e: 'pi*5^2' } }],
      run: v => { if (!v.e.trim()) throw new Error(tr('Enter an expression')); const r = C.evaluate(v.e, { degrees: v.deg === 'deg' }); if (!Number.isFinite(r)) throw new Error(tr('The result is not a finite number')); return { cards: [['Result', fmtNum(r, 12), 'good']], notes: ['sin cos tan asin acos atan sinh cosh tanh sqrt cbrt ln log exp abs floor ceil round · pi e · ! ^ %'] }; } });
  },
  'random-number-generator'(root) {
    calcTool(root, { fields: [{ key: 'min', label: 'Minimum', type: 'number', value: 1, step: 1 }, { key: 'max', label: 'Maximum', type: 'number', value: 100, step: 1 }, { key: 'n', label: 'How many numbers', type: 'number', value: 5, min: 1, max: 10000, step: 1 }, { key: 'uniq', label: 'No repeats', type: 'check', value: true }, { key: 'sort', label: 'Sort the result', type: 'check', value: false }],
      presets: [{ label: 'Draw again', values: {} }, { label: 'Dice 1–6', values: { min: 1, max: 6, n: 1, uniq: false } }, { label: 'Lottery 6 of 49', values: { min: 1, max: 49, n: 6, uniq: true, sort: true } }],
      run: v => { need(v, 'min', 'max', 'n'); let xs = C.randomInts(v.min, v.max, Math.min(10000, Math.max(1, Math.round(v.n))), { unique: v.uniq }); if (v.sort) xs = xs.sort((a, b) => a - b); return { cards: [['Count', String(xs.length)]], text: xs.join(', '), copy: xs.join('\n') }; } });
  },
  'age-calculator'(root) {
    calcTool(root, { fields: [{ key: 'b', label: 'Date of birth', type: 'date', value: '1990-06-15' }, { key: 'on', label: 'Age at', type: 'date', value: today() }],
      run: v => { const a = C.age(ymd(v.b), ymd(v.on)); return { cards: [['Age', `${a.years} ${tr('years')}, ${a.months} ${tr('months')}, ${a.days} ${tr('days')}`, 'good'], ['Total days', fmtNum(a.totalDays, 0)], ['Total weeks', fmtNum(a.totalWeeks, 0)], ['Total months', fmtNum(a.totalMonths, 0)], ['Next birthday', `${fmtDate(a.nextBirthday)} (${a.untilBirthday} ${tr('days')})`]] }; } });
  },
  'pregnancy-due-date-calculator'(root) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - 56);
    calcTool(root, { fields: [{ key: 'lmp', label: 'First day of the last period', type: 'date', value: d.toISOString().slice(0, 10) }, { key: 'cycle', label: 'Average cycle length (days)', type: 'number', value: 28, min: 20, max: 45, step: 1 }, { key: 'on', label: 'Calculate for', type: 'date', value: today() }],
      run: v => { need(v, 'cycle'); const p = C.pregnancy(ymd(v.lmp), ymd(v.on), v.cycle); const early = p.elapsed < 0; return { cards: [['Estimated due date', fmtDate(p.due), 'good'], ['Pregnancy week', early ? '–' : `${p.weeks} + ${p.days}`], ['Trimester', early ? '–' : String(Math.min(3, p.trimester))], ['Days to go', String(p.left)]], notes: [tr('An estimate for orientation, not medical advice. Your midwife or doctor confirms the date.')] }; } });
  },
  'bmi-calculator'(root) {
    calcTool(root, { fields: [units, { key: 'w', label: 'Weight (kg or lb)', type: 'number', value: 70 }, { key: 'h', label: 'Height (cm or in)', type: 'number', value: 175 }],
      run: v => { need(v, 'w', 'h'); const { kg, cm } = body(v); const r = C.bmi(kg, cm); const f = x => v.u === 'imperial' ? fmtNum(x / 0.45359237, 1) + ' lb' : fmtNum(x, 1) + ' kg'; return { cards: [['BMI', fmtNum(r.bmi, 1), r.bmi >= 18.5 && r.bmi < 25 ? 'good' : 'bad'], ['Category', tr(r.category)], ['BMI Prime', fmtNum(r.prime, 2)], ['Healthy weight range', `${f(r.low)} – ${f(r.high)}`]], notes: [tr('BMI is a rough screening number and ignores muscle mass, age and sex. It is not a diagnosis.')] }; } });
  },
  'bmr-calculator'(root) {
    calcTool(root, { fields: [units, sexF, { key: 'age', label: 'Age', type: 'number', value: 30, min: 10, max: 110, step: 1 }, { key: 'w', label: 'Weight (kg or lb)', type: 'number', value: 70 }, { key: 'h', label: 'Height (cm or in)', type: 'number', value: 175 }],
      run: v => { need(v, 'age', 'w', 'h'); const { kg, cm } = body(v); const b = C.bmr({ kg, cm, age: v.age, sex: v.sex }); return { cards: [['BMR', `${fmtNum(b, 0)} kcal / ${tr('day')}`, 'good'], ['Energy in kJ', `${fmtNum(b * 4.184, 0)} kJ`]], notes: ['10 × kg + 6.25 × cm − 5 × age ' + (v.sex === 'f' ? '− 161' : '+ 5')] }; } });
  },
  'calorie-calculator'(root) {
    calcTool(root, { fields: [units, sexF, { key: 'age', label: 'Age', type: 'number', value: 30, min: 10, max: 110, step: 1 }, { key: 'w', label: 'Weight (kg or lb)', type: 'number', value: 70 }, { key: 'h', label: 'Height (cm or in)', type: 'number', value: 175 },
      { key: 'act', label: 'Activity level', type: 'select', value: '1.55', choices: Object.entries(C.ACTIVITY).map(([k, l]) => [k, l]) }],
      run: v => { need(v, 'age', 'w', 'h'); const { kg, cm } = body(v); const r = C.calories({ kg, cm, age: v.age, sex: v.sex, factor: Number(v.act) }); const k = x => `${fmtNum(x, 0)} kcal`; return { cards: [['Maintain weight', k(r.maintain), 'good'], ['Lose about 0.5 kg a week', k(r.lose)], ['Lose about 1 kg a week', k(r.loseFast)], ['Gain about 0.5 kg a week', k(r.gain)], ['BMR', k(r.bmr)]], notes: [tr('Do not eat much less than your BMR without medical advice.')] }; } });
  },
  'body-fat-calculator'(root) {
    calcTool(root, { fields: [units, sexF, { key: 'h', label: 'Height (cm or in)', type: 'number', value: 180 }, { key: 'neck', label: 'Neck circumference (cm or in)', type: 'number', value: 38 }, { key: 'waist', label: 'Waist circumference (cm or in)', type: 'number', value: 85 }, { key: 'hip', label: 'Hip circumference (cm or in, women)', type: 'number', value: 98, show: v => v.sex === 'f' }],
      run: v => { need(v, 'h', 'neck', 'waist'); const k = v.u === 'imperial' ? 2.54 : 1; const r = C.bodyFat({ sex: v.sex, cm: v.h * k, neck: v.neck * k, waist: v.waist * k, hip: (v.hip ?? 0) * k }); const p = r.percent; const lo = v.sex === 'f' ? [14, 21, 25, 32] : [6, 14, 18, 25]; const cat = p < lo[0] ? 'Essential fat' : p < lo[1] ? 'Athletes' : p < lo[2] ? 'Fitness' : p < lo[3] ? 'Average' : 'Obese';
        return { cards: [['Body fat', pct(p, 1), 'good'], ['Category', tr(cat)]], notes: [tr('A rough estimate (about ±3–4 points). Best used to follow a trend, not as a diagnosis.')] }; } });
  },
  'water-intake-calculator'(root) {
    calcTool(root, { fields: [units, { key: 'w', label: 'Weight (kg or lb)', type: 'number', value: 70 }, { key: 'min', label: 'Exercise per day (minutes)', type: 'number', value: 30, min: 0, step: 5 }, { key: 'hot', label: 'Hot weather', type: 'check', value: false }],
      run: v => { need(v, 'w'); const kg = v.u === 'imperial' ? v.w * 0.45359237 : v.w; const r = C.water({ kg, minutes: v.min ?? 0, hot: v.hot }); return { cards: [['Litres per day', fmtNum(r.litres, 1), 'good'], ['Fluid ounces', fmtNum(r.litres * 33.814, 0)], ['Glasses of 250 ml', fmtNum(r.glasses, 0)]], notes: [tr('Food and other drinks also count. Follow your doctor\'s advice if you have a kidney or heart condition.')] }; } });
  },
  'gpa-calculator'(root) {
    calcTool(root, { fields: [{ key: 'lines', label: 'Courses: "name; credits; grade" per line (A, B+, 3.7 …)', type: 'textarea', value: 'Calculus; 4; A-\nHistory; 3; B+\nChemistry; 4; B\nSeminar; 2; A', rows: 7 }],
      run: v => { const rows = v.lines.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name, cr, gr] = l.split(/\s*;\s*/); const g = (gr ?? '').trim(); const points = C.GRADES[g.toUpperCase()] ?? (g !== '' && Number.isFinite(Number(g.replace(',', '.'))) ? Number(g.replace(',', '.')) : null); return { name, credits: Number((cr ?? '').replace(',', '.')), points }; });
        const bad = rows.find(r => r.points === null || !(r.credits > 0)); if (bad) throw new Error(`${tr('Check this line')}: ${bad.name}`); const r = C.gpa(rows); return { cards: [['GPA', fmtNum(r.gpa, 2), 'good'], ['Total credits', fmtNum(r.credits, 1)]], rows: [['Course', 'Credits', 'Grade points'], ...rows.map(x => [x.name, fmtNum(x.credits, 1), fmtNum(x.points, 1)])] }; } });
  },
  'pace-calculator'(root) {
    calcTool(root, { fields: [{ key: 'unit', label: 'Unit', type: 'select', value: 'km', choices: [['km', 'Kilometres'], ['mi', 'Miles']] }, { key: 'dist', label: 'Distance', type: 'number', value: 10 }, { key: 'known', label: 'I know', type: 'select', value: 'time', choices: [['time', 'My time (h:mm:ss)'], ['pace', 'My pace per unit (mm:ss)']] },
      { key: 'time', label: 'Time', type: 'text', value: '50:00', show: v => v.known === 'time' }, { key: 'pace', label: 'Pace per unit', type: 'text', value: '5:00', show: v => v.known === 'pace' }],
      presets: [{ label: '5K', values: { unit: 'km', dist: 5 } }, { label: '10K', values: { unit: 'km', dist: 10 } }, { label: tr('Half marathon'), values: { unit: 'km', dist: 21.0975 } }, { label: tr('Marathon'), values: { unit: 'km', dist: 42.195 } }],
      run: v => { need(v, 'dist'); const t = C.parseHMS(v.known === 'time' ? v.time : v.pace); if (t === null || !(t > 0)) throw new Error(tr('Enter the time like 1:05:30 or 5:00')); const r = C.pace(v.known === 'time' ? { distance: v.dist, seconds: t } : { distance: v.dist, pace: t }); const secs = r.seconds ?? t; const pace = r.pace ?? t; const u = v.unit;
        const other = u === 'km' ? pace * 1.609344 : pace / 1.609344; const spd = r.speed; const rows = [['Distance', 'Time']]; const whole = Math.floor(v.dist); for (let i = 1; i <= Math.min(whole, 60); i++) rows.push([`${i} ${u}`, C.fmtHMS(pace * i)]); if (v.dist > whole && whole < 60) rows.push([`${fmtNum(v.dist, 3)} ${u}`, C.fmtHMS(secs)]);
        return { cards: [['Finish time', C.fmtHMS(secs), 'good'], [`Pace per ${u}`, C.fmtHMS(pace)], [`Pace per ${u === 'km' ? 'mi' : 'km'}`, C.fmtHMS(other)], ['Speed', `${fmtNum(spd, 2)} ${u}/h`]], rows }; } });
  },
};
