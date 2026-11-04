// icons.mjs
// Inline SVG paths on a 24×24 grid, drawn as sheets of paper so the set reads as one family.

const SHEET = 'M6 3h8l4 4v14H6z M14 3v4h4';

export const ICONS = {
  doc: `<path d="${SHEET}"/><path d="M9 12h6M9 15h6M9 18h3"/>`,
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  table: '<path d="M3 4h18v16H3z"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  image: '<path d="M3 4h18v16H3z"/><circle cx="8.5" cy="9" r="1.6"/><path d="M3 17l5-4.5 3.5 3 4-4.5 5.5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M15 9.2a6 6 0 1 1-5.8 5.8"/><path d="M8 7.5h2.2a1.3 1.3 0 0 1 0 2.6H8.4a1.3 1.3 0 0 0 0 2.6H11"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  note: '<path d="M5 3h14v18H5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
  team: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5M14.5 14.8c2.8-.6 6 .9 6 4.2"/>',
  wave: '<path d="M3 12h2M7 7v10M11 4v16M15 8v8M19 10v4M21.5 12h-1"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  file: `<path d="${SHEET}"/>`,
  merge: '<path d="M3 4h7v9H3z M14 11h7v9h-7z"/><path d="M10 8h4l-1.8-1.8M14 8l-1.8 1.8"/><path d="M10 16h4l-1.8-1.8M10 16l1.8 1.8" opacity="0"/><path d="M6.5 16v3.5H11"/>',
  split: '<path d="M4 3h16v7H4z M4 14h16v7H4z"/><path d="M2 12h3M9 12h2M14 12h2M19 12h3" stroke-dasharray="0"/>',
  extract: `<path d="${SHEET}"/><path d="M10 11h4v5h-4z"/><path d="M12 19v2"/>`,
  delete: `<path d="${SHEET}"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/>`,
  organize: '<path d="M3 3h7v8H3z M14 3h7v8h-7z M3 15h7v6H3z M14 15h7v6h-7z"/>',
  rotate: '<path d="M8 8h9v12H8z"/><path d="M4 12a8 8 0 0 1 8-9l3 0"/><path d="M12.5 .8L15 3l-2.5 2.2"/>',
  crop: '<path d="M6 2v16h16"/><path d="M2 6h16v16"/>',
  compress: `<path d="${SHEET}"/><path d="M12 9v3.5m0 0l-2-2m2 2l2-2M12 19v-3.5m0 0l-2 2m2-2l2 2"/>`,
  ocr: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><path d="M8.5 16l3-8.5 3 8.5M9.6 13.2h3.8"/>',
  flatten: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18h18"/>',
  toWord: `<path d="${SHEET}"/><path d="M9 11l1.3 6 1.7-4.5 1.7 4.5 1.3-6"/>`,
  toExcel: `<path d="${SHEET}"/><path d="M9.5 11.5l5 6M14.5 11.5l-5 6"/>`,
  toImage: `<path d="${SHEET}"/><circle cx="10" cy="11.5" r="1.3"/><path d="M6 18l3.5-3 2.5 2 2.5-3 3.5 4"/>`,
  toText: `<path d="${SHEET}"/><path d="M9 11h6M9 14h6M9 17h4"/>`,
  fromImage: '<path d="M3 4h18v16H3z"/><circle cx="8.5" cy="9" r="1.6"/><path d="M3 17l5-4.5 3.5 3 4-4.5 5.5 6"/>',
  edit: `<path d="${SHEET}"/><path d="M9 18l.6-2.6 5-5 2 2-5 5z"/>`,
  sign: '<path d="M3 17c3-1 4-9 6-9s0 8 2 8 2-3 3.5-3 .5 2.5 2 2.5 2-1 3.5-1.5"/><path d="M3 21h18"/>',
  form: `<path d="${SHEET}"/><path d="M9 11h6v2.5H9z M9 16h6v2.5H9z"/>`,
  watermark: `<path d="${SHEET}"/><path d="M8.5 18l6-8"/><path d="M12 18l3.5-5" opacity=".5"/>`,
  numbers: `<path d="${SHEET}"/><path d="M10.5 14l1.5-1v5.5M10.5 18.5h3"/>`,
  protect: '<path d="M6 11h12v10H6z"/><path d="M8.5 11V7a3.5 3.5 0 0 1 7 0v4"/><path d="M12 15v2.5"/>',
  unlock: '<path d="M6 11h12v10H6z"/><path d="M8.5 11V7a3.5 3.5 0 0 1 6.8-1.2"/><path d="M12 15v2.5"/>',
  redact: `<path d="${SHEET}"/><path d="M8.5 11h7v2.6h-7z" fill="currentColor"/><path d="M8.5 16h7v2.6h-7z" fill="currentColor"/>`,
  metadata: '<path d="M4 4h8.5L20 11.5 12 20l-8-8z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
};

// OHFIS mark, flat: a solid blue tile, a white page with a folded corner and an "O" ring on it
// (the first letter, and a hole punch). Two flat colours plus white; no gradients or shadows.
export const LOGO_TILE = '<rect width="32" height="32" rx="8" fill="#2557D6"/>';
export const LOGO_GLYPH = '<path d="M10.5 6h8.2l4.8 4.8v13.2a2 2 0 0 1-2 2H10.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="#fff"/><path d="M18.7 6v3.4a1.4 1.4 0 0 0 1.4 1.4h3.4z" fill="#A9C0F5"/><circle cx="16" cy="18.4" r="3.9" fill="none" stroke="#2557D6" stroke-width="2.4"/>';
export const LOGO_MARK = LOGO_TILE + LOGO_GLYPH;
export const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${LOGO_MARK}</svg>`;
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${LOGO_MARK}</svg>\n`;
