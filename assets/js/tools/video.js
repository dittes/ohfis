// video.js — video tools. FFmpeg (WebAssembly) runs in a worker on this page; the command lines come from lib/video.js.
import { h, t, area, btn, select, check, field, numInput, textInput, filePicker, download, stat, wrap, debounce } from './kit.js';
import * as V from './lib/video.js';
import { runFFmpeg, probeFile, reset, explain } from './lib/ffrun.js';

const sizeFmt = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;
const dur = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor(s % 1 * 10))}`; };
const baseName = n => n.replace(/\.[^.]+$/, '');
const QUALITY_OPT = { key: 'quality', label: 'Quality / speed', type: 'select', value: 'balanced', choices: [['fast', 'Fast (larger file)'], ['balanced', 'Balanced'], ['high', 'High quality (slower)']] };
const VIDEO_ACCEPT = 'video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp,.mpg,.mpeg,.wmv,.flv,.ts';

/** Video in → options → FFmpeg → video out. spec.build(opts, ctx) returns what lib/video.js builders return. */
function videoTool(root, spec) {
  const ui = wrap(root); const ctl = {}; const opts = {}; let files = [], infos = [], extra = null, busy = false, outUrl = null, srcUrl = null;
  const mk = o => {
    let el, node;
    if (o.type === 'check') { node = check(o.label, o.value); el = node.input; }
    else if (o.type === 'select') { el = select(o.choices, o.value, { onChange: () => read() }); node = field(o.label, el, o.hint); }
    else if (o.type === 'text') { el = area({ rows: 2, placeholder: o.placeholder || '', 'aria-label': o.label }); el.value = o.value || ''; node = field(o.label, el, o.hint); }
    else { el = numInput(o.value, { min: o.min, max: o.max, step: o.step ?? 'any', onInput: () => { read(); drawRect(); } }); node = field(o.label, el, o.hint);
      if (o.now) node.append(btn('◷ use current position', () => { if (player.src) { el.value = Math.round(player.currentTime * 10) / 10; read(); } }, 'ghost', { style: { marginTop: '4px' } })); }
    ctl[o.key] = { el, o, node }; return node;
  };
  const read = () => { for (const [k, { el, o }] of Object.entries(ctl)) opts[k] = o.type === 'check' ? el.checked : o.type === 'number' ? Number(el.value) : el.value; for (const { o, node } of Object.values(ctl)) if (o.show) node.hidden = !o.show(opts); };
  const nodes = (spec.options || []).concat(spec.noQuality ? [] : [QUALITY_OPT]).map(mk);
  const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), status = h('p', { class: 'pt-hint', 'aria-live': 'polite' }), bar = h('progress', { max: 1, value: 0, hidden: true, style: { width: '100%' } }), out = h('div', { class: 'ut-actions' }), result = h('div');
  const player = h('video', { controls: true, playsinline: true, preload: 'metadata', style: { width: '100%', maxHeight: '360px', background: '#000', borderRadius: '8px' }, hidden: true }), rect = h('div', { class: 'ut-rect', hidden: true }), stage = h('div', { class: 'ut-stage' }, player, rect);
  const list = h('div', { class: 'ut-list' });
  function drawRect() { if (!spec.rect || !infos[0]) return rect.hidden = true; const i = infos[0], { x, y, w, h: hh } = { x: opts[spec.rect[0]], y: opts[spec.rect[1]], w: opts[spec.rect[2]], h: opts[spec.rect[3]] }; const on = !spec.rectShow || spec.rectShow(opts); if (!on || !(w > 0 && hh > 0) || !i.width) return rect.hidden = true; Object.assign(rect.style, { left: `${x / i.width * 100}%`, top: `${y / i.height * 100}%`, width: `${w / i.width * 100}%`, height: `${hh / i.height * 100}%` }); rect.hidden = false; }
  function showInfo() { const i = infos[0]; if (!i) { info.replaceChildren(); return; } info.replaceChildren(...(files.length > 1 ? [stat('Videos', files.length), stat('Total length', dur(infos.reduce((n, x) => n + x.duration, 0)))] : [stat('File', files[0].name), stat('Length', dur(i.duration)), stat('Size', i.width ? `${i.width} × ${i.height}` : '–'), stat('Frame rate', i.fps ? `${Math.round(i.fps * 100) / 100} fps` : '–'), stat('Sound', i.hasAudio ? 'yes' : 'no'), stat('File size', sizeFmt(files[0].size))])); }
  function renderList() { list.replaceChildren(...(spec.many ? files.map((f, k) => h('div', { class: 'ut-row' }, h('span', { class: 'ut-row__name' }, `${k + 1}. ${f.name}`), h('span', { class: 'pt-hint' }, dur(infos[k]?.duration || 0)), btn('↑', () => move(k, -1), 'ghost', { disabled: k === 0, 'aria-label': 'Move up' }), btn('↓', () => move(k, 1), 'ghost', { disabled: k === files.length - 1, 'aria-label': 'Move down' }), btn('✕', () => remove(k), 'ghost', { 'aria-label': 'Remove' }))) : [])); }
  const move = (k, d) => { [files[k], files[k + d]] = [files[k + d], files[k]]; [infos[k], infos[k + d]] = [infos[k + d], infos[k]]; renderList(); showInfo(); };
  const remove = k => { files.splice(k, 1); infos.splice(k, 1); renderList(); showInfo(); go.disabled = !ready(); };
  const ready = () => spec.many ? files.length >= 2 : files.length >= 1 && (!spec.extra || extra);
  async function load(list0) {
    err.hidden = true; result.replaceChildren(); out.replaceChildren(); if (!spec.many) { files = []; infos = []; }
    for (const f of list0) { try { status.textContent = 'Loading the video engine (about 31 MB, only once)…'; const log = await probeFile(f, s => { if (s === 'loading') status.textContent = 'Loading the video engine (about 31 MB, only once)…'; }); const i = V.parseProbe(log); if (!i.hasVideo && !spec.audioOnlyOk) throw new Error(`${f.name} does not look like a video file.`); files.push(f); infos.push(i); } catch (e) { err.textContent = e.message || String(e); err.hidden = false; } }
    status.textContent = ''; if (!spec.many && files[0]) { if (srcUrl) URL.revokeObjectURL(srcUrl); srcUrl = URL.createObjectURL(files[0]); player.src = srcUrl; player.hidden = false; const i = infos[0]; if (spec.onLoad) spec.onLoad(i, ctl); read(); drawRect(); }
    renderList(); showInfo(); go.disabled = !ready();
  }
  async function loadExtra([f]) { extra = f; extraName.textContent = f.name; go.disabled = !ready(); }
  async function process() {
    if (busy) return; err.hidden = true; read(); result.replaceChildren(); out.replaceChildren(); busy = true; go.disabled = true; cancel.hidden = false; bar.hidden = false; bar.value = 0; const t0 = performance.now();
    try {
      const i = infos[0]; const ctx = { info: i, infos, hasAudio: i.hasAudio, duration: i.duration, extra };
      const b = spec.build(opts, ctx); const inputs = files.map((f, k) => ({ name: `in${k}.mp4`, file: f })); const extraFiles = [];
      if (spec.extra) extraFiles.push({ name: `in1.${spec.extra.ext}`, file: extra });
      if (b.needsFont) { extraFiles.push({ name: 'font.ttf', data: new Uint8Array(await (await fetch('/assets/vendor/fonts/DejaVuSans.ttf')).arrayBuffer()) }); extraFiles.push({ name: 'text.txt', data: new TextEncoder().encode(b.textFile) }); }
      const r = await runFFmpeg(inputs, b.args, `out.${b.ext}`, { extraFiles, onProgress: p => { bar.value = p; status.textContent = `Processing… ${Math.round(p * 100)} %`; }, onStatus: s => { if (s === 'running') status.textContent = 'Processing…'; } });
      const mime = { mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' }[b.ext]; const blob = new Blob([r.data], { type: mime }), fn = `${baseName(files[0].name)}${spec.suffix}.${b.ext}`;
      if (outUrl) URL.revokeObjectURL(outUrl); outUrl = URL.createObjectURL(blob);
      const media = b.ext === 'gif' ? h('img', { src: outUrl, alt: 'Result', style: { maxWidth: '100%', borderRadius: '8px' } }) : ['mp3', 'm4a', 'wav'].includes(b.ext) ? h('audio', { src: outUrl, controls: true, style: { width: '100%' } }) : h('video', { src: outUrl, controls: true, playsinline: true, style: { width: '100%', maxHeight: '420px', background: '#000', borderRadius: '8px' } });
      const total = files.reduce((n, f) => n + f.size, 0); const notes = [b.droppedAudio ? 'One clip has no sound, so the sound of all clips was left out.' : ''].filter(Boolean);
      result.replaceChildren(media, h('div', { class: 'ut-stats' }, stat('Result', sizeFmt(blob.size)), stat('Before', sizeFmt(total)), stat('Change', `${blob.size <= total ? '−' : '+'}${Math.abs(Math.round((1 - blob.size / total) * 100))} %`), stat('Time', `${((performance.now() - t0) / 1000).toFixed(1)} s`)), ...notes.map(n => h('p', { class: 'pt-hint' }, n)));
      out.replaceChildren(btn(`${t('download')} ${fn}`, () => download(fn, blob), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${b.ext.toUpperCase()}, ${sizeFmt(blob.size)}`)); status.textContent = '';
    } catch (e) { err.textContent = e.message?.startsWith('FFmpeg') || e.log ? e.message : (e.message || explain(String(e))); err.hidden = false; status.textContent = ''; if (e.cancelled) err.hidden = true; }
    finally { busy = false; go.disabled = !ready(); cancel.hidden = true; bar.hidden = true; }
  }
  const go = btn(spec.button || 'Process video', process, 'primary', { disabled: true }), cancel = btn('Cancel', () => { reset(); busy = false; status.textContent = 'Cancelled.'; bar.hidden = true; cancel.hidden = true; go.disabled = !ready(); }, 'ghost', { hidden: true });
  const extraName = h('span', { class: 'pt-hint' }, ''); const extraBox = spec.extra ? h('div', { class: 'ut-actions' }, filePicker({ accept: spec.extra.accept, label: spec.extra.label, onFiles: loadExtra }), extraName) : null;
  const drop = h('div', { class: 'ut-drop' }, h('p', {}, spec.many ? 'Drop two or more videos here, or' : 'Drop a video here, or'), filePicker({ accept: VIDEO_ACCEPT, multiple: !!spec.many, label: t('chooseFile'), onFiles: load })); ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files.length) load(spec.many ? [...e.dataTransfer.files] : [e.dataTransfer.files[0]]); }));
  ui.append(drop, list, spec.many ? null : stage, info, extraBox, h('div', { class: 'ut-options' }, nodes), h('div', { class: 'ut-actions' }, go, cancel), bar, status, err, result, out, h('p', { class: 'pt-hint' }, (spec.note ? spec.note + ' ' : '') + 'The video is processed by FFmpeg inside your browser; it is never uploaded. Large videos need a lot of memory and time on a phone; the first use downloads the video engine (about 31 MB), which your browser then keeps.'));
  read(); addEventListener('pagehide', () => { if (busy) reset(); });
}

const P = (...a) => a;
export const tools = {
  'video-trimmer'(root) {
    videoTool(root, { suffix: '-trimmed', button: 'Trim video', note: 'Play the video, pause where the part should start or end and press "use current position". In fast mode the streams are copied without re-encoding: it takes a second, but the cut snaps to the nearest keyframe.',
      options: [{ key: 'start', label: 'Start (seconds)', type: 'number', value: 0, min: 0, step: 0.1, now: true }, { key: 'end', label: 'End (seconds, 0 = until the end)', type: 'number', value: 0, min: 0, step: 0.1, now: true }, { key: 'fast', label: 'Fast mode (no re-encoding, cuts at keyframes)', type: 'check', value: false }],
      build: (o, c) => V.trim({ start: o.start, end: o.end, duration: c.duration, fast: o.fast, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-merger'(root) {
    videoTool(root, { many: true, suffix: '-merged', button: 'Join videos', noQuality: false, note: 'Clips with a different size are fitted into one frame with black bars. If one clip has no sound, the result has no sound.',
      options: [{ key: 'size', label: 'Frame size', type: 'select', value: 'first', choices: [['first', 'Same as the first clip'], ['1920x1080', '1920 × 1080 (Full HD)'], ['1280x720', '1280 × 720 (HD)'], ['854x480', '854 × 480'], ['1080x1920', '1080 × 1920 (vertical)']] }],
      build: (o, c) => V.merge(c.infos, { size: o.size, quality: o.quality }) });
  },
  'video-converter'(root) {
    videoTool(root, { suffix: '-converted', button: 'Convert', note: 'MP4 (H.264) plays everywhere. WebM suits websites. GIF has no sound and gets large quickly. MP3, M4A and WAV take only the sound.',
      options: [{ key: 'format', label: 'Convert to', type: 'select', value: 'mp4', choices: Object.entries(V.FORMATS) }, { key: 'maxWidth', label: 'Maximum width', type: 'select', value: '0', choices: [['0', 'Keep the original size'], ['1920', '1920 px'], ['1280', '1280 px'], ['854', '854 px'], ['640', '640 px'], ['480', '480 px'], ['320', '320 px']], show: o => ['mp4', 'webm', 'gif'].includes(o.format) }, { key: 'fps', label: 'GIF frames per second', type: 'number', value: 12, min: 1, max: 30, show: o => o.format === 'gif' }, { key: 'mute', label: 'Remove the sound', type: 'check', value: false, show: o => ['mp4', 'webm'].includes(o.format) }],
      build: (o, c) => V.convert({ format: o.format, quality: o.quality, maxWidth: Number(o.maxWidth), mute: o.mute, fps: o.fps, hasAudio: c.hasAudio }) });
  },
  'video-compressor'(root) {
    videoTool(root, { suffix: '-small', button: 'Compress video', noQuality: true, note: 'A higher CRF number means a smaller file and lower quality. 23 is visually close to the original, 28 is a good compromise for sharing, 33 and above shows clear loss.',
      options: [{ key: 'crf', label: 'Quality (CRF, 18–38)', type: 'number', value: 28, min: 18, max: 38, step: 1, hint: 'Higher = smaller file' }, { key: 'maxHeight', label: 'Maximum height', type: 'select', value: '0', choices: [['0', 'Keep the original size'], ['1080', '1080 p'], ['720', '720 p'], ['480', '480 p'], ['360', '360 p']] }, { key: 'preset', label: 'Speed', type: 'select', value: 'veryfast', choices: [['ultrafast', 'Fastest (larger file)'], ['veryfast', 'Fast'], ['medium', 'Slow (smaller file)']] }],
      build: (o, c) => V.compress({ crf: o.crf, maxHeight: Number(o.maxHeight), preset: o.preset, hasAudio: c.hasAudio }) });
  },
  'video-crop-rotate-flip'(root) {
    videoTool(root, { suffix: '-edited', button: 'Apply', rect: ['x', 'y', 'w', 'h'], rectShow: o => o.cropMode === 'rect', note: 'Cropping happens first, then rotating and flipping. With "rectangle" the frame on the preview shows the area that is kept.',
      options: [{ key: 'cropMode', label: 'Crop', type: 'select', value: 'none', choices: [['none', 'No crop'], ['aspect', 'To an aspect ratio (centred)'], ['rect', 'Rectangle (pixels)']] }, { key: 'aspect', label: 'Aspect ratio', type: 'select', value: '16:9', choices: [['16:9', '16:9 (landscape)'], ['9:16', '9:16 (vertical, Stories/Reels)'], ['1:1', '1:1 (square)'], ['4:5', '4:5 (portrait)'], ['4:3', '4:3'], ['21:9', '21:9 (cinema)']], show: o => o.cropMode === 'aspect' }, { key: 'x', label: 'Left (px)', type: 'number', value: 0, min: 0, show: o => o.cropMode === 'rect' }, { key: 'y', label: 'Top (px)', type: 'number', value: 0, min: 0, show: o => o.cropMode === 'rect' }, { key: 'w', label: 'Width (px)', type: 'number', value: 640, min: 2, show: o => o.cropMode === 'rect' }, { key: 'h', label: 'Height (px)', type: 'number', value: 360, min: 2, show: o => o.cropMode === 'rect' }, { key: 'rotate', label: 'Rotate', type: 'select', value: '0', choices: [['0', 'No rotation'], ['90', '90° clockwise'], ['180', '180°'], ['270', '90° counter-clockwise']] }, { key: 'flipH', label: 'Flip horizontally (mirror)', type: 'check', value: false }, { key: 'flipV', label: 'Flip vertically', type: 'check', value: false }],
      onLoad(i, ctl) { ctl.w.el.value = i.width; ctl.h.el.value = i.height; },
      build: (o, c) => V.cropRotateFlip({ cropMode: o.cropMode, aspect: o.aspect, x: o.x, y: o.y, w: o.w, h: o.h, rotate: Number(o.rotate), flipH: o.flipH, flipV: o.flipV, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-resizer'(root) {
    videoTool(root, { suffix: '-resized', button: 'Resize video', note: 'The picture is scaled with its proportions kept unless you choose an exact size, which can stretch it. Making a video larger does not add detail.',
      options: [{ key: 'mode', label: 'Resize by', type: 'select', value: 'height', choices: [['height', 'Height (standard sizes)'], ['width', 'Width'], ['exact', 'Exact width and height']] }, { key: 'height', label: 'Height', type: 'select', value: '720', choices: [['2160', '2160 p (4K)'], ['1440', '1440 p'], ['1080', '1080 p (Full HD)'], ['720', '720 p (HD)'], ['480', '480 p'], ['360', '360 p'], ['240', '240 p']], show: o => o.mode === 'height' }, { key: 'width', label: 'Width (px)', type: 'number', value: 1280, min: 16, show: o => o.mode === 'width' }, { key: 'w2', label: 'Width (px)', type: 'number', value: 1280, min: 16, show: o => o.mode === 'exact' }, { key: 'h2', label: 'Height (px)', type: 'number', value: 720, min: 16, show: o => o.mode === 'exact' }],
      build: (o, c) => V.resize({ mode: o.mode, height: Number(o.height), width: o.width, w2: o.w2, h2: o.h2, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-speed-changer'(root) {
    videoTool(root, { suffix: '-speed', button: 'Change speed', note: 'Below 1× the video is slowed down, above 1× it is sped up; the sound follows without changing its pitch. For very slow motion the picture can look choppy because no new frames are invented.',
      options: [{ key: 'factor', label: 'Speed (×)', type: 'number', value: 2, min: 0.1, max: 20, step: 0.05, hint: '0.5 = half speed, 2 = twice as fast' }],
      build: (o, c) => V.speed({ factor: o.factor, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-loop'(root) {
    videoTool(root, { suffix: '-loop', button: 'Make loop', noQuality: false, note: 'Fast mode repeats the clip without re-encoding and finishes in seconds.',
      options: [{ key: 'times', label: 'Play how many times in total', type: 'number', value: 3, min: 2, max: 200, step: 1 }, { key: 'copy', label: 'Fast mode (no re-encoding)', type: 'check', value: true }],
      build: (o, c) => V.loop({ times: o.times, copy: o.copy, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-volume-changer'(root) {
    videoTool(root, { suffix: '-volume', button: 'Apply', noQuality: true, note: 'The picture is copied without re-encoding, so this is fast and lossless. +6 dB is about twice as loud, −6 dB about half. Loud videos can distort when raised further.',
      options: [{ key: 'db', label: 'Volume change (dB)', type: 'number', value: 6, min: -40, max: 30, step: 0.5, hint: 'Positive = louder', show: o => !o.mute }, { key: 'mute', label: 'Remove the sound completely', type: 'check', value: false }],
      build: (o, c) => V.volume({ db: o.db, mute: o.mute, hasAudio: c.hasAudio }) });
  },
  'video-add-audio'(root) {
    videoTool(root, { suffix: '-audio', button: 'Add audio', noQuality: true, extra: { ext: 'audio', accept: 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus', label: 'Choose the audio file' }, note: 'Replace the sound of the video with your audio file, or mix both. The picture is copied without re-encoding.',
      options: [{ key: 'mode', label: 'What to do', type: 'select', value: 'replace', choices: [['replace', 'Replace the original sound'], ['mix', 'Mix with the original sound']] }, { key: 'videoVolume', label: 'Original sound volume (%)', type: 'number', value: 100, min: 0, max: 300, show: o => o.mode === 'mix' }, { key: 'audioVolume', label: 'New audio volume (%)', type: 'number', value: 100, min: 0, max: 300 }, { key: 'shortest', label: 'End with the shorter of the two (otherwise the audio may run on)', type: 'check', value: true }],
      build: (o, c) => V.addAudio({ mode: o.mode, videoVolume: o.videoVolume, audioVolume: o.audioVolume, shortest: o.shortest, hasAudio: c.hasAudio }) });
  },
  'video-add-text'(root) {
    videoTool(root, { suffix: '-text', button: 'Add text', note: 'The text uses the DejaVu Sans font, which covers Latin, Greek and Cyrillic letters. Leave "end" at 0 to show the text until the end of the video.',
      options: [{ key: 'text', label: 'Text', type: 'text', value: 'Your text here', placeholder: 'Your text' }, { key: 'size', label: 'Font size (px)', type: 'number', value: 48, min: 8, max: 400 }, { key: 'color', label: 'Colour (hex)', type: 'select', value: '#ffffff', choices: [['#ffffff', 'White'], ['#ffeb3b', 'Yellow'], ['#000000', 'Black'], ['#ff5252', 'Red'], ['#40c4ff', 'Blue'], ['#69f0ae', 'Green']] }, { key: 'position', label: 'Position', type: 'select', value: 'bc', choices: [['tl', 'Top left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['ml', 'Middle left'], ['mc', 'Centre'], ['mr', 'Middle right'], ['bl', 'Bottom left'], ['bc', 'Bottom centre'], ['br', 'Bottom right']] }, { key: 'box', label: 'Dark box behind the text', type: 'check', value: true }, { key: 'start', label: 'Show from (seconds)', type: 'number', value: 0, min: 0, step: 0.1, now: true }, { key: 'end', label: 'Show until (seconds, 0 = end)', type: 'number', value: 0, min: 0, step: 0.1, now: true }],
      build: (o, c) => V.addText({ text: o.text, size: o.size, color: o.color, position: o.position, box: o.box, start: o.start, end: o.end, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-add-image'(root) {
    videoTool(root, { suffix: '-logo', button: 'Add image', extra: { ext: 'img', accept: 'image/png,image/jpeg,image/webp,image/gif', label: 'Choose the image or logo' }, note: 'Use a PNG with a transparent background for a logo. The size is a share of the video width.',
      options: [{ key: 'position', label: 'Position', type: 'select', value: 'br', choices: [['tl', 'Top left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['ml', 'Middle left'], ['mc', 'Centre'], ['mr', 'Middle right'], ['bl', 'Bottom left'], ['bc', 'Bottom centre'], ['br', 'Bottom right']] }, { key: 'scale', label: 'Size (% of the video width)', type: 'number', value: 20, min: 2, max: 100 }, { key: 'opacity', label: 'Opacity (%)', type: 'number', value: 100, min: 5, max: 100 }, { key: 'margin', label: 'Margin from the edge (px)', type: 'number', value: 20, min: 0 }, { key: 'start', label: 'Show from (seconds)', type: 'number', value: 0, min: 0, step: 0.1, now: true }, { key: 'end', label: 'Show until (seconds, 0 = end)', type: 'number', value: 0, min: 0, step: 0.1, now: true }],
      build: (o, c) => V.addImage({ position: o.position, scale: o.scale, opacity: o.opacity, margin: o.margin, start: o.start, end: o.end, quality: o.quality, hasAudio: c.hasAudio, videoWidth: c.info.width }) });
  },
  'video-logo-remover'(root) {
    videoTool(root, { suffix: '-nologo', button: 'Remove logo', rect: ['x', 'y', 'w', 'h'], note: 'The red frame on the preview shows the area that is smoothed over from its surroundings. It works well for small logos on calm backgrounds; it cannot restore what is behind busy or large areas.',
      options: [{ key: 'x', label: 'Left (px)', type: 'number', value: 20, min: 1 }, { key: 'y', label: 'Top (px)', type: 'number', value: 20, min: 1 }, { key: 'w', label: 'Width (px)', type: 'number', value: 120, min: 4 }, { key: 'h', label: 'Height (px)', type: 'number', value: 60, min: 4 }],
      build: (o, c) => V.removeLogo({ x: o.x, y: o.y, w: o.w, h: o.h, frameW: c.info.width, frameH: c.info.height, quality: o.quality, hasAudio: c.hasAudio }) });
  },
  'video-to-gif'(root) {
    videoTool(root, { suffix: '', button: 'Make GIF', noQuality: true, note: 'GIFs get large fast: a few seconds at 10–15 frames per second and 480 px wide is a good start. For longer clips use a short MP4 instead.',
      options: [{ key: 'start', label: 'Start (seconds)', type: 'number', value: 0, min: 0, step: 0.1, now: true }, { key: 'duration', label: 'Length (seconds, 0 = until the end)', type: 'number', value: 5, min: 0, step: 0.1 }, { key: 'fps', label: 'Frames per second', type: 'number', value: 12, min: 1, max: 30 }, { key: 'width', label: 'Width (px)', type: 'number', value: 480, min: 16, max: 1920 }, { key: 'loop', label: 'Repeat', type: 'select', value: '0', choices: [['0', 'Forever'], ['1', 'Once more'], ['-1', 'Do not repeat']] }],
      build: o => V.toGif({ start: o.start, duration: o.duration, fps: o.fps, width: o.width, loop: Number(o.loop) }) });
  },
  'video-stabilizer'(root) {
    videoTool(root, { suffix: '-stable', button: 'Stabilise', note: 'Smooths small shakes of hand-held clips. This browser build uses the basic "deshake" filter; strong shake or rolling-shutter wobble will not disappear. The edges are filled by mirroring or left black.',
      options: [{ key: 'strength', label: 'Search range (px, 4–64)', type: 'number', value: 16, min: 4, max: 64, hint: 'Larger = corrects bigger shakes, but can drift' }, { key: 'edge', label: 'Edges', type: 'select', value: 'mirror', choices: [['mirror', 'Fill by mirroring'], ['blank', 'Leave black']] }],
      build: (o, c) => V.stabilize({ strength: o.strength, edge: o.edge, quality: o.quality, hasAudio: c.hasAudio }) });
  },
};
