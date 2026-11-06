import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/tools/lib/calc.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

test('percentages', () => {
  assert.equal(C.percentOf(15, 200), 30); assert.equal(C.percentIs(30, 200), 15); assert.equal(C.percentWhole(30, 15), 200);
  assert.equal(C.percentChange(80, 100), 25); assert.equal(C.percentChange(100, 80), -20); assert.equal(C.addPercent(100, 19), 119); assert.equal(C.subPercent(100, 25), 75);
  assert.throws(() => C.percentIs(1, 0));
});
test('allocation adds up to the cent', () => {
  const p = C.allocate(100, [1, 1, 1]); near(p.reduce((a, x) => a + x.amount, 0), 100); assert.deepEqual(C.allocate(10, [50, 50]).map(x => x.amount), [5, 5]);
  assert.throws(() => C.allocate(10, [0, 0]));
});
test('fractions', () => {
  assert.deepEqual(C.fracOp(C.frac(1, 2), '+', C.frac(1, 3)), { n: 5, d: 6 }); assert.deepEqual(C.fracOp(C.frac(3, 4), '÷', C.frac(3, 8)), { n: 2, d: 1 });
  assert.deepEqual(C.parseFrac('1 1/2'), { n: 3, d: 2 }); assert.deepEqual(C.parseFrac('0.75'), { n: 3, d: 4 }); assert.deepEqual(C.parseFrac('-2/4'), { n: -1, d: 2 });
  assert.equal(C.fracText({ n: 9, d: 4 }), '9/4 = 2 1/4'); assert.throws(() => C.frac(1, 0)); assert.throws(() => C.fracOp(C.frac(1, 2), '÷', C.frac(0, 1)));
});
test('ratios', () => {
  assert.equal(C.solveRatio(2, 3, 4, null), 6); assert.equal(C.solveRatio(null, 3, 4, 6), 2); assert.deepEqual(C.simplifyRatio(1920, 1080), [16, 9]); assert.deepEqual(C.simplifyRatio(1.5, 3), [1, 2]);
  assert.throws(() => C.solveRatio(1, 2, 3, 4));
});
test('statistics', () => {
  const s = C.stats([2, 4, 4, 4, 5, 5, 7, 9]); assert.equal(s.mean, 5); assert.equal(s.median, 4.5); assert.deepEqual(s.mode, [4]); near(s.popSd, 2); near(s.sampSd, 2.13809, 1e-4); assert.equal(s.range, 7);
  assert.equal(C.stats([3]).sampSd, null); assert.throws(() => C.stats([]));
});
test('rounding modes', () => {
  assert.equal(C.roundTo(2.5, { mode: 'even' }), 2); assert.equal(C.roundTo(3.5, { mode: 'even' }), 4); assert.equal(C.roundTo(2.5), 3); assert.equal(C.roundTo(-2.5), -3);
  assert.equal(C.roundTo(1.234, { places: 2, mode: 'up' }), 1.24); assert.equal(C.roundTo(1.239, { places: 2, mode: 'down' }), 1.23); assert.equal(C.roundTo(17, { step: 5 }), 15); assert.equal(C.roundTo(18, { step: 5 }), 20); assert.equal(C.roundTo(1234, { places: -2 }), 1200);
});
test('loans', () => {
  near(C.payment(200000, 5, 360), 1073.64, 0.01); near(C.payment(1200, 0, 12), 100);
  const l = C.loan({ amount: 10000, rate: 6, months: 12 }); near(l.total - 10000, l.interest, 0.02); near(l.rows.at(-1).balance, 0); assert.equal(l.months, 12);
  assert.ok(C.loan({ amount: 10000, rate: 6, months: 12, extra: 200 }).months < 12);
  const m = C.mortgage({ price: 300000, down: 60000, rate: 4, years: 30, tax: 3600, insurance: 1200, hoa: 50 }); near(m.payment, 1145.80, 0.01); near(m.monthlyTotal, m.payment + 400 + 50, 1e-9); near(m.ltv, 80); assert.throws(() => C.mortgage({ price: 100, down: 100, rate: 3, years: 10 }));
});
test('interest, returns, discounts, tax', () => {
  assert.deepEqual(C.simpleInterest({ principal: 1000, rate: 5, years: 3 }), { interest: 150, total: 1150 });
  const r = C.investmentReturn({ start: 1000, end: 2000, years: 5 }); near(r.total, 100); near(r.cagr, 14.8698, 1e-3); assert.equal(C.investmentReturn({ start: 1000, end: 1500, years: 0 }).cagr, null);
  const d = C.discount({ price: 100, percent: 20, extra: 10 }); near(d.final, 72); near(d.effective, 28);
  near(C.salesTax({ amount: 100, rate: 19 }).gross, 119); const g = C.salesTax({ amount: 119, rate: 19, mode: 'remove' }); near(g.net, 100); near(g.tax, 19);
  const s = C.salaryTable(50000, 'year'); near(s.month, 4166.6667, 1e-3); near(s.hour, 50000 / 2080, 1e-9); near(C.salaryTable(25, 'hour').year, 52000);
  const u = C.unitPrice([{ price: 3, qty: 500 }, { price: 5, qty: 1000 }]); assert.equal(u.find(x => x.best).qty, 1000); assert.throws(() => C.unitPrice([{ price: 1, qty: 0 }]));
  near(C.fuelCost({ distance: 200, consumption: 7, price: 1.8 }).cost, 25.2); near(C.fuelCost({ distance: 100, consumption: 30, price: 4, unit: 'mpg' }).litres, 100 / 1.609344 / 30 * 3.785411784, 1e-9);
});
test('health', () => {
  const b = C.bmi(70, 175); near(b.bmi, 22.857, 1e-3); assert.equal(b.category, 'Normal weight'); near(b.prime, 22.857 / 25, 1e-3); assert.equal(C.bmi(95, 170).category, 'Obese class I'); assert.throws(() => C.bmi(0, 170));
  near(C.bmr({ kg: 70, cm: 175, age: 30, sex: 'm' }), 1648.75); near(C.bmr({ kg: 60, cm: 165, age: 30, sex: 'f' }), 1320.25);
  const c = C.calories({ kg: 70, cm: 175, age: 30, sex: 'm', factor: 1.55 }); near(c.maintain, 1648.75 * 1.55); near(c.lose, c.maintain - 500);
  const f = C.bodyFat({ sex: 'm', cm: 180, neck: 38, waist: 85 }); assert.ok(f.percent > 8 && f.percent < 20, f.percent); assert.ok(C.bodyFat({ sex: 'f', cm: 165, neck: 32, waist: 75, hip: 98 }).percent > 15);
  near(C.water({ kg: 70 }).litres, 2.31); assert.ok(C.water({ kg: 70, minutes: 60, hot: true }).litres > 3.4);
  near(C.gpa([{ credits: 3, points: 4 }, { credits: 3, points: 3 }, { credits: 4, points: 2 }]).gpa, 2.9); assert.throws(() => C.gpa([]));
  const p = C.pace({ distance: 10, seconds: 3000 }); near(p.pace, 300); near(p.speed, 12); near(C.pace({ distance: 10, pace: 300 }).seconds, 3000);
  assert.equal(C.fmtHMS(3725), '1:02:05'); assert.equal(C.fmtHMS(305), '5:05'); assert.equal(C.parseHMS('1:02:05'), 3725); assert.equal(C.parseHMS('x'), null);
});
test('age and pregnancy', () => {
  const a = C.age(new Date(Date.UTC(1990, 5, 15)), new Date(Date.UTC(2026, 10, 5))); assert.deepEqual([a.years, a.months, a.days], [36, 4, 21]); assert.equal(a.untilBirthday, 222);
  assert.throws(() => C.age(new Date(Date.UTC(2030, 0, 1)), new Date(Date.UTC(2026, 0, 1))));
  const d = C.dueDate(new Date(Date.UTC(2026, 0, 1))); assert.equal(d.toISOString().slice(0, 10), '2026-10-08');
  const p = C.pregnancy(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 2, 12))); assert.deepEqual([p.weeks, p.days, p.trimester], [10, 0, 1]);
});
test('random integers', () => {
  const r = C.randomInts(1, 6, 100); assert.ok(r.every(x => x >= 1 && x <= 6)); const u = C.randomInts(1, 10, 10, { unique: true }); assert.equal(new Set(u).size, 10);
  assert.throws(() => C.randomInts(1, 5, 6, { unique: true })); assert.throws(() => C.randomInts(5, 1, 1));
});
test('scientific evaluator', () => {
  assert.equal(C.evaluate('2+3*4^2'), 50); assert.equal(C.evaluate('(2+3)*4'), 20); assert.equal(C.evaluate('-2^2'), -4); assert.equal(C.evaluate('sin(30)'), 0.5); near(C.evaluate('sin(pi/2)', { degrees: false }), 1);
  assert.equal(C.evaluate('5!'), 120); assert.equal(C.evaluate('sqrt(16)+log(1000)'), 7); near(C.evaluate('ln(e)'), 1); assert.equal(C.evaluate('10 % 3'), 1); assert.equal(C.evaluate('2,5*2'), 5);
  assert.throws(() => C.evaluate('2+')); assert.throws(() => C.evaluate('foo(1)')); assert.throws(() => C.evaluate('(1+2')); assert.throws(() => C.evaluate('1 2'));
});
