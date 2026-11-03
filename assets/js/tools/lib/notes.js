// notes.js — passwords, encrypted notes, JWTs, QR payloads, PERT, draws and tree layout. Pure functions with injectable randomness.
import { secureRandom } from './text.js';
import { b64encode, b64decode } from './it.js';

// ── Passwords ───────────────────────────────────────────────────────────────
export const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.<>?/' };
const AMBIG = /[Il1O0o|`'"\s]/g;
export function passwordPool(o) { const sets = []; for (const k of ['lower', 'upper', 'digits', 'symbols']) if (o[k]) { let chars = k === 'symbols' && o.symbolSet ? o.symbolSet : SETS[k]; if (o.excludeAmbiguous) chars = chars.replace(AMBIG, ''); if (chars) sets.push(chars); } return sets; }
export function generatePassword(o, rand = secureRandom) {
  const sets = passwordPool(o); if (!sets.length) throw new Error('Select at least one kind of character'); const len = Math.max(sets.length, Math.min(512, Math.floor(o.length || 16)));
  const all = sets.join(''); const out = []; if (o.requireEach !== false) for (const s of sets) out.push(s[rand(s.length)]);
  while (out.length < len) out.push(all[rand(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rand(i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out.join('');
}
export const entropyBits = (length, pool) => length * Math.log2(pool);
export function crackTime(bits, guessesPerSecond = 1e10) { const s = Math.pow(2, bits - 1) / guessesPerSecond; if (s < 1) return 'instantly'; const u = [[31557600 * 1e9, 'billion years'], [31557600 * 1e6, 'million years'], [31557600 * 1000, 'thousand years'], [31557600, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']]; for (const [d, n] of u) if (s >= d) return `${s / d >= 100 ? Math.round(s / d).toLocaleString('en-US') : (s / d).toFixed(1)} ${n}`; return 'instantly'; }
export const strengthLabel = bits => bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'good' : bits < 110 ? 'strong' : 'excellent';
export function passphrase({ words = 5, sep = '-', capitalize = false, number = false, list }, rand = secureRandom) {
  if (!list?.length) throw new Error('Word list missing'); const w = Array.from({ length: Math.max(2, Math.min(20, words)) }, () => { const x = list[rand(list.length)]; return capitalize ? x[0].toUpperCase() + x.slice(1) : x; }); if (number) w[rand(w.length)] += String(rand(10));
  return { text: w.join(sep), bits: w.length * Math.log2(list.length) + (number ? Math.log2(10 * w.length) : 0) };
}

// ── Encrypted notes (AES-GCM; key in a separate part or derived from a password) ──
const b64u = b => b64encode(b, { url: true, pad: false });
const unb64u = s => b64decode(s);
export async function encryptNote(text, { password = null } = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); let key, keyOut = null, salt = null;
  if (password) { salt = crypto.getRandomValues(new Uint8Array(16)); key = await deriveKey(password, salt); } else { const raw = crypto.getRandomValues(new Uint8Array(32)); key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']); keyOut = b64u(raw); }
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
  return { payload: ['v1', password ? 'p' : 'k', b64u(iv), b64u(ct), salt ? b64u(salt) : ''].join('.'), key: keyOut };
}
async function deriveKey(password, salt) { const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function decryptNote(payload, secret) {
  const [v, mode, iv, ct, salt] = payload.split('.'); if (v !== 'v1' || !ct) throw new Error('This is not an OHFIS encrypted note'); let key;
  try { if (mode === 'p') key = await deriveKey(secret, unb64u(salt)); else key = await crypto.subtle.importKey('raw', unb64u(secret), 'AES-GCM', false, ['decrypt']); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, key, unb64u(ct)); return new TextDecoder().decode(pt); } catch { throw new Error('Wrong key or password, or the note was changed'); }
}

// ── JWT ─────────────────────────────────────────────────────────────────────
export function decodeJWT(token) {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.'); if (parts.length < 2 || parts.length > 3) throw new Error('A JWT has three parts separated by dots: header.payload.signature');
  const read = (s, name) => { try { return JSON.parse(new TextDecoder().decode(b64decode(s))); } catch { throw new Error(`The ${name} is not valid Base64URL-encoded JSON`); } };
  const header = read(parts[0], 'header'), payload = read(parts[1], 'payload'); const now = Date.now() / 1000; const claims = [];
  const when = (k, label) => { if (typeof payload[k] === 'number') claims.push({ claim: k, label, iso: new Date(payload[k] * 1000).toISOString(), delta: payload[k] - now }); };
  when('iat', 'Issued at'); when('nbf', 'Not valid before'); when('exp', 'Expires'); const warnings = [];
  if (String(header.alg).toLowerCase() === 'none') warnings.push('alg is "none": the token is unsigned and must never be trusted.'); if (!parts[2] && String(header.alg).toLowerCase() !== 'none') warnings.push('The signature part is missing.');
  const status = typeof payload.exp === 'number' ? (payload.exp < now ? 'expired' : typeof payload.nbf === 'number' && payload.nbf > now ? 'not yet valid' : 'valid (time claims)') : 'no expiry claim'; if (status === 'no expiry claim') warnings.push('No exp claim: this token never expires.');
  return { header, payload, signature: parts[2] || '', claims, status, warnings, signingInput: `${parts[0]}.${parts[1]}` };
}
export async function verifyHS(token, secret) {
  const d = decodeJWT(token); const alg = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }[d.header.alg]; if (!alg) throw new Error(`Only HS256, HS384 and HS512 can be verified here (this token uses ${d.header.alg}).`);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: alg }, false, ['sign']); const sig = b64u(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(d.signingInput)))); return sig === d.signature;
}
export const relTime = s => { const a = Math.abs(s); const [n, u] = a < 60 ? [Math.round(a), 'second'] : a < 3600 ? [Math.round(a / 60), 'minute'] : a < 86400 ? [Math.round(a / 3600), 'hour'] : [Math.round(a / 86400), 'day']; return `${n} ${u}${n === 1 ? '' : 's'} ${s < 0 ? 'ago' : 'from now'}`; };

// ── QR payloads ─────────────────────────────────────────────────────────────
const BS = String.fromCharCode(92); // backslash
const wesc = s => String(s).replace(new RegExp('([' + BS + BS + ';,:"])', 'g'), BS + '$1');
export const wifiPayload = ({ ssid, password = '', type = 'WPA', hidden = false }) => { if (!ssid) throw new Error('Enter the network name (SSID)'); if (type !== 'nopass' && !password) throw new Error('Enter the Wi-Fi password, or choose "No password"'); return `WIFI:T:${type === 'nopass' ? 'nopass' : type};S:${wesc(ssid)};${type === 'nopass' ? '' : `P:${wesc(password)};`}${hidden ? 'H:true;' : ''};`; };
const vesc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1');
export function vcardPayload(c) {
  if (!c.first && !c.last && !c.org) throw new Error('Enter at least a name or a company'); const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vesc(c.last)};${vesc(c.first)};;;`, `FN:${vesc([c.first, c.last].filter(Boolean).join(' ') || c.org)}`];
  if (c.org) L.push(`ORG:${vesc(c.org)}`); if (c.title) L.push(`TITLE:${vesc(c.title)}`); if (c.phone) L.push(`TEL;TYPE=WORK,VOICE:${c.phone.replace(/[^\d+]/g, '')}`); if (c.mobile) L.push(`TEL;TYPE=CELL:${c.mobile.replace(/[^\d+]/g, '')}`); if (c.email) L.push(`EMAIL;TYPE=INTERNET:${c.email}`); if (c.url) L.push(`URL:${c.url}`);
  if (c.street || c.city || c.zip || c.country) L.push(`ADR;TYPE=WORK:;;${vesc(c.street)};${vesc(c.city)};;${vesc(c.zip)};${vesc(c.country)}`); if (c.note) L.push(`NOTE:${vesc(c.note)}`); L.push('END:VCARD'); return L.join('\r\n');
}
export const mailtoPayload = ({ to, subject = '', body = '' }) => `mailto:${to}${subject || body ? '?' : ''}${[subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&')}`;
export const smsPayload = ({ number, body = '' }) => `SMSTO:${number.replace(/[^\d+]/g, '')}:${body}`;

// ── Markdown ────────────────────────────────────────────────────────────────
export const ghSlug = t => t.toLowerCase().trim().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
export function tocFromMarkdown(md, { minLevel = 1, maxLevel = 3, bullet = '-', numbered = false, indent = 2 } = {}) {
  const lines = md.split(/\r?\n/); let fence = null; const used = new Map(); const items = [];
  for (const line of lines) { const f = line.match(/^\s*(```+|~~~+)/); if (f) { fence = fence ? (f[1][0] === fence[0] ? null : fence) : f[1]; continue; } if (fence) continue; const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/); if (!m) continue; const level = m[1].length; if (level < minLevel || level > maxLevel) continue;
    const text = m[2].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim(); let slug = ghSlug(text); const n = used.get(slug) || 0; used.set(slug, n + 1); if (n) slug += `-${n}`; items.push({ level, text, slug }); }
  if (!items.length) return { text: '', items };
  const base = Math.min(...items.map(i => i.level)); const counters = []; const text = items.map(i => { const d = i.level - base; counters.length = d + 1; counters[d] = (counters[d] || 0) + 1; for (let k = 0; k < d; k++) counters[k] ||= 1; return `${' '.repeat(d * indent)}${numbered ? `${counters[d]}.` : bullet} [${i.text}](#${i.slug})`; }).join('\n'); return { text, items };
}

// ── Estimation and draws ────────────────────────────────────────────────────
export function pertTask({ o, m, p }) { if (!(o <= m && m <= p)) throw new Error('Values must satisfy optimistic ≤ most likely ≤ pessimistic'); const e = (o + 4 * m + p) / 6, sd = (p - o) / 6; return { expected: e, sd, variance: sd * sd, triangular: (o + m + p) / 3 }; }
export function normalCdf(x) { if (x < -8) return 0; if (x > 8) return 1; let sum = x, term = x; for (let i = 3; i < 400; i += 2) { term *= x * x / i; sum += term; if (Math.abs(term) < 1e-17) break; } return 0.5 + sum * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); } // Marsaglia (2004), error below 1e-14
export function pertProject(tasks) { const rows = tasks.map(pertTask); const expected = rows.reduce((s, r) => s + r.expected, 0), variance = rows.reduce((s, r) => s + r.variance, 0), sd = Math.sqrt(variance); const z = { 68: 1, 80: 1.2816, 90: 1.6449, 95: 1.96, 99: 2.5758 }; return { rows, expected, sd, intervals: Object.fromEntries(Object.entries(z).map(([k, v]) => [k, [expected - v * sd, expected + v * sd]])), probabilityBy: d => sd ? normalCdf((d - expected) / sd) : (d >= expected ? 1 : 0), percentile: pc => expected + ({ 50: 0, 75: 0.6745, 80: 0.8416, 85: 1.0364, 90: 1.2816, 95: 1.6449, 99: 2.3263 }[pc] ?? 0) * sd }; }
export function secretSanta(names, { exclude = [], rand = secureRandom, tries = 2000 } = {}) {
  if (names.length < 2) throw new Error('Add at least two people'); const forbid = new Set(exclude.map(([a, b]) => `${a}\u0000${b}`)); const ok = (a, b) => a !== b && !forbid.has(`${a}\u0000${b}`);
  for (let t = 0; t < tries; t++) { const pool = [...names]; for (let i = pool.length - 1; i > 0; i--) { const j = rand(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; } const map = {}; let good = true; const left = new Set(pool); const order = [...names].sort(() => rand(3) - 1); for (const g of order) { const options = [...left].filter(r => ok(g, r)); if (!options.length) { good = false; break; } const r = options[rand(options.length)]; map[g] = r; left.delete(r); } if (good) return map; }
  throw new Error('No valid assignment exists with these exclusions. Remove some exclusions or add people.');
}
export function seedOrder(n) { let order = [1]; while (order.length < n) { const next = order.length * 2; order = order.flatMap(s => [s, next + 1 - s]); } return order; }
export function singleElimination(entrants) {
  const n = entrants.length; if (n < 2) throw new Error('Add at least two entrants'); const size = 2 ** Math.ceil(Math.log2(n)); const order = seedOrder(size); const slots = order.map(s => s <= n ? { name: entrants[s - 1], seed: s } : null); const rounds = []; let cur = []; for (let i = 0; i < size; i += 2) cur.push({ a: slots[i], b: slots[i + 1] }); rounds.push(cur);
  while (cur.length > 1) { const next = []; for (let i = 0; i < cur.length; i += 2) next.push({ a: null, b: null, from: [i, i + 1] }); rounds.push(next); cur = next; }
  rounds[0].forEach((m, i) => { if (!m.b || !m.a) { const adv = m.a || m.b; m.bye = true; const target = rounds[1]?.[Math.floor(i / 2)]; if (target) target[i % 2 ? 'b' : 'a'] = adv; } }); return { size, byes: size - n, matches: n - 1, rounds };
}
export function roundRobin(teams) { const t = teams.length % 2 ? [...teams, null] : [...teams]; const n = t.length; const rounds = []; for (let r = 0; r < n - 1; r++) { const m = []; for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a !== null && b !== null) m.push(r % 2 && i === 0 ? [b, a] : [a, b]); } rounds.push(m); t.splice(1, 0, t.pop()); } return rounds; }

// ── Tree layout (org chart) ─────────────────────────────────────────────────
export function layoutTree(roots, { nodeW = 150, nodeH = 44, gapX = 24, gapY = 48 } = {}) {
  const forest = roots.length === 1 ? roots[0] : { text: '', children: roots, virtual: true }; const nodes = [], edges = []; let leaf = 0;
  const place = (n, depth) => { const kids = n.children.map(c => place(c, depth + 1)); const x = kids.length ? (kids[0].x + kids.at(-1).x) / 2 : leaf++ * (nodeW + gapX); const node = { text: n.text, x, y: depth * (nodeH + gapY), depth, virtual: n.virtual }; nodes.push(node); for (const k of kids) edges.push([node, k]); return node; };
  const root = place(forest, forest.virtual ? -1 : 0); const real = nodes.filter(n => !n.virtual); const minX = Math.min(...real.map(n => n.x)), maxX = Math.max(...real.map(n => n.x)), maxY = Math.max(...real.map(n => n.y)), minY = Math.min(...real.map(n => n.y));
  return { nodes: real.map(n => ({ ...n, x: n.x - minX, y: n.y - minY })), edges: edges.filter(([a]) => !a.virtual).map(([a, b]) => [{ x: a.x - minX, y: a.y - minY }, { x: b.x - minX, y: b.y - minY }]), width: maxX - minX + nodeW, height: maxY - minY + nodeH, nodeW, nodeH };
}
