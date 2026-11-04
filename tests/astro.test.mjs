import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../assets/js/tools/lib/astro.js';

const mins = (a, b) => Math.abs(a - b) / 60000;
test('sunrise and sunset Berlin on the summer solstice 2024', () => {
  const s = S.sunTimes(2024, 6, 21, 52.52, 13.405); assert.ok(mins(s.sunrise, Date.UTC(2024, 5, 21, 2, 43)) < 4, s.sunrise.toISOString()); assert.ok(mins(s.sunset, Date.UTC(2024, 5, 21, 19, 33)) < 4, s.sunset.toISOString());
});
test('sunrise and sunset London on the winter solstice 2024', () => {
  const s = S.sunTimes(2024, 12, 21, 51.5074, -0.1278); assert.ok(mins(s.sunrise, Date.UTC(2024, 11, 21, 8, 4)) < 4, s.sunrise.toISOString()); assert.ok(mins(s.sunset, Date.UTC(2024, 11, 21, 15, 53)) < 4, s.sunset.toISOString());
});
test('day length at the equator is about 12 hours', () => { const s = S.sunTimes(2024, 3, 20, 0, 0); assert.ok(Math.abs(s.dayMinutes - 727) < 6, String(s.dayMinutes)); });
test('polar day and night', () => {
  assert.equal(S.sunTimes(2024, 6, 21, 78.2, 15.6).polar, 'day'); assert.equal(S.sunTimes(2024, 12, 21, 78.2, 15.6).polar, 'night'); assert.equal(S.sunTimes(2024, 6, 21, 78.2, 15.6).sunrise, null);
});
test('known new and full moons', () => {
  const ev = S.moonEvents(Date.UTC(2024, 0, 1), Date.UTC(2024, 1, 5)); const nm = ev.find(e => e.kind === 'new'), fm = ev.find(e => e.kind === 'full');
  assert.ok(mins(nm.ms, Date.UTC(2024, 0, 11, 11, 57)) < 10, new Date(nm.ms).toISOString()); assert.ok(mins(fm.ms, Date.UTC(2024, 0, 25, 17, 54)) < 10, new Date(fm.ms).toISOString());
  const ev2 = S.moonEvents(Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 31)); const f2 = ev2.find(e => e.kind === 'full'); assert.ok(mins(f2.ms, Date.UTC(2025, 0, 13, 22, 27)) < 10, new Date(f2.ms).toISOString());
});
test('moon status', () => {
  const full = S.moonStatus(Date.UTC(2024, 0, 25, 17, 54)); assert.ok(full.illumination > 0.99 && full.name === 'Full moon', JSON.stringify(full)); const nm = S.moonStatus(Date.UTC(2024, 0, 11, 12, 30)); assert.ok(nm.illumination < 0.01 && nm.name === 'New moon');
  const q = S.moonStatus(Date.UTC(2024, 0, 18, 3, 52)); assert.ok(Math.abs(q.illumination - 0.5) < 0.04 && q.name === 'First quarter', JSON.stringify(q));
});
