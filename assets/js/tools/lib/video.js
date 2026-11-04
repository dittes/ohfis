// video.js — builds FFmpeg command lines for the video tools and reads FFmpeg's log.
// Pure functions: every builder returns { args, ext, ... } where args use the file names "in0.<ext>", "in1.<ext>" … and the
// caller appends the output name "out.<ext>". Checked against a native FFmpeg in tests/video.test.mjs and in the browser build.

export const IN = (i, ext = 'mp4') => `in${i}.${ext}`;
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const fix = n => String(Math.round(n * 1000) / 1000);
const even = n => Math.max(2, Math.round(n / 2) * 2);

/** Read duration, size, frame rate and streams from the log of "ffmpeg -i file". */
export function parseProbe(log) {
  const l = String(log), info = { duration: 0, width: 0, height: 0, fps: 0, hasVideo: false, hasAudio: false, rotation: 0, videoCodec: '', audioCodec: '' };
  const d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(l); if (d) info.duration = +d[1] * 3600 + +d[2] * 60 + +d[3];
  const v = /Stream #\d+:\d+[^:]*: Video: (\w+)[^\n]*?, (\d{2,5})x(\d{2,5})/.exec(l); if (v) { info.hasVideo = true; info.videoCodec = v[1]; info.width = +v[2]; info.height = +v[3]; }
  const f = /(\d+(?:\.\d+)?) fps/.exec(l); if (f && info.hasVideo) info.fps = +f[1];
  const a = /Stream #\d+:\d+[^:]*: Audio: (\w+)/.exec(l); if (a) { info.hasAudio = true; info.audioCodec = a[1]; }
  const r = /rotate\s*:\s*(-?\d+)/.exec(l) || /displaymatrix: rotation of (-?[\d.]+) degrees/.exec(l); if (r) info.rotation = ((Math.round(+r[1]) % 360) + 360) % 360;
  if (info.rotation === 90 || info.rotation === 270) [info.width, info.height] = [info.height, info.width];
  return info;
}

// ── encoders ────────────────────────────────────────────────────────────────
export const QUALITY = { fast: { preset: 'ultrafast', crf: 26 }, balanced: { preset: 'veryfast', crf: 23 }, high: { preset: 'faster', crf: 19 } };
/** H.264 + AAC in MP4: plays in every browser, phone and editor. */
export function mp4Args({ quality = 'balanced', audio = true, audioKbps = 128 } = {}) {
  const q = QUALITY[quality] || QUALITY.balanced;
  return ['-c:v', 'libx264', '-preset', q.preset, '-crf', String(q.crf), '-pix_fmt', 'yuv420p', ...(audio ? ['-c:a', 'aac', '-b:a', `${audioKbps}k`] : ['-an']), '-movflags', '+faststart'];
}
const evenScale = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

// ── tools ───────────────────────────────────────────────────────────────────
/** Trim: fast = copy the streams (cuts at the nearest keyframe, instant), otherwise re-encode (frame accurate). */
export function trim({ start = 0, end = 0, duration = 0, fast = false, quality = 'balanced', hasAudio = true }) {
  const s = Math.max(0, num(start)), e = num(end) > 0 ? num(end) : duration, len = e > 0 ? e - s : 0;
  if (e > 0 && e <= s) throw new Error('The end must be after the start.');
  const t = len > 0 ? ['-t', fix(len)] : [];
  if (fast) return { args: ['-ss', fix(s), '-i', IN(0), ...t, '-c', 'copy', '-avoid_negative_ts', 'make_zero'], ext: 'mp4' };
  return { args: ['-ss', fix(s), '-i', IN(0), ...t, ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** Join clips one after another. Every clip is scaled to the same frame (letterboxed). infos: parseProbe results. */
export function merge(infos, { size = 'first', fps = 0, quality = 'balanced' } = {}) {
  if (infos.length < 2) throw new Error('Add at least two videos.');
  const first = infos[0]; let W, H;
  if (size === 'first') { W = even(first.width || 1280); H = even(first.height || 720); } else { const m = /^(\d+)x(\d+)$/.exec(size); W = +m[1]; H = +m[2]; }
  const F = fps || Math.round(first.fps) || 30, audio = infos.every(i => i.hasAudio), parts = [], labels = [];
  infos.forEach((_, i) => {
    parts.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${F},format=yuv420p[v${i}]`);
    if (audio) parts.push(`[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    labels.push(`[v${i}]` + (audio ? `[a${i}]` : ''));
  });
  parts.push(`${labels.join('')}concat=n=${infos.length}:v=1:a=${audio ? 1 : 0}[v]${audio ? '[a]' : ''}`);
  const inputs = infos.flatMap((_, i) => ['-i', IN(i)]);
  return { args: [...inputs, '-filter_complex', parts.join(';'), '-map', '[v]', ...(audio ? ['-map', '[a]'] : []), ...mp4Args({ quality, audio })], ext: 'mp4', droppedAudio: !audio && infos.some(i => i.hasAudio), width: W, height: H };
}

export const FORMATS = { mp4: 'MP4 (H.264, plays everywhere)', webm: 'WebM (VP8, for the web)', gif: 'Animated GIF (no sound)', mp3: 'MP3 (audio only)', m4a: 'M4A / AAC (audio only)', wav: 'WAV (audio only, large)' };
/** Convert to another format. maxWidth 0 = keep the size. fps only used for GIF. */
export function convert({ format = 'mp4', quality = 'balanced', maxWidth = 0, mute = false, fps = 12, hasAudio = true, audioKbps = 192 }) {
  const scale = maxWidth > 0 ? `scale='min(${Math.round(maxWidth)},iw)':-2` : null;
  if (format === 'mp3') return { args: ['-i', IN(0), '-vn', '-c:a', 'libmp3lame', '-b:a', `${audioKbps}k`], ext: 'mp3' };
  if (format === 'm4a') return { args: ['-i', IN(0), '-vn', '-c:a', 'aac', '-b:a', `${audioKbps}k`, '-movflags', '+faststart'], ext: 'm4a' };
  if (format === 'wav') return { args: ['-i', IN(0), '-vn', '-c:a', 'pcm_s16le'], ext: 'wav' };
  if (format === 'gif') return toGif({ fps, width: maxWidth || 480 });
  // VP8 (not VP9): the browser build of FFmpeg is single-threaded and its VP9 encoder crashes the page.
  if (format === 'webm') { const vf = [scale].filter(Boolean).join(','), q = quality === 'high' ? ['6', '5M'] : quality === 'fast' ? ['18', '1M'] : ['10', '2M']; return { args: ['-i', IN(0), ...(vf ? ['-vf', vf] : []), '-c:v', 'libvpx', '-crf', q[0], '-b:v', q[1], '-deadline', 'realtime', '-cpu-used', '5', '-threads', '1', ...(mute || !hasAudio ? ['-an'] : ['-c:a', 'libopus', '-b:a', '96k'])], ext: 'webm' }; }
  const vf = [scale, evenScale].filter(Boolean).join(',');
  return { args: ['-i', IN(0), '-vf', vf, ...mp4Args({ quality, audio: !mute && hasAudio })], ext: 'mp4' };
}

/** Make a video smaller: lower quality (CRF) and optionally a smaller frame. */
export function compress({ crf = 28, maxHeight = 0, audioKbps = 96, preset = 'veryfast', hasAudio = true }) {
  const vf = [maxHeight > 0 ? `scale=-2:'min(${Math.round(maxHeight)},ih)'` : null, evenScale].filter(Boolean).join(',');
  return { args: ['-i', IN(0), '-vf', vf, '-c:v', 'libx264', '-preset', preset, '-crf', String(Math.min(40, Math.max(14, Math.round(crf)))), '-pix_fmt', 'yuv420p', ...(hasAudio ? ['-c:a', 'aac', '-b:a', `${audioKbps}k`] : ['-an']), '-movflags', '+faststart'], ext: 'mp4' };
}

/** Crop (by rectangle or by aspect ratio around the centre), then rotate and flip. */
export function cropRotateFlip({ cropMode = 'none', x = 0, y = 0, w = 0, h = 0, aspect = '16:9', rotate = 0, flipH = false, flipV = false, quality = 'balanced', hasAudio = true }) {
  const f = [];
  if (cropMode === 'rect') { if (!(num(w) > 0 && num(h) > 0)) throw new Error('Enter the width and height of the crop area.'); f.push(`crop=${even(w)}:${even(h)}:${Math.max(0, Math.round(num(x)))}:${Math.max(0, Math.round(num(y)))}`); }
  else if (cropMode === 'aspect') { const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect); if (!m) throw new Error('Use an aspect ratio like 16:9.'); const A = +m[1] / +m[2]; f.push(`crop='trunc(min(iw,ih*${fix(A)})/2)*2':'trunc(min(ih,iw/${fix(A)})/2)*2'`); }
  const r = ((Math.round(num(rotate) / 90) * 90) % 360 + 360) % 360;
  if (r === 90) f.push('transpose=1'); else if (r === 180) f.push('hflip', 'vflip'); else if (r === 270) f.push('transpose=2');
  if (flipH) f.push('hflip'); if (flipV) f.push('vflip');
  f.push(evenScale);
  return { args: ['-i', IN(0), '-vf', f.join(','), ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

export const RESIZE_PRESETS = { '2160': 2160, '1440': 1440, '1080': 1080, '720': 720, '480': 480, '360': 360, '240': 240 };
/** Scale to a height preset (width follows) or to an exact width/height. */
export function resize({ mode = 'height', height = 720, width = 0, w2 = 0, h2 = 0, quality = 'balanced', hasAudio = true }) {
  let vf;
  if (mode === 'exact') { if (!(num(w2) > 0 && num(h2) > 0)) throw new Error('Enter width and height.'); vf = `scale=${even(w2)}:${even(h2)},setsar=1`; }
  else if (mode === 'width') { if (!(num(width) > 0)) throw new Error('Enter a width.'); vf = `scale=${even(width)}:-2`; }
  else vf = `scale=-2:${even(height)}`;
  return { args: ['-i', IN(0), '-vf', vf, ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** atempo only accepts 0.5–2 per stage, so extreme speeds use a chain. */
export function atempoChain(f) { const out = []; let x = f; while (x > 2) { out.push('atempo=2'); x /= 2; } while (x < 0.5) { out.push('atempo=0.5'); x /= 0.5; } out.push(`atempo=${fix(x)}`); return out.join(','); }
export function speed({ factor = 2, quality = 'balanced', hasAudio = true, fps = 0 }) {
  const k = num(factor); if (!(k >= 0.1 && k <= 20)) throw new Error('Speed must be between 0.1× and 20×.');
  const vf = [`setpts=PTS/${fix(k)}`, ...(fps > 0 ? [`fps=${fps}`] : []), evenScale].join(',');
  return { args: ['-i', IN(0), '-vf', vf, ...(hasAudio ? ['-af', atempoChain(k)] : []), ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** Repeat a clip. copy = no re-encoding (instant). */
export function loop({ times = 2, copy = true, quality = 'balanced', hasAudio = true }) {
  const n = Math.round(num(times)); if (!(n >= 2 && n <= 200)) throw new Error('Repeat between 2 and 200 times.');
  return copy ? { args: ['-stream_loop', String(n - 1), '-i', IN(0), '-c', 'copy'], ext: 'mp4' } : { args: ['-stream_loop', String(n - 1), '-i', IN(0), ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** Change or remove the sound; the picture is copied untouched. */
export function volume({ db = 6, mute = false, hasAudio = true }) {
  if (!hasAudio) throw new Error('This video has no audio track.');
  if (mute) return { args: ['-i', IN(0), '-c:v', 'copy', '-an'], ext: 'mp4' };
  return { args: ['-i', IN(0), '-c:v', 'copy', '-af', `volume=${fix(num(db))}dB`, '-c:a', 'aac', '-b:a', '160k'], ext: 'mp4' };
}

/** Put an audio file under a video: replace the original sound or mix both. */
export function addAudio({ mode = 'replace', videoVolume = 100, audioVolume = 100, shortest = true, hasAudio = true, audioDuration = 0, videoDuration = 0 }) {
  const vv = fix(num(videoVolume, 100) / 100), av = fix(num(audioVolume, 100) / 100), inputs = ['-i', IN(0), '-i', IN(1, 'audio')];
  const dur = shortest ? ['-shortest'] : [];
  if (mode === 'mix' && hasAudio) return { args: [...inputs, '-filter_complex', `[0:a]volume=${vv}[a0];[1:a]volume=${av}[a1];[a0][a1]amix=inputs=2:duration=${shortest ? 'first' : 'longest'}:normalize=0[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k'], ext: 'mp4' };
  return { args: [...inputs, '-map', '0:v', '-map', '1:a', '-af', `volume=${av}`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', ...dur], ext: 'mp4' };
}

const POS = { tl: ['{m}', '{m}'], tc: ['(w-text_w)/2', '{m}'], tr: ['w-text_w-{m}', '{m}'], ml: ['{m}', '(h-text_h)/2'], mc: ['(w-text_w)/2', '(h-text_h)/2'], mr: ['w-text_w-{m}', '(h-text_h)/2'], bl: ['{m}', 'h-text_h-{m}'], bc: ['(w-text_w)/2', 'h-text_h-{m}'], br: ['w-text_w-{m}', 'h-text_h-{m}'] };
export const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
const colour = c => /^#?[0-9a-f]{6}$/i.test(c) ? '0x' + c.replace('#', '') : 'white';
/** Text over the video. The text is written to a file (textfile=) so no escaping of the message is needed. */
export function addText({ text = '', size = 48, color = '#ffffff', position = 'bc', margin = 40, box = true, boxOpacity = 0.5, start = 0, end = 0, quality = 'balanced', hasAudio = true }) {
  if (!String(text).trim()) throw new Error('Enter the text to show.');
  const [x, y] = (POS[position] || POS.bc).map(s => s.replaceAll('{m}', String(Math.round(num(margin)))));
  const en = num(end) > num(start) ? `:enable='between(t,${fix(num(start))},${fix(num(end))})'` : num(start) > 0 ? `:enable='gte(t,${fix(num(start))})'` : '';
  const vf = `drawtext=fontfile=font.ttf:textfile=text.txt:expansion=none:fontsize=${Math.round(num(size, 48))}:fontcolor=${colour(color)}:x=${x}:y=${y}${box ? `:box=1:boxcolor=black@${fix(num(boxOpacity, 0.5))}:boxborderw=${Math.round(num(size, 48) / 4)}` : ''}${en},${evenScale}`;
  return { args: ['-i', IN(0), '-vf', vf, ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4', textFile: String(text), needsFont: true };
}

/** Logo or picture over the video. */
export function addImage({ position = 'br', scale = 20, opacity = 100, margin = 20, start = 0, end = 0, quality = 'balanced', hasAudio = true, videoWidth = 1280 }) {
  const m = Math.round(num(margin)), ox = { tl: m, tc: '(W-w)/2', tr: `W-w-${m}`, ml: m, mc: '(W-w)/2', mr: `W-w-${m}`, bl: m, bc: '(W-w)/2', br: `W-w-${m}` }, oy = { tl: m, tc: m, tr: m, ml: '(H-h)/2', mc: '(H-h)/2', mr: '(H-h)/2', bl: `H-h-${m}`, bc: `H-h-${m}`, br: `H-h-${m}` };
  const sw = even(Math.max(16, (videoWidth || 1280) * num(scale, 20) / 100)), al = fix(Math.min(1, Math.max(0, num(opacity, 100) / 100)));
  const en = num(end) > num(start) ? `:enable='between(t,${fix(num(start))},${fix(num(end))})'` : num(start) > 0 ? `:enable='gte(t,${fix(num(start))})'` : '';
  const fc = `[1:v]scale=${sw}:-2,format=rgba,colorchannelmixer=aa=${al}[wm];[0:v][wm]overlay=${ox[position] ?? ox.br}:${oy[position] ?? oy.br}${en},${evenScale}[v]`;
  return { args: ['-i', IN(0), '-i', IN(1, 'img'), '-filter_complex', fc, '-map', '[v]', ...(hasAudio ? ['-map', '0:a?'] : []), ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** Blur a rectangle (logo, watermark) away with delogo. The rectangle must lie inside the frame. */
export function removeLogo({ x = 10, y = 10, w = 100, h = 50, frameW = 0, frameH = 0, quality = 'balanced', hasAudio = true }) {
  let X = Math.round(num(x)), Y = Math.round(num(y)), W = Math.round(num(w)), H = Math.round(num(h));
  if (!(W > 0 && H > 0)) throw new Error('Enter the width and height of the logo area.');
  X = Math.max(1, X); Y = Math.max(1, Y);
  if (frameW && X + W > frameW - 1) W = frameW - 1 - X; if (frameH && Y + H > frameH - 1) H = frameH - 1 - Y;
  if (W < 4 || H < 4) throw new Error('The logo area is outside the picture.');
  return { args: ['-i', IN(0), '-vf', `delogo=x=${X}:y=${Y}:w=${W}:h=${H}`, ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}

/** Animated GIF with a palette made for this clip (much better colours than the default). */
export function toGif({ start = 0, duration = 0, fps = 12, width = 480, loop = 0 }) {
  const t = num(duration) > 0 ? ['-t', fix(num(duration))] : [];
  const vf = `fps=${Math.round(num(fps, 12))},scale='min(${Math.round(num(width, 480))},iw)':-2:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4`;
  return { args: ['-ss', fix(Math.max(0, num(start))), ...t, '-i', IN(0), '-filter_complex', vf, '-loop', String(num(loop)), '-an'], ext: 'gif' };
}

/** Basic stabilisation with the deshake filter (the browser build has no vid.stab). */
export function stabilize({ strength = 16, edge = 'mirror', quality = 'balanced', hasAudio = true }) {
  const r = Math.min(64, Math.max(4, Math.round(num(strength, 16))));
  return { args: ['-i', IN(0), '-vf', `deshake=rx=${r}:ry=${r}:edge=${edge === 'blank' ? 'blank' : 'mirror'},${evenScale}`, ...mp4Args({ quality, audio: hasAudio })], ext: 'mp4' };
}
