import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../assets/js/tools/lib/fin.js';
const close = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`);

test('margin and markup', () => {
  let r = F.marginMarkup({ cost: 60, price: 100 }); close(r.margin, 40); close(r.markup, 66.6667, 1e-3); r = F.marginMarkup({ cost: 60, margin: 40 }); close(r.price, 100); r = F.marginMarkup({ cost: 50, markup: 100 }); close(r.price, 100); close(r.margin, 50);
  r = F.marginMarkup({ price: 200, margin: 25 }); close(r.cost, 150); r = F.marginMarkup({ price: 150, markup: 50 }); close(r.cost, 100); close(F.marginToMarkup(50), 100); close(F.markupToMargin(25), 20); assert.throws(() => F.marginToMarkup(100)); assert.throws(() => F.marginMarkup({ cost: 5 }));
});
test('compound interest', () => {
  let r = F.compound({ principal: 1000, rate: 5, years: 10, compounds: 12 }); close(r.final, 1647.01, 0.01); r = F.compound({ principal: 10000, rate: 7, years: 30, compounds: 1 }); close(r.final, 76122.55, 0.01); assert.equal(r.rows.length, 30);
  r = F.compound({ monthly: 100, rate: 6, years: 20, compounds: 12 }); close(r.final, 46204.09, 0.5); close(r.contributed, 24000); r = F.compound({ principal: 500, rate: 0, years: 3, monthly: 10 }); close(r.final, 860);
  assert.ok(F.compound({ monthly: 100, rate: 6, years: 1, contributeAt: 'start' }).final > F.compound({ monthly: 100, rate: 6, years: 1 }).final);
});
test('NPV, IRR, rule of 72, payback', () => {
  close(F.npv(0.1, [-1000, 300, 400, 500]), -21.0368, 1e-3); close(F.npv(0, [-100, 50, 60]), 10); close(F.irr([-1000, 300, 400, 500]), 0.0889, 1e-3); close(F.irr([-100, 110]), 0.1, 1e-6); assert.equal(F.irr([100, 200]), null); assert.equal(F.irr([-100, -50]), null);
  const r = F.ruleOf72(8); close(r.approx, 9); close(r.exact, 9.0065, 1e-3); close(F.discountedPayback([-1000, 600, 600, 600], 0.1), 1.9167, 1e-3); assert.equal(F.discountedPayback([-1000, 100, 100], 0.1), null);
});
test('loans and debt payoff', () => {
  const l = F.loanSchedule({ amount: 200000, rate: 6, months: 360 }); close(l.payment, 1199.10, 0.01); close(l.totalInterest, 231676, 50); assert.equal(l.months, 360); close(l.rows.at(-1).balance, 0, 0.01);
  const extra = F.loanSchedule({ amount: 200000, rate: 6, months: 360, extra: 200 }); assert.ok(extra.months < 300 && extra.totalInterest < l.totalInterest);
  const debts = [{ name: 'Card', balance: 3000, rate: 24, min: 90 }, { name: 'Car', balance: 8000, rate: 6, min: 160 }, { name: 'Small', balance: 500, rate: 12, min: 25 }];
  const av = F.debtPayoff(debts, 600, 'avalanche'), sb = F.debtPayoff(debts, 600, 'snowball'); assert.ok(av.converged && sb.converged); assert.ok(av.totalInterest <= sb.totalInterest + 1e-9); assert.equal(sb.timeline[0].name, 'Small'); assert.throws(() => F.debtPayoff(debts, 100), /below the sum/);
});
test('business metrics', () => {
  const r = F.runway({ cash: 120000, burn: 20000, revenue: 5000, growth: 0 }); close(r.simple, 8); close(r.months, 8, 1e-6); assert.equal(r.netBurn, 15000); assert.equal(F.runway({ cash: 100, burn: 10, revenue: 20 }).simple, Infinity);
  const g = F.runway({ cash: 100000, burn: 10000, revenue: 5000, growth: 10 }); assert.ok(g.months === null || g.months > 10);
  const l = F.ltvCac({ arpa: 100, grossMargin: 80, churn: 2, cac: 400 }); close(l.lifetime, 50); close(l.ltv, 4000); close(l.ratio, 10); close(l.payback, 5);
  const b = F.breakEven({ fixed: 10000, price: 50, variable: 30 }); assert.equal(b.units, 500); close(b.cmRatio, 40); assert.equal(F.breakEven({ fixed: 10000, price: 50, variable: 30, target: 5000 }).units, 750); assert.throws(() => F.breakEven({ fixed: 1, price: 5, variable: 5 })); close(b.marginOfSafety(600), 16.6667, 1e-3);
  const ro = F.roi({ gain: 15000, cost: 10000, years: 2 }); close(ro.roi, 50); close(ro.annualized, 22.4745, 1e-3); close(ro.net, 5000);
  let v = F.vat({ amount: 119, rate: 19 }); close(v.net, 100); close(v.vat, 19); v = F.vat({ amount: 100, rate: 19, mode: 'net' }); close(v.gross, 119);
  const wc = F.workingCapital({ currentAssets: 500, currentLiabilities: 250, inventory: 150, cash: 100 }); close(wc.wc, 250); close(wc.current, 2); close(wc.quick, 1.4); close(wc.cashRatio, 0.4);
});
test('tiers, commissions, fees', () => {
  const tiers = [{ from: 1, price: 10 }, { from: 101, price: 8 }, { from: 501, price: 5 }];
  assert.equal(F.tieredPrice(50, tiers).total, 500); assert.equal(F.tieredPrice(250, tiers).total, 100 * 10 + 150 * 8); assert.equal(F.tieredPrice(600, tiers).total, 1000 + 400 * 8 + 100 * 5); assert.equal(F.tieredPrice(600, tiers, 'volume').total, 600 * 5); assert.equal(F.tieredPrice(100, tiers, 'volume').unit, 10); assert.equal(F.tieredPrice(101, tiers, 'volume').unit, 8); assert.throws(() => F.tieredPrice(5, []));
  const c = F.commission(130000, 100000, [{ upTo: 100, rate: 5 }, { upTo: 150, rate: 8 }, { upTo: null, rate: 12 }]); close(c.paid, 5000 + 2400); close(c.attainment, 130); assert.equal(c.breakdown.length, 2); assert.equal(F.commission(50000, 100000, [{ upTo: 100, rate: 5 }, { upTo: null, rate: 10 }]).paid, 2500);
  const f = F.processorFee({ pct: 2.9, fixed: 0.3 }, 100); close(f.fee, 3.2); close(f.effective, 3.2); close(F.grossUp({ pct: 2.9, fixed: 0.3 }, 100), 103.2956, 1e-3); close(F.processorFee({ pct: 2.9, fixed: 0.3 }, F.grossUp({ pct: 2.9, fixed: 0.3 }, 100)).net, 100, 1e-9);
});
test('depreciation, hourly rates, proration', () => {
  const s = F.depreciation({ cost: 10000, salvage: 1000, life: 5 }); assert.equal(s.length, 5); close(s[0].depreciation, 1800); close(s[4].book, 1000); const syd = F.depreciation({ cost: 10000, salvage: 1000, life: 5, method: 'syd' }); close(syd[0].depreciation, 3000); close(syd[4].depreciation, 600); close(syd[4].book, 1000);
  const db = F.depreciation({ cost: 10000, salvage: 1000, life: 5, method: 'declining' }); close(db[0].depreciation, 4000); close(db[1].depreciation, 2400); close(db.at(-1).book, 1000, 1e-6); assert.ok(db.every(r => r.depreciation >= 0));
  const e = F.effectiveHourly({ salary: 52000, hoursPerWeek: 40, weeksOff: 4, commuteMinutes: 45, extraUnpaidHours: 5 }); close(e.nominal, 52000 / (40 * 48)); assert.ok(e.effective < e.nominal); close(e.commute, 45 * 2 / 60 * 5 * 48);
  const c = F.contractorRate({ salary: 90000, benefitsPct: 25, weeksOff: 5, utilization: 75 }); close(c.billableHours, 47 * 40 * 0.75); close(c.rate, 90000 * 1.25 / (47 * 30), 1e-6);
  const p = F.prorate({ amount: 3100, start: new Date(Date.UTC(2024, 0, 11)), periodStart: new Date(Date.UTC(2024, 0, 1)), periodEnd: new Date(Date.UTC(2024, 0, 31)) }); assert.equal(p.total, 31); assert.equal(p.used, 21); close(p.charge, 2100); assert.equal(F.prorate({ amount: 100, start: new Date(Date.UTC(2024, 1, 5)), periodStart: new Date(Date.UTC(2024, 0, 1)), periodEnd: new Date(Date.UTC(2024, 0, 31)) }).charge, 0);
  const feb = F.prorate({ amount: 2800, start: new Date(Date.UTC(2024, 1, 15)), periodStart: new Date(Date.UTC(2024, 1, 1)), periodEnd: new Date(Date.UTC(2024, 1, 29)) }); assert.equal(feb.total, 29); close(feb.charge, 2800 * 15 / 29);
});
test('bill splitting adds up to the cent', () => {
  const r = F.splitBill({ items: [{ price: 20, who: ['Ann'] }, { price: 30, who: ['Bo'] }, { price: 10, who: [] }], people: [{ name: 'Ann' }, { name: 'Bo' }, { name: 'Cy' }], tax: 6, tip: 15 });
  close(r.subtotal, 60); close(r.tip, 9); close(r.total, 75); const sum = Object.values(r.per).reduce((s, p) => s + p.pay, 0); close(sum, 75, 1e-9); assert.ok(r.per.Bo.pay > r.per.Ann.pay && r.per.Ann.pay > r.per.Cy.pay);
  const odd = F.splitBill({ items: [{ price: 10, who: [] }], people: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] }); close(Object.values(odd.per).reduce((s, p) => s + p.pay, 0), 10, 1e-9);
});
test('remaining helpers', () => {
  assert.deepEqual(F.tipTable(100, [15, 20], 4).map(x => [x.tip, x.total, x.perPerson]), [[15, 115, 28.75], [20, 120, 30]]); close(F.mileage({ distance: 100, rate: 0.67, roundTrip: true }).amount, 134);
  const o = F.overheadAllocation(10000, [{ name: 'A', heads: 6 }, { name: 'B', heads: 4 }], 'heads'); close(o[0].amount, 6000); assert.throws(() => F.overheadAllocation(1, [{ name: 'A' }], 'heads'));
  const el = F.elasticity({ p1: 10, q1: 100, p2: 12, q2: 80 }); close(el.e, -1.2222, 1e-3); assert.equal(el.type, 'elastic'); assert.ok(el.revenueChange < 0);
  const d = F.dilution([{ name: 'Seed', invest: 1, preMoney: 4 }, { name: 'A', invest: 5, preMoney: 15 }]); close(d[0].investor, 20); close(d[0].founders, 80); close(d[1].investor, 25); close(d[1].founders, 60); close(d[1].post, 20);
  const ch = F.churnModel({ customers: 1000, arpa: 50, churn: 5, months: 12 }); close(ch.rows[0].customers, 950); close(ch.survival, 54.0360, 1e-3); close(ch.halfLife, 13.5134, 1e-3);
});
