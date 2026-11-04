// devtools.js — JSON, XML, YAML helpers, regex testing, minifiers and lorem ipsum. Pure functions, unit-tested.

// ── JSON ────────────────────────────────────────────────────────────────────
/** Remove // and /* comments and trailing commas (JSON5-style input) without touching strings. */
export function stripJsonExtras(src) {
  let out = '', i = 0, inStr = false, q = '';
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (inStr) { out += c; if (c === '\\') { out += n ?? ''; i += 2; continue; } if (c === q) inStr = false; i++; continue; }
    if (c === '"') { inStr = true; q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}
/** Find the first syntax error of a JSON text with our own small parser (engines differ in what they report): { line, col, message }. */
export function jsonErrorPosition(text) {
  let i = 0; const n = text.length;
  const fail = (message, at = i) => { const before = text.slice(0, at).split('\n'); const e = new Error(message); e.pos = at; e.line = before.length; e.col = before.at(-1).length + 1; throw e; };
  const ws = () => { while (i < n && /[ \t\r\n]/.test(text[i])) i++; };
  const show = () => i >= n ? 'the end of the text' : `"${text[i]}"`;
  function value() {
    ws(); const c = text[i];
    if (c === '{') { i++; ws(); if (text[i] === '}') { i++; return; } for (;;) { ws(); if (text[i] !== '"') fail(text[i] === '}' ? 'Trailing comma: remove the comma before "}"' : `Expected a property name in quotes, found ${show()}`); string(); ws(); if (text[i] !== ':') fail(`Expected ":" after the property name, found ${show()}`); i++; value(); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === '}') { i++; return; } fail(`Expected "," or "}", found ${show()}`); } }
    if (c === '[') { i++; ws(); if (text[i] === ']') { i++; return; } for (;;) { ws(); if (text[i] === ']') fail('Trailing comma: remove the comma before "]"'); value(); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === ']') { i++; return; } fail(`Expected "," or "]", found ${show()}`); } }
    if (c === '"') return string();
    const m = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 400)); if (m) { i += m[0].length; return; }
    if (i >= n) fail('Unexpected end of the text: something is not closed'); fail(`Unexpected ${show()}; expected a value (string, number, true, false, null, object or array)`);
  }
  function string() { const start = i; i++; while (i < n && text[i] !== '"') { if (text[i] === '\n') fail('Line break inside a string; use \\n instead', i); if (text[i] === '\\') { i++; if (!/["\\/bfnrtu]/.test(text[i] ?? '')) fail('Invalid escape sequence', i); if (text[i] === 'u' && !/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail('Invalid \\u escape', i); } i++; } if (i >= n) fail('Unterminated string', start); i++; }
  try { value(); ws(); if (i < n) fail(`Unexpected ${show()} after the end of the JSON value`); } catch (e) { if (e.pos === undefined) throw e; return { line: e.line, col: e.col, message: e.message }; }
  return { line: 1, col: 1, message: 'Invalid JSON' };
}
const sortDeep = v => Array.isArray(v) ? v.map(sortDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map(k => [k, sortDeep(v[k])])) : v;
/** Format, minify or validate JSON. opts: { indent: 2 | 4 | 'tab', sortKeys, minify, lenient }. Returns { ok, text, stats } or { ok:false, error }. */
export function formatJson(text, { indent = 2, sortKeys = false, minify = false, lenient = false } = {}) {
  if (!text.trim()) return { ok: false, error: { line: 1, col: 1, message: 'Enter some JSON first.' } };
  const src = lenient ? stripJsonExtras(text) : text; let v;
  try { v = JSON.parse(src); } catch { return { ok: false, error: jsonErrorPosition(src) }; }
  if (sortKeys) v = sortDeep(v);
  const out = minify ? JSON.stringify(v) : JSON.stringify(v, null, indent === 'tab' ? '\t' : Number(indent));
  return { ok: true, text: out, stats: jsonStats(v, out) };
}
export function jsonStats(v, out = '') {
  let keys = 0, depth = 0, values = 0; const walk = (x, d) => { depth = Math.max(depth, d); if (Array.isArray(x)) x.forEach(y => walk(y, d + 1)); else if (x && typeof x === 'object') { for (const k of Object.keys(x)) { keys++; walk(x[k], d + 1); } } else values++; };
  walk(v, 1); return { keys, depth, values, bytes: new TextEncoder().encode(out).length, type: Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v };
}

// ── XML (small, dependency-free) ────────────────────────────────────────────
const XML_ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const xmlDecode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : XML_ENT[e] ?? m);
export const xmlEscape = (s, attr = false) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(attr ? /"/g : /(?!)/g, '&quot;');
/** Parse XML into { name, attrs, children: [node | string] }. Throws with a line number on malformed input. */
export function parseXml(src) {
  let i = 0; const stack = []; let root = null; const line = () => src.slice(0, i).split('\n').length;
  const fail = m => { throw new Error(`${m} (line ${line()})`); };
  const add = node => { if (stack.length) stack.at(-1).children.push(node); else if (typeof node === 'string') { if (node.trim()) fail('Text outside the root element'); } else { if (root) fail('More than one root element'); root = node; } };
  while (i < src.length) {
    if (src[i] !== '<') { const j = src.indexOf('<', i); const raw = src.slice(i, j < 0 ? src.length : j); if (stack.length) { if (raw.trim() || stack.at(-1).children.length === 0 && false) add(xmlDecode(raw)); else if (raw && stack.at(-1).preserve) add(raw); } else if (raw.trim()) { fail('Text outside the root element'); } i = j < 0 ? src.length : j; continue; }
    if (src.startsWith('<!--', i)) { const j = src.indexOf('-->', i); if (j < 0) fail('Unclosed comment'); i = j + 3; continue; }
    if (src.startsWith('<![CDATA[', i)) { const j = src.indexOf(']]>', i); if (j < 0) fail('Unclosed CDATA'); add(src.slice(i + 9, j)); i = j + 3; continue; }
    if (src.startsWith('<?', i)) { const j = src.indexOf('?>', i); if (j < 0) fail('Unclosed declaration'); i = j + 2; continue; }
    if (src.startsWith('<!', i)) { const j = src.indexOf('>', i); if (j < 0) fail('Unclosed declaration'); i = j + 1; continue; }
    if (src[i + 1] === '/') { const j = src.indexOf('>', i); if (j < 0) fail('Unclosed tag'); const name = src.slice(i + 2, j).trim(); const top = stack.pop(); if (!top || top.name !== name) fail(`Closing tag </${name}> does not match <${top?.name ?? 'nothing'}>`); if (!stack.length) root = root || top; i = j + 1; continue; }
    const m = /^<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/.exec(src.slice(i, i + 20000)); if (!m) fail('Malformed tag');
    const node = { name: m[1], attrs: {}, children: [] }; for (const a of m[2].matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) node.attrs[a[1]] = xmlDecode(a[3] ?? a[4]);
    if (stack.length) stack.at(-1).children.push(node); else { if (root) fail('More than one root element'); root = node; }
    i += m[0].length; if (!m[3]) stack.push(node);
  }
  if (stack.length) fail(`Missing closing tag </${stack.at(-1).name}>`); if (!root) throw new Error('No XML element found');
  return root;
}
/** XML tree → plain JS value: attributes as "@name", text as "#text", repeated elements as arrays. */
export function xmlToValue(node) {
  const textOnly = node.children.every(c => typeof c === 'string'), hasAttrs = Object.keys(node.attrs).length;
  const text = node.children.filter(c => typeof c === 'string').join('').trim();
  if (textOnly && !hasAttrs) return text === '' ? '' : text;
  const o = {}; for (const [k, v] of Object.entries(node.attrs)) o['@' + k] = v;
  for (const c of node.children) { if (typeof c === 'string') continue; const v = xmlToValue(c); if (c.name in o) { if (!Array.isArray(o[c.name])) o[c.name] = [o[c.name]]; o[c.name].push(v); } else o[c.name] = v; }
  if (text && !textOnly) o['#text'] = text; else if (text) o['#text'] = text;
  return o;
}
export const xmlToJson = xml => { const r = parseXml(xml); return { [r.name]: xmlToValue(r) }; };
const xmlName = k => /^[A-Za-z_][\w.\-]*$/.test(k) ? k : 'item';
/** Plain value → XML text (inverse of xmlToValue). A top-level object with one key uses it as the root; otherwise root = "root". */
export function valueToXml(v, { indent = 2, declaration = true } = {}) {
  const pad = n => ' '.repeat(indent * n), lines = [];
  const emit = (name, val, d) => {
    if (Array.isArray(val)) { for (const x of val) emit(name, x, d); return; }
    if (val === null || val === undefined) { lines.push(`${pad(d)}<${name}/>`); return; }
    if (typeof val !== 'object') { lines.push(`${pad(d)}<${name}>${xmlEscape(val)}</${name}>`); return; }
    const attrs = Object.entries(val).filter(([k]) => k[0] === '@').map(([k, x]) => ` ${xmlName(k.slice(1))}="${xmlEscape(x, true)}"`).join(''), kids = Object.entries(val).filter(([k]) => k[0] !== '@' && k !== '#text'), text = val['#text'];
    if (!kids.length) { lines.push(text !== undefined ? `${pad(d)}<${name}${attrs}>${xmlEscape(text)}</${name}>` : `${pad(d)}<${name}${attrs}/>`); return; }
    lines.push(`${pad(d)}<${name}${attrs}>`); if (text !== undefined) lines.push(`${pad(d + 1)}${xmlEscape(text)}`); for (const [k, x] of kids) emit(xmlName(k), x, d + 1); lines.push(`${pad(d)}</${name}>`);
  };
  const keys = v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).filter(k => k[0] !== '@' && k !== '#text') : [];
  if (keys.length === 1 && !Array.isArray(v[keys[0]]) && Object.keys(v).length === 1) emit(xmlName(keys[0]), v[keys[0]], 0); else emit('root', v, 0);
  return (declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '') + lines.join('\n') + '\n';
}

// ── Regex tester ────────────────────────────────────────────────────────────
/** All matches with index, groups and line/col. Throws a readable error for an invalid pattern. Limits the number of matches. */
export function findMatches(pattern, flags, text, limit = 1000) {
  let re; try { re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); } catch (e) { throw new Error(String(e.message).replace(/^Invalid regular expression: /, '')); }
  const out = []; let m;
  while ((m = re.exec(text)) && out.length < limit) {
    const before = text.slice(0, m.index).split('\n');
    out.push({ index: m.index, end: m.index + m[0].length, text: m[0], line: before.length, col: before.at(-1).length + 1, groups: [...m].slice(1), named: m.groups ? { ...m.groups } : {} });
    if (m[0] === '') re.lastIndex++;
  }
  return { matches: out, truncated: out.length >= limit };
}
export const replaceAll = (pattern, flags, text, rep) => { const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); return text.replace(re, rep); };

// ── Minifiers ───────────────────────────────────────────────────────────────
export function minifyCss(css) {
  const strings = []; let s = css.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, m => { strings.push(m); return `\u0000${strings.length - 1}\u0000`; });
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>~+])\s*/g, '$1').replace(/;}/g, '}').replace(/(^|[^0-9])0(px|em|rem|%|pt)\b/g, '$10').replace(/\b0\.(\d)/g, '.$1').replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3\b/g, '#$1$2$3').trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => strings[+i]);
}
export function minifyHtml(html) {
  const keep = []; let s = html.replace(/<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi, m => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  s = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/>\s+</g, '> <').replace(/\s{2,}/g, ' ').replace(/\n+/g, ' ').replace(/ ?(<\/?(?:html|head|body|div|p|ul|ol|li|table|tr|td|th|thead|tbody|section|article|header|footer|nav|main|h[1-6]|meta|link|title|br|hr|form|script|style)\b[^>]*>) ?/gi, '$1').trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => minifyEmbedded(keep[+i]));
}
const minifyEmbedded = block => block.replace(/^(<style\b[^>]*>)([\s\S]*?)(<\/style>)$/i, (_, a, b, c) => a + minifyCss(b) + c);
export const minifyJson = text => JSON.stringify(JSON.parse(stripJsonExtras(text)));
export const savings = (before, after) => ({ before: new TextEncoder().encode(before).length, after: new TextEncoder().encode(after).length });

// ── Lorem ipsum ─────────────────────────────────────────────────────────────
const LATIN = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida duis ac tellus et risus vulputate vehicula donec lobortis risus a elit etiam tempor ut ullamcorper ligula eu tempor congue eros est euismod turpis id tincidunt sapien risus a quam maecenas fermentum consequat mi donec fermentum pellentesque malesuada nulla a mi duis sapien sem aliquet sed gravida'.split(' ');
export function seededRandom(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** unit: words | sentences | paragraphs. classicStart begins with "Lorem ipsum dolor sit amet". */
export function lorem({ unit = 'paragraphs', count = 3, classicStart = true, seed = 1 } = {}) {
  const rnd = seededRandom(seed), pick = () => LATIN[Math.floor(rnd() * LATIN.length)], cap = s => s[0].toUpperCase() + s.slice(1);
  const sentence = (first) => { const n = 6 + Math.floor(rnd() * 12), w = []; if (first) w.push(...'lorem ipsum dolor sit amet'.split(' ')); while (w.length < n) w.push(pick()); const withCommas = w.map((x, i) => i > 2 && i < w.length - 2 && rnd() < 0.08 ? x + ',' : x); return cap(withCommas.join(' ')).replace(/,$/, '') + '.'; };
  const n = Math.max(1, Math.min(1000, Math.floor(count)));
  if (unit === 'words') { const w = []; if (classicStart) w.push(...'lorem ipsum dolor sit amet consectetur adipiscing elit'.split(' ')); while (w.length < n) w.push(pick()); return cap(w.slice(0, n).join(' ')) + '.'; }
  if (unit === 'sentences') return Array.from({ length: n }, (_, i) => sentence(classicStart && i === 0)).join(' ');
  return Array.from({ length: n }, (_, p) => Array.from({ length: 3 + Math.floor(rnd() * 4) }, (_, i) => sentence(classicStart && p === 0 && i === 0)).join(' ')).join('\n\n');
}

// ── Markdown → HTML (CommonMark subset + GitHub tables/task lists). Raw HTML is escaped, so the output is safe to show. ──
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = u => /^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(u.trim()) ? esc(u.trim()) : '#';
export function mdInline(src) {
  const codes = []; let s = String(src).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => { codes.push(`<code>${esc(c.trim())}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, u) => /^https?:/i.test(u) ? `<img src="${safeUrl(u)}" alt="${alt}">` : alt)
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, t, u, ti) => `<a href="${safeUrl(u.replace(/&amp;/g, '&'))}"${ti ? ` title="${ti}"` : ''}>${t}</a>`)
    .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>').replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/ {2,}\n/g, '<br>\n');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}
export function markdownToHtml(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n'), out = []; let i = 0;
  const isTableSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l || '') && (l || '').includes('-');
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const listItem = l => /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(l);
  function parseList(indent) {
    const first = listItem(lines[i]), ordered = /\d/.test(first[2]), items = [];
    while (i < lines.length) {
      const m = listItem(lines[i]); if (!m || m[1].length < indent || m[1].length > indent + 1 && m[1].length !== indent) { if (m && m[1].length > indent) { const sub = parseList(m[1].length); items[items.length - 1] += sub; continue; } break; }
      if (/\d/.test(m[2]) !== ordered) break; let text = m[3]; i++;
      const task = /^\[([ xX])\]\s+(.*)$/.exec(text); let body = task ? `<input type="checkbox" disabled${task[1] !== ' ' ? ' checked' : ''}> ${mdInline(task[2])}` : mdInline(text);
      while (i < lines.length && lines[i].trim() && !listItem(lines[i]) && /^\s+\S/.test(lines[i])) { body += ' ' + mdInline(lines[i].trim()); i++; }
      items.push(body);
    }
    return `<${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${x}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
  }
  while (i < lines.length) {
    const l = lines[i]; let m;
    if (!l.trim()) { i++; continue; }
    if ((m = /^(`{3,}|~{3,})\s*([\w+-]*)\s*$/.exec(l))) { const body = []; i++; while (i < lines.length && !lines[i].startsWith(m[1])) body.push(lines[i++]); i++; out.push(`<pre><code${m[2] ? ` class="language-${esc(m[2])}"` : ''}>${esc(body.join('\n'))}\n</code></pre>`); continue; }
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (l.includes('|') && isTableSep(lines[i + 1])) { const head = cells(l), al = cells(lines[i + 1]).map(c => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : ''); i += 2; const rows = []; while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++])); const td = (t, k, c) => `<${t}${al[k] ? ` style="text-align:${al[k]}"` : ''}>${mdInline(c ?? '')}</${t}>`; out.push(`<table><thead><tr>${head.map((c, k) => td('th', k, c)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, k) => td('td', k, r[k])).join('')}</tr>`).join('')}</tbody></table>`); continue; }
    if (/^\s{0,3}>/.test(l)) { const q = []; while (i < lines.length && /^\s{0,3}>/.test(lines[i])) q.push(lines[i++].replace(/^\s{0,3}>\s?/, '')); out.push(`<blockquote>${markdownToHtml(q.join('\n'))}</blockquote>`); continue; }
    if (listItem(l)) { out.push(parseList(listItem(l)[1].length)); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|`{3}|~{3}|\s{0,3}>|\s{0,3}([-*_])(\s*\2){2,}\s*$)/.test(lines[i]) && !listItem(lines[i]) && !(lines[i].includes('|') && isTableSep(lines[i + 1]))) para.push(lines[i++]);
    if (!para.length) { out.push(`<p>${mdInline(l)}</p>`); i++; } else out.push(`<p>${mdInline(para.join('\n'))}</p>`);
  }
  return out.join('\n');
}
