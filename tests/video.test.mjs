// Runs the generated command lines through a native FFmpeg (if installed) and checks the results with ffprobe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as V from '../assets/js/tools/lib/video.js';

const have = spawnSync('ffmpeg', ['-version']).status === 0;
const dir = mkdtempSync(join(tmpdir(), 'vid-'));
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8' });
const mk = (name, { dur = 4, w = 320, h = 240, audio = true, rate = 25 } = {}) => { const a = ['-y', '-f', 'lavfi', '-i', `testsrc=size=${w}x${h}:rate=${rate}:duration=${dur}`]; if (audio) a.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${dur}`, '-c:a', 'aac'); a.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', name); const r = sh('ffmpeg', a); assert.equal(r.status, 0, r.stderr.slice(-300)); };
const probe = f => JSON.parse(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', f]).stdout);
const run = (b, out = 'out') => { const o = `${out}.${b.ext}`; const r = sh('ffmpeg', ['-hide_banner', '-y', ...b.args, o]); assert.equal(r.status, 0, `${b.args.join(' ')}\n${r.stderr.slice(-400)}`); return { path: o, p: probe(o) }; };
const info = f => V.parseProbe(sh('ffmpeg', ['-hide_banner', '-i', f]).stderr);
const dur = r => Number(r.p.format.duration), vs = r => r.p.streams.find(s => s.codec_type === 'video'), as = r => r.p.streams.find(s => s.codec_type === 'audio');

if (have) { mk('in0.mp4'); mk('in1.mp4', { w: 640, h: 360, dur: 2 }); mk('silent.mp4', { audio: false, dur: 2 }); sh('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=10', 'music.mp3']); sh('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=red:s=100x50', '-frames:v', '1', 'in1.png']); copyFileSync(new URL('../assets/vendor/fonts/DejaVuSans.ttf', import.meta.url), join(dir, 'font.ttf')); copyFileSync(join(dir, 'music.mp3'), join(dir, 'in1.audio')); copyFileSync(join(dir, 'in1.png'), join(dir, 'in1.img')); }
const T = (name, fn) => test(name, { skip: !have && 'ffmpeg not installed' }, fn);

test('parseProbe reads duration, size, fps and streams', { skip: !have && 'ffmpeg not installed' }, () => {
  const i = info('in0.mp4'); assert.ok(Math.abs(i.duration - 4) < 0.1); assert.equal(i.width, 320); assert.equal(i.height, 240); assert.equal(i.fps, 25); assert.ok(i.hasVideo && i.hasAudio); assert.equal(i.videoCodec, 'h264');
  const s = info('silent.mp4'); assert.ok(s.hasVideo && !s.hasAudio);
  assert.equal(V.parseProbe('garbage').hasVideo, false);
});
test('atempoChain splits extreme speeds into valid stages', () => {
  assert.equal(V.atempoChain(1.5), 'atempo=1.5'); assert.equal(V.atempoChain(4), 'atempo=2,atempo=2'); assert.equal(V.atempoChain(0.25), 'atempo=0.5,atempo=0.5'); assert.equal(V.atempoChain(3), 'atempo=2,atempo=1.5');
});
test('builders validate their input', () => {
  assert.throws(() => V.trim({ start: 5, end: 3 }), /after the start/); assert.throws(() => V.speed({ factor: 50 }), /between/); assert.throws(() => V.loop({ times: 1 }), /Repeat/); assert.throws(() => V.addText({ text: ' ' }), /Enter the text/);
  assert.throws(() => V.removeLogo({ w: 0 }), /width and height/); assert.throws(() => V.cropRotateFlip({ cropMode: 'rect' }), /crop area/); assert.throws(() => V.volume({ hasAudio: false }), /no audio/); assert.throws(() => V.merge([{}]), /at least two/);
});
T('trim: accurate and fast mode give the requested length', () => {
  const a = run(V.trim({ start: 1, end: 3 })); assert.ok(Math.abs(dur(a) - 2) < 0.2, 'accurate ' + dur(a)); assert.equal(vs(a).codec_name, 'h264');
  const f = run(V.trim({ start: 1, end: 3, fast: true }), 'fast'); assert.ok(dur(f) > 1.5 && dur(f) < 4.1, 'fast ' + dur(f));
});
T('merge: different sizes are joined into one frame and the length adds up', () => {
  const b = V.merge([info('in0.mp4'), info('in1.mp4')].map(x => x), { size: '640x360' }); copyFileSync(join(dir, 'in1.mp4'), join(dir, 'in1.mp4')); const r = run(b, 'merged'); assert.ok(Math.abs(dur(r) - 6) < 0.3, 'length ' + dur(r)); assert.equal(vs(r).width, 640); assert.equal(vs(r).height, 360); assert.ok(as(r), 'audio kept');
  const m = V.merge([info('in0.mp4'), info('silent.mp4')]); assert.ok(m.droppedAudio); const r2 = run(m, 'merged2'); assert.equal(as(r2), undefined); assert.ok(Math.abs(dur(r2) - 6) < 0.3);
});
T('convert: every output format is produced and plays', () => {
  const mp4 = run(V.convert({ format: 'mp4', maxWidth: 160 })); assert.equal(vs(mp4).width, 160); assert.equal(vs(mp4).height, 120);
  assert.equal(vs(run(V.convert({ format: 'webm' }), 'c2')).codec_name, 'vp8'); assert.equal(as(run(V.convert({ format: 'mp3' }), 'c3')).codec_name, 'mp3'); assert.equal(as(run(V.convert({ format: 'm4a' }), 'c4')).codec_name, 'aac'); assert.equal(as(run(V.convert({ format: 'wav' }), 'c5')).codec_name, 'pcm_s16le');
  const g = run(V.convert({ format: 'gif', fps: 10, maxWidth: 160 }), 'c6'); assert.equal(vs(g).codec_name, 'gif'); assert.equal(as(g), undefined); assert.equal(as(run(V.convert({ mute: true }), 'c7')), undefined, 'mute removes audio');
});
T('compress: smaller file at lower quality and smaller frame', () => {
  const big = run(V.convert({ quality: 'high' }), 'q1'), small = run(V.compress({ crf: 36, maxHeight: 120 }), 'q2'); assert.equal(vs(small).height, 120); assert.ok(readFileSync(join(dir, small.path)).length < readFileSync(join(dir, big.path)).length);
});
T('cropRotateFlip: aspect crop, rect crop, rotate swaps the size, flips run', () => {
  const sq = run(V.cropRotateFlip({ cropMode: 'aspect', aspect: '1:1' })); assert.equal(vs(sq).width, vs(sq).height); assert.equal(vs(sq).width, 240);
  const rc = run(V.cropRotateFlip({ cropMode: 'rect', x: 20, y: 10, w: 100, h: 60 }), 'r2'); assert.equal(vs(rc).width, 100); assert.equal(vs(rc).height, 60);
  const ro = run(V.cropRotateFlip({ rotate: 90 }), 'r3'); assert.equal(vs(ro).width, 240); assert.equal(vs(ro).height, 320);
  assert.equal(vs(run(V.cropRotateFlip({ rotate: 180, flipH: true, flipV: true }), 'r4')).width, 320);
});
T('resize: height preset, width and exact size', () => {
  const a = run(V.resize({ mode: 'height', height: 120 })); assert.equal(vs(a).height, 120); assert.equal(vs(a).width, 160);
  assert.equal(vs(run(V.resize({ mode: 'width', width: 200 }), 's2')).width, 200); const e = run(V.resize({ mode: 'exact', w2: 100, h2: 100 }), 's3'); assert.equal(vs(e).width, 100); assert.equal(vs(e).height, 100);
});
T('speed: length scales and audio follows', () => {
  const f = run(V.speed({ factor: 2 })); assert.ok(Math.abs(dur(f) - 2) < 0.3, 'double speed ' + dur(f)); const s = run(V.speed({ factor: 0.5 }), 'sp2'); assert.ok(Math.abs(dur(s) - 8) < 0.5, 'half speed ' + dur(s)); assert.ok(as(s));
  const q = run(V.speed({ factor: 4 }), 'sp3'); assert.ok(Math.abs(dur(q) - 1) < 0.3);
});
T('loop: copy and re-encode repeat the clip', () => {
  const c = run(V.loop({ times: 3 })); assert.ok(Math.abs(dur(c) - 12) < 0.6, 'copy ' + dur(c)); const r = run(V.loop({ times: 2, copy: false }), 'l2'); assert.ok(Math.abs(dur(r) - 8) < 0.4);
});
T('volume: change keeps the picture, mute removes the sound', () => {
  const v = run(V.volume({ db: -10 })); assert.equal(vs(v).codec_name, 'h264'); assert.ok(as(v)); const vol = sh('ffmpeg', ['-i', 'out.mp4', '-af', 'volumedetect', '-f', 'null', '-']).stderr, base = sh('ffmpeg', ['-i', 'in0.mp4', '-af', 'volumedetect', '-f', 'null', '-']).stderr; const mean = s => Number(/mean_volume: (-?[\d.]+) dB/.exec(s)[1]); assert.ok(Math.abs(mean(vol) - mean(base) + 10) < 1.5, `${mean(vol)} vs ${mean(base)}`);
  assert.equal(as(run(V.volume({ mute: true }), 'v2')), undefined);
});
T('addAudio: replace and mix', () => {
  const r = run(V.addAudio({ mode: 'replace' })); assert.ok(Math.abs(dur(r) - 4) < 0.3, 'shortest ' + dur(r)); assert.ok(as(r)); const m = run(V.addAudio({ mode: 'mix', audioVolume: 50 }), 'a2'); assert.ok(as(m)); assert.ok(Math.abs(dur(m) - 4) < 0.3);
  const n = V.addAudio({ mode: 'mix', hasAudio: false }); const nr = (() => { const o = 'a3.mp4'; const x = sh('ffmpeg', ['-hide_banner', '-y', ...n.args.map(a => a === 'in0.mp4' ? 'silent.mp4' : a), o]); return x.status; })(); assert.equal(nr, 0, 'silent video + music works');
});
T('addText: draws text from a file, even unusual characters, and keeps audio', () => {
  const b = V.addText({ text: 'Grüße: 100% “ok” — ä ł č', position: 'bc' }); writeFileSync(join(dir, 'text.txt'), b.textFile); const r = run(b, 't1'); assert.equal(vs(r).width, 320); assert.ok(as(r));
  const plain = sh('ffmpeg', ['-i', 'in0.mp4', '-vf', 'select=eq(n\\,50)', '-frames:v', '1', '-y', 'p.png']), withText = sh('ffmpeg', ['-i', r.path, '-vf', 'select=eq(n\\,50)', '-frames:v', '1', '-y', 't.png']); assert.equal(plain.status + withText.status, 0); assert.notDeepEqual(readFileSync(join(dir, 'p.png')), readFileSync(join(dir, 't.png')), 'frame differs where the text is');
  const timed = run(V.addText({ text: 'X', start: 1, end: 2, position: 'tl', box: false }), 't2'); assert.ok(timed.p);
});
T('addImage: overlay in every corner with opacity and timing', () => {
  for (const pos of ['tl', 'br', 'mc']) assert.ok(run(V.addImage({ position: pos, scale: 30, opacity: 60, videoWidth: 320 }), `im${pos}`).p);
  const t = run(V.addImage({ start: 1, end: 3, videoWidth: 320 }), 'imt'); assert.equal(vs(t).width, 320); assert.ok(as(t));
});
T('removeLogo: runs inside the frame and clamps a rectangle that sticks out', () => {
  assert.ok(run(V.removeLogo({ x: 10, y: 10, w: 60, h: 30, frameW: 320, frameH: 240 })).p); assert.ok(run(V.removeLogo({ x: 300, y: 220, w: 100, h: 100, frameW: 320, frameH: 240 }), 'lg2').p);
  assert.throws(() => V.removeLogo({ x: 400, y: 10, w: 50, h: 50, frameW: 320, frameH: 240 }), /outside/);
});
T('toGif: a palette GIF of the requested part', () => {
  const g = run(V.toGif({ start: 1, duration: 2, fps: 8, width: 160 })); assert.equal(vs(g).codec_name, 'gif'); assert.equal(vs(g).width, 160); assert.ok(Math.abs(dur(g) - 2) < 0.3, 'gif length ' + dur(g));
});
T('stabilize: produces a normal video of the same size', () => { const s = run(V.stabilize({ strength: 16 })); assert.equal(vs(s).width, 320); assert.ok(Math.abs(dur(s) - 4) < 0.3); assert.ok(as(s)); });
