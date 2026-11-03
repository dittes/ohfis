// it.js — encoders, network maths, parsers for IT and web helpers. Pure functions, tested in tests/it.test.mjs.

// ── MD5 (incremental; WebCrypto has no MD5) ─────────────────────────────────
export class MD5 {
  constructor() { this.s = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]; this.buf = new Uint8Array(64); this.n = 0; this.len = 0; }
  static K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
  static R = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  block(b, o) {
    const M = new Uint32Array(16); for (let i = 0; i < 16; i++) M[i] = b[o + i * 4] | b[o + i * 4 + 1] << 8 | b[o + i * 4 + 2] << 16 | b[o + i * 4 + 3] << 24;
    let [a, bb, c, d] = this.s;
    for (let i = 0; i < 64; i++) {
      let f, g; if (i < 16) { f = (bb & c) | (~bb & d); g = i; } else if (i < 32) { f = (d & bb) | (~d & c); g = (5 * i + 1) % 16; } else if (i < 48) { f = bb ^ c ^ d; g = (3 * i + 5) % 16; } else { f = c ^ (bb | ~d); g = (7 * i) % 16; }
      const t = d; d = c; c = bb; const x = (a + f + MD5.K[i] + M[g]) | 0; bb = (bb + ((x << MD5.R[i]) | (x >>> (32 - MD5.R[i])))) | 0; a = t;
    }
    this.s = [(this.s[0] + a) | 0, (this.s[1] + bb) | 0, (this.s[2] + c) | 0, (this.s[3] + d) | 0];
  }
  update(data) {
    let o = 0; this.len += data.length;
    if (this.n) { const take = Math.min(64 - this.n, data.length); this.buf.set(data.subarray(0, take), this.n); this.n += take; o = take; if (this.n === 64) { this.block(this.buf, 0); this.n = 0; } }
    for (; o + 64 <= data.length; o += 64) this.block(data, o);
    if (o < data.length) { this.buf.set(data.subarray(o), 0); this.n = data.length - o; }
    return this;
  }
  hex() {
    const bits = this.len * 8; const pad = new Uint8Array(((this.n < 56 ? 56 : 120) - this.n) + 8); pad[0] = 0x80; const dv = new DataView(pad.buffer); dv.setUint32(pad.length - 8, bits >>> 0, true); dv.setUint32(pad.length - 4, Math.floor(bits / 4294967296), true);
    const keep = this.len; this.update(pad); this.len = keep; return this.s.map(w => [0, 8, 16, 24].map(sh => ((w >>> sh) & 255).toString(16).padStart(2, '0')).join('')).join('');
  }
}
export const md5 = bytes => new MD5().update(typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes).hex();
export const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function digest(algo, bytes) { return toHex(await crypto.subtle.digest(algo, bytes)); }
export async function hmacHex(secret, message, algo = 'SHA-256') { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: algo }, false, ['sign']); return toHex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message))); }

// ── Base64 ──────────────────────────────────────────────────────────────────
export function b64encode(bytes, { url = false, pad = true, lines = 0 } = {}) {
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); let s = btoa(bin);
  if (url) s = s.replace(/\+/g, '-').replace(/\//g, '_'); if (!pad) s = s.replace(/=+$/, ''); if (lines) s = s.replace(new RegExp(`(.{${lines}})`, 'g'), '$1\n').trimEnd(); return s;
}
export function b64decode(str) {
  let s = str.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('This is not valid Base64'); while (s.length % 4) s += '=';
  const bin = atob(s); return Uint8Array.from(bin, c => c.charCodeAt(0));
}
export const sniffMime = b => b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0xFF && b[1] === 0xD8 ? 'image/jpeg' : b[0] === 0x47 && b[1] === 0x49 ? 'image/gif' : b[0] === 0x25 && b[1] === 0x50 ? 'application/pdf' : b[0] === 0x50 && b[1] === 0x4B ? 'application/zip' : (b[0] === 0x52 && b[8] === 0x57) ? 'image/webp' : b[0] === 0x3C ? 'image/svg+xml' : 'application/octet-stream';

// ── Network ─────────────────────────────────────────────────────────────────
export const ipToInt = ip => { const p = ip.trim().split('.'); if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) throw new Error(`"${ip}" is not a valid IPv4 address`); return p.reduce((n, x) => n * 256 + +x, 0); };
export const intToIp = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
export function subnet(input) {
  let ip, bits; const m = input.trim().match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d{1,2})|\s+(\d+\.\d+\.\d+\.\d+))?$/); if (!m) throw new Error('Enter an address like 192.168.1.10/24 or 192.168.1.10 255.255.255.0');
  ip = ipToInt(m[1]); if (m[2] !== undefined) bits = +m[2]; else if (m[3]) { const mk = ipToInt(m[3]); const bin = mk.toString(2).padStart(32, '0'); if (!/^1*0*$/.test(bin)) throw new Error('The subnet mask is not contiguous'); bits = bin.indexOf('0') < 0 ? 32 : bin.indexOf('0'); } else bits = 24;
  if (bits < 0 || bits > 32) throw new Error('The prefix must be between 0 and 32');
  const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0; const net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0, total = 2 ** (32 - bits);
  const hosts = bits >= 31 ? (bits === 32 ? 1 : 2) : total - 2; const first = bits >= 31 ? net : net + 1, last = bits >= 31 ? bc : bc - 1;
  const cls = (ip >>> 24) < 128 ? 'A' : (ip >>> 24) < 192 ? 'B' : (ip >>> 24) < 224 ? 'C' : (ip >>> 24) < 240 ? 'D (multicast)' : 'E (reserved)';
  const priv = [[10, 8], [172 << 24 | 16 << 16, 12], [192 << 24 | 168 << 16, 16]].some(([b, p]) => (ip >>> (32 - p)) === ((b >>> 0) >>> (32 - p))) ? 'private (RFC 1918)' : (ip >>> 24 === 127 ? 'loopback' : (ip >>> 16) === (169 << 8 | 254) ? 'link-local' : ((ip >>> 22) === (100 << 2 | 1)) ? 'shared (CGNAT)' : 'public');
  return { ip: intToIp(ip), bits, mask: intToIp(mask), wildcard: intToIp(~mask >>> 0), network: intToIp(net), broadcast: bits >= 31 ? '—' : intToIp(bc), first: intToIp(first), last: intToIp(last), hosts, total, class: cls, scope: priv, binaryMask: mask.toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1.'), cidr: `${intToIp(net)}/${bits}` };
}
export function splitSubnet(cidr, newBits, limit = 256) {
  const s = subnet(cidr); if (newBits <= s.bits || newBits > 32) throw new Error('The new prefix must be longer than the current one'); const count = 2 ** (newBits - s.bits); const size = 2 ** (32 - newBits); const base = ipToInt(s.network); const out = [];
  for (let i = 0; i < Math.min(count, limit); i++) { const n = subnet(`${intToIp(base + i * size)}/${newBits}`); out.push({ cidr: n.cidr, first: n.first, last: n.last, broadcast: n.broadcast, hosts: n.hosts }); } return { count, subnets: out };
}

// ── Cron ────────────────────────────────────────────────────────────────────
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const LIM = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]], NAMES = [null, null, null, MON, DOW];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function parseCronField(f, idx) {
  const [lo, hi] = LIM[idx]; const set = new Set(); const nameIdx = (t) => { const n = NAMES[idx]; if (n) { const i = n.indexOf(t.toUpperCase()); if (i >= 0) return idx === 3 ? i + 1 : i; } if (!/^\d+$/.test(t)) throw new Error(`"${t}" is not allowed here`); return +t; };
  for (const part of f.split(',')) {
    const [range, stepS] = part.split('/'); const step = stepS === undefined ? 1 : +stepS; if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in "${part}"`);
    let a, b; if (range === '*' || range === '?') { a = lo; b = hi; } else if (range.includes('-')) { const [x, y] = range.split('-'); a = nameIdx(x); b = nameIdx(y); } else { a = nameIdx(range); b = stepS !== undefined ? hi : a; }
    if (idx === 4) { if (a === 7) a = 0; if (b === 7) b = idx === 4 && a === 0 && range === '7' ? 0 : 6; }
    if (a < lo || b > hi || a > b) throw new Error(`"${part}" is outside ${lo}–${hi}`); for (let i = a; i <= b; i += step) set.add(i);
  } return set;
}
export function parseCron(expr) {
  const alias = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' }; const e = (alias[expr.trim().toLowerCase()] || expr).trim().split(/\s+/);
  if (e.length !== 5) throw new Error('A cron expression has 5 fields: minute hour day-of-month month day-of-week');
  const sets = e.map((f, i) => parseCronField(f, i)); return { fields: e, sets, domStar: /^[*?]$/.test(e[2]), dowStar: /^[*?]$/.test(e[4]) };
}
export function cronMatches(c, d) { // d: Date components in the zone being simulated {mi,h,d,mo,wd}
  const [mi, h, dom, mo, dow] = c.sets; if (!mi.has(d.mi) || !h.has(d.h) || !mo.has(d.mo)) return false;
  const domOk = dom.has(d.d), dowOk = dow.has(d.wd); return c.domStar && c.dowStar ? true : c.domStar ? dowOk : c.dowStar ? domOk : domOk || dowOk; // POSIX: either matches when both restricted
}
export function nextRuns(expr, { from = new Date(), count = 5, utc = true } = {}) {
  const c = parseCron(expr); const out = []; let t = new Date(from.getTime()); t.setUTCSeconds(0, 0); t = new Date(t.getTime() + 60000); const limit = from.getTime() + 5 * 366 * 86400000;
  while (out.length < count && t.getTime() < limit) {
    const p = utc ? { mi: t.getUTCMinutes(), h: t.getUTCHours(), d: t.getUTCDate(), mo: t.getUTCMonth() + 1, wd: t.getUTCDay() } : { mi: t.getMinutes(), h: t.getHours(), d: t.getDate(), mo: t.getMonth() + 1, wd: t.getDay() };
    if (!c.sets[3].has(p.mo)) { t = utc ? new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1)) : new Date(t.getFullYear(), t.getMonth() + 1, 1); continue; }
    if (!(c.sets[1].has(p.h))) { t = new Date(t.getTime() + (60 - p.mi) * 60000); continue; }
    if (cronMatches(c, p)) out.push(new Date(t)); t = new Date(t.getTime() + 60000);
  } return out;
}
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0]);
const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a.at(-1);
export function describeCron(expr) {
  const c = parseCron(expr); const [mf, hf, df, monf, dwf] = c.fields; const raw = c.sets.map(s => [...s].sort((a, b) => a - b));
  const every = (f, unit) => { const m = f.match(/^(\*|\d+-\d+)\/(\d+)$/); return m ? `every ${+m[2] === 1 ? unit : m[2] + ' ' + unit + 's'}` : null; };
  let time;
  if (mf === '*' && hf === '*') time = 'every minute'; else if (every(mf, 'minute') && hf === '*') time = every(mf, 'minute'); else if (/^\d+$/.test(mf) && hf === '*') time = +mf === 0 ? 'every hour, on the hour' : `at minute ${mf} of every hour`;
  else if (/^\d+$/.test(mf) && every(hf, 'hour')) time = `at minute ${mf} ${every(hf, 'hour')}`; else if (mf === '*' && /^\d+$/.test(hf)) time = `every minute from ${hf}:00 to ${hf}:59`;
  else if (raw[0].length === 1 && raw[1].length <= 6 && !/[-/]/.test(hf)) time = 'at ' + list(raw[1].map(h => `${String(h).padStart(2, '0')}:${String(raw[0][0]).padStart(2, '0')}`));
  else if (raw[0].length === 1 && /^\d+-\d+$/.test(hf)) time = `at minute ${raw[0][0]} past every hour from ${hf.split('-')[0]}:00 to ${hf.split('-')[1]}:59`; else time = `at minute ${mf}, hour ${hf}`;
  const parts = [time[0].toUpperCase() + time.slice(1)];
  if (!c.domStar) parts.push('on the ' + list(raw[2].map(ord)) + ' of the month'); if (!c.dowStar) { const days = raw[4].map(d => DAYS[d]); parts.push(raw[4].join() === '1,2,3,4,5' ? 'on weekdays' : raw[4].join() === '0,6' ? 'on weekends' : 'on ' + list(days)); }
  if (!c.domStar && !c.dowStar) parts.push('(when both day fields are set, a run happens if EITHER matches)');
  if (monf !== '*') parts.push('in ' + list(raw[3].map(m => MONTHS[m - 1]))); return parts.join(', ').replace(', (', ' (');
}

// ── curl → code ─────────────────────────────────────────────────────────────
export function shellSplit(s) {
  const out = []; let cur = '', q = null, has = false; s = s.replace(/\\\r?\n/g, ' ');
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === q) q = null; else if (ch === '\\' && q === '"' && /["\\$`]/.test(s[i + 1])) cur += s[++i]; else cur += ch; }
    else if (ch === '"' || ch === "'") { q = ch; has = true; } else if (ch === '$' && s[i + 1] === "'") { q = "'"; i++; has = true; } else if (/\s/.test(ch)) { if (has || cur) { out.push(cur); cur = ''; has = false; } } else if (ch === '\\') cur += s[++i] ?? ''; else cur += ch; }
  if (q) throw new Error('Unclosed quote in the command'); if (has || cur) out.push(cur); return out;
}
export function parseCurl(cmd) {
  const t = shellSplit(cmd.trim()); if (!t.length || !/^curl$/i.test(t[0].replace(/^.*\//, ''))) throw new Error('The command must start with curl'); const r = { url: '', method: '', headers: [], data: null, user: null, form: [], insecure: false, follow: false, json: false }; let i = 1;
  const need = f => { if (i + 1 >= t.length) throw new Error(`${f} needs a value`); return t[++i]; };
  for (; i < t.length; i++) { const a = t[i];
    if (a === '-X' || a === '--request') r.method = need(a).toUpperCase(); else if (/^-X./.test(a)) r.method = a.slice(2).toUpperCase(); else if (a === '-H' || a === '--header') { const h = need(a); const k = h.indexOf(':'); if (k > 0) r.headers.push([h.slice(0, k).trim(), h.slice(k + 1).trim()]); }
    else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'].includes(a)) { const v = need(a); r.data = r.data === null ? v : r.data + '&' + v; } else if (a === '--json') { r.data = need(a); r.json = true; r.headers.push(['Content-Type', 'application/json'], ['Accept', 'application/json']); }
    else if (a === '-u' || a === '--user') r.user = need(a); else if (a === '-F' || a === '--form') r.form.push(need(a)); else if (a === '-A' || a === '--user-agent') r.headers.push(['User-Agent', need(a)]); else if (a === '-e' || a === '--referer') r.headers.push(['Referer', need(a)]); else if (a === '-b' || a === '--cookie') r.headers.push(['Cookie', need(a)]);
    else if (a === '-k' || a === '--insecure') r.insecure = true; else if (a === '-L' || a === '--location') r.follow = true; else if (a === '-I' || a === '--head') r.method = 'HEAD'; else if (a === '--url') r.url = need(a); else if (['-s', '-S', '-v', '-i', '-f', '--compressed', '-sS', '-sSL', '-O', '-g'].includes(a)) { if (/L/.test(a)) r.follow = true; } else if (['-o', '--output', '-m', '--max-time', '--connect-timeout', '--retry', '-w', '-x', '--proxy'].includes(a)) need(a);
    else if (!a.startsWith('-') && !r.url) r.url = a; }
  if (!r.url) throw new Error('No URL found in the command'); if (!/^https?:\/\//i.test(r.url)) r.url = 'https://' + r.url; if (!r.method) r.method = r.data !== null || r.form.length ? 'POST' : 'GET';
  if (r.data !== null && !r.headers.some(([k]) => k.toLowerCase() === 'content-type') && !r.form.length) r.headers.push(['Content-Type', 'application/x-www-form-urlencoded']); return r;
}
const js = s => JSON.stringify(s); const py = s => { const r = JSON.stringify(s); return r; };
export function curlToFetch(r) {
  const o = [`method: ${js(r.method)}`]; const hs = [...r.headers]; if (r.user) hs.push(['Authorization', 'Basic ' + (typeof btoa === 'function' ? btoa(r.user) : '')]);
  if (hs.length) o.push(`headers: {\n${hs.map(([k, v]) => `    ${js(k)}: ${js(v)}`).join(',\n')}\n  }`);
  if (r.form.length) o.push('body: formData'); else if (r.data !== null) { let body = js(r.data); try { const j = JSON.parse(r.data); body = `JSON.stringify(${JSON.stringify(j, null, 2).replace(/\n/g, '\n  ')})`; } catch { /* plain */ } o.push(`body: ${body}`); }
  if (r.follow) o.push("redirect: 'follow'");
  const form = r.form.length ? `const formData = new FormData();\n${r.form.map(f => { const k = f.indexOf('='); const v = f.slice(k + 1); return v.startsWith('@') ? `// file upload: formData.append(${js(f.slice(0, k))}, fileInput.files[0]); // ${v}` : `formData.append(${js(f.slice(0, k))}, ${js(v)});`; }).join('\n')}\n\n` : '';
  return `${form}const response = await fetch(${js(r.url)}, {\n  ${o.join(',\n  ')}\n});\n\nif (!response.ok) throw new Error(\`HTTP \${response.status}\`);\nconst data = await response.json(); // or response.text()\nconsole.log(data);`;
}
export function curlToPython(r) {
  const lines = ['import requests', '']; const hs = r.headers; lines.push(`url = ${py(r.url)}`);
  if (hs.length) lines.push(`headers = {\n${hs.map(([k, v]) => `    ${py(k)}: ${py(v)}`).join(',\n')}\n}`);
  let arg = ''; if (r.data !== null) { try { const j = JSON.parse(r.data); lines.push(`payload = ${JSON.stringify(j, null, 4).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None')}`); arg = ', json=payload'; } catch { lines.push(`data = ${py(r.data)}`); arg = ', data=data'; } }
  if (r.form.length) { lines.push(`files = {\n${r.form.map(f => { const k = f.indexOf('='); const v = f.slice(k + 1); return v.startsWith('@') ? `    ${py(f.slice(0, k))}: open(${py(v.slice(1))}, 'rb')` : `    ${py(f.slice(0, k))}: (None, ${py(v)})`; }).join(',\n')}\n}`); arg += ', files=files'; }
  if (r.user) { const [u, ...p] = r.user.split(':'); arg += `, auth=(${py(u)}, ${py(p.join(':'))})`; } if (r.insecure) arg += ', verify=False'; if (r.follow === false) arg += ', allow_redirects=False';
  lines.push('', `response = requests.request(${py(r.method)}, url${hs.length ? ', headers=headers' : ''}${arg})`, 'response.raise_for_status()', 'print(response.text)'); return lines.join('\n');
}

// ── User agents ─────────────────────────────────────────────────────────────
export function parseUA(ua) {
  const r = { browser: 'Unknown', version: '', engine: '', os: 'Unknown', osVersion: '', device: 'Desktop', bot: false, raw: ua }; const m = (re) => ua.match(re);
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|headlesschrome|lighthouse|curl\/|wget\/|python-requests|httpclient/i.test(ua)) { r.bot = true; r.device = 'Bot / script'; const b = m(/(Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Applebot|GPTBot|ClaudeBot|PerplexityBot|facebookexternalhit|Slackbot|Twitterbot|LinkedInBot|HeadlessChrome|curl|Wget|python-requests|Lighthouse)\/?([\d.]*)/i); if (b) { r.browser = b[1]; r.version = b[2]; } }
  let x;
  if ((x = m(/Edg(?:e|A|iOS)?\/([\d.]+)/))) { r.browser = 'Microsoft Edge'; r.version = x[1]; } else if ((x = m(/OPR\/([\d.]+)|Opera\/([\d.]+)/))) { r.browser = 'Opera'; r.version = x[1] || x[2]; } else if ((x = m(/SamsungBrowser\/([\d.]+)/))) { r.browser = 'Samsung Internet'; r.version = x[1]; } else if ((x = m(/Vivaldi\/([\d.]+)/))) { r.browser = 'Vivaldi'; r.version = x[1]; } else if ((x = m(/(?:Firefox|FxiOS)\/([\d.]+)/))) { r.browser = 'Firefox'; r.version = x[1]; } else if ((x = m(/(?:Chrome|CriOS)\/([\d.]+)/))) { r.browser = 'Chrome'; r.version = x[1]; } else if ((x = m(/Version\/([\d.]+).*Safari/)) || (/Safari\//.test(ua) && (x = m(/Safari\/([\d.]+)/)))) { r.browser = 'Safari'; r.version = x[1]; } else if ((x = m(/MSIE ([\d.]+)|Trident\/.*rv:([\d.]+)/))) { r.browser = 'Internet Explorer'; r.version = x[1] || x[2]; }
  if (/Gecko\/\d/.test(ua) && /Firefox/.test(ua)) r.engine = 'Gecko'; else if (/AppleWebKit/.test(ua) && /Chrome|CriOS|Edg|OPR/.test(ua) && !/FxiOS/.test(ua)) r.engine = 'Blink'; else if (/AppleWebKit/.test(ua)) r.engine = 'WebKit'; else if (/Trident/.test(ua)) r.engine = 'Trident';
  if ((x = m(/Windows NT ([\d.]+)/))) { r.os = 'Windows'; r.osVersion = { '10.0': '10 / 11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.1': 'XP' }[x[1]] || x[1]; } else if ((x = m(/Android ([\d.]+)/))) { r.os = 'Android'; r.osVersion = x[1]; } else if ((x = m(/(?:iPhone|CPU) OS ([\d_]+)/)) && /iPhone|iPad|iPod/.test(ua)) { r.os = /iPad/.test(ua) ? 'iPadOS' : 'iOS'; r.osVersion = x[1].replace(/_/g, '.'); } else if ((x = m(/Mac OS X ([\d_.]+)/))) { r.os = 'macOS'; r.osVersion = x[1].replace(/_/g, '.'); } else if (/CrOS/.test(ua)) r.os = 'ChromeOS'; else if (/Linux/.test(ua)) r.os = /Ubuntu/.test(ua) ? 'Ubuntu Linux' : 'Linux';
  if (!r.bot) { if (/iPad|Tablet|Nexus 7|Nexus 9|SM-T\d/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) r.device = 'Tablet'; else if (/Mobi|iPhone|iPod|Android.*Mobile/.test(ua)) r.device = 'Mobile phone'; else if (/SmartTV|Tizen|Web0S|AppleTV|HbbTV/.test(ua)) r.device = 'Smart TV'; }
  const model = m(/;\s*([A-Z][A-Za-z0-9 _-]+)\s+Build\//) || m(/\((?:Linux; )?Android [\d.]+; ([^;)]+)/); if (model && !/^(U|wv)$/.test(model[1])) r.model = model[1].trim(); return r;
}

// ── HTML entities ───────────────────────────────────────────────────────────
export const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', deg: '°', plusmn: '±', micro: 'µ', para: '¶', middot: '·', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', bdquo: '„', ndash: '–', mdash: '—', hellip: '…', bull: '•', times: '×', divide: '÷', frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', hearts: '♥', infin: '∞', ne: '≠', le: '≤', ge: '≥', asymp: '≈', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', pi: 'π', sigma: 'σ', omega: 'ω', Omega: 'Ω', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', aacute: 'á', acirc: 'â', ccedil: 'ç', ntilde: 'ñ', iacute: 'í', oacute: 'ó', uacute: 'ú', oslash: 'ø', aring: 'å', aelig: 'æ', iexcl: '¡', iquest: '¿', shy: '\u00AD', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwj: '\u200D', zwnj: '\u200C', lrm: '\u200E', rlm: '\u200F' };
const REV = Object.fromEntries(Object.entries(ENTITIES).filter(([k]) => !['apos', 'shy', 'ensp', 'emsp', 'thinsp', 'zwj', 'zwnj', 'lrm', 'rlm'].includes(k)).map(([k, v]) => [v, k]));
export function htmlEncode(s, { mode = 'basic', numeric = 'dec' } = {}) {
  const num = cp => numeric === 'hex' ? `&#x${cp.toString(16).toUpperCase()};` : `&#${cp};`;
  return [...s].map(ch => { const cp = ch.codePointAt(0); if (ch === '&') return '&amp;'; if (ch === '<') return '&lt;'; if (ch === '>') return '&gt;'; if (ch === '"') return '&quot;'; if (ch === "'") return '&#39;'; if (mode === 'basic') return ch; if (cp < 128) return ch; if (mode === 'named') return REV[ch] ? `&${REV[ch]};` : num(cp); return num(cp); }).join('');
}
export function htmlDecode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e) => { if (e[0] === '#') { const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); if (!Number.isFinite(cp) || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF) || cp === 0) return '\uFFFD'; return String.fromCodePoint(cp); } if (!m.endsWith(';') && !['amp', 'lt', 'gt', 'quot', 'nbsp', 'copy', 'reg'].includes(e)) return m; return ENTITIES[e] ?? m; });
}

// ── Colours ─────────────────────────────────────────────────────────────────
export function parseColor(input) {
  const s = input.trim().toLowerCase(); let m;
  if ((m = s.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))) { let h = m[1]; if (h.length <= 4) h = [...h].map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return { r: n >> 16, g: n >> 8 & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 }; }
  if ((m = s.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:[\s,/]+([\d.]+%?))?\s*\)$/))) { const c = v => v.endsWith('%') ? Math.round(parseFloat(v) * 2.55) : Math.round(+v); return { r: Math.min(255, c(m[1])), g: Math.min(255, c(m[2])), b: Math.min(255, c(m[3])), a: m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4] }; }
  if ((m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/))) { const c = hslToRgb(+m[1], +m[2], +m[3]); return { ...c, a: m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4] }; }
  if ((m = s.match(/^cmyk\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*\)$/))) { const [c, mm, y, k] = m.slice(1).map(x => +x / 100); return { r: Math.round(255 * (1 - c) * (1 - k)), g: Math.round(255 * (1 - mm) * (1 - k)), b: Math.round(255 * (1 - y) * (1 - k)), a: 1 }; }
  if (NAMED[s]) return parseColor(NAMED[s]); throw new Error('Enter a colour like #2557D6, rgb(37 87 214), hsl(223 70% 48%) or cmyk(83 59 0 16)');
}
const NAMED = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080', grey: '#808080', cyan: '#00ffff', magenta: '#ff00ff', navy: '#000080', teal: '#008080', lime: '#00ff00', maroon: '#800000', olive: '#808000', silver: '#c0c0c0', brown: '#a52a2a', gold: '#ffd700', coral: '#ff7f50', salmon: '#fa8072', tomato: '#ff6347', indigo: '#4b0082', violet: '#ee82ee', turquoise: '#40e0d0', crimson: '#dc143c', rebeccapurple: '#663399' };
export function hslToRgb(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) }; }
export function rgbToHsl({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; const l = (max + min) / 2; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); if (d) { if (max === r) h = ((g - b) / d + 6) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; } return { h, s: s * 100, l: l * 100 }; }
export function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; const hsl = rgbToHsl({ r: r * 255, g: g * 255, b: b * 255 }); return { h: hsl.h, s: max === 0 ? 0 : d / max * 100, v: max * 100 }; }
export function rgbToCmyk({ r, g, b }) { const k = 1 - Math.max(r, g, b) / 255; if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }; const c = (1 - r / 255 - k) / (1 - k), m = (1 - g / 255 - k) / (1 - k), y = (1 - b / 255 - k) / (1 - k); return { c: c * 100, m: m * 100, y: y * 100, k: k * 100 }; }
export const rgbToHex = ({ r, g, b, a = 1 }, withAlpha = false) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase() + (withAlpha || a < 1 ? alphaToHex(a) : '');
export const alphaToHex = a => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0').toUpperCase();
export const hexToAlpha = h => parseInt(h, 16) / 255;
export function formats(c) { const hsl = rgbToHsl(c), hsv = rgbToHsv(c), cmyk = rgbToCmyk(c), r1 = x => Math.round(x), r2 = x => Math.round(x * 10) / 10; return { hex: rgbToHex({ ...c, a: 1 }), hexa: rgbToHex(c, true), rgb: `rgb(${c.r} ${c.g} ${c.b}${c.a < 1 ? ` / ${r2(c.a * 100) / 100}` : ''})`, hsl: `hsl(${r1(hsl.h)} ${r1(hsl.s)}% ${r1(hsl.l)}%${c.a < 1 ? ` / ${r2(c.a * 100) / 100}` : ''})`, hsv: `hsv(${r1(hsv.h)}, ${r1(hsv.s)}%, ${r1(hsv.v)}%)`, cmyk: `cmyk(${r1(cmyk.c)}%, ${r1(cmyk.m)}%, ${r1(cmyk.y)}%, ${r1(cmyk.k)}%)` }; }
export const luminance = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrast = (a, b) => { const l1 = luminance(a), l2 = luminance(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

// ── IDs and numbers ─────────────────────────────────────────────────────────
export function uuidv4() { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 0x0f | 0x40; b[8] = b[8] & 0x3f | 0x80; return fmtUuid(b); }
export function uuidv7(now = Date.now()) { const b = crypto.getRandomValues(new Uint8Array(16)); let t = BigInt(now); for (let i = 5; i >= 0; i--) { b[i] = Number(t & 0xffn); t >>= 8n; } b[6] = b[6] & 0x0f | 0x70; b[8] = b[8] & 0x3f | 0x80; return fmtUuid(b); }
const fmtUuid = b => { const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
export const uuidTime = u => { const h = u.replace(/-/g, '').slice(0, 12); return parseInt(h, 16); };
export function convertBase(str, from, to) {
  const s = str.trim().toLowerCase().replace(/^[-+]/, m => '').replace(/^(0x|0b|0o)/, ''); const neg = str.trim().startsWith('-'); if (!s) return ''; const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, from);
  let n = 0n; for (const ch of s.replace(/[_\s]/g, '')) { const d = digits.indexOf(ch); if (d < 0) throw new Error(`"${ch}" is not a base-${from} digit`); n = n * BigInt(from) + BigInt(d); } return (neg ? '-' : '') + n.toString(to);
}
export const basicAuth = (u, p) => 'Basic ' + b64encode(new TextEncoder().encode(`${u}:${p}`));
export function queryString(pairs, { plusForSpace = false, skipEmpty = true, arrays = 'repeat' } = {}) {
  const enc = s => { const e = encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()); return plusForSpace ? e.replace(/%20/g, '+') : e; };
  const groups = new Map(); for (const [k, v] of pairs) { if (skipEmpty && (k === '' || (v === '' && k === ''))) continue; if (k === '') continue; (groups.get(k) || groups.set(k, []).get(k)).push(v); }
  const out = []; for (const [k, vs] of groups) { if (arrays === 'comma') out.push(`${enc(k)}=${vs.map(enc).join(',')}`); else if (arrays === 'brackets' && vs.length > 1) vs.forEach(v => out.push(`${enc(k)}%5B%5D=${enc(v)}`)); else vs.forEach(v => out.push(`${enc(k)}=${enc(v)}`)); } return out.join('&');
}
export function cacheBust(url, { param = 'v', mode = 'timestamp' } = {}) { const u = new URL(url); const v = mode === 'timestamp' ? String(Date.now()) : mode === 'random' ? Math.random().toString(36).slice(2, 10) : mode; u.searchParams.set(param, v); return u.toString(); }

// ── Email headers ───────────────────────────────────────────────────────────
export function parseHeaders(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n'); const hs = []; for (const l of lines) { if (/^[ \t]/.test(l) && hs.length) hs.at(-1)[1] += ' ' + l.trim(); else { const i = l.indexOf(':'); if (i > 0 && /^[\w-]+$/.test(l.slice(0, i))) hs.push([l.slice(0, i), l.slice(i + 1).trim()]); } } return hs;
}
export function analyzeEmail(raw) {
  const hs = parseHeaders(raw); if (!hs.length) throw new Error('No email headers found. Paste the full original headers.'); const get = n => hs.filter(([k]) => k.toLowerCase() === n.toLowerCase()).map(x => x[1]);
  const hops = get('Received').reverse().map(v => { const date = v.split(';').at(-1).trim(); const t = Date.parse(date); return { by: (v.match(/\bby\s+([^\s(;]+)/i) || [])[1] || '', from: (v.match(/\bfrom\s+([^\s(;]+)/i) || [])[1] || '', ip: (v.match(/\[([0-9a-f:.]+)\]/i) || [])[1] || '', with: (v.match(/\bwith\s+([A-Za-z0-9]+)/i) || [])[1] || '', date, time: Number.isNaN(t) ? null : t }; });
  hops.forEach((h, i) => { h.delay = i && h.time !== null && hops[i - 1].time !== null ? Math.round((h.time - hops[i - 1].time) / 1000) : null; });
  const auth = get('Authentication-Results').join(' ; '); const pick = k => (auth.match(new RegExp(`\\b${k}=(\\w+)`, 'i')) || [])[1]?.toLowerCase() || (k === 'spf' ? (get('Received-SPF')[0] || '').split(/\s/)[0].toLowerCase() : '') || 'not found';
  const addr = s => (s.match(/<([^>]+)>/) || [, s.trim()])[1].toLowerCase(); const from = get('From')[0] || '', rp = get('Return-Path')[0] || '', reply = get('Reply-To')[0] || ''; const dom = a => (a.split('@')[1] || '').replace(/>$/, '');
  const flags = []; if (pick('spf') === 'fail' || pick('spf') === 'softfail') flags.push('SPF did not pass: the sending server is not authorised for the domain.'); if (pick('dkim') === 'fail') flags.push('DKIM signature failed: the message may have been altered.'); if (pick('dmarc') === 'fail') flags.push('DMARC failed: the From domain does not align with SPF or DKIM.');
  if (rp && from && dom(addr(rp)) && dom(addr(from)) && dom(addr(rp)) !== dom(addr(from))) flags.push(`Return-Path domain (${dom(addr(rp))}) differs from the From domain (${dom(addr(from))}). Normal for mailing services, suspicious otherwise.`); if (reply && from && dom(addr(reply)) !== dom(addr(from))) flags.push(`Reply-To (${addr(reply)}) goes to a different domain than From (${addr(from)}).`);
  const total = hops.length > 1 && hops[0].time !== null && hops.at(-1).time !== null ? Math.round((hops.at(-1).time - hops[0].time) / 1000) : null;
  return { subject: get('Subject')[0] || '', from, to: get('To')[0] || '', date: get('Date')[0] || '', messageId: get('Message-ID')[0] || '', hops, spf: pick('spf'), dkim: pick('dkim'), dmarc: pick('dmarc'), flags, totalSeconds: total, headers: hs };
}

// ── X.509 (PEM/DER) ─────────────────────────────────────────────────────────
function readTLV(b, o) { const tag = b[o]; let len = b[o + 1], p = o + 2; if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = len * 256 + b[p++]; } return { tag, start: p, end: p + len, next: p + len }; }
const children = (b, t) => { const out = []; let o = t.start; while (o < t.end) { const c = readTLV(b, o); out.push(c); o = c.next; } return out; };
const OIDS = { '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '1.2.840.113549.1.9.1': 'emailAddress' };
const oid = (b, t) => { const bytes = b.subarray(t.start, t.end); const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40]; let v = 0; for (let i = 1; i < bytes.length; i++) { v = v * 128 + (bytes[i] & 0x7f); if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; } } return parts.join('.'); };
const str = (b, t) => new TextDecoder(t.tag === 0x1e ? 'utf-16be' : 'utf-8').decode(b.subarray(t.start, t.end));
const name = (b, t) => children(b, t).flatMap(rdn => children(b, rdn)).map(atv => { const [o, v] = children(b, atv); return `${OIDS[oid(b, o)] || oid(b, o)}=${str(b, v)}`; });
const time = (b, t) => { const s = str(b, t); const m = t.tag === 0x17 ? s.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/) : s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/); if (!m) throw new Error('Unreadable certificate date'); let y = +m[1]; if (t.tag === 0x17) y += y >= 50 ? 1900 : 2000; return new Date(Date.UTC(y, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))); };
export function parseCertificate(pem) {
  const m = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/); if (!m) throw new Error('Paste a certificate in PEM format (-----BEGIN CERTIFICATE-----)');
  const der = b64decode(m[1]); const cert = readTLV(der, 0); const tbs = children(der, cert)[0]; let kids = children(der, tbs); if (kids[0].tag === 0xa0) kids = kids.slice(1); const [serial, sigAlg, issuer, validity, subject, spki, ...rest] = kids; const [nb, na] = children(der, validity);
  const sans = []; const ext = rest.find(t => t.tag === 0xa3); if (ext) for (const e of children(der, children(der, ext)[0])) { const [id, ...vals] = children(der, e); if (oid(der, id) === '2.5.29.17') { const octet = vals.at(-1); const seq = readTLV(der, octet.start); for (const g of children(der, seq)) if (g.tag === 0x82) sans.push(new TextDecoder().decode(der.subarray(g.start, g.end))); else if (g.tag === 0x87) sans.push([...der.subarray(g.start, g.end)].join('.')); } }
  const sa = { '1.2.840.113549.1.1.11': 'SHA-256 with RSA', '1.2.840.113549.1.1.12': 'SHA-384 with RSA', '1.2.840.10045.4.3.2': 'ECDSA with SHA-256', '1.2.840.10045.4.3.3': 'ECDSA with SHA-384', '1.2.840.113549.1.1.5': 'SHA-1 with RSA (weak)' }[oid(der, children(der, sigAlg)[0])] || oid(der, children(der, sigAlg)[0]);
  return { subject: name(der, subject).join(', '), issuer: name(der, issuer).join(', '), notBefore: time(der, nb), notAfter: time(der, na), serial: toHex(der.subarray(serial.start, serial.end)), sans, signature: sa };
}

// ── robots.txt and sitemaps ─────────────────────────────────────────────────
export function validateRobots(text) {
  const issues = []; const groups = []; let cur = null; const known = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host', 'clean-param', 'noindex']); const sitemaps = [];
  text.split(/\r?\n/).forEach((raw, i) => { const line = raw.replace(/#.*/, '').trim(); if (!line) { return; } const k = line.indexOf(':'); if (k < 1) { issues.push({ line: i + 1, level: 'error', msg: `Not a "field: value" line: "${raw.trim()}"` }); return; } const field = line.slice(0, k).trim().toLowerCase(), val = line.slice(k + 1).trim();
    if (!known.has(field)) issues.push({ line: i + 1, level: 'warn', msg: `Unknown directive "${line.slice(0, k).trim()}" (crawlers ignore it)` });
    if (field === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val); if (!val) issues.push({ line: i + 1, level: 'error', msg: 'User-agent is empty' }); }
    else if (field === 'sitemap') { sitemaps.push(val); if (!/^https?:\/\/\S+$/i.test(val)) issues.push({ line: i + 1, level: 'error', msg: 'Sitemap must be a full URL starting with http:// or https://' }); }
    else if (['allow', 'disallow', 'crawl-delay', 'noindex'].includes(field)) { if (!cur) { issues.push({ line: i + 1, level: 'error', msg: `"${field}" appears before any User-agent line` }); return; } cur.rules.push([field, val]); if ((field === 'allow' || field === 'disallow') && val && !/^[/*]/.test(val)) issues.push({ line: i + 1, level: 'error', msg: `Path "${val}" should start with / or *` }); if (field === 'crawl-delay' && !/^\d+(\.\d+)?$/.test(val)) issues.push({ line: i + 1, level: 'error', msg: 'crawl-delay must be a number (Google ignores it)' }); if (field === 'noindex') issues.push({ line: i + 1, level: 'warn', msg: 'noindex in robots.txt is not supported by Google; use a meta robots tag' }); } });
  if (!groups.length) issues.push({ line: 0, level: 'error', msg: 'No User-agent group found' }); if (!sitemaps.length) issues.push({ line: 0, level: 'info', msg: 'No Sitemap line. Adding one helps crawlers find your pages.' });
  for (const g of groups) if (g.rules.some(([f, v]) => f === 'disallow' && v === '/') && g.agents.includes('*')) issues.push({ line: 0, level: 'warn', msg: 'Disallow: / for all agents blocks the whole site from crawling.' });
  return { groups, sitemaps, issues };
}
export function buildRobots({ agents = [{ ua: '*', disallow: [], allow: [] }], sitemaps = [], blockAI = false }) {
  const out = []; for (const a of agents) { out.push(`User-agent: ${a.ua}`); if (!a.disallow.length && !a.allow.length) out.push('Disallow:'); a.allow.forEach(p => out.push(`Allow: ${p}`)); a.disallow.forEach(p => out.push(`Disallow: ${p}`)); out.push(''); }
  if (blockAI) for (const b of ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Bytespider']) out.push(`User-agent: ${b}`, 'Disallow: /', ''); sitemaps.forEach(s => out.push(`Sitemap: ${s}`)); return out.join('\n').trim() + '\n';
}
