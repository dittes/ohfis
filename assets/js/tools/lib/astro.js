// astro.js — sunrise/sunset (NOAA solar equations) and moon phases (Meeus, "Astronomical Algorithms" ch. 49). Accurate to about a minute (sun) and a few minutes (moon).
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI, DAY = 86400000;
const jdOf = ms => ms / DAY + 2440587.5;

function sunPosition(T) {
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(om));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60, eps = eps0 + 0.00256 * Math.cos(rad(om));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lam)))), y = Math.tan(rad(eps / 2)) ** 2;
  const eq = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { decl, eq };
}
/** Times (as Date, UTC instants) for a calendar day at lat/lon (degrees, east positive). zenith 90.833 = sunrise/sunset, 96 civil, 102 nautical, 108 astronomical. */
export function sunTimes(y, m, d, lat, lon, zenith = 90.833) {
  const base = Date.UTC(y, m - 1, d); let noonMin = 720 - 4 * lon;
  for (let i = 0; i < 3; i++) { const T = (jdOf(base + noonMin * 60000) - 2451545) / 36525, { eq } = sunPosition(T); noonMin = 720 - 4 * lon - eq; }
  const T = (jdOf(base + noonMin * 60000) - 2451545) / 36525, { decl, eq } = sunPosition(T); noonMin = 720 - 4 * lon - eq;
  const cosH = Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
  const at = min => new Date(base + min * 60000), noon = at(noonMin);
  if (cosH > 1) return { noon, sunrise: null, sunset: null, polar: 'night', dayMinutes: 0, declination: decl };
  if (cosH < -1) return { noon, sunrise: null, sunset: null, polar: 'day', dayMinutes: 1440, declination: decl };
  const H = deg(Math.acos(cosH)); return { noon, sunrise: at(noonMin - 4 * H), sunset: at(noonMin + 4 * H), polar: null, dayMinutes: 8 * H, declination: decl };
}

const SYN = 29.530588861;
/** Moon phase event (kind 'new' or 'full') number k (k=0 is the new moon of 6 Jan 2000; full moons use k+0.5). Returns epoch ms (UT, ΔT ignored). */
export function moonEvent(k, kind) {
  const kk = kind === 'full' ? Math.floor(k) + 0.5 : Math.floor(k), T = kk / 1236.85, E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = rad(2.5534 + 29.1053567 * kk - 0.0000014 * T * T), Mp = rad(201.5643 + 385.81693528 * kk + 0.0107582 * T * T), F = rad(160.7108 + 390.67050284 * kk - 0.0016118 * T * T), Om = rad(124.7746 - 1.56375588 * kk + 0.0020672 * T * T);
  const f = kind === 'full' ? [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209] : [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208];
  let jde = 2451550.09766 + SYN * kk + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  jde += f[0] * Math.sin(Mp) + f[1] * E * Math.sin(M) + f[2] * Math.sin(2 * Mp) + f[3] * Math.sin(2 * F) + f[4] * E * Math.sin(Mp - M) + f[5] * E * Math.sin(Mp + M) + f[6] * E * E * Math.sin(2 * M) - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M) - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F) - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(Om);
  return (jde - 2440587.5) * DAY;
}
const kOf = ms => Math.floor((ms / DAY + 2440587.5 - 2451550.09766) / SYN);
/** All new and full moons between two instants, sorted. */
export function moonEvents(fromMs, toMs) {
  const out = []; for (let k = kOf(fromMs) - 2; k <= kOf(toMs) + 2; k++) for (const kind of ['new', 'full']) { const ms = moonEvent(k, kind); if (ms >= fromMs && ms <= toMs) out.push({ kind, ms }); } return out.sort((a, b) => a.ms - b.ms);
}
export const PHASE_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
/** Elongation of the moon from the sun in degrees (0 = new, 180 = full), from truncated series (error well under 1°). */
export function elongation(ms) {
  const T = (jdOf(ms) - 2451545) / 36525, mod = x => ((x % 360) + 360) % 360;
  const Lm = 218.3164477 + 481267.88123421 * T, D = rad(297.8501921 + 445267.1114034 * T), M = rad(357.5291092 + 35999.0502909 * T), Mp = rad(134.9633964 + 477198.8675055 * T), F = rad(93.272095 + 483202.0175233 * T);
  const lonMoon = Lm + 6.289 * Math.sin(Mp) + 1.274 * Math.sin(2 * D - Mp) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * Mp) - 0.186 * Math.sin(M) - 0.114 * Math.sin(2 * F) + 0.059 * Math.sin(2 * D - 2 * Mp) + 0.057 * Math.sin(2 * D - M - Mp) + 0.053 * Math.sin(2 * D + Mp) + 0.046 * Math.sin(2 * D - M) + 0.041 * Math.sin(Mp - M) - 0.035 * Math.sin(D) - 0.03 * Math.sin(Mp + M);
  const Ls = 280.46646 + 36000.76983 * T + (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M);
  return mod(lonMoon - Ls);
}
/** Age (days since the last new moon), phase 0..1, illuminated fraction and name at an instant. */
export function moonStatus(ms) {
  const psi = elongation(ms), phase = psi / 360, illum = (1 - Math.cos(rad(psi))) / 2; const i = Math.floor(phase * 8 + 0.5) % 8;
  let k = kOf(ms) + 1; let prev = moonEvent(k, 'new'); while (prev > ms) prev = moonEvent(--k, 'new'); const next = moonEvent(k + 1, 'new');
  return { age: (ms - prev) / DAY, phase, illumination: illum, name: PHASE_NAMES[i], lastNew: prev, nextNew: next };
}
