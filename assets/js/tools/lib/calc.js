// calc.js — everyday maths: percentages, fractions, statistics, loans, health and age. Pure functions, unit-tested (tests/calc.test.mjs).

export const round = (x, d = 2) => Math.round((x + Number.EPSILON * Math.sign(x)) * 10 ** d) / 10 ** d;

// ── Percentages ─────────────────────────────────────────────────────────────
export const percentOf = (p, x) => x * p / 100;                    // p % of x
export const percentIs = (a, b) => { if (!b) throw new Error('The base must not be zero'); return a / b * 100; }; // a is what % of b
export const percentWhole = (a, p) => { if (!p) throw new Error('The percentage must not be zero'); return a / p * 100; }; // a is p % of what
export const percentChange = (from, to) => { if (!from) throw new Error('The starting value must not be zero'); return (to - from) / Math.abs(from) * 100; };
export const addPercent = (x, p) => x * (1 + p / 100);
export const subPercent = (x, p) => x * (1 - p / 100);
/** Split an amount by weights (any numbers). Rounded to cents so the parts add up exactly. */
export function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0); if (!(sum > 0)) throw new Error('The shares must add up to more than zero');
  const cents = Math.round(total * 100); const raw = weights.map(w => cents * w / sum); const parts = raw.map(Math.floor); let rest = cents - parts.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { parts[i]++; rest--; } });
  return parts.map((c, i) => ({ share: weights[i] / sum * 100, amount: c / 100 }));
}

// ── Fractions ───────────────────────────────────────────────────────────────
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export function frac(n, d = 1) { if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Use whole numbers'); if (d === 0) throw new Error('The denominator must not be zero'); const g = gcd(n, d); const s = d < 0 ? -1 : 1; return { n: s * n / g, d: s * d / g }; }
export function fracOp(a, op, b) {
  if (op === '+') return frac(a.n * b.d + b.n * a.d, a.d * b.d); if (op === '−' || op === '-') return frac(a.n * b.d - b.n * a.d, a.d * b.d);
  if (op === '×' || op === '*') return frac(a.n * b.n, a.d * b.d); if (op === '÷' || op === '/') { if (b.n === 0) throw new Error('Cannot divide by zero'); return frac(a.n * b.d, a.d * b.n); }
  throw new Error('Unknown operation');
}
export function fracText(f) { const w = Math.trunc(f.n / f.d), r = Math.abs(f.n) % f.d; return f.d === 1 ? String(f.n) : (Math.abs(f.n) > f.d ? `${f.n}/${f.d} = ${w} ${r}/${f.d}` : `${f.n}/${f.d}`); }
/** "3/4", "1 1/2", "0.75" or "2" → fraction. */
export function parseFrac(s) {
  s = String(s).trim().replace(',', '.'); let m;
  if ((m = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(s))) { const w = +m[1], n = +m[2], d = +m[3]; return frac(w < 0 ? w * d - n : w * d + n, d); }
  if ((m = /^(-?\d+)\/(-?\d+)$/.exec(s))) return frac(+m[1], +m[2]);
  if ((m = /^(-?\d+)(?:\.(\d+))?$/.exec(s))) { const dec = m[2] || ''; return frac(+(m[1] + dec), 10 ** dec.length); }
  throw new Error('Enter a fraction like 3/4, a mixed number like 1 1/2 or a decimal');
}

// ── Ratios and statistics ───────────────────────────────────────────────────
/** a : b = c : x → x (any one of the four may be the unknown). Pass null for the unknown. */
export function solveRatio(a, b, c, d) {
  const n = [a, b, c, d]; const k = n.filter(v => v === null).length; if (k !== 1) throw new Error('Leave exactly one field empty');
  if (a === null) { if (!d) throw new Error('Cannot divide by zero'); return b * c / d; } if (b === null) { if (!c) throw new Error('Cannot divide by zero'); return a * d / c; }
  if (c === null) { if (!b) throw new Error('Cannot divide by zero'); return a * d / b; } if (!a) throw new Error('Cannot divide by zero'); return b * c / a;
}
export function simplifyRatio(a, b) { if (!Number.isInteger(a) || !Number.isInteger(b)) { const k = 10 ** Math.max(decs(a), decs(b)); a = Math.round(a * k); b = Math.round(b * k); } const g = gcd(a, b); return [a / g, b / g]; }
const decs = x => (String(x).split('.')[1] || '').length;
export function stats(xs) {
  if (!xs.length) throw new Error('Enter at least one number');
  const n = xs.length, sum = xs.reduce((a, b) => a + b, 0), mean = sum / n, sorted = [...xs].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2; const counts = new Map(); xs.forEach(x => counts.set(x, (counts.get(x) || 0) + 1)); const top = Math.max(...counts.values());
  const mode = top > 1 ? [...counts].filter(([, c]) => c === top).map(([v]) => v).sort((a, b) => a - b) : [];
  const ss = xs.reduce((a, x) => a + (x - mean) ** 2, 0); const popVar = ss / n, sampVar = n > 1 ? ss / (n - 1) : null;
  return { n, sum, mean, median, mode, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], popVar, popSd: Math.sqrt(popVar), sampVar, sampSd: sampVar === null ? null : Math.sqrt(sampVar) };
}
export function roundTo(x, { mode = 'nearest', places = 0, step = 0 } = {}) {
  const f = step > 0 ? step : 10 ** -places; const q = x / f; const eps = 1e-9;
  const r = mode === 'up' ? Math.ceil(q - eps) : mode === 'down' ? Math.floor(q + eps) : mode === 'toward-zero' ? Math.trunc(q) : mode === 'even' ? bankers(q) : Math.sign(q) * Math.round(Math.abs(q) + eps);
  return +(r * f).toFixed(Math.max(0, step > 0 ? Math.max(decs(step), 0) : places) + 6).replace(/\.?0+$/, '') * 1;
}
const bankers = q => { const f = Math.floor(q), d = q - f; return Math.abs(d - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(q); };

// ── Loans ───────────────────────────────────────────────────────────────────
/** Monthly payment for a fully amortising loan. rate in % per year. */
export function payment(principal, ratePct, months) { const i = ratePct / 100 / 12; return i === 0 ? principal / months : principal * i / (1 - (1 + i) ** -months); }
export function loan({ amount, rate, months, extra = 0 }) {
  if (!(amount > 0) || !(months > 0)) throw new Error('Enter an amount and a term above zero'); const i = rate / 100 / 12; const pay = payment(amount, rate, months); let bal = amount, paid = 0, interest = 0; const rows = [];
  for (let m = 1; m <= months + 1 && bal > 0.005; m++) { const it = bal * i; let pr = pay - it + extra; if (pr > bal) pr = bal; bal -= pr; paid += pr + it; interest += it; rows.push({ month: m, payment: pr + it, interest: it, principal: pr, balance: Math.max(0, bal) }); }
  return { payment: pay, total: paid, interest, months: rows.length, rows };
}
export function mortgage({ price, down, rate, years, tax = 0, insurance = 0, hoa = 0 }) {
  const amount = price - down; if (!(amount > 0)) throw new Error('The down payment must be below the price'); const l = loan({ amount, rate, months: Math.round(years * 12) });
  const extra = (tax + insurance) / 12 + hoa; return { ...l, amount, monthlyTotal: l.payment + extra, extra, ltv: amount / price * 100 };
}
export function simpleInterest({ principal, rate, years }) { const interest = principal * rate / 100 * years; return { interest, total: principal + interest }; }
/** Investment return: final vs initial over a period; CAGR. */
export function investmentReturn({ start, end, years, contributions = 0 }) {
  const invested = start + contributions; if (!(invested > 0)) throw new Error('Enter an amount above zero'); const gain = end - invested; const total = gain / invested * 100; const cagr = years > 0 && end > 0 && start > 0 ? ((end / start) ** (1 / years) - 1) * 100 : null;
  return { gain, total, cagr, invested };
}
export function discount({ price, percent, extra = 0 }) { const first = price * (1 - percent / 100); const final = first * (1 - extra / 100); return { saved: price - final, final, effective: price ? (1 - final / price) * 100 : 0 }; }
export function salesTax({ amount, rate, mode = 'add' }) { if (mode === 'add') { const tax = amount * rate / 100; return { net: amount, tax, gross: amount + tax }; } const net = amount / (1 + rate / 100); return { net, tax: amount - net, gross: amount }; }
export const salaryTable = (amount, per, { hours = 40, days = 5, weeks = 52 } = {}) => {
  const year = { hour: amount * hours * weeks, day: amount * days * weeks, week: amount * weeks, biweek: amount * weeks / 2, month: amount * 12, year: amount }[per];
  if (year === undefined) throw new Error('Unknown period'); return { hour: year / (hours * weeks), day: year / (days * weeks), week: year / weeks, biweek: year / weeks * 2, month: year / 12, year };
};
export function unitPrice(items) { const rows = items.map(i => ({ ...i, unit: i.qty > 0 ? i.price / i.qty : null })).filter(r => r.unit !== null); if (!rows.length) throw new Error('Enter at least one price and quantity'); const best = Math.min(...rows.map(r => r.unit)); return rows.map(r => ({ ...r, best: r.unit === best, extra: (r.unit / best - 1) * 100 })); }
export const fuelCost = ({ distance, consumption, price, unit = 'l100' }) => { const litres = unit === 'l100' ? distance * consumption / 100 : unit === 'mpg' ? distance / consumption * 3.785411784 / 1.609344 : distance / consumption; return { litres, cost: litres * price }; };

// ── Health ──────────────────────────────────────────────────────────────────
export function bmi(kg, cm) { if (!(kg > 0) || !(cm > 0)) throw new Error('Enter weight and height above zero'); const m = cm / 100; const v = kg / (m * m); const cat = v < 16 ? 'Severe thinness' : v < 17 ? 'Moderate thinness' : v < 18.5 ? 'Mild thinness' : v < 25 ? 'Normal weight' : v < 30 ? 'Overweight' : v < 35 ? 'Obese class I' : v < 40 ? 'Obese class II' : 'Obese class III'; return { bmi: v, prime: v / 25, category: cat, low: 18.5 * m * m, high: 24.9 * m * m }; }
export const bmr = ({ kg, cm, age, sex }) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'f' ? -161 : 5); // Mifflin–St Jeor
export const ACTIVITY = { 1.2: 'Little or no exercise', 1.375: 'Light exercise 1–3 days a week', 1.55: 'Moderate exercise 3–5 days a week', 1.725: 'Hard exercise 6–7 days a week', 1.9: 'Very hard exercise or physical job' };
export function calories({ kg, cm, age, sex, factor }) { const b = bmr({ kg, cm, age, sex }); const tdee = b * factor; return { bmr: b, maintain: tdee, lose: tdee - 500, loseFast: tdee - 1000, gain: tdee + 500 }; }
/** US Navy method. Lengths in cm. */
export function bodyFat({ sex, cm, neck, waist, hip }) { const v = sex === 'f' ? 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(cm)) - 450 : 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(cm)) - 450; if (!Number.isFinite(v)) throw new Error('Check the measurements'); return { percent: v }; }
export const water = ({ kg, minutes = 0, hot = false }) => { const base = kg * 0.033; const l = base + minutes / 30 * 0.35 + (hot ? 0.5 : 0); return { litres: l, glasses: l / 0.25 }; };
export const GRADES = { 'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, 'D-': 0.7, F: 0 };
export function gpa(courses) { const rows = courses.filter(c => c.credits > 0 && c.points !== null && Number.isFinite(c.points)); if (!rows.length) throw new Error('Add at least one course'); const credits = rows.reduce((a, c) => a + c.credits, 0); return { gpa: rows.reduce((a, c) => a + c.credits * c.points, 0) / credits, credits }; }
export function pace({ distance, seconds, pace: perUnit }) { if (seconds != null && distance > 0) return { pace: seconds / distance, speed: distance / (seconds / 3600) }; if (perUnit != null && distance > 0) return { seconds: perUnit * distance, speed: 3600 / perUnit }; throw new Error('Enter a distance and a time or a pace'); }
export const fmtHMS = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0'); };
export const parseHMS = s => { const p = String(s).trim().split(':').map(Number); if (!p.length || p.some(x => !Number.isFinite(x))) return null; return p.reduce((a, x) => a * 60 + x, 0); };

// ── Dates of life ───────────────────────────────────────────────────────────
export function age(birth, on) {
  if (!(birth <= on)) throw new Error('The birth date must be before the other date'); let y = on.getUTCFullYear() - birth.getUTCFullYear(), m = on.getUTCMonth() - birth.getUTCMonth(), d = on.getUTCDate() - birth.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), 0)).getUTCDate(); } if (m < 0) { y--; m += 12; }
  const days = Math.floor((on - birth) / 864e5); let next = new Date(Date.UTC(on.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate())); if (next < on) next = new Date(Date.UTC(on.getUTCFullYear() + 1, birth.getUTCMonth(), birth.getUTCDate()));
  return { years: y, months: m, days: d, totalDays: days, totalWeeks: Math.floor(days / 7), totalMonths: y * 12 + m, nextBirthday: next, untilBirthday: Math.round((next - on) / 864e5) };
}
/** Naegele's rule: first day of last period + 280 days (adjusted for cycle length). */
export function dueDate(lmp, cycle = 28) { const due = new Date(lmp.getTime() + (280 + (cycle - 28)) * 864e5); return due; }
export function pregnancy(lmp, today, cycle = 28) { const due = dueDate(lmp, cycle); const elapsed = Math.floor((today - lmp) / 864e5) - (cycle - 28); return { due, weeks: Math.floor(elapsed / 7), days: elapsed % 7, elapsed, trimester: elapsed < 91 ? 1 : elapsed < 189 ? 2 : 3, left: Math.max(0, Math.ceil((due - today) / 864e5)) }; }

// ── Random numbers ──────────────────────────────────────────────────────────
export function randomInts(min, max, count, { unique = false } = {}) {
  min = Math.ceil(min); max = Math.floor(max); if (!(max >= min)) throw new Error('The maximum must not be below the minimum'); const span = max - min + 1; if (unique && count > span) throw new Error('Not enough different numbers in that range');
  const out = []; const used = new Set(); const rnd = () => { const a = new Uint32Array(2); crypto.getRandomValues(a); return (a[0] * 2 ** 21 + (a[1] >>> 11)) % span; };
  while (out.length < count) { const v = min + rnd(); if (unique && used.has(v)) continue; used.add(v); out.push(v); } return out;
}

// ── Scientific expression evaluator (no eval) ───────────────────────────────
const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, cbrt: Math.cbrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh };
const fact = n => { if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error('Factorial needs a whole number from 0 to 170'); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
export function evaluate(src, { degrees = true } = {}) {
  const tok = []; const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-zπ]+|[-+*/^%()!,×÷−])/gyi; let m, pos = 0; src = src.replace(/,/g, '.'); re.lastIndex = 0;
  while (pos < src.length) { re.lastIndex = pos; m = re.exec(src); if (!m) { if (!src.slice(pos).trim()) break; throw new Error('Unexpected character: ' + src.slice(pos).trim()[0]); } tok.push(m[1]); pos = re.lastIndex; }
  let i = 0; const peek = () => tok[i], next = () => tok[i++];
  const toRad = x => degrees ? x * Math.PI / 180 : x, fromRad = x => degrees ? x * 180 / Math.PI : x;
  function expr() { let v = term(); while (peek() === '+' || peek() === '-' || peek() === '−') { const o = next(); const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term() { let v = unary(); while (['*', '/', '×', '÷', '%'].includes(peek())) { const o = next(); const r = unary(); v = o === '*' || o === '×' ? v * r : o === '%' ? v % r : v / r; } return v; }
  function unary() { if (peek() === '-' || peek() === '−') { next(); return -unary(); } if (peek() === '+') { next(); return unary(); } return power(); }
  function power() { let b = postfix(); if (peek() === '^') { next(); const e = unary(); return b ** e; } return b; }
  function postfix() { let v = atom(); while (peek() === '!') { next(); v = fact(v); } return v; }
  function atom() {
    const t = next(); if (t === undefined) throw new Error('The expression ends too early');
    if (t === '(') { const v = expr(); if (next() !== ')') throw new Error('Missing closing bracket'); return v; }
    if (/^[\d.]/.test(t)) return parseFloat(t);
    const k = t.toLowerCase(); if (k === 'pi' || k === 'π') return Math.PI; if (k === 'e') return Math.E;
    if (FN[k]) { if (next() !== '(') throw new Error(`${k} needs brackets, e.g. ${k}(30)`); const a = expr(); if (next() !== ')') throw new Error('Missing closing bracket'); const trig = ['sin', 'cos', 'tan'].includes(k), inv = ['asin', 'acos', 'atan'].includes(k); return trig ? clean(FN[k](toRad(a))) : inv ? fromRad(FN[k](a)) : FN[k](a); }
    throw new Error('Unknown word: ' + t);
  }
  const clean = x => Math.abs(x) < 1e-12 ? 0 : +x.toPrecision(12);
  const v = expr(); if (i < tok.length) throw new Error('Unexpected: ' + tok[i]); return v;
}
