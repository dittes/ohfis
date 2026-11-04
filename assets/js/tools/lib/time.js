// time.js — dates, holidays, calendar files, durations. All pure and timezone-explicit.

const DAY = 86400000;
export const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
export const ymd = d => d.toISOString().slice(0, 10);
export const parseYMD = s => { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; const d = utc(+m[1], +m[2], +m[3]); return d.getUTCMonth() === +m[2] - 1 ? d : null; };
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);

// ── Unix timestamps ─────────────────────────────────────────────────────────
export function parseTimestamp(input) {
  const s = String(input).trim(); if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s); const abs = Math.abs(n); let ms, unit;
    if (abs < 1e11) { ms = n * 1000; unit = 'seconds'; } else if (abs < 1e14) { ms = n; unit = 'milliseconds'; } else if (abs < 1e17) { ms = n / 1000; unit = 'microseconds'; } else { ms = n / 1e6; unit = 'nanoseconds'; }
    return { ms: Math.round(ms), unit };
  }
  const iso = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00Z' : /(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : s.replace(' ', 'T') + (/T/.test(s.replace(' ', 'T')) ? 'Z' : ''));
  return Number.isNaN(iso) ? null : { ms: iso, unit: 'date' };
}
export function describeTimestamp(ms, tz = 'UTC') {
  const d = new Date(ms); if (Number.isNaN(d.getTime())) return null;
  const f = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(d);
  const rel = (() => { const diff = ms - Date.now(); const a = Math.abs(diff); const u = [['year', 31557600000], ['month', 2629800000], ['day', DAY], ['hour', 3600000], ['minute', 60000], ['second', 1000]].find(([, v]) => a >= v) || ['second', 1000]; const n = Math.round(a / u[1]); return `${n} ${u[0]}${n === 1 ? '' : 's'} ${diff < 0 ? 'ago' : 'from now'}`; })();
  return { seconds: Math.floor(ms / 1000), milliseconds: ms, iso: d.toISOString(), inZone: f({ dateStyle: 'full', timeStyle: 'long' }), relative: rel, rfc2822: d.toUTCString() };
}

// ── Date differences ────────────────────────────────────────────────────────
const addMonthsClamped = (d, n) => { const y = d.getUTCFullYear(), m = d.getUTCMonth() + n; const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), dim))); };
export function dateDiff(a, b) {
  const [from, to] = a <= b ? [a, b] : [b, a]; const neg = a > b;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  let anchor = addMonthsClamped(from, months); if (anchor > to) { months--; anchor = addMonthsClamped(from, months); }
  const days = Math.round((to - from) / DAY); let biz = 0;
  for (let t = from.getTime(); t < to.getTime(); t += DAY) { const wd = new Date(t).getUTCDay(); if (wd !== 0 && wd !== 6) biz++; }
  return { years: Math.floor(months / 12), months: months % 12, days: Math.round((to - anchor) / DAY), totalDays: days, weeks: Math.floor(days / 7), remDays: days % 7, hours: days * 24, minutes: days * 1440, businessDays: biz, negative: neg };
}

// ── Holidays ────────────────────────────────────────────────────────────────
export function easter(year) { // Meeus/Jones/Butcher
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; return utc(year, month, day);
}
const nthWeekday = (y, m, wd, n) => { const first = utc(y, m, 1); const off = (wd - first.getUTCDay() + 7) % 7; return utc(y, m, 1 + off + (n - 1) * 7); };
const lastWeekday = (y, m, wd) => { const last = utc(y, m + 1, 0); const off = (last.getUTCDay() - wd + 7) % 7; return addDays(last, -off); };
const observed = d => { const w = d.getUTCDay(); return w === 6 ? addDays(d, -1) : w === 0 ? addDays(d, 1) : d; };
const substitute = (d, taken) => { let x = d; while (x.getUTCDay() === 0 || x.getUTCDay() === 6 || taken.has(ymd(x))) x = addDays(x, 1); return x; };
export const HOLIDAY_SETS = { none: 'No holidays', US: 'United States (federal)', GB: 'United Kingdom (England & Wales)', DE: 'Germany (nationwide)', PL: 'Poland', CZ: 'Czechia', AT: 'Austria' };
export function holidays(country, year) {
  const E = easter(year), out = []; const add = (d, name) => out.push({ date: ymd(d), name });
  const rel = (n) => addDays(E, n);
  if (country === 'US') {
    add(observed(utc(year, 1, 1)), "New Year's Day"); add(nthWeekday(year, 1, 1, 3), 'Martin Luther King Jr. Day'); add(nthWeekday(year, 2, 1, 3), "Presidents' Day"); add(lastWeekday(year, 5, 1), 'Memorial Day');
    if (year >= 2021) add(observed(utc(year, 6, 19)), 'Juneteenth'); add(observed(utc(year, 7, 4)), 'Independence Day'); add(nthWeekday(year, 9, 1, 1), 'Labor Day'); add(nthWeekday(year, 10, 1, 2), 'Columbus Day'); add(observed(utc(year, 11, 11)), 'Veterans Day'); add(nthWeekday(year, 11, 4, 4), 'Thanksgiving'); add(observed(utc(year, 12, 25)), 'Christmas Day');
  } else if (country === 'GB') {
    const taken = new Set(); const sub = (d, n) => { const x = substitute(d, taken); taken.add(ymd(x)); add(x, n); };
    add(rel(-2), 'Good Friday'); taken.add(ymd(rel(-2))); add(rel(1), 'Easter Monday'); taken.add(ymd(rel(1)));
    sub(utc(year, 1, 1), "New Year's Day"); add(nthWeekday(year, 5, 1, 1), 'Early May bank holiday'); add(lastWeekday(year, 5, 1), 'Spring bank holiday'); add(lastWeekday(year, 8, 1), 'Summer bank holiday');
    // Christmas on a Sunday: Boxing Day keeps Monday 26th and Christmas moves to Tuesday 27th (as gov.uk publishes it)
    if (utc(year, 12, 25).getUTCDay() === 0) { add(utc(year, 12, 26), 'Boxing Day'); add(utc(year, 12, 27), 'Christmas Day'); } else { sub(utc(year, 12, 25), 'Christmas Day'); sub(utc(year, 12, 26), 'Boxing Day'); }
  } else if (country === 'DE') {
    add(utc(year, 1, 1), 'Neujahr'); add(rel(-2), 'Karfreitag'); add(rel(1), 'Ostermontag'); add(utc(year, 5, 1), 'Tag der Arbeit'); add(rel(39), 'Christi Himmelfahrt'); add(rel(50), 'Pfingstmontag'); add(utc(year, 10, 3), 'Tag der Deutschen Einheit'); add(utc(year, 12, 25), '1. Weihnachtstag'); add(utc(year, 12, 26), '2. Weihnachtstag');
  } else if (country === 'AT') {
    add(utc(year, 1, 1), 'Neujahr'); add(utc(year, 1, 6), 'Heilige Drei Könige'); add(rel(1), 'Ostermontag'); add(utc(year, 5, 1), 'Staatsfeiertag'); add(rel(39), 'Christi Himmelfahrt'); add(rel(50), 'Pfingstmontag'); add(rel(60), 'Fronleichnam'); add(utc(year, 8, 15), 'Mariä Himmelfahrt'); add(utc(year, 10, 26), 'Nationalfeiertag'); add(utc(year, 11, 1), 'Allerheiligen'); add(utc(year, 12, 8), 'Mariä Empfängnis'); add(utc(year, 12, 25), 'Christtag'); add(utc(year, 12, 26), 'Stefanitag');
  } else if (country === 'PL') {
    add(utc(year, 1, 1), 'Nowy Rok'); add(utc(year, 1, 6), 'Trzech Króli'); add(rel(1), 'Poniedziałek Wielkanocny'); add(utc(year, 5, 1), 'Święto Pracy'); add(utc(year, 5, 3), 'Święto Konstytucji 3 Maja'); add(rel(60), 'Boże Ciało'); add(utc(year, 8, 15), 'Wniebowzięcie NMP'); add(utc(year, 11, 1), 'Wszystkich Świętych'); add(utc(year, 11, 11), 'Święto Niepodległości'); if (year >= 2025) add(utc(year, 12, 24), 'Wigilia'); add(utc(year, 12, 25), 'Boże Narodzenie'); add(utc(year, 12, 26), 'Drugi dzień Świąt');
  } else if (country === 'CZ') {
    add(utc(year, 1, 1), 'Nový rok'); add(rel(-2), 'Velký pátek'); add(rel(1), 'Velikonoční pondělí'); add(utc(year, 5, 1), 'Svátek práce'); add(utc(year, 5, 8), 'Den vítězství'); add(utc(year, 7, 5), 'Cyril a Metoděj'); add(utc(year, 7, 6), 'Jan Hus'); add(utc(year, 9, 28), 'Den české státnosti'); add(utc(year, 10, 28), 'Vznik Československa'); add(utc(year, 11, 17), 'Den boje za svobodu'); add(utc(year, 12, 24), 'Štědrý den'); add(utc(year, 12, 25), '1. svátek vánoční'); add(utc(year, 12, 26), '2. svátek vánoční');
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
export function holidaySet(country, from, to, extra = []) {
  const set = new Map(); for (let y = from.getUTCFullYear(); y <= to.getUTCFullYear(); y++) for (const h of holidays(country, y)) set.set(h.date, h.name); for (const x of extra) set.set(x, 'Custom day off'); return set;
}
export function addBusinessDays(start, n, { country = 'none', extra = [], weekend = [0, 6] } = {}) {
  const dir = n < 0 ? -1 : 1; let left = Math.abs(n), cur = new Date(start); const skipped = [];
  const hol = holidaySet(country, addDays(start, -400 * (dir < 0 ? 1 : 0)), addDays(start, Math.abs(n) * 2 + 400), extra);
  if (dir < 0) { for (const [k, v] of holidaySet(country, addDays(start, -Math.abs(n) * 2 - 400), start, extra)) hol.set(k, v); }
  while (left > 0) { cur = addDays(cur, dir); const wd = cur.getUTCDay(); if (weekend.includes(wd)) continue; if (hol.has(ymd(cur))) { skipped.push({ date: ymd(cur), name: hol.get(ymd(cur)) }); continue; } left--; }
  return { date: cur, skipped };
}
export function countBusinessDays(a, b, { country = 'none', extra = [], weekend = [0, 6], inclusive = true } = {}) {
  const [from, to] = a <= b ? [a, b] : [b, a]; const hol = holidaySet(country, from, to, extra); let n = 0; const used = [];
  for (let t = from.getTime(); inclusive ? t <= to.getTime() : t < to.getTime(); t += DAY) { const d = new Date(t); if (weekend.includes(d.getUTCDay())) continue; if (hol.has(ymd(d))) { used.push({ date: ymd(d), name: hol.get(ymd(d)) }); continue; } n++; }
  return { days: n, holidays: used };
}

// ── Calendar numbers ────────────────────────────────────────────────────────
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y = t.getUTCFullYear(); const week = Math.ceil(((t - Date.UTC(y, 0, 1)) / DAY + 1) / 7); return { year: y, week };
}
export const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const dayOfYear = d => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY);
export const weeksInYear = y => isoWeek(utc(y, 12, 28)).week;
export function quarterInfo(d, fyStartMonth = 1) {
  const m = d.getUTCMonth() + 1; const shifted = (m - fyStartMonth + 12) % 12; const fyYear = fyStartMonth === 1 ? d.getUTCFullYear() : (m >= fyStartMonth ? d.getUTCFullYear() + 1 : d.getUTCFullYear());
  return { calendarQuarter: Math.floor((m - 1) / 3) + 1, fiscalQuarter: Math.floor(shifted / 3) + 1, fiscalYear: fyYear };
}
export function julianDay(d) { return d.getTime() / DAY + 2440587.5; }
export function fromJulianDay(jd) { return new Date((jd - 2440587.5) * DAY); }
export function fiscalCalendar445(year, startDate, pattern = [4, 4, 5]) { // 12 periods of 4-4-5 weeks, 52 weeks; returns period start/end
  const out = []; let cur = new Date(startDate); for (let p = 0; p < 12; p++) { const weeks = pattern[p % 3]; const end = addDays(cur, weeks * 7 - 1); out.push({ period: p + 1, quarter: Math.floor(p / 3) + 1, weeks, start: ymd(cur), end: ymd(end) }); cur = addDays(end, 1); } return out;
}

// ── Time zones ──────────────────────────────────────────────────────────────
export function tzOffsetMinutes(tz, atMs) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(atMs)).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second); return Math.round((asUTC - Math.floor(atMs / 1000) * 1000) / 60000);
}
/** Wall-clock time in a zone → UTC instant (ms). Handles DST gaps by moving forward, overlaps by taking the first. */
export function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi); let off = tzOffsetMinutes(tz, guess); let t = guess - off * 60000; const off2 = tzOffsetMinutes(tz, t);
  if (off2 !== off) { t = guess - off2 * 60000; if (tzOffsetMinutes(tz, t) !== off2) t = guess - Math.min(off, off2) * 60000; }
  return t;
}
export function localParts(ms, tz) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(ms)).map(x => [x.type, x.value])); return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: p.weekday }; }
/** For each 30-minute slot of a UTC day, which of the zones are inside working hours? */
export function overlapSlots(zones, dateYMD, workStart = 9, workEnd = 17) {
  const day0 = Date.parse(dateYMD + 'T00:00:00Z'); const slots = [];
  for (let i = 0; i < 48; i++) {
    const ms = day0 + i * 1800000; const per = zones.map(tz => { const p = localParts(ms, tz); const dec = p.h + p.mi / 60; const weekend = p.wd === 'Sat' || p.wd === 'Sun'; return { tz, label: `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`, day: p.d, working: !weekend && dec >= workStart && dec < workEnd, weekend }; });
    slots.push({ ms, per, all: per.every(x => x.working), count: per.filter(x => x.working).length });
  }
  return slots;
}
export function bestWindows(slots) { const out = []; let cur = null; for (const s of slots) { if (s.all) { if (!cur) cur = { from: s.ms, to: s.ms + 1800000 }; else cur.to = s.ms + 1800000; } else if (cur) { out.push(cur); cur = null; } } if (cur) out.push(cur); return out; }

// ── Calendar files (.ics) ───────────────────────────────────────────────────
const icsEsc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export function fold(line) { // 75 octets per line, continuation lines start with a space; never split inside a UTF-8 character
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line; const out = []; let cur = ''; let bytes = 0; let limit = 75;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; } cur += ch; bytes += b; }
  out.push(cur); return out.join('\r\n ');
}
const icsUTC = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function buildICS({ title, start, end, allDay = false, tz = 'UTC', location = '', description = '', url = '', organizer = '', attendees = [], alarmMinutes = null, rrule = '', uid, now = Date.now(), status = 'CONFIRMED' }) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ohfis//Calendar Event Generator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT'];
  lines.push(`UID:${uid || `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}@ohfis.com`}`, `DTSTAMP:${icsUTC(now)}`);
  if (allDay) { const s = parseYMD(start.slice(0, 10)); const e = parseYMD((end || start).slice(0, 10)); lines.push(`DTSTART;VALUE=DATE:${ymd(s).replaceAll('-', '')}`, `DTEND;VALUE=DATE:${ymd(addDays(e, 1)).replaceAll('-', '')}`); }
  else { const p = s => s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/).slice(1).map(Number); const [y, mo, d, h, mi] = p(start); const [y2, mo2, d2, h2, mi2] = p(end || start); const sMs = zonedToUtc(y, mo, d, h, mi, tz), eMs = zonedToUtc(y2, mo2, d2, h2, mi2, tz); if (eMs < sMs) throw new Error('The event ends before it starts'); lines.push(`DTSTART:${icsUTC(sMs)}`, `DTEND:${icsUTC(eMs)}`); }
  lines.push(`SUMMARY:${icsEsc(title)}`); if (description) lines.push(`DESCRIPTION:${icsEsc(description)}`); if (location) lines.push(`LOCATION:${icsEsc(location)}`); if (url) lines.push(`URL:${url}`);
  if (organizer) lines.push(`ORGANIZER;CN=${icsEsc(organizer.split('<')[0].trim() || organizer)}:mailto:${(organizer.match(/<([^>]+)>/) || [, organizer])[1].trim()}`);
  for (const a of attendees) lines.push(`ATTENDEE;CN=${icsEsc(a)};RSVP=TRUE:mailto:${a}`);
  if (rrule) lines.push(`RRULE:${rrule.replace(/^RRULE:/i, '')}`); lines.push(`STATUS:${status}`);
  if (alarmMinutes != null) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, `TRIGGER:-PT${alarmMinutes}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR'); return lines.map(fold).join('\r\n') + '\r\n';
}

// ── Durations ───────────────────────────────────────────────────────────────
export function parseDuration(token) {
  const t = token.trim().toLowerCase(); if (!t) return null;
  let m = t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/); if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0));
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(parseFloat(t) * 3600);
  const re = /(\d+(?:\.\d+)?)\s*(d|days?|h|hrs?|hours?|m|mins?|minutes?|s|secs?|seconds?)/g; let sum = 0, any = false, rest = t; let x;
  while ((x = re.exec(t))) { any = true; const n = parseFloat(x[1]); const u = x[2][0]; sum += u === 'd' ? n * 86400 : u === 'h' ? n * 3600 : u === 'm' ? n * 60 : n; }
  rest = t.replace(re, '').trim(); if (!any || rest) return null; return Math.round(sum);
}
export function evalDurations(expr) {
  const parts = expr.replace(/\s+/g, ' ').trim().match(/[+-]?\s*[^+-]+/g) || []; let total = 0; const items = [];
  parts.forEach((p, i) => { const sign = p.trim().startsWith('-') ? -1 : 1; const body = p.replace(/^[+-]\s*/, ''); const v = parseDuration(body); if (v === null) throw new Error(`Cannot read "${body.trim()}"`); total += sign * v; items.push({ sign, seconds: v }); });
  return { seconds: total, items };
}
export function formatHMS(sec, { days = false } = {}) {
  const neg = sec < 0; let s = Math.abs(Math.round(sec)); const d = days ? Math.floor(s / 86400) : 0; s -= d * 86400; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  return `${neg ? '-' : ''}${d ? d + 'd ' : ''}${h}:${String(m).padStart(2, '0')}${r ? ':' + String(r).padStart(2, '0') : ''}`;
}
export const toDecimalHours = (h, m, s = 0) => Math.round((h + m / 60 + s / 3600) * 10000) / 10000;
export function roundHours(dec, increment = 0, mode = 'nearest') { if (!increment) return dec; const f = { nearest: Math.round, up: Math.ceil, down: Math.floor }[mode]; return f(dec / increment - 1e-9 * (mode === 'up' ? 1 : 0)) * increment; }
export function fromDecimalHours(dec) { const neg = dec < 0; let mins = Math.round(Math.abs(dec) * 60); return { negative: neg, hours: Math.floor(mins / 60), minutes: mins % 60 }; }

// ── Recurring dates ─────────────────────────────────────────────────────────
export function recurringDates({ start, every = 1, unit = 'week', weekdays = [], nth = null, nthWeekdayOf = null, count = 10, until = null, skipWeekends = false, holidaysCountry = 'none' }) {
  const out = []; const hol = holidaysCountry !== 'none' ? holidaySet(holidaysCountry, start, addDays(start, 3650)) : new Map(); const limit = until ? until.getTime() : Infinity;
  const push = d => { if (d.getTime() > limit || out.length >= count) return false; let x = d; if (skipWeekends || hol.size) { while (x.getUTCDay() === 0 || x.getUTCDay() === 6 || hol.has(ymd(x))) x = addDays(x, 1); } out.push(x); return true; };
  if (unit === 'day') { for (let i = 0; out.length < count && i < 5000; i++) if (!push(addDays(start, i * every))) break; }
  else if (unit === 'week') {
    const wds = weekdays.length ? [...weekdays].sort() : [start.getUTCDay()]; const weekStart = addDays(start, -start.getUTCDay());
    outer: for (let w = 0; w < 5000; w++) for (const wd of wds) { const d = addDays(weekStart, w * every * 7 + wd); if (d < start) continue; if (!push(d)) break outer; }
  } else if (unit === 'month') {
    for (let i = 0; out.length < count && i < 2000; i++) {
      const y = start.getUTCFullYear(), m = start.getUTCMonth() + i * every; let d;
      if (nthWeekdayOf) { const [n, wd] = nthWeekdayOf; const mm = ((m % 12) + 12) % 12 + 1, yy = y + Math.floor(m / 12); d = n === -1 ? lastWeekday(yy, mm, wd) : nthWeekday(yy, mm, wd, n); }
      else { const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); d = new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), dim))); }
      if (d < start) continue; if (!push(d)) break;
    }
  } else if (unit === 'year') { for (let i = 0; out.length < count && i < 500; i++) { const d = new Date(Date.UTC(start.getUTCFullYear() + i * every, start.getUTCMonth(), Math.min(start.getUTCDate(), new Date(Date.UTC(start.getUTCFullYear() + i * every, start.getUTCMonth() + 1, 0)).getUTCDate()))); if (!push(d)) break; } }
  return out;
}
export function sprintPlan({ start, sprintDays = 14, count = 6, planningDays = 0, retroDays = 0 }) {
  const out = []; let cur = new Date(start); for (let i = 0; i < count; i++) { let endIdx = 0, days = 0; const s = new Date(cur); let e = new Date(cur); while (days < sprintDays) { if (e.getUTCDay() !== 0 && e.getUTCDay() !== 6) days++; if (days < sprintDays) e = addDays(e, 1); } out.push({ sprint: i + 1, start: ymd(s), end: ymd(e), planning: ymd(s), review: ymd(e), retro: ymd(e) }); cur = addDays(e, 1); while (cur.getUTCDay() === 0 || cur.getUTCDay() === 6) cur = addDays(cur, 1); } return out;
}

/** Arrival in another zone: departure wall clock in depTz plus duration (minutes). */
export function flightArrival({ y, mo, d, h, mi, depTz, arrTz, durationMin }) {
  const dep = zonedToUtc(y, mo, d, h, mi, depTz), arr = dep + durationMin * 60000; const shift = (tzOffsetMinutes(arrTz, arr) - tzOffsetMinutes(depTz, dep)) / 60;
  return { depUtc: dep, arrUtc: arr, arrLocal: localParts(arr, arrTz), shiftHours: shift };
}
/** OKR quarter schedule: kickoff, weekly check-ins, mid-quarter review, final grading. start = Date (UTC). */
export function okrSchedule(start, { weeks = 13, checkinDay = 4 } = {}) {
  const ev = [{ date: start, label: 'Quarter starts: OKR kickoff, objectives and key results final' }]; const dayOf = d => d.getUTCDay();
  let first = new Date(start.getTime() + 7 * 864e5); while (dayOf(first) !== checkinDay) first = new Date(first.getTime() - 864e5);
  if (first < start) first = new Date(first.getTime() + 7 * 864e5);
  for (let w = 1; w < weeks; w++) { const d = new Date(first.getTime() + (w - 1) * 7 * 864e5); if (d < new Date(start.getTime() + weeks * 7 * 864e5)) ev.push({ date: d, label: `Week ${w + 1}: check-in (update confidence, flag risks)` }); }
  const mid = new Date(start.getTime() + Math.floor(weeks / 2) * 7 * 864e5); ev.push({ date: mid, label: 'Mid-quarter review: re-forecast, adjust or drop key results' });
  const end = new Date(start.getTime() + (weeks * 7 - 1) * 864e5); ev.push({ date: new Date(end.getTime() - 4 * 864e5), label: 'Grading: score every key result (0.0–1.0)' }, { date: end, label: 'Quarter ends: retrospective and planning for the next quarter' });
  return ev.sort((a, b) => a.date - b.date);
}
