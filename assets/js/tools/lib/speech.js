// speech.js — helpers for reading text aloud with the browser's speech synthesis.
/** Split text into chunks of at most `max` characters at sentence ends (then commas, then spaces).
 *  Browsers stop long utterances (Chrome after ~15 s), so reading in chunks is more reliable. */
export function splitForSpeech(text, max = 200) {
  const sentences = String(text).replace(/\r/g, '').split(/(?<=[.!?…。！？])\s+|\n+/).map(s => s.trim()).filter(Boolean), out = [];
  const pushLong = s => { while (s.length > max) { let cut = Math.max(s.lastIndexOf(', ', max), s.lastIndexOf('; ', max), s.lastIndexOf(': ', max)); if (cut < max * 0.4) cut = s.lastIndexOf(' ', max); if (cut < max * 0.2) cut = max; out.push(s.slice(0, cut + 1).trim()); s = s.slice(cut + 1).trim(); } if (s) out.push(s); };
  let cur = ''; for (const s of sentences) { if (s.length > max) { if (cur) { out.push(cur); cur = ''; } pushLong(s); } else if (cur && cur.length + 1 + s.length > max) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; }
  if (cur) out.push(cur); return out;
}
/** Voices sorted so that voices matching the page language come first, then by name. */
export function sortVoices(voices, lang) { const l = String(lang).slice(0, 2).toLowerCase(); return [...voices].sort((a, b) => ((b.lang || '').toLowerCase().startsWith(l) ? 1 : 0) - ((a.lang || '').toLowerCase().startsWith(l) ? 1 : 0) || a.name.localeCompare(b.name)); }
/** Rough reading time in seconds for text at the given speech rate (1 = about 150 words/minute). */
export function readingSeconds(text, rate = 1) { const words = (String(text).match(/[\p{L}\p{N}'’-]+/gu) || []).length; return Math.round(words / (150 * rate) * 60); }
