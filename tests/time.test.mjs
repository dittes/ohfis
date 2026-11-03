import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/js/tools/lib/time.js';

test('timestamps: unit detection and ISO parsing', () => {
  assert.deepEqual(T.parseTimestamp('1700000000'), { ms: 1700000000000, unit: 'seconds' }); assert.deepEqual(T.parseTimestamp('1700000000123'), { ms: 1700000000123, unit: 'milliseconds' });
  assert.equal(T.parseTimestamp('1700000000123456').unit, 'microseconds'); assert.equal(T.parseTimestamp('-86400').ms, -86400000);
  assert.equal(T.parseTimestamp('2023-11-14T22:13:20Z').ms, 1700000000000); assert.equal(T.parseTimestamp('2023-11-14').ms, Date.UTC(2023, 10, 14)); assert.equal(T.parseTimestamp('2023-11-14 22:13:20').ms, 1700000000000); assert.equal(T.parseTimestamp('2023-11-14T23:13:20+01:00').ms, 1700000000000);
  assert.equal(T.parseTimestamp('nonsense'), null); assert.equal(T.parseTimestamp(''), null);
  const d = T.describeTimestamp(1700000000000, 'Europe/Berlin'); assert.equal(d.iso, '2023-11-14T22:13:20.000Z'); assert.equal(d.seconds, 1700000000); assert.match(d.inZone, /Tuesday,? 14 November 2023/); assert.match(d.inZone, /23:13:20/);
});
test('date differences are calendar-aware', () => {
  const a = T.utc(2020, 2, 29), b = T.utc(2024, 3, 1); let r = T.dateDiff(a, b); assert.deepEqual([r.years, r.months, r.days], [4, 0, 1]); assert.equal(r.totalDays, 1462);
  r = T.dateDiff(T.utc(2024, 1, 31), T.utc(2024, 3, 1)); assert.deepEqual([r.years, r.months, r.days], [0, 1, 1]); r = T.dateDiff(T.utc(2024, 3, 1), T.utc(2024, 1, 31)); assert.equal(r.negative, true); assert.equal(r.months, 1);
  r = T.dateDiff(T.utc(2024, 1, 1), T.utc(2024, 1, 15)); assert.equal(r.businessDays, 10); assert.equal(r.weeks, 2); assert.equal(r.hours, 336); assert.equal(T.dateDiff(T.utc(2024, 5, 5), T.utc(2024, 5, 5)).totalDays, 0);
});
test('Easter and holiday rules', () => {
  assert.equal(T.ymd(T.easter(2024)), '2024-03-31'); assert.equal(T.ymd(T.easter(2025)), '2025-04-20'); assert.equal(T.ymd(T.easter(2038)), '2038-04-25'); assert.equal(T.ymd(T.easter(1999)), '1999-04-04');
  const us24 = Object.fromEntries(T.holidays('US', 2024).map(h => [h.date, h.name])); assert.equal(us24['2024-11-28'], 'Thanksgiving'); assert.equal(us24['2024-05-27'], 'Memorial Day'); assert.equal(us24['2024-09-02'], 'Labor Day'); assert.equal(us24['2024-01-15'], 'Martin Luther King Jr. Day'); assert.equal(us24['2024-07-04'], 'Independence Day'); assert.equal(T.holidays('US', 2024).length, 11);
  assert.equal(T.holidays('US', 2021).find(h => h.name === "New Year's Day").date, '2021-01-01'); assert.equal(T.holidays('US', 2022).find(h => h.name === 'Christmas Day').date, '2022-12-26'); assert.equal(T.holidays('US', 2021).find(h => h.name === 'Independence Day').date, '2021-07-05'); assert.equal(T.holidays('US', 2020).some(h => h.name === 'Juneteenth'), false);
  const de25 = Object.fromEntries(T.holidays('DE', 2025).map(h => [h.date, h.name])); assert.equal(de25['2025-04-18'], 'Karfreitag'); assert.equal(de25['2025-05-29'], 'Christi Himmelfahrt'); assert.equal(de25['2025-06-09'], 'Pfingstmontag'); assert.equal(Object.keys(de25).length, 9);
  const gb = Object.fromEntries(T.holidays('GB', 2022).map(h => [h.date, h.name])); assert.equal(gb['2022-01-03'], "New Year's Day"); assert.equal(gb['2022-12-27'], 'Christmas Day'); assert.equal(gb['2022-12-26'], 'Boxing Day'); assert.equal(gb['2022-05-30'], 'Spring bank holiday'); assert.equal(gb['2022-08-29'], 'Summer bank holiday');
  assert.equal(T.holidays('PL', 2025).find(h => h.name === 'Boże Ciało').date, '2025-06-19'); assert.equal(T.holidays('CZ', 2024).find(h => h.name === 'Velký pátek').date, '2024-03-29'); assert.equal(T.holidays('AT', 2024).find(h => h.name === 'Fronleichnam').date, '2024-05-30'); assert.deepEqual(T.holidays('none', 2024), []);
});
test('business day arithmetic', () => {
  let r = T.addBusinessDays(T.utc(2024, 12, 20), 5, { country: 'US' }); assert.equal(T.ymd(r.date), '2024-12-30'); assert.equal(r.skipped[0].name, 'Christmas Day');
  r = T.addBusinessDays(T.utc(2024, 12, 20), 5, { country: 'DE' }); assert.equal(T.ymd(r.date), '2024-12-31'); assert.equal(r.skipped.length, 2);
  assert.equal(T.ymd(T.addBusinessDays(T.utc(2024, 3, 25), 3, { country: 'none' }).date), '2024-03-28'); assert.equal(T.ymd(T.addBusinessDays(T.utc(2024, 3, 25), 5, { country: 'DE' }).date), '2024-04-03');
  assert.equal(T.ymd(T.addBusinessDays(T.utc(2024, 1, 2), -1, { country: 'US' }).date), '2023-12-29'); assert.equal(T.ymd(T.addBusinessDays(T.utc(2024, 6, 14), 0).date), '2024-06-14'); assert.equal(T.ymd(T.addBusinessDays(T.utc(2024, 6, 7), 1, { weekend: [5, 6] }).date), '2024-06-09');
  assert.equal(T.countBusinessDays(T.utc(2024, 12, 23), T.utc(2024, 12, 27), { country: 'US' }).days, 4); assert.equal(T.countBusinessDays(T.utc(2024, 1, 1), T.utc(2024, 1, 31)).days, 23); assert.equal(T.countBusinessDays(T.utc(2024, 1, 1), T.utc(2024, 1, 8), { inclusive: false }).days, 5);
  assert.equal(T.addBusinessDays(T.utc(2024, 4, 2), 1, { country: 'US', extra: ['2024-04-03'] }).date.toISOString().slice(0, 10), '2024-04-04');
});
test('ISO weeks, quarters, Julian days', () => {
  const w = (y, m, d) => T.isoWeek(T.utc(y, m, d)); assert.deepEqual(w(2024, 12, 30), { year: 2025, week: 1 }); assert.deepEqual(w(2021, 1, 3), { year: 2020, week: 53 }); assert.deepEqual(w(2024, 1, 1), { year: 2024, week: 1 }); assert.deepEqual(w(2026, 12, 31), { year: 2026, week: 53 }); assert.deepEqual(w(2023, 1, 1), { year: 2022, week: 52 });
  assert.equal(T.weeksInYear(2020), 53); assert.equal(T.weeksInYear(2023), 52); assert.equal(T.dayOfYear(T.utc(2024, 3, 1)), 61); assert.equal(T.dayOfYear(T.utc(2023, 12, 31)), 365); assert.equal(T.isLeap(1900), false); assert.equal(T.isLeap(2000), true);
  assert.deepEqual(T.quarterInfo(T.utc(2024, 5, 10)), { calendarQuarter: 2, fiscalQuarter: 2, fiscalYear: 2024 }); assert.deepEqual(T.quarterInfo(T.utc(2024, 10, 10), 10), { calendarQuarter: 4, fiscalQuarter: 1, fiscalYear: 2025 }); assert.deepEqual(T.quarterInfo(T.utc(2024, 9, 30), 10), { calendarQuarter: 3, fiscalQuarter: 4, fiscalYear: 2024 });
  assert.equal(T.julianDay(new Date(Date.UTC(2000, 0, 1, 12))), 2451545); assert.equal(T.julianDay(T.utc(2024, 1, 1)), 2460310.5); assert.equal(T.fromJulianDay(2451545).toISOString(), '2000-01-01T12:00:00.000Z');
  const cal = T.fiscalCalendar445(2024, T.utc(2024, 2, 4)); assert.equal(cal.length, 12); assert.deepEqual(cal.map(c => c.weeks), [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5]); assert.equal(cal[0].start, '2024-02-04'); assert.equal(cal[0].end, '2024-03-02'); assert.equal(cal[11].end, '2025-02-01');
});
test('time zones: offsets, DST gaps and overlaps', () => {
  assert.equal(T.tzOffsetMinutes('America/New_York', Date.UTC(2024, 0, 15, 12)), -300); assert.equal(T.tzOffsetMinutes('America/New_York', Date.UTC(2024, 6, 15, 12)), -240); assert.equal(T.tzOffsetMinutes('Asia/Kolkata', Date.UTC(2024, 0, 1)), 330); assert.equal(T.tzOffsetMinutes('Europe/Berlin', Date.UTC(2024, 6, 1)), 120);
  assert.equal(new Date(T.zonedToUtc(2024, 3, 15, 9, 0, 'America/New_York')).toISOString(), '2024-03-15T13:00:00.000Z'); assert.equal(new Date(T.zonedToUtc(2024, 1, 15, 9, 0, 'America/New_York')).toISOString(), '2024-01-15T14:00:00.000Z');
  assert.equal(new Date(T.zonedToUtc(2024, 3, 10, 2, 30, 'America/New_York')).toISOString(), '2024-03-10T07:30:00.000Z', 'nonexistent 02:30 moves forward');
  assert.equal(new Date(T.zonedToUtc(2024, 11, 3, 1, 30, 'America/New_York')).toISOString(), '2024-11-03T05:30:00.000Z', 'ambiguous 01:30 takes the first (EDT)');
  assert.equal(new Date(T.zonedToUtc(2024, 6, 1, 12, 0, 'Asia/Tokyo')).toISOString(), '2024-06-01T03:00:00.000Z'); assert.equal(new Date(T.zonedToUtc(2024, 6, 1, 12, 0, 'Australia/Lord_Howe')).toISOString(), '2024-06-01T01:30:00.000Z');
  const slots = T.overlapSlots(['Europe/Berlin', 'America/New_York'], '2024-01-15', 9, 17); const w = T.bestWindows(slots); assert.equal(w.length, 1); assert.equal(new Date(w[0].from).toISOString(), '2024-01-15T14:00:00.000Z'); assert.equal(new Date(w[0].to).toISOString(), '2024-01-15T16:00:00.000Z');
  assert.equal(T.bestWindows(T.overlapSlots(['Asia/Tokyo', 'America/Los_Angeles'], '2024-01-15', 9, 17)).length, 0); assert.equal(T.bestWindows(T.overlapSlots(['Europe/London'], '2024-01-13', 9, 17)).length, 0, 'weekend has no working hours');
});
test('ICS files are standards-compliant', () => {
  const ics = T.buildICS({ title: 'Team sync; weekly, "important"', start: '2024-03-15T09:00', end: '2024-03-15T10:00', tz: 'America/New_York', location: 'Room 1, Berlin', description: 'Line1\nLine2', attendees: ['a@example.com'], organizer: 'Ann <ann@example.com>', alarmMinutes: 15, rrule: 'FREQ=WEEKLY;COUNT=4', uid: 'u1', now: Date.UTC(2024, 0, 1) });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n')); assert.match(ics, /DTSTART:20240315T130000Z\r\n/); assert.match(ics, /DTEND:20240315T140000Z\r\n/); assert.match(ics, /SUMMARY:Team sync\; weekly\\, "important"\r\n/); assert.match(ics, /DESCRIPTION:Line1\\nLine2\r\n/);
  assert.match(ics, /ORGANIZER;CN=Ann:mailto:ann@example\.com/); assert.match(ics, /RRULE:FREQ=WEEKLY;COUNT=4/); assert.match(ics, /TRIGGER:-PT15M/); assert.match(ics, /DTSTAMP:20240101T000000Z/); assert.ok(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75), 'line folding');
  const allDay = T.buildICS({ title: 'Holiday', start: '2024-12-24', end: '2024-12-26', allDay: true, uid: 'u2', now: 0 }); assert.match(allDay, /DTSTART;VALUE=DATE:20241224\r\nDTEND;VALUE=DATE:20241227\r\n/);
  assert.throws(() => T.buildICS({ title: 'x', start: '2024-03-15T10:00', end: '2024-03-15T09:00' }), /ends before/);
  const long = T.buildICS({ title: 'ä'.repeat(100), start: '2024-03-15T09:00', uid: 'u', now: 0 }); const folded = long.split('\r\n'); assert.ok(folded.every(l => new TextEncoder().encode(l).length <= 75)); assert.equal(long.replace(/\r\n /g, '').match(/SUMMARY:(.*)\r\n/)[1], 'ä'.repeat(100));
});
test('durations', () => {
  assert.equal(T.evalDurations('4h 12m + 1h 55m').seconds, 6 * 3600 + 7 * 60); assert.equal(T.evalDurations('2:30 - 0:45').seconds, 6300); assert.equal(T.evalDurations('1d 2h').seconds, 93600); assert.equal(T.evalDurations('90m + 1.5h').seconds, 10800); assert.equal(T.evalDurations('1:15:30').seconds, 4530); assert.equal(T.evalDurations('0.25').seconds, 900);
  assert.throws(() => T.evalDurations('4 apples'), /Cannot read/); assert.equal(T.formatHMS(6 * 3600 + 7 * 60), '6:07'); assert.equal(T.formatHMS(-5400), '-1:30'); assert.equal(T.formatHMS(93600, { days: true }), '1d 2:00'); assert.equal(T.formatHMS(3661), '1:01:01');
  assert.equal(T.toDecimalHours(7, 45), 7.75); assert.equal(T.toDecimalHours(0, 10), 0.1667); assert.deepEqual(T.fromDecimalHours(7.75), { negative: false, hours: 7, minutes: 45 }); assert.deepEqual(T.fromDecimalHours(-0.5), { negative: true, hours: 0, minutes: 30 });
  assert.equal(T.roundHours(7.8, 0.25), 7.75); assert.equal(T.roundHours(7.9, 0.25), 8); assert.equal(T.roundHours(7.9, 0.25, 'up'), 8); assert.equal(T.roundHours(7.76, 0.25, 'down'), 7.75); assert.equal(T.roundHours(1.234, 0), 1.234); assert.equal(T.roundHours(0.25, 0.25, 'up'), 0.25);
});
test('recurring dates', () => {
  const s = T.utc(2024, 1, 2); const f = (o) => T.recurringDates({ start: s, ...o }).map(T.ymd);
  assert.deepEqual(f({ unit: 'week', every: 2, count: 3 }), ['2024-01-02', '2024-01-16', '2024-01-30']); assert.deepEqual(f({ unit: 'week', weekdays: [1, 3], count: 4 }), ['2024-01-03', '2024-01-08', '2024-01-10', '2024-01-15']);
  assert.deepEqual(f({ unit: 'month', count: 3, start: T.utc(2024, 1, 31) }), ['2024-01-31', '2024-02-29', '2024-03-31']); assert.deepEqual(T.recurringDates({ start: T.utc(2024, 1, 31), unit: 'month', count: 3 }).map(T.ymd), ['2024-01-31', '2024-02-29', '2024-03-31']);
  assert.deepEqual(f({ unit: 'month', nthWeekdayOf: [2, 2], count: 3 }), ['2024-01-09', '2024-02-13', '2024-03-12']); assert.deepEqual(f({ unit: 'month', nthWeekdayOf: [-1, 5], count: 2 }), ['2024-01-26', '2024-02-23']);
  assert.deepEqual(f({ unit: 'day', every: 3, count: 3, skipWeekends: true }), ['2024-01-02', '2024-01-05', '2024-01-08']); assert.deepEqual(f({ unit: 'year', count: 2, start: T.utc(2024, 2, 29) }).length, 2); assert.equal(T.recurringDates({ start: s, unit: 'day', count: 100, until: T.utc(2024, 1, 5) }).length, 4);
  const sp = T.sprintPlan({ start: T.utc(2024, 1, 1), sprintDays: 10, count: 2 }); assert.deepEqual([sp[0].start, sp[0].end, sp[1].start, sp[1].end], ['2024-01-01', '2024-01-12', '2024-01-15', '2024-01-26']);
});
