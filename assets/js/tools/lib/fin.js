// fin.js — business maths. Every function states its formula in the tool text; keep them in sync.

export const round = (x, d = 2) => Math.round((x + Number.EPSILON * Math.sign(x)) * 10 ** d) / 10 ** d;

// ── Margin vs markup ────────────────────────────────────────────────────────
export function marginMarkup({ cost, price, margin, markup }) {
  if (cost != null && price != null) { const profit = price - cost; return { cost, price, profit, margin: price ? profit / price * 100 : null, markup: cost ? profit / cost * 100 : null }; }
  if (cost != null && margin != null) { if (margin >= 100) throw new Error('Margin must be below 100%'); const price = cost / (1 - margin / 100); return marginMarkup({ cost, price }); }
  if (cost != null && markup != null) return marginMarkup({ cost, price: cost * (1 + markup / 100) });
  if (price != null && margin != null) return marginMarkup({ cost: price * (1 - margin / 100), price });
  if (price != null && markup != null) return marginMarkup({ cost: price / (1 + markup / 100), price });
  throw new Error('Enter two values');
}
export const marginToMarkup = m => { if (m >= 100) throw new Error('Margin must be below 100%'); return m / (100 - m) * 100; };
export const markupToMargin = k => k / (100 + k) * 100;

// ── Time value of money ─────────────────────────────────────────────────────
export function compound({ principal = 0, monthly = 0, rate = 0, years = 0, compounds = 12, contributeAt = 'end' }) {
  const r = rate / 100, n = compounds, rows = []; let balance = principal, contributed = principal;
  const months = Math.round(years * 12); const monthlyRate = Math.pow(1 + r / n, n / 12) - 1;
  for (let m = 1; m <= months; m++) { if (contributeAt === 'start') { balance += monthly; contributed += monthly; } balance *= 1 + monthlyRate; if (contributeAt !== 'start') { balance += monthly; contributed += monthly; } if (m % 12 === 0 || m === months) rows.push({ year: m / 12, balance, contributed, interest: balance - contributed }); }
  return { final: balance, contributed, interest: balance - contributed, rows };
}
export const npv = (rate, flows) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
export function irr(flows, guess = 0.1) {
  if (!flows.some(x => x < 0) || !flows.some(x => x > 0)) return null;
  let lo = -0.9999, hi = 10; let flo = npv(lo, flows), fhi = npv(hi, flows); if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = npv(mid, flows); if (Math.abs(fm) < 1e-9) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } } return (lo + hi) / 2;
}
export const ruleOf72 = rate => ({ approx: 72 / rate, exact: Math.log(2) / Math.log(1 + rate / 100), rule69: 69.3 / rate });
export function discountedPayback(flows, rate) { let cum = 0; for (let t = 0; t < flows.length; t++) { const pv = flows[t] / Math.pow(1 + rate, t); const prev = cum; cum += pv; if (cum >= 0 && t > 0) return t - 1 + (-prev / pv); } return null; }
export function loanSchedule({ amount, rate, months, extra = 0 }) {
  const r = rate / 1200; const pay = r ? amount * r / (1 - Math.pow(1 + r, -months)) : amount / months; let bal = amount, totalInt = 0; const rows = [];
  for (let m = 1; bal > 0.005 && m <= 1200; m++) { const int = bal * r; let princ = Math.min(bal, pay - int + extra); bal -= princ; totalInt += int; rows.push({ m, payment: princ + int, principal: princ, interest: int, balance: Math.max(0, bal) }); }
  return { payment: pay, months: rows.length, totalInterest: totalInt, rows };
}
export function debtPayoff(debts, budget, strategy = 'avalanche') {
  const ds = debts.map(d => ({ ...d, bal: d.balance })); const order = strategy === 'snowball' ? (a, b) => a.bal - b.bal : (a, b) => b.rate - a.rate; let month = 0, totalInt = 0; const timeline = [];
  if (budget < ds.reduce((s, d) => s + d.min, 0)) throw new Error('Budget is below the sum of minimum payments');
  while (ds.some(d => d.bal > 0.005) && month < 1200) {
    month++; let avail = budget; for (const d of ds) if (d.bal > 0) { const i = d.bal * d.rate / 1200; d.bal += i; totalInt += i; const p = Math.min(d.bal, d.min); d.bal -= p; avail -= p; }
    for (const d of [...ds].filter(d => d.bal > 0.005).sort(order)) { const p = Math.min(d.bal, avail); d.bal -= p; avail -= p; if (avail <= 0) break; }
    for (const d of ds) if (d.bal <= 0.005 && !d.paidMonth) { d.paidMonth = month; timeline.push({ name: d.name, month }); }
  }
  return { months: month, totalInterest: totalInt, timeline, converged: month < 1200 };
}

// ── Business metrics ────────────────────────────────────────────────────────
export function runway({ cash, burn, revenue = 0, growth = 0, months = 60 }) {
  const rows = []; let c = cash, rev = revenue, zero = null;
  for (let m = 1; m <= months; m++) { rev *= 1 + growth / 100; const net = rev - burn; c += net; rows.push({ m, revenue: rev, net, cash: c }); if (c <= 0 && zero === null) { zero = m - 1 + (c - net > 0 ? (c - net) / -net : 0); } if (zero !== null && m > zero + 3) break; }
  const netNow = revenue - burn; return { netBurn: -netNow, simple: netNow < 0 ? cash / -netNow : Infinity, months: zero, rows };
}
export function ltvCac({ arpa, grossMargin, churn, cac }) {
  const lifetime = churn > 0 ? 100 / churn : Infinity; const ltv = arpa * grossMargin / 100 * lifetime; const payback = arpa * grossMargin / 100 ? cac / (arpa * grossMargin / 100) : Infinity;
  return { lifetime, ltv, ratio: cac ? ltv / cac : Infinity, payback };
}
export function breakEven({ fixed, price, variable, target = 0 }) {
  const cm = price - variable; if (cm <= 0) throw new Error('Price must be higher than the variable cost per unit');
  const units = Math.ceil((fixed + target) / cm); return { contribution: cm, cmRatio: cm / price * 100, units, revenue: units * price, marginOfSafety: (u) => u > units ? (u - units) / u * 100 : 0 };
}
export const roi = ({ gain, cost, years = null }) => { const r = (gain - cost) / cost * 100; return { roi: r, annualized: years ? (Math.pow(gain / cost, 1 / years) - 1) * 100 : null, net: gain - cost }; };
export function vat({ amount, rate, mode = 'gross' }) { // gross: amount includes VAT; net: amount excludes
  if (mode === 'gross') { const net = amount / (1 + rate / 100); return { net, vat: amount - net, gross: amount }; } const v = amount * rate / 100; return { net: amount, vat: v, gross: amount + v };
}
export const VAT_RATES = { DE: [19, 7], AT: [20, 10, 13], CH: [8.1, 2.6, 3.8], FR: [20, 10, 5.5, 2.1], GB: [20, 5], PL: [23, 8, 5], CZ: [21, 12], IT: [22, 10, 5, 4], ES: [21, 10, 4], NL: [21, 9], BE: [21, 12, 6], SE: [25, 12, 6], DK: [25], IE: [23, 13.5, 9], PT: [23, 13, 6], FI: [25.5, 14, 10], NO: [25, 15, 12], HU: [27, 18, 5], RO: [19, 9, 5], AU: [10], NZ: [15], CA: [5], IN: [18, 12, 5], JP: [10, 8] };
export function tieredPrice(qty, tiers, mode = 'graduated') { // tiers: [{from, price}] ascending
  const sorted = [...tiers].sort((a, b) => a.from - b.from); if (!sorted.length) throw new Error('Add at least one tier');
  if (mode === 'volume') { const t = [...sorted].reverse().find(t => qty >= t.from) || sorted[0]; return { total: qty * t.price, unit: t.price, breakdown: [{ from: t.from, qty, price: t.price, subtotal: qty * t.price }] }; }
  let left = qty, total = 0; const breakdown = [];
  sorted.forEach((t, i) => { const next = sorted[i + 1]?.from ?? Infinity; const span = Math.max(0, Math.min(qty, next - 1) - t.from + 1); if (span > 0) { breakdown.push({ from: t.from, qty: span, price: t.price, subtotal: span * t.price }); total += span * t.price; } });
  return { total, unit: qty ? total / qty : 0, breakdown };
}
export function commission(sales, quota, tiers) { // tiers: [{upTo: percent of quota (or Infinity), rate}]
  let paid = 0, prev = 0; const breakdown = []; const pct = sales / quota * 100;
  for (const t of tiers) { const upper = Math.min(pct, t.upTo ?? Infinity); const span = Math.max(0, upper - prev); const base = span / 100 * quota; if (base > 0) { breakdown.push({ band: `${prev}–${t.upTo ?? '∞'}% of quota`, base, rate: t.rate, pay: base * t.rate / 100 }); paid += base * t.rate / 100; } prev = t.upTo ?? Infinity; if (pct <= prev) break; }
  return { attainment: pct, paid, breakdown };
}
export const FEES_AS_OF = '2024 list prices; edit them to match your contract';
export const PROCESSORS = [{ name: 'Stripe (EU cards)', pct: 1.5, fixed: 0.25 }, { name: 'Stripe (US cards)', pct: 2.9, fixed: 0.30 }, { name: 'PayPal (EU)', pct: 2.99, fixed: 0.35 }, { name: 'PayPal (US)', pct: 3.49, fixed: 0.49 }, { name: 'Square (US, in person)', pct: 2.6, fixed: 0.10 }];
export function processorFee({ pct, fixed }, amount) { const fee = amount * pct / 100 + fixed; return { fee, net: amount - fee, effective: amount ? fee / amount * 100 : 0 }; }
export function grossUp({ pct, fixed }, wanted) { const gross = (wanted + fixed) / (1 - pct / 100); return gross; }
export function churnModel({ customers, arpa, churn, newPerMonth = 0, months = 24, expansion = 0 }) {
  const rows = []; let c = customers, a = arpa; for (let m = 1; m <= months; m++) { c = c * (1 - churn / 100) + newPerMonth; a *= 1 + expansion / 100; rows.push({ m, customers: c, mrr: c * a }); } return { rows, survival: Math.pow(1 - churn / 100, 12) * 100, halfLife: churn > 0 ? Math.log(0.5) / Math.log(1 - churn / 100) : Infinity };
}
export function workingCapital({ currentAssets, currentLiabilities, inventory = 0, cash = 0 }) {
  return { wc: currentAssets - currentLiabilities, current: currentLiabilities ? currentAssets / currentLiabilities : Infinity, quick: currentLiabilities ? (currentAssets - inventory) / currentLiabilities : Infinity, cashRatio: currentLiabilities ? cash / currentLiabilities : Infinity };
}
export function depreciation({ cost, salvage = 0, life, method = 'straight', factor = 2 }) {
  const rows = []; let book = cost; const base = cost - salvage;
  for (let y = 1; y <= life; y++) { let d; if (method === 'straight') d = base / life; else if (method === 'syd') d = base * (life - y + 1) / (life * (life + 1) / 2); else { d = Math.min(book * factor / life, book - salvage); if (y === life) d = book - salvage; } d = Math.max(0, Math.min(d, book - salvage)); book -= d; rows.push({ year: y, depreciation: d, accumulated: cost - book, book }); }
  return rows;
}
export function effectiveHourly({ salary, hoursPerWeek = 40, weeksOff = 5, commuteMinutes = 0, workDaysPerWeek = 5, extraUnpaidHours = 0, expenses = 0 }) {
  const weeks = 52 - weeksOff; const hours = hoursPerWeek * weeks; const commute = commuteMinutes * 2 / 60 * workDaysPerWeek * weeks; const extra = extraUnpaidHours * weeks; const total = hours + commute + extra;
  return { nominal: salary / hours, effective: (salary - expenses) / total, hours, commute, extra, total };
}
export function contractorRate({ salary, benefitsPct = 25, weeksOff = 5, hoursPerWeek = 40, utilization = 75, taxPct = 0, overhead = 0 }) {
  const loaded = salary * (1 + benefitsPct / 100) + overhead; const billable = (52 - weeksOff) * hoursPerWeek * utilization / 100; const rate = loaded / billable / (1 - taxPct / 100); return { loaded, billableHours: billable, rate, day: rate * 8 };
}
export function prorate({ amount, start, periodStart, periodEnd, mode = 'days' }) { // all Date (UTC)
  const DAY = 86400000; const total = Math.round((periodEnd - periodStart) / DAY) + 1; const used = Math.round((periodEnd - start) / DAY) + 1; if (used <= 0) return { total, used: 0, charge: 0, fraction: 0 };
  const f = Math.min(1, used / total); return { total, used, fraction: f, charge: amount * f };
}
export function splitBill({ items, people, tax = 0, tip = 0, taxMode = 'proportional', tipOn = 'subtotal' }) {
  const names = people.map(p => p.name); const sub = Object.fromEntries(names.map(n => [n, 0])); let subtotal = 0;
  for (const it of items) { const who = it.who.length ? it.who : names; const share = it.price / who.length; for (const w of who) sub[w] += share; subtotal += it.price; }
  const taxAmt = tax; const tipAmt = tipOn === 'subtotal' ? subtotal * tip / 100 : (subtotal + taxAmt) * tip / 100;
  const per = Object.fromEntries(names.map(n => { const f = subtotal ? sub[n] / subtotal : 1 / names.length; return [n, { items: sub[n], tax: taxMode === 'equal' ? taxAmt / names.length : taxAmt * f, tip: tipAmt * f }]; }));
  for (const n of names) per[n].total = per[n].items + per[n].tax + per[n].tip;
  // fix cent rounding so the shares add up exactly
  const grand = round(subtotal + taxAmt + tipAmt); const cents = names.map(n => ({ n, c: Math.round(per[n].total * 100) })); let diff = Math.round(grand * 100) - cents.reduce((s, x) => s + x.c, 0); for (let i = 0; diff !== 0; i = (i + 1) % cents.length) { cents[i].c += Math.sign(diff); diff -= Math.sign(diff); }
  for (const x of cents) per[x.n].pay = x.c / 100; return { subtotal, tax: taxAmt, tip: tipAmt, total: grand, per };
}
export function mileage({ distance, rate, unit = 'mi', roundTrip = false }) { const d = distance * (roundTrip ? 2 : 1); return { distance: d, amount: d * rate, perUnit: rate }; }
export const MILEAGE_RATES = { 'US (IRS 2024, business)': [0.67, 'mi', 'USD'], 'US (IRS 2025, business)': [0.70, 'mi', 'USD'], 'DE (Dienstreise)': [0.30, 'km', 'EUR'], 'UK (HMRC, first 10,000 mi)': [0.45, 'mi', 'GBP'], 'AT (Kilometergeld)': [0.42, 'km', 'EUR'], 'PL (limit)': [1.15, 'km', 'PLN'], 'CZ (základní náhrada)': [5.60, 'km', 'CZK'] };
export const tipTable = (bill, rates = [10, 15, 18, 20, 25], people = 1) => rates.map(r => ({ rate: r, tip: round(bill * r / 100), total: round(bill * (1 + r / 100)), perPerson: round(bill * (1 + r / 100) / Math.max(1, people)) }));
export function overheadAllocation(pool, depts, key) { const total = depts.reduce((s, d) => s + (d[key] || 0), 0); if (!total) throw new Error(`No "${key}" values to allocate by`); return depts.map(d => ({ ...d, share: (d[key] || 0) / total * 100, amount: pool * (d[key] || 0) / total })); }
export function elasticity({ p1, q1, p2, q2 }) { const mid = (a, b) => (a + b) / 2; const e = ((q2 - q1) / mid(q1, q2)) / ((p2 - p1) / mid(p1, p2)); const r1 = p1 * q1, r2 = p2 * q2; return { e, type: Math.abs(e) > 1 ? 'elastic' : Math.abs(e) < 1 ? 'inelastic' : 'unit elastic', revenueChange: r2 - r1, r1, r2 }; }
export function dilution(rounds, founders = 100) { // rounds: [{name, invest, preMoney}]
  let own = founders; let shares = 100; const out = []; for (const r of rounds) { const post = r.preMoney + r.invest; const pct = r.invest / post * 100; own *= 1 - pct / 100; out.push({ ...r, post, investor: pct, founders: own, value: own / 100 * post }); } return out;
}
