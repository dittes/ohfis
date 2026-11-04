// regex-worker.js — runs a user's regular expression off the main thread so a catastrophic pattern cannot freeze the page.
import { findMatches, replaceAll } from './lib/devtools.js';
self.onmessage = ({ data: { id, pattern, flags, text, replace } }) => {
  try { const r = findMatches(pattern, flags, text); self.postMessage({ id, ...r, replaced: replace !== null && replace !== undefined ? replaceAll(pattern, flags, text, replace) : null }); }
  catch (e) { self.postMessage({ id, error: e.message || String(e) }); }
};
