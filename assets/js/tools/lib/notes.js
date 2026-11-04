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
  const [v, mode, iv, ct, salt] = payload.split('.'); if (v !== 'v1' || !ct) throw new Error('This is not an Ohfis encrypted note'); let key;
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

// ---------- Braille (Grade 1, English) ----------
const BR_LETTERS = { a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5], u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6] };
const cell = dots => String.fromCharCode(0x2800 + dots.reduce((s, d) => s + (1 << (d - 1)), 0));
const BR_PUNCT = { ',': [2], ';': [2, 3], ':': [2, 5], '.': [2, 5, 6], '!': [2, 3, 5], '?': [2, 3, 6], "'": [3], '-': [3, 6], '"': [2, 3, 6], '(': [5, 2, 3, 6], ')': [5, 3, 4, 5] };
const NUM_SIGN = cell([3, 4, 5, 6]), CAP_SIGN = cell([6]);
const BR_MAP = new Map(), BR_REV = new Map();
for (const [c, d] of Object.entries(BR_LETTERS)) { BR_MAP.set(c, cell(d)); BR_REV.set(cell(d), c); }
for (const [c, d] of Object.entries(BR_PUNCT)) { BR_MAP.set(c, d.length === 4 && c === '(' ? cell([5]) + cell([1, 2, 6]) : c === ')' ? cell([5]) + cell([3, 4, 5]) : cell(d)); }
/** Text → Unicode braille (uncontracted). Numbers use the number sign, capitals the capital sign (⠠, doubled for words in capitals). */
export function toBraille(text) {
  let out = '', numMode = false; const s = String(text).normalize('NFC');
  for (const m of s.matchAll(/[\p{L}\p{M}]+|\d+|\s+|./gsu)) {
    const tok = m[0];
    if (/^\d/.test(tok)) { out += (numMode ? '' : NUM_SIGN); for (const ch of tok) out += BR_MAP.get('abcdefghij'[+ch === 0 ? 9 : +ch - 1]); numMode = true; continue; }
    numMode = false;
    if (/^\s+$/.test(tok)) { out += tok.replace(/[^\S\n]/g, '⠀'); continue; }
    if (/^\p{L}/u.test(tok)) { const letters = [...tok.normalize('NFD').replace(/[̀-ͯ]/g, '')].filter(c => /[a-zA-Z]/.test(c)); const allCaps = letters.length > 1 && letters.every(c => c === c.toUpperCase()); if (allCaps) out += CAP_SIGN + CAP_SIGN; for (const [i, c] of letters.entries()) { if (!allCaps && c !== c.toLowerCase()) out += CAP_SIGN; out += BR_MAP.get(c.toLowerCase()); void i; } continue; }
    out += tok === '’' ? BR_MAP.get("'") : tok === '“' || tok === '”' ? BR_MAP.get('"') : BR_MAP.get(tok) ?? '⠿';
  }
  return out;
}
/** Unicode braille → text (uncontracted grade 1). */
export function fromBraille(br) {
  let out = '', num = false, cap = 0; const letterOf = ch => BR_REV.get(ch);
  for (const ch of String(br)) {
    if (ch === '⠀') { out += ' '; num = false; cap = 0; continue; } if (ch === '\n') { out += ch; num = false; cap = 0; continue; }
    if (ch === NUM_SIGN) { num = true; continue; } if (ch === CAP_SIGN) { cap++; continue; }
    const l = letterOf(ch);
    if (l) { if (num && 'abcdefghij'.includes(l)) { out += String('abcdefghij'.indexOf(l) + 1).slice(-1) === '0' ? '0' : ((('abcdefghij'.indexOf(l) + 1) % 10)); continue; } num = false; out += cap ? l.toUpperCase() : l; if (cap === 1) cap = 0; continue; }
    num = false; const p = [...Object.entries(BR_PUNCT)].find(([, d]) => cell(d) === ch && d.length < 4); out += p ? p[0] : ch; if (cap === 1) cap = 0;
  }
  return out;
}

// ---------- Brain dump organiser (rule based) ----------
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const DATE_RE = new RegExp(`\\b(today|tonight|tomorrow|next week|this week|end of (?:the )?(?:day|week|month|quarter|year)|eod|eow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?|\\d{4}-\\d{2}-\\d{2}|(?:${MONTHS})[a-z]*\\.? \\d{1,2}|\\d{1,2}(?:st|nd|rd|th)? (?:${MONTHS})[a-z]*)\\b`, 'i');
const TASK_RE = /^(?:[-*•\d.)\s]*)?(?:to ?do:?|task:?|need to|have to|must|should|remember to|don'?t forget(?: to)?|make sure|call|email|e-mail|send|write|book|buy|order|pay|schedule|fix|finish|prepare|review|update|check|ask|follow up|clean|plan|renew|cancel|submit|print|sign|reply|organi[sz]e|pick up|set up)\b/i;
const IDEA_RE = /\b(idea|what if|maybe|could we|we could|might|brainstorm|perhaps|how about)\b/i;
const WORRY_RE = /\b(worr(?:y|ied|ies)|afraid|anxious|risk|problem|issue|stuck|blocked|concern(?:ed)?|scared|nervous|deadline|late|behind)\b/i;
const URGENT_RE = /\b(urgent|asap|immediately|right away|critical|overdue|today|tonight|!{2,})/i;
/** Split a messy dump into lines/sentences and sort into groups. */
export function organizeBrainDump(text) {
  const items = String(text).replace(/\r/g, '').split(/\n+|(?<=[.!?])\s+(?=[A-ZÄÖÜŁŚŻČŘŠŽ])/).map(l => l.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(l => l.length > 1);
  const groups = { urgent: [], tasks: [], deadlines: [], questions: [], ideas: [], worries: [], notes: [] }; const people = new Set();
  for (const it of items) {
    for (const m of it.matchAll(/@([\p{L}][\p{L}\d._-]*)/gu)) people.add(m[1]); for (const m of it.matchAll(/\b(?:ask|tell|email|call|ping|remind|meet(?: with)?|with|from|for) ([A-ZÄÖÜŁŚŻČŘŠŽ][\p{L}]+)(?=[\s,.!?]|$)/gu)) people.add(m[1]);
    const urgent = URGENT_RE.test(it), date = DATE_RE.exec(it)?.[0] || null; let g = 'notes';
    if (/^(what if|how about|could we|we could|maybe|perhaps)\b/i.test(it)) g = 'ideas'; else if (/\?\s*$/.test(it)) g = 'questions'; else if (IDEA_RE.test(it)) g = 'ideas'; else if (TASK_RE.test(it)) g = 'tasks'; else if (WORRY_RE.test(it)) g = 'worries'; else if (date) g = 'tasks';
    const row = { text: it, date, urgent }; groups[g].push(row); if (urgent && g !== 'urgent') groups.urgent.push(row); if (date && (g === 'tasks')) groups.deadlines.push(row);
  }
  return { groups, people: [...people].sort(), count: items.length };
}
export function brainDumpMarkdown(r) {
  const T = { urgent: '🔥 Urgent', tasks: '✅ Tasks', deadlines: '📅 With a date', questions: '❓ Questions', ideas: '💡 Ideas', worries: '⚠️ Worries and risks', notes: '📝 Notes' }; const out = [];
  for (const [k, title] of Object.entries(T)) { const rows = r.groups[k]; if (!rows.length) continue; out.push(`## ${title}`, ...rows.map(x => k === 'tasks' || k === 'urgent' || k === 'deadlines' ? `- [ ] ${x.text}${x.date && !x.text.toLowerCase().includes(x.date.toLowerCase()) ? ` (${x.date})` : ''}` : `- ${x.text}`), ''); }
  if (r.people.length) out.push('## 👥 People mentioned', r.people.join(', '), ''); return out.join('\n').trim() + '\n';
}

// ---------- Webhook signatures ----------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function hmac(secret, msg, hash = 'SHA-256') { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash }, false, ['sign']); return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)); }
export async function webhookSignatures(secret, body, { timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const h1 = hex(await hmac(secret, body)), h1b = b64(await hmac(secret, body)), stripe = hex(await hmac(secret, `${timestamp}.${body}`)), slack = hex(await hmac(secret, `v0:${timestamp}:${body}`)), sha1 = hex(await hmac(secret, body, 'SHA-1')), sha512 = hex(await hmac(secret, body, 'SHA-512'));
  return { hex: h1, base64: h1b, github: `sha256=${h1}`, githubSha1: `sha1=${sha1}`, stripe: `t=${timestamp},v1=${stripe}`, slack: `v0=${slack}`, sha512, timestamp };
}
/** Constant-time comparison of two strings. */
export function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

// ---------- Rich text → clean HTML (needs a DOM: pass document.implementation or use in the browser) ----------
const KEEP = new Set(['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'hr', 's']);
const MAP = { b: 'strong', i: 'em', strike: 's', del: 's', div: 'p' };
export function cleanHtml(html, { keepLinks = true, keepTables = true, keepHeadings = true, doc = globalThis.document } = {}) {
  const src = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html'); const out = doc.createElement('div');
  const walk = (node, parent) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { parent.append(doc.createTextNode(n.nodeValue.replace(/ /g, ' '))); continue; } if (n.nodeType !== 1) continue;
      let tag = n.tagName.toLowerCase(); if (['script', 'style', 'meta', 'link', 'head', 'title', 'noscript', 'iframe', 'object', 'embed', 'svg', 'img', 'canvas', 'video', 'audio', 'button', 'input', 'form', 'select', 'textarea'].includes(tag)) continue;
      const st = (n.getAttribute('style') || '').toLowerCase(); let wrap = null;
      if (tag === 'span' || tag === 'font') { const b = /font-weight:\s*(bold|[6-9]00)/.test(st), i = /font-style:\s*italic/.test(st), u = /text-decoration[^;]*underline/.test(st); let host = parent; const mk = t => { const e = doc.createElement(t); host.append(e); host = e; }; if (b) mk('strong'); if (i) mk('em'); if (u) mk('u'); walk(n, host); continue; }
      tag = MAP[tag] || tag;
      if ((tag === 'a' && !keepLinks) || (/^h[1-6]$/.test(tag) && !keepHeadings) || (/^(table|thead|tbody|tr|th|td)$/.test(tag) && !keepTables)) { if (/^h[1-6]$/.test(tag)) { const p = doc.createElement('p'); const s = doc.createElement('strong'); p.append(s); parent.append(p); walk(n, s); } else walk(n, parent); continue; }
      if (!KEEP.has(tag)) { walk(n, parent); continue; }
      const el = doc.createElement(tag); if (tag === 'a') { const href = n.getAttribute('href') || ''; if (/^(https?:|mailto:|tel:)/i.test(href)) el.setAttribute('href', href); else { walk(n, parent); continue; } } if ((tag === 'th' || tag === 'td') && n.getAttribute('colspan')) el.setAttribute('colspan', n.getAttribute('colspan'));
      wrap = el; parent.append(el); walk(n, el);
    }
  };
  walk(src.body, out);
  for (const p of [...out.querySelectorAll('p,li,td,th,strong,em,u')]) if (!p.textContent.trim() && !p.querySelector('br,table,ul,ol')) p.remove();
  return out.innerHTML.replace(/<p><\/p>/g, '').replace(/(<\/(?:p|li|ul|ol|table|tr|h\d|blockquote)>)(?=<)/g, '$1\n').trim();
}
