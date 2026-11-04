// ffrun.js — runs FFmpeg (WebAssembly build, single thread) in a worker on this origin.
// The 31 MB core is only downloaded when a video tool is actually used. Nothing leaves the browser.
const BASE = '/assets/vendor/ffmpeg';
let ff = null, loading = null, logHandler = null, progHandler = null;

export async function loadFFmpeg(onStatus) {
  if (ff) return ff;
  return loading ||= (async () => {
    onStatus?.('loading');
    const { FFmpeg } = await import(`${BASE}/index.js`);
    const inst = new FFmpeg();
    inst.on('log', ({ message }) => logHandler?.(message));
    inst.on('progress', ({ progress, time }) => progHandler?.(progress, time));
    await inst.load({ coreURL: `${BASE}/core/ffmpeg-core.js`, wasmURL: `${BASE}/core/ffmpeg-core.wasm` });
    ff = inst; return inst;
  })().catch(e => { loading = null; throw e; });
}

export const isLoaded = () => !!ff;
/** Stop whatever is running and start fresh next time (the only way to cancel an FFmpeg job). */
export function reset() { try { ff?.terminate(); } catch { /* already gone */ } ff = null; loading = null; }

/**
 * Run one FFmpeg job. inputs: [{ name, data: Uint8Array }]. args use those names and "out.<ext>" as output.
 * Returns { data: Uint8Array, log: string }. opts: onProgress(0..1), onStatus(text), extraFiles: [{ name, data }] (fonts, images).
 */
export async function runFFmpeg(inputs, args, outName, opts = {}) {
  const inst = await loadFFmpeg(opts.onStatus); let log = '';
  logHandler = m => { log += m + '\n'; }; progHandler = p => { if (opts.onProgress && p >= 0 && p <= 1.2) opts.onProgress(Math.min(1, p)); };
  const written = [];
  try {
    // Files are read at the last moment and handed to the worker without a second copy (large videos).
    for (const f of [...inputs, ...(opts.extraFiles || [])]) { const data = f.file ? new Uint8Array(await f.file.arrayBuffer()) : f.data.slice(); await inst.writeFile(f.name, data); written.push(f.name); }
    opts.onStatus?.('running');
    const code = await inst.exec(['-hide_banner', '-y', ...args, outName]);
    if (code !== 0) { const err = new Error(explain(log)); err.log = log; throw err; }
    const data = await inst.readFile(outName); written.push(outName);
    return { data: new Uint8Array(data), log };
  } finally {
    for (const n of written) { try { await inst.deleteFile(n); } catch { /* not there */ } }
    logHandler = progHandler = null;
  }
}

/** Turn FFmpeg's log into a message a person can act on. */
export function explain(log) {
  const l = String(log); const tail = l.trim().split('\n').slice(-3).join(' ').slice(0, 300);
  if (/Invalid data found when processing input|moov atom not found/.test(l)) return 'This file could not be read as a video. It may be damaged, incomplete or in an unusual format.';
  if (/Output file does not contain any stream|does not contain any stream/.test(l)) return 'The result would be empty. Check the start and end times.';
  if (/Stream specifier .* matches no streams|matches no streams/.test(l)) return 'This video has no audio track, so the audio setting cannot be applied.';
  if (/Out of memory|memory access out of bounds|Cannot enlarge memory/i.test(l)) return 'The video is too large for the memory your browser gives to this page. Try a shorter or smaller video.';
  if (/Unknown encoder|Encoder .* not found/.test(l)) return 'This browser build of FFmpeg cannot make that format.';
  return `FFmpeg could not finish: ${tail}`;
}

/** Read the log of "ffmpeg -i file" (duration, size, streams). */
export async function probeFile(file, onStatus) {
  const inst = await loadFFmpeg(onStatus); let log = ''; logHandler = m => { log += m + '\n'; };
  try { await inst.writeFile('probe.bin', new Uint8Array(await file.arrayBuffer())); await inst.exec(['-hide_banner', '-i', 'probe.bin']); }
  finally { try { await inst.deleteFile('probe.bin'); } catch { /* not there */ } logHandler = null; }
  return log;
}
