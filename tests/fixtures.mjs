// fixtures.mjs — synthetic image bytes shared by unit tests and browser tests.
const str = s => [...s].map(c => c.charCodeAt(0));
const be16 = n => [n >> 8, n & 255], be32 = n => [n >>> 24, n >> 16 & 255, n >> 8 & 255, n & 255];

/** TIFF block with Make=Canon, Orientation=6 and GPS 52°30'N 13°24'E 34 m (big-endian). */
export function exifTiff() {
  const e = (tag, type, count, val) => [...be16(tag), ...be16(type), ...be32(count), ...val]; const make = str('Canon\0'); const nIfd0 = 3; const makeOff = 8 + 2 + nIfd0 * 12 + 4; const gpsOff = makeOff + make.length;
  const ifd0 = [...be16(nIfd0), ...e(0x010F, 2, make.length, be32(makeOff)), ...e(0x0112, 3, 1, [...be16(6), 0, 0]), ...e(0x8825, 4, 1, be32(gpsOff)), ...be32(0)]; const rat = (n, d) => [...be32(n), ...be32(d)]; const latOff = gpsOff + 2 + 5 * 12 + 4, lonOff = latOff + 24, altOff = lonOff + 24;
  const gps = [...be16(5), ...e(1, 2, 2, [78, 0, 0, 0]), ...e(2, 5, 3, be32(latOff)), ...e(3, 2, 2, [69, 0, 0, 0]), ...e(4, 5, 3, be32(lonOff)), ...e(6, 5, 1, be32(altOff)), ...be32(0)];
  return [...str('MM'), ...be16(42), ...be32(8), ...ifd0, ...make, ...gps, ...rat(52, 1), ...rat(30, 1), ...rat(0, 1), ...rat(13, 1), ...rat(24, 1), ...rat(0, 1), ...rat(34, 1)];
}
/** Inserts an EXIF APP1 segment (with GPS) right after the SOI marker of a real JPEG. */
export function addExif(jpeg) { const payload = [...str('Exif\0\0'), ...exifTiff()]; const seg = Uint8Array.from([0xFF, 0xE1, ...be16(payload.length + 2), ...payload]); const out = new Uint8Array(jpeg.length + seg.length); out.set(jpeg.subarray(0, 2)); out.set(seg, 2); out.set(jpeg.subarray(2), 2 + seg.length); return out; }
