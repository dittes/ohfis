// textmore.js — readability scores, extractive summary, text similarity and Word-document counts. Pure, unit-tested.

// ── Counting ────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
export const wordsOf = text => text.match(WORD) || [];
/** Split into sentences at . ! ? … and line breaks, without splitting after common abbreviations or decimals. */
export function sentencesOf(text) {
  const t = text.replace(/\r/g, '').replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|z\.B|d\.h|bzw|ca|Nr|Abs|u\.a|tj|tzv|př|atd|np|ul|tzn|m\.in|itd|itp)\./gi, m => m.replace('.', '\u0001')).replace(/(\d)\.(\d)/g, '$1\u0001$2');
  return t.split(/(?<=[.!?…。])["”’)»]*\s+|\n{1,}/).map(s => s.replace(/\u0001/g, '.').trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
}
/** Syllables of one word: vowel groups, with language-specific adjustments (en: silent e; de: diphthongs count once). */
export function syllables(word, lang = 'en') {
  const w = word.toLowerCase().replace(/[^\p{L}]/gu, ''); if (!w) return 0;
  if (lang === 'de') { const m = w.match(/(?:ei|ai|ey|ay|au|eu|äu|oi|ie)|[aeiouyäöü]/g); return Math.max(1, m ? m.length : 1); }
  let g = w.match(/[aeiouyáàâäéèêëíîïóôöúûüůýěąęó]+/g) || []; let n = g.length;
  if (lang === 'en') { if (/(?:[^aeiouy]e|[^aeiouy]es|[^aeiouy]ed)$/.test(w) && !/(?:le|ted|ded)$/.test(w) && n > 1) n--; if (/^(?:[^aeiouy]*)ia|io[nu]$/.test(w) && false) n++; }
  return Math.max(1, n);
}
/** Language-independent and language-specific readability scores. lang: en | de | other. */
export function readability(text, lang = 'en') {
  const words = wordsOf(text), sents = sentencesOf(text); if (!words.length || !sents.length) return null;
  const W = words.length, S = Math.max(1, sents.length), letters = words.join('').length, syl = words.map(w => syllables(w, lang)), SY = syl.reduce((a, b) => a + b, 0);
  const asl = W / S, asw = SY / W, long7 = words.filter(w => w.length > 6).length, complex = syl.filter(n => n >= 3).length, mono = syl.filter(n => n === 1).length;
  const r = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const out = { words: W, sentences: S, letters, syllables: SY, avgSentenceLength: r(asl), avgSyllablesPerWord: r(asw, 2), longWordShare: r(100 * long7 / W),
    lix: r(asl + 100 * long7 / W), ari: r(4.71 * letters / W + 0.5 * asl - 21.43), colemanLiau: r(0.0588 * (100 * letters / W) - 0.296 * (100 * S / W) - 15.8) };
  if (lang === 'en') { out.fleschReadingEase = r(206.835 - 1.015 * asl - 84.6 * asw); out.fleschKincaidGrade = r(0.39 * asl + 11.8 * asw - 15.59); out.gunningFog = r(0.4 * (asl + 100 * complex / W)); out.smog = r(1.043 * Math.sqrt(complex * 30 / S) + 3.1291); }
  if (lang === 'de') { out.amstad = r(180 - asl - 58.5 * asw); const MS = 100 * complex / W, IW = 100 * long7 / W, ES = 100 * mono / W; out.wiener = r(0.1935 * MS + 0.1672 * asl + 0.1297 * IW - 0.0327 * ES - 0.875); }
  out.level = level(out, lang); return out;
}
/** Plain-language level from the main score of the language (or LIX for others). */
export function level(s, lang) {
  if (lang === 'en') { const f = s.fleschReadingEase; return f >= 90 ? 'very easy (about age 11)' : f >= 70 ? 'easy' : f >= 60 ? 'plain English (age 13–15)' : f >= 50 ? 'fairly difficult' : f >= 30 ? 'difficult (college level)' : 'very difficult (academic)'; }
  if (lang === 'de') { const f = s.amstad; return f >= 80 ? 'very easy' : f >= 60 ? 'easy' : f >= 50 ? 'medium' : f >= 30 ? 'difficult' : 'very difficult'; }
  const l = s.lix; return l < 30 ? 'very easy' : l < 40 ? 'easy' : l < 50 ? 'medium' : l < 60 ? 'difficult' : 'very difficult';
}
/** Sentences that are long (over `limit` words), for editing. */
export const longSentences = (text, limit = 25) => sentencesOf(text).map(s => ({ s, n: wordsOf(s).length })).filter(x => x.n > limit).sort((a, b) => b.n - a.n);

// ── Extractive summary ──────────────────────────────────────────────────────
const STOP = {
  en: 'a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your'.split(' '),
  de: 'aber alle allem allen aller alles als also am an ander andere anderen auch auf aus bei bin bis bist da damit dann das dass daß dein deine dem den der des dessen die dies diese diesem diesen dieser dieses doch dort du durch ein eine einem einen einer eines er es etwas euer für hab habe haben hat hatte hier ich ihm ihn ihr ihre im in indem ist ja jede jedem jeden jeder jedes kann kein keine man mehr mein meine mit muss nach nicht noch nun nur ob oder ohne sehr sein seine sich sie sind so solche sollte über um und uns unser unter vom von vor war waren was weil wenn wer werden wie wieder will wir wird wo zu zum zur'.split(' '),
  pl: 'a aby ale bardzo bez bo by być był była było były co czy dla do gdy go i ich ja jak jako je jego jej jest już każdy kiedy która które który których ma mi mnie mogą może my na nad nam nas nie nich nim o od on ona one oni po pod przez przy się są ta tak tam te tego ten to tu tylko u w we wiele z za ze że'.split(' '),
  cs: 'a aby ale ani asi až bez bude by byl byla bylo byly co či další do i já jak jako je jeho její jejich jen jsem jsi jsme jsou jste k kde když která které který ke mezi mi mít mně my na nad nám než ne nebo není než o od on ona oni po pod pro před při s se si své to ta tak také tam ten tento to tu u už v ve však z za ze že'.split(' '),
};
/** Pick the n most important sentences (word-frequency score with a small bonus for early sentences), in original order. */
export function summarize(text, n = 3, lang = 'en') {
  const sents = sentencesOf(text); if (sents.length <= n) return sents;
  const stop = new Set(STOP[lang] || []), freq = new Map();
  for (const w of wordsOf(text.toLowerCase())) if (!stop.has(w) && w.length > 2 && !/^\d+$/.test(w)) freq.set(w, (freq.get(w) || 0) + 1);
  const max = Math.max(1, ...freq.values());
  const scored = sents.map((s, i) => { const ws = wordsOf(s.toLowerCase()).filter(w => freq.has(w)); const score = ws.length ? ws.reduce((a, w) => a + freq.get(w) / max, 0) / Math.sqrt(wordsOf(s).length + 3) : 0; return { s, i, score: score * (1 + (i === 0 ? 0.3 : i < 3 ? 0.1 : 0)) }; });
  return scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s);
}
export const topKeywords = (text, n = 8, lang = 'en') => { const stop = new Set(STOP[lang] || []), f = new Map(); for (const w of wordsOf(text.toLowerCase())) if (!stop.has(w) && w.length > 2 && !/^\d+$/.test(w)) f.set(w, (f.get(w) || 0) + 1); return [...f].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n); };

// ── Similarity ──────────────────────────────────────────────────────────────
const norm = text => wordsOf(text.toLowerCase());
const shingles = (ws, k) => { const s = new Set(); for (let i = 0; i + k <= ws.length; i++) s.add(ws.slice(i, i + k).join(' ')); return s; };
/** Compare two texts: overlap of word sequences (shingles), cosine similarity of word counts, and the shared passages. */
export function similarity(a, b, k = 3, minRun = 5) {
  const A = norm(a), B = norm(b); if (!A.length || !B.length) return null;
  const sa = shingles(A, k), sb = shingles(B, k); let inter = 0; for (const x of sa) if (sb.has(x)) inter++;
  const jaccard = sa.size + sb.size - inter ? inter / (sa.size + sb.size - inter) : 0;
  const ca = new Map(), cb = new Map(); A.forEach(w => ca.set(w, (ca.get(w) || 0) + 1)); B.forEach(w => cb.set(w, (cb.get(w) || 0) + 1));
  let dot = 0, na = 0, nb = 0; for (const [w, c] of ca) { na += c * c; dot += c * (cb.get(w) || 0); } for (const c of cb.values()) nb += c * c;
  // shared runs: maximal word sequences of at least minRun words that appear in both texts
  const idxB = new Map(); B.forEach((w, i) => { (idxB.get(w) ?? idxB.set(w, []).get(w)).push(i); });
  const runs = [], coveredA = new Array(A.length).fill(false);
  for (let i = 0; i < A.length; i++) {
    if (coveredA[i]) continue; let best = 0, bj = -1;
    for (const j of idxB.get(A[i]) || []) { let l = 0; while (i + l < A.length && j + l < B.length && A[i + l] === B[j + l]) l++; if (l > best) { best = l; bj = j; } }
    if (best >= minRun) { runs.push({ text: A.slice(i, i + best).join(' '), words: best, posA: i, posB: bj }); for (let t = i; t < i + best; t++) coveredA[t] = true; i += best - 1; }
  }
  const sharedWords = runs.reduce((n, r) => n + r.words, 0);
  return { wordsA: A.length, wordsB: B.length, jaccard: Math.round(jaccard * 1000) / 10, cosine: Math.round(100 * dot / Math.sqrt(na * nb) * 10) / 10, sharedPassages: runs.sort((x, y) => y.words - x.words), sharedShareOfA: Math.round(1000 * sharedWords / A.length) / 10, sharedShareOfB: Math.round(1000 * sharedWords / B.length) / 10 };
}

// ── Word documents ──────────────────────────────────────────────────────────
const xmlText = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
/** Count text in word/document.xml (given as a string): paragraphs and the text of w:t runs. Tabs and breaks become spaces. */
export function docxTextFromXml(xml) {
  const paras = [];
  for (const p of xml.matchAll(/<w:p\/>|<w:p[ >][\s\S]*?<\/w:p>/g)) { let t = ''; for (const m of p[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(?:tab|br)\b[^>]*\/>/g)) t += m[1] !== undefined ? m[1] : ' '; paras.push(xmlText(t)); }
  return paras;
}
export function docCounts(paragraphs) {
  const text = paragraphs.join('\n'), nonEmpty = paragraphs.filter(p => p.trim()), words = wordsOf(text).length;
  return { paragraphs: nonEmpty.length, words, characters: text.replace(/\n/g, '').length, charactersNoSpaces: text.replace(/\s/g, '').length, sentences: sentencesOf(text).length, readingMinutes: Math.max(words ? 1 : 0, Math.round(words / 200)), speakingMinutes: Math.max(words ? 1 : 0, Math.round(words / 130)), pagesApprox: Math.round(words / 500 * 10) / 10 };
}
