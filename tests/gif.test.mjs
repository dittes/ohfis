import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as G from '../assets/js/tools/lib/gif.js';
import { quantize } from '../assets/js/tools/lib/image.js';

const havePil = spawnSync('python3', ['-c', 'import PIL']).status === 0;
const py = (code, ...args) => spawnSync('python3', ['-c', code, ...args], { encoding: 'utf8' });
const dir = mkdtempSync(join(tmpdir(), 'gif-'));

test('lzw round trip matches a reference decoder (small and large inputs)', { skip: !havePil && 'PIL missing' }, () => {
  // build a GIF whose single frame contains a known pattern, then let Pillow decode it
  for (const [w, h, n] of [[7, 5, 2], [64, 64, 16], [300, 200, 256]]) {
    const idx = new Uint8Array(w * h).map((_, i) => (i * 7 + (i >> 4) * 3 + Math.floor(i / w)) % n), pal = Array.from({ length: n }, (_, i) => [i % 256, (i * 3) % 256, (i * 7) % 256]);
    const gif = G.encodeGif({ width: w, height: h, frames: [{ indices: idx, palette: pal }] }), f = join(dir, `a${w}.gif`); writeFileSync(f, gif);
    const r = py('import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.load();p=im.convert("P");import json;print(json.dumps([im.size, list(im.getdata())[:40], im.n_frames]))', f); assert.equal(r.status, 0, r.stderr);
    const [size, px, frames] = JSON.parse(r.stdout); assert.deepEqual(size, [w, h]); assert.equal(frames, 1);
    assert.deepEqual(px, Array.from(idx.slice(0, 40)), `${w}x${h}`);
  }
});
test('animated GIF: frame count, loop and delays are read back by Pillow', { skip: !havePil && 'PIL missing' }, () => {
  const mk = shade => { const w = 20, h = 10, rgba = new Uint8ClampedArray(w * h * 4).fill(255); for (let i = 0; i < w * h; i++) { rgba[i * 4] = i % w * 12; rgba[i * 4 + 1] = shade; rgba[i * 4 + 2] = 255 - shade; } return { ...quantize(rgba, w, h, 32), w, h }; };
  const fr = [mk(0), mk(100), mk(200)], gif = G.encodeGif({ width: 20, height: 10, frames: fr, delay: [100, 250, 40], loop: 3 }), f = join(dir, 'anim.gif'); writeFileSync(f, gif);
  const r = py('import sys,json;from PIL import Image;im=Image.open(sys.argv[1]);d=[];\nfor i in range(im.n_frames):\n    im.seek(i);d.append(im.info.get("duration"))\nprint(json.dumps([im.n_frames, d, im.info.get("loop"), im.size]))', f); assert.equal(r.status, 0, r.stderr); assert.deepEqual(JSON.parse(r.stdout), [3, [100, 250, 40], 3, [20, 10]]);
  const once = G.encodeGif({ width: 20, height: 10, frames: fr, delay: 100, loop: -1 }); writeFileSync(join(dir, 'once.gif'), once); assert.equal(py('import sys,json;from PIL import Image;im=Image.open(sys.argv[1]);print(json.dumps(im.info.get("loop")))', join(dir, 'once.gif')).stdout.trim(), 'null', 'no loop extension = play once');
});
test('colours survive quantise + encode within the palette error', { skip: !havePil && 'PIL missing' }, () => {
  const w = 16, h = 16, rgba = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const left = (i % w) < 8; rgba.set(left ? [200, 30, 30, 255] : [20, 40, 220, 255], i * 4); }
  const q = quantize(rgba, w, h, 4), gif = G.encodeGif({ width: w, height: h, frames: [{ indices: q.indices, palette: q.palette }] }), f = join(dir, 'c.gif'); writeFileSync(f, gif);
  const r = py('import sys,json;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");print(json.dumps([im.getpixel((2,2)),im.getpixel((12,2))]))', f); const [a, b] = JSON.parse(r.stdout); assert.ok(Math.abs(a[0] - 200) < 8 && Math.abs(a[1] - 30) < 8 && Math.abs(b[2] - 220) < 8, JSON.stringify([a, b]));
});
test('encodeGif rejects an empty list', () => assert.throws(() => G.encodeGif({ width: 1, height: 1, frames: [] }), /No frames/));
