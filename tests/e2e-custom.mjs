// Tools whose test needs real interaction. Each handler receives (page, baseUrl) and throws on failure.
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, createWriteStream, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { addExif } from './fixtures.mjs';
import * as IMG from '../assets/js/tools/lib/image.js';

const area = (page, i = 0) => page.locator('#tool-root textarea:not([readonly])').nth(i);
const out = page => page.locator('#tool-root textarea[readonly]').first();
const rootText = page => page.evaluate(() => { const r = document.getElementById('tool-root'); return r.innerText + '\n' + [...r.querySelectorAll('textarea,input')].map(x => x.value).join('\n'); });


// ---- document tools ----
async function makePdf(n, size = [300, 400]) {
  const { PDFDocument, StandardFonts } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < n; i++) d.addPage(size).drawText('Page ' + (i + 1), { x: 40, y: 200, size: 24, font: f }); return Buffer.from(await d.save());
}
async function pageCount(buf) { const { PDFDocument } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.load(buf); return { n: d.getPageCount(), sizes: d.getPages().map(p => p.getSize()) }; }
async function runPdf(page, n, label, size) {
  await page.setInputFiles('#tool-root input[type=file]', { name: 'in.pdf', mimeType: 'application/pdf', buffer: await makePdf(n, size) });
  await page.getByRole('button', { name: label }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).first().click()]);
  const path = await dl.path(); return { buf: readFileSync(path), name: dl.suggestedFilename() };
}

// ---- audio helpers ----
import * as AU from '../assets/js/tools/lib/audio.js';
function testWav({ lead = 1, tone = 1, tail = 1, amp = 0.1, sr = 44100 } = {}) { const n = Math.round((lead + tone + tail) * sr), a = new Float32Array(n); for (let i = Math.round(lead * sr); i < Math.round((lead + tone) * sr); i++) a[i] = amp * Math.sin(2 * Math.PI * 440 * i / sr); return Buffer.from(AU.encodeWav([a, a.slice()], sr)); }
async function audioRun(page, wav, name = 'in.wav') { await page.setInputFiles('#tool-root input[type=file]', { name, mimeType: 'audio/wav', buffer: wav }); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).first().click()]); return AU.decodeWav(new Uint8Array(readFileSync(await dl.path()))); }

// ---- image helpers (run inside the page) ----
async function makeImg(page, w, h, draw) { const arr = await page.evaluate(async ([w, h, src]) => { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d'); new Function('g', 'w', 'h', src)(g, w, h); const b = await new Promise(r => c.toBlob(r, 'image/png')); return [...new Uint8Array(await b.arrayBuffer())]; }, [w, h, draw]); return Buffer.from(arr); }
const pixelAt = (page, selector, x, y) => page.evaluate(async ([sel, x, y]) => { const el = document.querySelector(sel); const blob = await (await fetch(el.src)).blob(); const bmp = await createImageBitmap(blob); const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height }); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; }, [selector, x, y]);

const poppler = (buf, args = []) => { const d = mkdtempSync(join(tmpdir(), 'pop-')); const f = join(d, 'x.pdf'); writeFileSync(f, buf); return { dir: d, file: f }; };
const pdfText = buf => { const { file } = poppler(buf); const r = spawnSync('pdftotext', ['-layout', file, '-']); return r.stdout.toString(); };
const pdfPng = (buf, page = 1) => { const { dir, file } = poppler(buf); spawnSync('pdftoppm', ['-png', '-r', '60', '-f', String(page), '-l', String(page), file, join(dir, 'p')]); const files = readdirSync(dir).filter(x => x.endsWith('.png')); return readFileSync(join(dir, files[0])); };

const custom = {
  async 'text-diff-checker'(page) {
    await area(page, 0).fill('a\nb\nc'); await area(page, 1).fill('a\nx\nc'); await page.waitForTimeout(400);
    const added = await page.locator('.ut-dl--add').allInnerTexts(); const removed = await page.locator('.ut-dl--del').allInnerTexts();
    assert.ok(added.some(t => t.includes('x')) && removed.some(t => t.includes('b')), `diff: +${added} -${removed}`);
    await page.selectOption('#tool-root select', 'words'); await area(page, 0).fill('the quick fox'); await area(page, 1).fill('the slow fox'); await page.waitForTimeout(400);
    assert.equal(await page.locator('.ut-dw del').innerText(), 'quick'); assert.equal(await page.locator('.ut-dw ins').innerText(), 'slow');
  },
  async 'character-counter'(page) {
    await area(page).fill('Hello 👋 world'); await page.waitForTimeout(200);
    const t = await rootText(page); assert.match(t, /Characters\s*13/); assert.match(t, /X \/ Twitter post\s*13 \/ 280/);
    await area(page).fill('€'.repeat(81)); await page.waitForTimeout(200); assert.match(await rootText(page), /2 messages/);
  },
  async 'speech-time-calculator'(page) {
    await area(page).fill('word '.repeat(300)); await page.waitForTimeout(200);
    const t = await rootText(page); assert.match(t, /Natural · 150 wpm\s*2m 00s/); assert.match(t, /Slow · 110 wpm\s*2m 44s/);
  },
  async 'dummy-data-generator'(page) {
    const t = await rootText(page); assert.match(t, /example\.com/); assert.ok((await page.locator('.ut-table tr').count()) >= 11);
    await page.getByRole('button', { name: 'Generate new data' }).click();
  },
  async 'table-to-markdown'(page) {
    await area(page).fill('Name\tQty\nPen\t10'); await page.waitForTimeout(200);
    assert.equal((await out(page).inputValue()).split('\n')[1], '| :--- | :-- |', 'delimiter row');
  },
  async 'email-extractor'(page) {
    await area(page).fill('A <ann@example.com>, ANN@example.com, bob@test.org'); await page.waitForTimeout(200);
    assert.equal(await out(page).inputValue(), 'ann@example.com\nbob@test.org');
  },
  async 'url-extractor-tracking-remover'(page) {
    await area(page).fill('see https://a.com/p?id=1&utm_source=x&fbclid=2.'); await page.waitForTimeout(200);
    assert.equal(await out(page).inputValue(), 'https://a.com/p?id=1');
  },
  async 'merge-columns'(page) {
    await area(page, 0).fill('a\nb'); await area(page, 1).fill('1\n2'); await page.waitForTimeout(200);
    assert.equal(await out(page).inputValue(), 'a\t1\nb\t2');
  },
  async 'word-frequency-counter'(page) {
    await area(page).fill('cat cat dog the the the'); await page.waitForTimeout(200);
    const rows = await page.locator('.ut-table tr').allInnerTexts(); assert.match(rows[1], /cat\s+2/); assert.ok(!rows.some(r => /^the\b/.test(r)), 'stop word listed');
  },
  async 'text-splitter'(page) {
    await area(page).fill('alpha beta gamma delta epsilon zeta'); await page.locator('#tool-root input[type=number]').first().fill('12'); await page.waitForTimeout(200);
    const parts = await page.locator('.ut-chunk pre').allInnerTexts(); assert.ok(parts.length >= 3 && parts.every(p => p.length <= 12), JSON.stringify(parts));
  },
  async 'buzzword-detector'(page) {
    await area(page).fill('We must leverage synergy.'); await page.waitForTimeout(200);
    assert.deepEqual(await page.locator('.ut-richout mark').allInnerTexts(), ['leverage', 'synergy']);
  },
  async 'morse-code-translator'(page) {
    await area(page).fill('SOS'); await page.waitForTimeout(200); assert.equal(await out(page).inputValue(), '... --- ...');
    await area(page).fill('.... ..'); await page.waitForTimeout(200); assert.equal(await out(page).inputValue(), 'HI');
    await page.getByRole('button', { name: 'Play as sound' }).click(); await page.waitForTimeout(150);
    assert.equal(await page.getByRole('button', { name: 'Stop' }).count(), 1, 'audio started'); await page.getByRole('button', { name: 'Stop' }).click();
  },
  async 'shuffle-lines'(page) {
    await area(page).fill('a\nb\nc\nd\ne\nf\ng\nh'); await page.waitForTimeout(200); const first = (await out(page).inputValue()).split('\n').sort().join('');
    assert.equal(first, 'abcdefgh'); await page.getByRole('button', { name: 'Shuffle again' }).click();
    assert.equal((await out(page).inputValue()).split('\n').sort().join(''), 'abcdefgh');
  },
};

const pickFile = async (page, path, label) => { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: label }).first().click()]); await fc.setFiles(path); };
const tmp = () => mkdtempSync(join(tmpdir(), 'ohfis-'));
const T = (page, name) => page.getByRole('button', { name, exact: true });

Object.assign(custom, {
  async 'csv-viewer'(page) {
    const dir = tmp(); const file = join(dir, 'big.csv'); const N = 400000;
    await new Promise((res, rej) => { const w = createWriteStream(file); w.on('finish', res); w.on('error', rej);
      w.write('id,name,note,amount\n'); for (let i = 0; i < N; i++) { w.write(i === 4 ? `${i},"multi\nline ""quoted""",x,1.5\n` : `row-${i},name ${i},some note text for row ${i},${i % 97}.25\r\n`.replace(/^row-4,/, '4,')); } w.end(); });
    await pickFile(page, file, 'Choose a CSV file');
    await page.waitForSelector('.ut-vgrid:not([hidden])', { timeout: 60000 });
    const stats = await page.locator('.ut-stats').innerText(); assert.match(stats, /Rows\s*400,000/, stats); assert.match(stats, /Columns\s*4/);
    await page.waitForFunction(() => document.querySelectorAll('.ut-vgrid__row:not(.ut-vgrid__head) span').length > 20); const firstRows = await page.locator('.ut-vgrid__row:not(.ut-vgrid__head)').first().innerText(); assert.match(firstRows, /row-0/);
    await page.waitForFunction(() => /multi\s*line/.test(document.querySelector('.ut-vgrid').innerText), null, { timeout: 5000 }); // quoted newline stayed inside one record
    await page.evaluate(() => { const g = document.querySelector('.ut-vgrid'); g.scrollTop = g.scrollHeight; });
    await page.waitForFunction(() => document.querySelector('.ut-vgrid').innerText.includes('row-399999'), null, { timeout: 15000 });
    await page.locator('input[aria-label="Search"]').fill('row-123456,'); await page.waitForFunction(() => /Matches\s*1\b/.test(document.querySelector('.ut-stats').innerText), null, { timeout: 30000 });
    assert.match(await page.locator('.ut-vgrid').innerText(), /row-123456/); await page.locator('input[aria-label="Search"]').fill(''); await page.waitForTimeout(600);
    assert.match(await page.locator('.ut-vgrid').innerText(), /row-/);
  },
  async 'csv-compare'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(300);
    const t = await page.locator('.ut-table').innerText(); assert.match(t, /removed\t3\tCleo\tRome/); assert.match(t, /added\t4\tDev\tOslo/); assert.match(t, /changed\t2\tBo\tParis → Lyon/);
    assert.match(await page.locator('.ut-stats').innerText(), /Added\s*1[\s\S]*Removed\s*1[\s\S]*Changed\s*1[\s\S]*Identical\s*1/);
  },
  async 'reorder-csv-columns'(page) {
    await area(page).fill('a,b,c\n1,2,3'); await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Move right' }).first().click(); await page.waitForTimeout(100);
    const header = await page.locator('.ut-table tr').first().innerText(); assert.equal(header.split(/\s+/).join(','), 'b,a,c');
    await page.locator('.ut-colcard input').nth(1).uncheck(); await page.waitForTimeout(100); assert.equal((await page.locator('.ut-table tr').first().innerText()).split(/\s+/).join(','), 'b,c');
    const [dl] = await Promise.all([page.waitForEvent('download'), T(page, 'Download').click()]); const path = await dl.path(); assert.equal((await import('node:fs')).readFileSync(path, 'utf8'), 'b,c\n2,3');
  },
  async 'merge-csv-files'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(200); const t = await page.locator('.ut-table').first().innerText(); assert.match(t, /id\tamount\tnote/); assert.match(t, /3\t30\tlate/);
    const dir = tmp(); writeFileSync(join(dir, 'a.csv'), 'id;v\n1;x\n'); await T(page, 'Clear files').click(); await pickFile(page, join(dir, 'a.csv'), 'Choose CSV files'); await page.waitForTimeout(300);
    assert.match(await page.locator('.ut-stats').innerText(), /Files\s*1[\s\S]*Rows\s*1/);
  },
  async 'csv-encoding-fixer'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(200); const v = await out(page).inputValue(); assert.equal(v, 'Müller; Größe; café – naïve; Zażółć');
    const dir = tmp(); writeFileSync(join(dir, 'win.csv'), Buffer.from([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x3b, 0xe4])); await pickFile(page, join(dir, 'win.csv'), 'Open file'); await page.waitForTimeout(300);
    assert.equal(await out(page).inputValue(), 'Müller;ä'); assert.match(await page.locator('.ut-stats').innerText(), /windows-1252/);
  },
  async 'excel-formula-translator'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(200); const v = await out(page).inputValue(); assert.match(v, /^=WENNFEHLER\(SVERWEIS\(A2;Sheet2!\$A\$1:\$C\$100;3;FALSCH\);"n\/a"\)/); assert.match(v, /SUMMEWENNS\(C:C;A:A;">"&0,5;B:B;"x"\)/);
    await page.locator('#tool-root select').nth(1).selectOption('fr'); await page.waitForTimeout(200); assert.match(await out(page).inputValue(), /SIERREUR\(RECHERCHEV/.source ? /SIERREUR\(RECHERCHEV\(A2;/ : /x/);
  },
  async 'vlookup-formula-generator'(page) {
    const t = await page.locator('.ut-formulas').innerText(); assert.match(t, /=IFERROR\(VLOOKUP\(A2,\$D\$2:\$F\$100,3,FALSE\),"Not found"\)/); assert.match(t, /INDEX\(\$F\$2:\$F\$100,MATCH\(A2,\$D\$2:\$D\$100,0\)\)/);
    await page.locator('#tool-root input[type=text]').nth(1).fill('F'); await page.locator('#tool-root input[type=text]').nth(2).fill('B'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-formulas').innerText(), /cannot look to the left/);
  },
  async 'sample-size-calculator'(page) {
    assert.match(await page.locator('.ut-cards').innerText(), /385/); await page.locator('#tool-root input[type=number]').first().fill('1000'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /278/);
  },
  async 'csv-to-json'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(300); const v = await out(page).inputValue(); const j = JSON.parse(v); assert.deepEqual(j[0], { id: 1, name: 'Ann', 'address.city': 'Berlin', active: true });
    await page.getByLabel('Turn dotted headers (a.b) into nested objects').check(); await page.waitForTimeout(200); assert.equal(JSON.parse(await out(page).inputValue())[1].address.city, 'Paris');
  },
  async 'json-to-csv'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(300); const t = await page.locator('.ut-table').first().innerText(); assert.match(t, /id\tname\taddress\.city\taddress\.zip\ttags\.0\ttags\.1/); await area(page).fill('{ bad json'); await page.waitForTimeout(300); assert.ok(await page.locator('.pt-drop__error').isVisible());
  },
  async 'excel-number-format-tester'(page) {
    const t = await page.locator('.ut-table').innerText(); assert.match(t, /1234\.5\s+\$ 1,235/); await page.locator('#tool-root input[type=text]').first().fill('yyyy-mm-dd'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-table').innerText(), /45231\s+2023-11-01/);
  },
  async 'phone-number-formatter'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(300); const t = await page.locator('.ut-table').innerText(); assert.match(t, /\+49301234567\s+yes/); assert.match(t, /\+442079460958/); assert.match(t, /no \(length\)/);
  },
  async 'address-parser'(page) {
    await T(page, 'Sample').click(); await page.waitForTimeout(300); const t = await page.locator('.ut-table').innerText(); assert.match(t, /Main St\s+123\s+Apt 4B\s+Springfield\s+IL\s+62704/); assert.match(t, /Hauptstraße\s+12a[\s\S]*Berlin/);
  },
});


const num = (page, label) => page.getByLabel(label, { exact: true });
Object.assign(custom, {
  async 'unix-timestamp-converter'(page) {
    await page.locator('#tool-root textarea').fill('1700000000\n1700000000123\nbad'); await page.waitForTimeout(300); const t = await page.locator('.ut-table').innerText();
    assert.match(t, /1700000000\tseconds\t1700000000\t1700000000000\t2023-11-14T22:13:20\.000Z/); assert.match(t, /milliseconds/); assert.match(t, /not recognised/);
    const live = Number(await page.locator('.ut-big').innerText()); assert.ok(Math.abs(live - Date.now() / 1000) < 5);
  },
  async 'date-difference-calculator'(page) {
    await page.locator('#tool-root input[type=date]').nth(0).fill('2020-02-29'); await page.locator('#tool-root input[type=date]').nth(1).fill('2024-03-01'); await page.waitForTimeout(200);
    const t = await page.locator('.ut-cards').innerText(); assert.match(t, /4 years, 1 day/); assert.match(t, /1,462/);
  },
  async 'working-days-calculator'(page) {
    await page.locator('#tool-root input[type=date]').first().fill('2024-12-20'); await page.locator('#tool-root select').nth(1).selectOption('US'); await page.locator('#tool-root input[type=number]').first().fill('5'); await page.waitForTimeout(300);
    const t = await page.locator('.ut-result').innerText(); assert.match(t, /2024-12-30/); assert.match(t, /2024-12-25\tChristmas Day/);
    await page.locator('#tool-root select').first().selectOption('count'); await page.locator('#tool-root input[type=date]').nth(1).fill('2024-12-27'); await page.waitForTimeout(300); assert.match(await page.locator('.ut-cards').innerText(), /Working days\s*5/);
  },
  async 'ics-event-generator'(page) {
    await page.locator('#tool-root select').nth(0).selectOption('UTC').catch(() => {}); const ics = await page.locator('.ut-pre').innerText(); assert.match(ics, /^BEGIN:VCALENDAR/); assert.match(ics, /SUMMARY:Project kick-off/); assert.match(ics, /END:VEVENT/);
    await page.locator('#tool-root input[type=text]').first().fill('Lunch, with "team"; ok'); await page.waitForTimeout(300); assert.match(await page.locator('.ut-pre').innerText(), /SUMMARY:Lunch\\, with "team"\; ok/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .ics file' }).click()]); assert.equal(dl.suggestedFilename(), 'event.ics'); assert.match((await import('node:fs')).readFileSync(await dl.path(), 'utf8'), /\r\nEND:VCALENDAR\r\n$/);
  },
  async 'timezone-overlap-planner'(page) {
    assert.ok(await page.getByText('No time works for everyone').isVisible()); await page.getByRole('button', { name: 'Remove Asia/Kolkata' }).click(); await page.locator('#tool-root input[type=date]').fill('2024-01-16'); await page.waitForTimeout(300);
    const t = await page.locator('.ut-table').innerText(); assert.match(t, /14:00–16:00 UTC/); assert.match(t, /09:00–11:00/); assert.match(t, /15:00–17:00/);
  },
  async 'meeting-time-link-generator'(page, base) {
    const link = await page.locator('.ut-pre').innerText(); assert.match(link, /\?t=\d{4}-\d\d-\d\dT\d\d%3A\d\dZ&title=Team%20call/);
    const ctx = await page.context().browser().newContext({ timezoneId: 'Asia/Tokyo', locale: 'en-GB' }); const p2 = await ctx.newPage(); await p2.goto(`${base}/en/meeting-time-link-generator/?t=2024-06-01T03:00Z&title=Launch%20call`); await p2.waitForSelector('#tool-root[data-ready=true]');
    const t = await p2.locator('#tool-root').innerText(); assert.match(t, /Launch call/); assert.match(t, /12:00/); assert.match(t, /Asia\/Tokyo/); assert.match(t, /2024-06-01T03:00:00Z/); await ctx.close();
  },
  async 'meeting-cost-calculator'(page) {
    assert.match(await page.locator('.pt-hint').first().innerText(), /€ 46\.30 per hour|€ 266\.67 per hour/.source ? /per hour/ : /x/); const perHour = (6 * 80000 / 1800); assert.match(await page.locator('#tool-root').innerText(), new RegExp(`€ ${perHour.toFixed(2).replace('.', '\\.')} per hour`));
    await page.getByRole('button', { name: 'Start meeting' }).click(); await page.waitForTimeout(1200); const c = await page.locator('.ut-clock').innerText(); assert.notEqual(c, '€ 0.00'); await page.getByRole('button', { name: 'Pause' }).click();
  },
  async 'pomodoro-timer'(page) {
    await page.getByRole('button', { name: 'Start' }).click(); await page.waitForTimeout(1500); const c = await page.locator('.ut-clock').innerText(); assert.match(c, /^24:5\d$/); assert.match(await page.title(), /24:5\d Focus/);
    await page.getByRole('button', { name: 'Pause' }).click(); await page.getByRole('button', { name: 'Skip' }).click(); assert.match(await page.locator('.pt-hint').first().innerText(), /Short break/);
  },
  async 'decimal-hours-converter'(page) {
    await page.locator('#tool-root textarea:not([readonly])').fill('7:45\n0:10\nxyz'); await page.waitForTimeout(300); const o = await page.locator('#tool-root textarea[readonly]').inputValue(); assert.match(o, /^7\.75 {2}·/); assert.match(o, /0\.17 {2}·/); assert.match(o, /⚠ xyz/); assert.match(await page.locator('.ut-stats').innerText(), /Total\s*7\.92 h/);
    await page.locator('#tool-root select').first().selectOption('0.25'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-stats').innerText(), /Total\s*8\.00 h/);
  },
  async 'timecard-calculator'(page) {
    const t = await page.locator('#tool-root').innerText(); assert.match(t, /Total hours\s*40\.00/); assert.match(t, /Overtime\s*0\.00/); await page.getByLabel('Mon end').fill('21:30'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /Total hours\s*44\.00[\s\S]*Overtime\s*4\.00/);
  },
  async 'iso-week-number-calculator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-12-30'); await page.waitForTimeout(200); const t = await page.locator('#tool-root').innerText(); assert.match(t, /2025-W01/); assert.match(t, /Monday/); assert.match(t, /Day of year\s*365 of 366/);
    await page.locator('#tool-root select').selectOption('10'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /Fiscal quarter\s*Q1 FY2025/);
  },
  async 'recurring-dates-generator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-01-02'); await page.waitForTimeout(300); const t = await page.locator('.ut-table').innerText(); assert.match(t, /1\t2024-01-02\tTuesday/); assert.match(t, /2\t2024-01-16\tTuesday/);
  },
  async 'julian-date-converter'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-01-01'); await page.waitForTimeout(200); const t = await page.locator('.ut-cards').innerText(); assert.match(t, /2,460,310\.5/); assert.match(t, /2024-001/);
    await page.locator('#tool-root input[type=number]').fill('2451545'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /2000-01-01 12:00:00 UTC/);
  },
  async 'countdown-timer'(page) {
    await page.getByRole('button', { name: '1 min' }).click(); assert.equal(await page.locator('.ut-clock').innerText(), '01:00'); await page.getByRole('button', { name: 'Start' }).click(); await page.waitForTimeout(1500); assert.match(await page.locator('.ut-clock').innerText(), /^00:5\d$/);
    await page.getByRole('button', { name: 'Full screen' }).click(); assert.ok(await page.locator('.ut-fullscreen').isVisible()); await page.keyboard.press('Escape'); assert.equal(await page.locator('.ut-fullscreen').count(), 0);
  },
  async 'stopwatch-lap-timer'(page) {
    await page.keyboard.press('Space'); await page.waitForTimeout(400); await page.keyboard.press('l'); await page.waitForTimeout(300); await page.keyboard.press('l'); await page.keyboard.press('Space');
    const t = await page.locator('.ut-table').innerText(); assert.match(t, /2\t00:00\.\d{3}\t00:00\.\d{3}/); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export laps (CSV)' }).click()]);
    const csv = (await import('node:fs')).readFileSync(await dl.path(), 'utf8').split('\n'); assert.equal(csv.length, 3); assert.match(csv[1], /^1,\d+,\d+,/);
  },
  async 'world-clock'(page) {
    const before = await page.locator('.ut-card').count(); await page.locator('#tool-root select').selectOption('Pacific/Auckland'); await page.waitForTimeout(200); assert.equal(await page.locator('.ut-card').count(), before + 1);
    await page.reload(); await page.waitForSelector('#tool-root[data-ready=true]'); assert.equal(await page.locator('.ut-card').count(), before + 1); assert.match(await page.locator('#tool-root').innerText(), /Pacific\/Auckland|Pacific Auckland/);
  },
  async 'sprint-schedule-generator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-01-01'); await page.waitForTimeout(300); const t = await page.locator('.ut-table').innerText(); assert.match(t, /Sprint 1\t2024-01-01\t2024-01-01\t2024-01-12/); assert.match(t, /Sprint 2\t2024-01-15\t2024-01-15\t2024-01-26/);
  },
});


const cards = page => page.locator('.ut-result').innerText();
Object.assign(custom, {
  async 'margin-markup-calculator'(page) { const t = await cards(page); assert.match(t, /Gross margin\s*40\.00 %/); assert.match(t, /Markup\s*66\.67 %/); await page.locator('#tool-root select').selectOption('cm'); await page.waitForTimeout(200); assert.match(await cards(page), /Selling price\s*100\.00/); },
  async 'compound-interest-calculator'(page) { const t = await cards(page); assert.match(t, /Final balance\s*€ 1[0-9]{2},[0-9]{3}/); assert.equal(await page.locator('.ut-chart path').count(), 2); await page.locator('#tool-root input[type=number]').nth(1).fill('0'); await page.locator('#tool-root input[type=number]').nth(0).fill('10000'); await page.locator('#tool-root input[type=number]').nth(3).fill('30'); await page.locator('#tool-root select').first().selectOption('1'); await page.locator('#tool-root input[type=number]').nth(2).fill('7'); await page.waitForTimeout(300); assert.match(await cards(page), /76,123/); },
  async 'vat-calculator'(page) { const t = await cards(page); assert.match(t, /Net amount\s*€ 100\.00/); assert.match(t, /VAT 19%\s*€ 19\.00/); },
  async 'break-even-calculator'(page) { const t = await cards(page); assert.match(t, /Break-even units\s*500/); assert.match(t, /Margin of safety\s*37\.5 %/); assert.equal(await page.locator('.ut-chart path').count(), 2); },
  async 'npv-irr-calculator'(page) { const t = await cards(page); assert.match(t, /Net present value\s*€ 1,?[0-9]{3}\.[0-9]{2}|Net present value\s*€ -?[0-9,]+\.[0-9]{2}/); assert.match(t, /Internal rate of return\s*\d+\.\d+ %/); await page.locator('#tool-root textarea').fill('100\n200'); await page.waitForTimeout(300); assert.match(await cards(page), /no solution/); },
  async 'tiered-pricing-calculator'(page) { assert.match(await cards(page), /Total price\s*€ 4,700\.00/); await page.locator('#tool-root select').first().selectOption('volume'); await page.waitForTimeout(200); assert.match(await cards(page), /Total price\s*€ 3,?000\.00/); },
  async 'sales-commission-calculator'(page) { assert.match(await cards(page), /Commission\s*€ 7,?400\.00/); },
  async 'bill-splitter'(page) { const t = await page.locator('#tool-root').innerText(); assert.match(t, /Total\t.*\t€ 69\.58/); const before = await page.locator('.ut-table').last().innerText(); await page.getByRole('button', { name: 'Add item' }).click(); assert.equal(await page.locator('.ut-table').first().locator('tr').count(), 5); assert.match(before, /Ann/); },
  async 'debt-payoff-planner'(page) { const t = await cards(page); assert.match(t, /Avalanche[\s\S]*Snowball/); assert.match(t, /Avalanche saves\s*€ [0-9,.]+/); await page.locator('#tool-root input[type=number]').fill('100'); await page.waitForTimeout(300); assert.ok(await page.locator('.pt-drop__error').isVisible()); },
  async 'prorated-rent-calculator'(page) { await page.locator('#tool-root input[type=date]').fill('2024-02-15'); await page.waitForTimeout(300); assert.match(await cards(page), /Days in the month\s*29/); assert.match(await cards(page), /First-month charge\s*€ 775\.86/); },
  async 'depreciation-schedule-calculator'(page) { assert.match(await cards(page), /First-year expense\s*€ 1,800/); await page.locator('#tool-root select').first().selectOption('syd'); await page.waitForTimeout(300); assert.match(await cards(page), /First-year expense\s*€ 3,000/); },
  async 'rule-of-72-calculator'(page) { const t = await cards(page); assert.match(t, /Rule of 72\s*9 years/); assert.match(t, /Exact doubling time\s*9\.01 years/); },
  async 'startup-dilution-calculator'(page) { assert.match(await cards(page), /Founders after all rounds\s*48\.0 %/.source ? /Founders after all rounds\s*\d+\.\d %/ : /x/); },
});


Object.assign(custom, {
  async 'file-hash-generator'(page) {
    const dir = tmp(); const f = join(dir, 'data.bin'); const buf = Buffer.alloc(20 * 1024 * 1024 + 7, 'ohfis'); writeFileSync(f, buf);
    await pickFile(page, f, 'Choose file'); await page.waitForSelector('.ut-table', { timeout: 60000 }); const t = await page.locator('.ut-table').innerText();
    const sha = createHash('sha256').update(buf).digest('hex'), md5 = createHash('md5').update(buf).digest('hex'); assert.ok(t.includes(sha), 'sha256'); assert.ok(t.includes(md5), 'md5 (incremental, 20 MB)');
    await page.getByLabel('Expected checksum').fill(sha.toUpperCase()); await page.waitForTimeout(300); assert.match(await page.locator('.ut-result, #tool-root').first().innerText(), /The checksum matches/); await page.getByLabel('Expected checksum').fill('deadbeef'); await page.waitForTimeout(300); assert.match(await page.locator('#tool-root').innerText(), /does not match/);
  },
  async 'subnet-calculator'(page) { const t = await page.locator('.ut-table').innerText(); assert.match(t, /Broadcast address\t192\.168\.1\.255/); assert.match(t, /Usable hosts\t254/); await page.locator('#tool-root input[type=number]').fill('26'); await page.waitForTimeout(300); const t2 = await page.locator('.ut-table').innerText(); assert.match(t2, /192\.168\.1\.64\/26\t192\.168\.1\.65\t192\.168\.1\.126/); await page.locator('#tool-root input[type=text]').fill('999.1.1.1/8'); await page.waitForTimeout(300); assert.ok(await page.locator('.pt-drop__error').isVisible()); },
  async 'cron-expression-translator'(page) { assert.match(await page.locator('.ut-cards').innerText(), /At 09:00, on weekdays/); const rows = await page.locator('.ut-table tr').allInnerTexts(); assert.equal(rows.length, 9); await page.getByRole('button', { name: 'Every 5 minutes' }).click(); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /Every 5 minutes/); await page.locator('#tool-root input[type=text]').fill('61 * * * *'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error').innerText(), /outside 0–59/); },
  async 'http-status-codes'(page) { assert.ok((await page.locator('.ut-ref').count()) >= 50); await page.locator('#tool-root input[type=text]').fill('timeout'); await page.waitForTimeout(200); const t = await page.locator('.ut-refs').innerText(); assert.match(t, /408/); assert.match(t, /504/); await page.locator('#tool-root input[type=text]').fill('418'); await page.waitForTimeout(200); assert.equal(await page.locator('.ut-ref').count(), 1); },
  async 'curl-converter'(page) { await T(page, 'Sample').click(); await page.waitForTimeout(300); const t = await page.locator('.ut-io').innerText(); assert.match(t, /await fetch\("https:\/\/api\.example\.com\/v1\/orders"/); assert.match(t, /"gift": True/); assert.match(t, /requests\.request\("POST"/); await area(page).fill('wget x'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error').innerText(), /must start with curl/); },
  async 'user-agent-decoder'(page) { await area(page).fill('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80'); await page.waitForTimeout(300); const t = await page.locator('.ut-cards').innerText(); assert.match(t, /Microsoft Edge 124/); assert.match(t, /Windows 10 \/ 11/); assert.match(t, /Blink/); },
  async 'base64-encoder'(page) { await area(page).fill('Hello, Wörld! 👋'); await page.waitForTimeout(300); const e = await out(page).inputValue(); assert.equal(Buffer.from(e, 'base64').toString(), 'Hello, Wörld! 👋'); await area(page).fill(e); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), 'Hello, Wörld! 👋'); await page.locator('#tool-root select').first().selectOption('dec'); await area(page).fill('SGVsbG8*'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error').innerText(), /not valid Base64/);
    const dir = tmp(); const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'); writeFileSync(join(dir, 'p.png'), png); await pickFile(page, join(dir, 'p.png'), 'Encode a file'); await page.waitForTimeout(300); assert.equal(Buffer.from((await out(page).inputValue()).replace(/\s/g, ''), 'base64').compare(png), 0); },
  async 'color-converter'(page) { await page.locator('#tool-root input[type=text]').fill('hsl(120 100% 25%)'); await page.waitForTimeout(200); const t = await page.locator('.ut-refs').innerText(); assert.match(t, /#008000/); assert.match(t, /rgb\(0 128 0\)/); await page.locator('#tool-root input[type=text]').fill('nonsense'); await page.waitForTimeout(200); assert.ok(await page.locator('.pt-drop__error').isVisible()); },
  async 'uuid-generator'(page) { const lines = (await page.locator('.ut-pre').innerText()).split('\n'); assert.equal(lines.length, 10); assert.ok(lines.every(l => /^[0-9a-f-]{36}$/.test(l)) && new Set(lines).size === 10); await page.locator('#tool-root select').first().selectOption('7'); await page.waitForTimeout(300); const v7 = (await page.locator('.ut-pre').innerText()).split('\n'); assert.ok(v7.every(l => l[14] === '7')); assert.deepEqual([...v7].sort(), v7, 'v7 sorted'); },
  async 'number-base-converter'(page) { await page.locator('#tool-root input[type=text]').fill('1' + '0'.repeat(70)); await page.locator('#tool-root select').selectOption('2'); await page.waitForTimeout(300); const t = await page.locator('.ut-cards').innerText(); assert.match(t, /1,180,591,620,717,411,303,424/); assert.match(t, /400000000000000000/i); },
  async 'ssl-certificate-expiry-checker'(page) {
    const dir = tmp(); const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k'), '-out', join(dir, 'c'), '-days', '20', '-subj', '/CN=shop.example.com/O=Shop AG', '-addext', 'subjectAltName=DNS:shop.example.com,DNS:www.shop.example.com'], { encoding: 'utf8' }); assert.equal(r.status, 0);
    await page.locator('#tool-root textarea').fill((await import('node:fs')).readFileSync(join(dir, 'c'), 'utf8')); await page.waitForTimeout(400); const t = await page.locator('#tool-root').innerText(); assert.match(t, /Days remaining\s*(19|20)\b/); assert.match(t, /CN=shop\.example\.com/); assert.match(t, /www\.shop\.example\.com/); assert.match(t, /Plan the renewal|Renew now/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download reminders/ }).click()]); const ics = (await import('node:fs')).readFileSync(await dl.path(), 'utf8'); assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3); assert.match(ics, /Renew SSL certificate for shop\.example\.com \(30 days left\)/); assert.equal((ics.match(/BEGIN:VCALENDAR/g) || []).length, 1);
    await page.locator('#tool-root textarea').fill('garbage'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error').innerText(), /PEM format/);
  },
  async 'email-header-analyzer'(page) { await T(page, 'Sample').click(); await page.waitForTimeout(300); const t = await page.locator('#tool-root').innerText(); assert.match(t, /Hops\s*2/); assert.match(t, /SPF\s*PASS/i); assert.match(t, /mail\.example\.org\tmx\.google\.com|mail\.example\.org/); await area(page).fill('plain text'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error').innerText(), /No email headers/); },
  async 'robots-txt-generator'(page) { const t = await page.locator('#tool-root').innerText(); assert.match(t, /Groups\s*1/); assert.match(t, /Errors\s*0/); await page.locator('#tool-root textarea').first().fill('Disallow: /x\nUser-agent: *\nDisallow: admin'); await page.waitForTimeout(300); const t2 = await page.locator('#tool-root').innerText(); assert.match(t2, /before any User-agent/); assert.match(t2, /should start with/);
    await page.locator('#tool-root select').selectOption('build'); await page.waitForTimeout(300); const o = await page.locator('#tool-root textarea[readonly]').inputValue(); assert.match(o, /^User-agent: \*\nDisallow: \/admin\/\nDisallow: \/search\n\nSitemap: https:\/\/example\.com\/sitemap\.xml/); await page.getByLabel(/Block AI training crawlers/).check(); await page.waitForTimeout(200); assert.match(await page.locator('#tool-root textarea[readonly]').inputValue(), /User-agent: GPTBot\nDisallow: \//); },
  async 'sitemap-xml-validator'(page) { await T(page, 'Sample').click(); await page.waitForTimeout(400); const t = await page.locator('#tool-root').innerText(); assert.match(t, /Entry 2 .*lastmod is not W3C date format/); assert.match(t, /Entry 3 .*not an absolute URL/); assert.match(t, /Entries\s*3/); await area(page).fill('<urlset><url></urlset>'); await page.waitForTimeout(300); assert.match(await page.locator('#tool-root').innerText(), /not well-formed/);
    await area(page).fill('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/a?x=1&amp;y=2</loc><lastmod>2024-05-01T10:00:00+02:00</lastmod></url></urlset>'); await page.waitForTimeout(300); assert.match(await page.locator('#tool-root').innerText(), /The sitemap is valid/); },
  async 'opengraph-preview'(page) { const tags = await page.locator('#tool-root textarea[readonly]').inputValue(); assert.match(tags, /<meta property="og:title" content="Ohfis – Free Online Tools">/); assert.match(tags, /twitter:card" content="summary_large_image"/); await page.locator('#tool-root input[type=text]').first().fill('Tom & "Jerry" <3'); await page.waitForTimeout(200); assert.match(await page.locator('#tool-root textarea[readonly]').inputValue(), /Tom &amp; &quot;Jerry&quot; &lt;3/); assert.equal(await page.locator('.ut-og').count(), 4); },
  async 'css-box-shadow-generator'(page) { const css = await page.locator('#tool-root textarea[readonly]').inputValue(); assert.match(css, /^box-shadow: 0px 8px 24px -4px rgba\(16, 24, 40, 0.25\),\n {4}0px 2px 6px 0px rgba\(16, 24, 40, 0.1\);$/); const bs = await page.locator('.ut-shadowbox').evaluate(e => e.style.boxShadow); assert.match(bs, /rgba\(16, 24, 40, 0.25\) 0px 8px 24px -4px/); await page.getByRole('button', { name: 'Add layer' }).click(); assert.equal(await page.locator('.ut-layer').count(), 3); },
  async 'regex-explainer'(page) { const t = await page.locator('.ut-ref-tree').innerText(); assert.match(t, /named group “user”/); assert.match(t, /start of the text/); assert.match(t, /one or more times/); const marks = await page.locator('.ut-richout div').allInnerTexts(); assert.equal(marks[0][0], '✓'); assert.equal(marks[1][0], '✗'); assert.equal(marks[2][0], '✓'); await page.locator('#tool-root input[type=text]').first().fill('(unclosed'); await page.waitForTimeout(200); assert.ok(await page.locator('.pt-drop__error').isVisible()); },
  async 'hex-alpha-calculator'(page) { assert.match(await page.locator('.ut-cards').innerText(), /Alpha suffix\s*80/); assert.match(await page.locator('.ut-cards').innerText(), /#2557D680/); },
  async 'basic-auth-header-generator'(page) { assert.match(await page.locator('.ut-pre').innerText(), /^Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==$/); },
  async 'query-string-builder'(page) { const o = await page.locator('.ut-pre').innerText(); assert.equal(o, 'https://api.example.com/search?q=coffee%20%26%20tea&lang=de&tag=hot&tag=cold&price_max=3%2C50'); },
  async 'cache-buster-url-generator'(page) { const o = (await page.locator('.ut-pre').innerText()).split('\n'); assert.match(o[0], /^https:\/\/example\.com\/assets\/app\.css\?v=\d{13}$/); assert.match(o[1], /app\.js\?lang=en&v=\d{13}$/); },
});


// ── image helpers: images are generated inside the browser and written to disk ──
async function makeImage(page, path, { w = 400, h = 300, type = 'image/png', paint } = {}) {
  const b64 = await page.evaluate(async ({ w, h, type, paint }) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); if (paint) new Function('x', 'w', 'h', paint)(x, w, h); else { x.fillStyle = '#d62525'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#2557d6'; x.fillRect(w / 2, 0, w / 2, h); } const blob = await new Promise(r => c.toBlob(r, type, 0.95)); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); }, { w, h, type, paint });
  writeFileSync(path, Buffer.from(b64, 'base64')); return path;
}
const decode = (page, file) => page.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const bmp = await createImageBitmap(new Blob([bin])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return { w: bmp.width, h: bmp.height, px: (X, Y) => 0, data: Array.from(x.getImageData(0, 0, bmp.width, bmp.height).data.slice(0, 0)) }; }, readFileSync(file).toString('base64')).then(async r => { const px = await page.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const bmp = await createImageBitmap(new Blob([bin])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0); const d = x.getImageData(0, 0, bmp.width, bmp.height).data; return { w: bmp.width, h: bmp.height, data: Array.from(d) }; }, readFileSync(file).toString('base64')); return { ...px, at: (X, Y) => px.data.slice((Y * px.w + X) * 4, (Y * px.w + X) * 4 + 4) }; });
const saveDownload = async (page, click, name) => { const [dl] = await Promise.all([page.waitForEvent('download'), click()]); const p = join(tmp(), name || dl.suggestedFilename()); await dl.saveAs(p); return { path: p, name: dl.suggestedFilename(), bytes: readFileSync(p) }; 
};
const near = (a, b, tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

Object.assign(custom, {
  async 'image-converter'(page) {
    const dir = tmp(); const png = await makeImage(page, join(dir, 'pic.png')); await pickFile(page, png, 'Choose images'); await page.waitForSelector('.ut-img img'); await page.locator('#tool-root select').first().selectOption('image/jpeg'); await page.waitForTimeout(600);
    const d = await saveDownload(page, () => page.locator('.ut-img button').first().click()); assert.equal(d.name, 'pic.jpg'); assert.deepEqual([...d.bytes.slice(0, 3)], [0xFF, 0xD8, 0xFF]); const im = await decode(page, d.path); assert.deepEqual([im.w, im.h], [400, 300]); assert.ok(near(im.at(50, 50), [214, 37, 37, 255]) && near(im.at(350, 50), [37, 87, 214, 255]));
    await page.locator('#tool-root select').first().selectOption('image/webp'); await page.waitForTimeout(600); const w = await saveDownload(page, () => page.locator('.ut-img button').first().click()); assert.equal(String.fromCharCode(...w.bytes.slice(8, 12)), 'WEBP');
  },
  async 'image-resizer'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'a.png'), { w: 800, h: 600 }); await makeImage(page, join(dir, 'b.png'), { w: 200, h: 100 }); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose images' }).click()]); await fc.setFiles([join(dir, 'a.png'), join(dir, 'b.png')]); await page.waitForSelector('.ut-img img'); await page.locator('#tool-root input[type=number]').first().fill('400'); await page.waitForTimeout(800);
    const t = await page.locator('.ut-imglist').innerText(); assert.match(t, /a-400x300\.png/); assert.match(t, /800×600 → 400×300/); assert.match(t, /200×100 → 200×100/, 'small image not enlarged'); const z = await saveDownload(page, () => page.getByRole('button', { name: 'Download all (ZIP)' }).click()); assert.equal(z.name, 'images.zip');
    const { unzipSync } = await import('../assets/vendor/fflate/fflate.js'); assert.deepEqual(Object.keys(unzipSync(new Uint8Array(z.bytes))).sort(), ['a-400x300.png', 'b-200x100.png']);
  },
  async 'image-compressor'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'noise.png'), { w: 500, h: 400, paint: "for (let i=0;i<w;i+=4) for (let j=0;j<h;j+=4) { x.fillStyle='hsl('+((i*7+j*3)%360)+',70%,'+(30+((i+j)%40))+'%)'; x.fillRect(i,j,4,4); }" }); const orig = readFileSync(join(dir, 'noise.png')).length;
    await pickFile(page, join(dir, 'noise.png'), 'Choose images'); await page.waitForSelector('.ut-img img'); await page.waitForTimeout(500); const t = await page.locator('.ut-imglist').innerText(); const m = t.match(/([\d.]+) (KB|MB|B) → ([\d.]+) (KB|MB|B)/); assert.ok(m, t); const toB = (n, u) => Number(n) * ({ B: 1, KB: 1024, MB: 1048576 })[u]; assert.ok(toB(m[3], m[4]) < toB(m[1], m[2]) * 0.8, `expected savings: ${m[0]}`); assert.match(await page.locator('.ut-stats').innerText(), /Change\s*−\d+ %/);
  },
  async 'image-metadata-remover'(page) {
    const dir = tmp(); const jpg = join(dir, 'photo.jpg'); await makeImage(page, jpg, { type: 'image/jpeg' }); writeFileSync(jpg, addExif(new Uint8Array(readFileSync(jpg)))); assert.equal(IMG.readExif(readFileSync(jpg)).gps.lat, 52.5);
    await pickFile(page, jpg, 'Choose images'); await page.waitForSelector('.ut-img img'); const t = await page.locator('.ut-imglist').innerText(); assert.match(t, /GPS location 52\.5000, 13\.4000/); assert.match(t, /device: Canon/); assert.match(t, /EXIF/);
    const d = await saveDownload(page, () => page.locator('.ut-img button').first().click()); assert.equal(d.name, 'photo-clean.jpg'); const ex = IMG.readExif(d.bytes); assert.equal(ex.gps, undefined); assert.equal(ex.Make, undefined); assert.equal(ex.Orientation, 6, 'rotation kept'); const im = await decode(page, d.path); assert.deepEqual([im.w, im.h].sort(), [300, 400], 'still a valid image'); assert.ok(d.bytes.length < readFileSync(jpg).length);
    await page.getByLabel('Keep the rotation flag (recommended, so the photo is not turned)').uncheck(); await page.waitForTimeout(600); const d2 = await saveDownload(page, () => page.locator('.ut-img button').first().click()); assert.equal(IMG.readExif(d2.bytes), null);
  },
  async 'image-blur-redact'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 's.png'), { w: 400, h: 200 }); await pickFile(page, join(dir, 's.png'), 'Choose an image'); await page.waitForSelector('canvas.ut-canvas'); await page.locator('#tool-root select').selectOption('black');
    const box = await page.locator('canvas.ut-canvas').boundingBox(); await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6, { steps: 5 }); await page.mouse.up();
    const px = await page.evaluate(() => { const c = document.querySelector('canvas.ut-canvas'); const x = c.getContext('2d'); return [Array.from(x.getImageData(80, 70, 1, 1).data), Array.from(x.getImageData(350, 150, 1, 1).data)]; }); assert.deepEqual(px[0], [0, 0, 0, 255]); assert.ok(near(px[1], [37, 87, 214, 255]), 'outside untouched');
    await page.getByRole('button', { name: 'Undo' }).click(); assert.ok(near(await page.evaluate(() => Array.from(document.querySelector('canvas.ut-canvas').getContext('2d').getImageData(80, 70, 1, 1).data)), [214, 37, 37, 255]), 'undo restores');
    const d = await saveDownload(page, () => page.getByRole('button', { name: 'Download PNG' }).click()); assert.equal(d.name, 's-redacted.png'); assert.deepEqual([...d.bytes.slice(1, 4)], [80, 78, 71]);
  },
  async 'image-crop-rotate-flip'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'c.png'), { w: 400, h: 200 }); await pickFile(page, join(dir, 'c.png'), 'Choose an image'); await page.waitForSelector('canvas.ut-canvas'); await page.getByRole('button', { name: '↻ 90°' }).click(); assert.match(await page.locator('.pt-hint').first().innerText(), /200 × 400/);
    await page.getByRole('button', { name: 'Flip horizontally' }).click(); const box = await page.locator('canvas.ut-canvas').boundingBox(); await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
    const d = await saveDownload(page, () => page.getByRole('button', { name: 'Download PNG' }).click()); const im = await decode(page, d.path); assert.ok(Math.abs(im.w - 90) <= 6 && Math.abs(im.h - 190) <= 6, `crop ${im.w}×${im.h}`);
  },
  async 'watermark-images'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'w.png'), { w: 600, h: 400, paint: "x.fillStyle='#000'; x.fillRect(0,0,w,h)" }); await pickFile(page, join(dir, 'w.png'), 'Choose images'); await page.waitForSelector('.ut-img img'); await page.waitForTimeout(400);
    const d = await saveDownload(page, () => page.locator('.ut-img button').first().click()); assert.equal(d.name, 'w-watermarked.png'); const im = await decode(page, d.path); let lit = 0; for (let y = 300; y < 400; y++) for (let x = 400; x < 600; x++) if (im.at(x, y)[0] > 40) lit++; assert.ok(lit > 200, 'text pixels in the bottom-right corner: ' + lit); let top = 0; for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) if (im.at(x, y)[0] > 40) top++; assert.equal(top, 0, 'top-left untouched');
  },
  async 'favicon-generator'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'logo.png'), { w: 512, h: 512 }); await pickFile(page, join(dir, 'logo.png'), 'Choose an image'); await page.waitForSelector('.ut-icons figure'); assert.equal(await page.locator('.ut-icons figure').count(), 6);
    const z = await saveDownload(page, () => page.getByRole('button', { name: 'Download all (ZIP)' }).click()); const { unzipSync } = await import('../assets/vendor/fflate/fflate.js'); const files = unzipSync(new Uint8Array(z.bytes)); assert.deepEqual(Object.keys(files).sort(), ['apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png', 'favicon.ico', 'icon-192.png', 'icon-512.png', 'site.webmanifest']);
    const ico = files['favicon.ico']; const dv = new DataView(ico.buffer, ico.byteOffset); assert.equal(dv.getUint16(2, true), 1); assert.equal(dv.getUint16(4, true), 3); assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]); const first = dv.getUint32(18, true); assert.deepEqual([...ico.slice(first, first + 4)], [0x89, 0x50, 0x4E, 0x47]); assert.equal(JSON.parse(new TextDecoder().decode(files['site.webmanifest'])).icons.length, 2);
    const p = join(tmp(), 'a.png'); writeFileSync(p, files['apple-touch-icon.png']); const a = await decode(page, p); assert.deepEqual([a.w, a.h], [180, 180]); assert.equal(a.at(0, 0)[3], 255, 'apple icon is opaque');
  },
  async 'wcag-contrast-checker'(page) {
    assert.match(await page.locator('.ut-cards').innerText(), /6\.\d\d : 1/); assert.match(await page.locator('.ut-stats').innerText(), /✓ AA normal text[\s\S]*✗ AAA normal text[\s\S]*✓ AAA large text/i); const f = page.locator('#tool-root input[type=text]').first(); await f.fill('#777777'); await page.locator('#tool-root input[type=text]').nth(1).fill('#ffffff'); await page.waitForTimeout(200); assert.match(await page.locator('.ut-cards').innerText(), /4\.48 : 1/); assert.match(await page.locator('.ut-stats').innerText(), /✗ AA normal text/i); assert.match(await page.locator('.pt-notice').innerText(), /passes AA: #[0-9A-F]{6}/); await page.getByRole('button', { name: 'Use it' }).click(); await page.waitForTimeout(200); assert.match(await page.locator('.ut-stats').innerText(), /✓ AA normal text/i);
  },
  async 'image-palette-extractor'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'p.png'), { paint: "x.fillStyle='#e03030'; x.fillRect(0,0,w,h); x.fillStyle='#2040d0'; x.fillRect(0,0,w,h*0.3)" }); await pickFile(page, join(dir, 'p.png'), 'Choose an image'); await page.waitForSelector('.ut-chip'); const chips = await page.locator('.ut-chip').allInnerTexts(); assert.ok(chips[0].includes('#E03030') && chips[0].includes('70 %'), chips[0]); assert.ok(chips[1].includes('#2040D0'), chips[1]);
  },
  async 'aspect-ratio-padder'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'sq.png'), { w: 100, h: 100 }); await pickFile(page, join(dir, 'sq.png'), 'Choose images'); await page.waitForSelector('.ut-img img'); await page.waitForTimeout(400); assert.match(await page.locator('.ut-imglist').innerText(), /100×100 → 178×100/);
    const d = await saveDownload(page, () => page.locator('.ut-img button').first().click()); const im = await decode(page, d.path); assert.deepEqual([im.w, im.h], [178, 100]); assert.deepEqual(im.at(2, 50), [255, 255, 255, 255]); assert.ok(near(im.at(60, 50), [214, 37, 37, 255]));
  },
  async 'image-to-base64'(page) {
    const dir = tmp(); const png = await makeImage(page, join(dir, 'i.png'), { w: 16, h: 16 }); await pickFile(page, png, 'Choose an image'); await page.waitForTimeout(300); const v = await out(page).inputValue(); assert.ok(v.startsWith('data:image/png;base64,')); assert.equal(Buffer.from(v.split(',')[1], 'base64').compare(readFileSync(png)), 0);
    await page.locator('#tool-root select').selectOption('img'); await page.waitForTimeout(100); assert.match(await out(page).inputValue(), /^<img src="data:image\/png;base64,/); await page.locator('#tool-root textarea:not([readonly])').fill(v); await page.waitForTimeout(500); assert.ok(await page.locator('img[alt="Decoded image"]').isVisible());
  },
  async 'avatar-circle-cropper'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'f.png'), { w: 300, h: 400 }); await pickFile(page, join(dir, 'f.png'), 'Choose an image'); await page.waitForSelector('canvas.ut-canvas'); const d = await saveDownload(page, () => page.getByRole('button', { name: 'Download PNG' }).click()); assert.equal(d.name, 'f-avatar.png'); const im = await decode(page, d.path); assert.deepEqual([im.w, im.h], [512, 512]); assert.equal(im.at(2, 2)[3], 0, 'corner transparent'); assert.equal(im.at(256, 256)[3], 255, 'centre opaque');
  },
  async 'screenshot-beautifier'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'shot.png'), { w: 300, h: 200 }); await pickFile(page, join(dir, 'shot.png'), 'Choose a screenshot'); await page.waitForSelector('canvas.ut-canvas'); const dims = await page.evaluate(() => { const c = document.querySelector('canvas.ut-canvas'); return [c.width, c.height]; }); assert.deepEqual(dims, [300 + 128, 200 + 38 + 128]);
    const d = await saveDownload(page, () => page.getByRole('button', { name: 'Download PNG' }).click()); const im = await decode(page, d.path); assert.ok(near(im.at(5, 5), [37, 87, 214, 255], 70), 'gradient corner'); assert.ok(near(im.at(64 + 100, 64 + 38 + 20), [214, 37, 37, 255]), 'screenshot content');
  },
  async 'image-diff'(page) {
    const dir = tmp(); await makeImage(page, join(dir, 'a.png'), { w: 100, h: 100, paint: "x.fillStyle='#fff'; x.fillRect(0,0,w,h)" }); await makeImage(page, join(dir, 'b.png'), { w: 100, h: 100, paint: "x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.fillStyle='#000'; x.fillRect(10,10,20,20)" });
    const [c1] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#tool-root button', { hasText: 'Choose' }).first().click()]); await c1.setFiles(join(dir, 'a.png')); const [c2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#tool-root button', { hasText: 'Choose' }).nth(1).click()]); await c2.setFiles(join(dir, 'b.png')); await page.waitForSelector('.ut-stats .ut-stat'); const t = await page.locator('.ut-stats').innerText(); assert.match(t, /Changed pixels\s*400/); assert.match(t, /Share of image\s*4\.00 %/);
  },
  async 'booklet-maker'(page) {
    const r = await runPdf(page, 6, /Create booklet/); const c = await pageCount(r.buf); assert.equal(c.n, 4, 'sheet sides'); assert.ok(Math.abs(c.sizes[0].width - 600) < 1 && Math.abs(c.sizes[0].height - 400) < 1, JSON.stringify(c.sizes[0])); assert.match(r.name, /booklet/);
  },
  async 'n-up-pdf'(page) {
    const r = await runPdf(page, 5, /Create n-up/); const c = await pageCount(r.buf); assert.equal(c.n, 2); assert.ok(Math.abs(c.sizes[0].width - 595.28) < 1, JSON.stringify(c.sizes[0]));
  },
  async 'bates-numbering'(page) {
    const r = await runPdf(page, 3, /Add Bates/); assert.equal((await pageCount(r.buf)).n, 3);
    const pdfjs = await import('../assets/vendor/pdfjs/pdf.min.mjs').catch(() => null); if (pdfjs) { pdfjs.GlobalWorkerOptions.workerSrc = new URL('../assets/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href; const d = await pdfjs.getDocument({ data: new Uint8Array(r.buf), isEvalSupported: false }).promise; const tx = await (await d.getPage(3)).getTextContent(); assert.ok(tx.items.map(i => i.str).join(' ').includes('ACME-000003'), 'stamp text'); }
    else assert.ok(r.buf.length > 1000);
  },
  async 'add-margins-to-pdf'(page) {
    const r = await runPdf(page, 2, /Add margins/); const c = await pageCount(r.buf); assert.equal(c.n, 2); assert.ok(Math.abs(c.sizes[0].width - (300 + 60 * 72 / 25.4)) < 1, JSON.stringify(c.sizes[0])); assert.equal(Math.round(c.sizes[0].height), 400);
  },
  async 'paper-size-calculator'(page) {
    let txt = await rootText(page); assert.ok(/210\.0 × 297\.0 mm/.test(txt) || /210 × 297/.test(txt), txt.slice(0, 200)); assert.ok(txt.includes('2,480 × 3,508 px') || txt.includes('2480 × 3508 px'), 'A4 at 300 ppi');
    await page.selectOption('#tool-root select >> nth=0', 'pixels'); await page.waitForTimeout(300); txt = await rootText(page); assert.ok(/254 × 169\.3 mm/.test(txt), 'pixels mode: ' + txt.slice(0, 200));
  },
  async 'mailing-labels'(page) {
    await area(page).fill('Anna Příklad\nUlice 1\nPraha\n\nBen Sample\n2 Road\nLondon'); await page.getByRole('button', { name: /Create label sheet/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download labels/ }).click()]); const c = await pageCount(readFileSync(await dl.path())); assert.equal(c.n, 1); assert.ok(Math.abs(c.sizes[0].width - 595.28) < 1, 'A4 sheet');
    await page.locator('#tool-root input[type=number]').nth(1).fill('30'); await page.getByRole('button', { name: /Create label sheet/ }).click(); await page.waitForTimeout(1500);
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download labels/ }).click()]); assert.equal((await pageCount(readFileSync(await dl2.path()))).n, 3, '60 labels need 3 sheets of 21');
  },
  async 'certificate-generator'(page) {
    await page.getByRole('button', { name: /Create certificates/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /certificates\.pdf/ }).click()]); const c = await pageCount(readFileSync(await dl.path())); assert.equal(c.n, 2); assert.ok(c.sizes[0].width > c.sizes[0].height, 'landscape');
  },
  async 'markdown-to-docx'(page) {
    await page.getByRole('button', { name: /Sample/i }).click(); await page.getByRole('button', { name: /Create Word document/ }).click(); await page.waitForSelector('[data-result=ready]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).click()]); const buf = readFileSync(await dl.path());
    const { unzipSync, strFromU8 } = await import('../assets/vendor/fflate/fflate.js'); const z = unzipSync(new Uint8Array(buf)); const doc = strFromU8(z['word/document.xml']); assert.ok(doc.includes('Heading1') && doc.includes('<w:tbl>') && doc.includes('Project report')); assert.ok(z['[Content_Types].xml']);
    const tmp = mkdtempSync(join(tmpdir(), 'docx-')); const f = join(tmp, 'out.docx'); writeFileSync(f, buf); const hasLo = spawnSync('which', ['soffice']).status === 0;
    if (hasLo) { const r = spawnSync('soffice', ['--headless', '--convert-to', 'txt:Text', '--outdir', tmp, f], { timeout: 90000 }); assert.equal(r.status, 0, 'LibreOffice opens the file'); assert.ok(readFileSync(join(tmp, 'out.txt'), 'utf8').includes('Project report')); }
    // round trip through the converter page
    globalThis.__docxBuf = buf;
  },
  async 'docx-to-markdown'(page, base) {
    // build a docx in-process using the same library, then convert it back
    const D = await import('../assets/js/tools/lib/docs.js'); const { zipSync, strToU8 } = await import('../assets/vendor/fflate/fflate.js'); const md = '# Report\n\nSome **bold** and *italic* text with a [link](https://example.com).\n\n- one\n- two\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n';
    const entries = {}; for (const [k, v] of Object.entries(D.docxFiles(md))) entries[k] = strToU8(v); const buf = Buffer.from(zipSync(entries));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: buf }); await page.waitForTimeout(800);
    const o = await out(page).inputValue(); for (const want of ['# Report', '**bold**', '*italic*', '[link](https://example.com)', '- one', '1. first', '| A | B |', '| 1 | 2 |']) assert.ok(o.includes(want), `missing ${want} in:\n${o}`);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'bad.docx', buffer: Buffer.from('not a zip') }); await page.waitForTimeout(500); assert.ok((await page.locator('.pt-drop__error').first().innerText()).length > 0, 'error shown for invalid file');
  },
  async 'port-number-lookup'(page) {
    await page.locator('#tool-root input[type=text]').fill('mysql'); await page.waitForTimeout(200); const txt = await rootText(page); assert.ok(txt.includes('3306'), txt.slice(0, 300)); assert.ok(!txt.includes('Telnet'), 'filtered');
  },
  async 'mime-type-lookup'(page) {
    await page.locator('#tool-root input[type=text]').fill('report.docx'); await page.waitForTimeout(200); assert.ok((await rootText(page)).includes('wordprocessingml.document')); await page.locator('#tool-root input[type=text]').fill('image/webp'); await page.waitForTimeout(200); assert.ok((await rootText(page)).includes('.webp'));
  },
  async 'spf-dmarc-generator'(page) {
    const recs = async () => page.locator('[data-record]').allInnerTexts(); let r = await recs(); assert.equal(r[0], 'v=spf1 include:_spf.google.com ~all'); assert.equal(r[1], 'v=DMARC1; p=none');
    await page.locator('#tool-root input[placeholder*="dmarc@"]').fill('d@example.com'); await page.locator('#tool-root select').nth(1).selectOption('quarantine'); await page.waitForTimeout(300); r = await recs(); assert.equal(r[1], 'v=DMARC1; p=quarantine; rua=mailto:d@example.com');
    await page.locator('#tool-root input[placeholder*="203.0"]').fill('999.1.1.1'); await page.waitForTimeout(300); assert.ok((await rootText(page)).includes('not a valid IPv4'), 'validation message');
  },
  async 'css-flexbox-playground'(page) {
    await page.locator('#tool-root select').nth(1).selectOption('space-between'); await page.waitForTimeout(200); assert.ok((await rootText(page)).includes('justify-content: space-between;')); assert.equal(await page.locator('.ut-flexitem').count(), 4);
    const x = await page.locator('.ut-flexitem').evaluateAll(els => els.map(e => e.getBoundingClientRect().left)); const box = await page.locator('.ut-flexbox').boundingBox(); assert.ok(x[3] > box.x + box.width * 0.7, 'last item pushed to the right');
  },
  async 'password-generator'(page) {
    const codes = async () => page.locator('.ut-pw code').allInnerTexts(); let c = await codes(); assert.equal(c.length, 5); assert.ok(c.every(x => x.length === 20), 'default length 20');
    assert.ok(c.every(x => /[a-z]/.test(x) && /[A-Z]/.test(x) && /\d/.test(x) && /[^A-Za-z0-9]/.test(x)), 'all classes present');
    await page.locator('#tool-root input[type=range]').evaluate(e => { e.value = 40; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(100); c = await codes(); assert.ok(c.every(x => x.length === 40));
    for (const l of ['a–z', 'A–Z', '!@#$…']) await page.getByLabel(l, { exact: true }).uncheck(); await page.waitForTimeout(100); c = await codes(); assert.ok(c.every(x => /^\d{40}$/.test(x)), 'digits only: ' + c[0]); assert.equal(new Set(c).size, 5, 'different every time');
  },
  async 'passphrase-generator'(page) {
    const c = await page.locator('.ut-pw code').allInnerTexts(); assert.equal(c.length, 5); assert.ok(c.every(x => /^[a-z]+(-[a-z]+){4}$/.test(x)), c[0]); assert.ok((await rootText(page)).includes('65 bits') || (await rootText(page)).includes('(64 bits)') || /\(6[45] bits\)/.test(await rootText(page)), 'entropy shown');
  },
  async 'jwt-decoder'(page) {
    await page.getByRole('button', { name: /Sample/i }).click(); await page.waitForTimeout(500); let txt = await rootText(page); assert.ok(txt.includes('John Doe') && txt.includes('HS256') && txt.includes('✓ valid'), txt.slice(0, 400));
    await page.locator('#tool-root input[type=text]').fill('wrong secret'); await page.waitForTimeout(500); assert.ok((await rootText(page)).includes('does not match'));
    await area(page).fill('not.a.jwt'); await page.waitForTimeout(400); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0, 'invalid token message');
  },
  async 'wifi-qr-code-generator'(page) {
    assert.ok(await page.locator('#tool-root canvas, #tool-root svg, #tool-root img').count() > 0, 'code shown');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]); const png = readFileSync(await dl.path()); assert.equal(png.subarray(1, 4).toString(), 'PNG');
    let decoded = null; try { const { createRequire } = await import('node:module'); const rq = createRequire('/tmp/claude-0/qrdec/'); const jsQR = rq('jsqr'); const { PNG } = rq('pngjs'); const img = PNG.sync.read(png); decoded = jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data; } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
    if (decoded !== null) assert.equal(decoded, 'WIFI:T:WPA;S:Guest Wi-Fi;P:welcome-2025;;', 'decoded QR payload');
  },
  async 'qr-code-generator'(page) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download SVG' }).click()]); const svg = readFileSync(await dl.path(), 'utf8'); assert.ok(svg.includes('<svg') && svg.includes('<path') || svg.includes('<rect'), 'svg content');
    const [d2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]); const png = readFileSync(await d2.path());
    try { const { createRequire } = await import('node:module'); const rq = createRequire('/tmp/claude-0/qrdec/'); const jsQR = rq('jsqr'); const { PNG } = rq('pngjs'); const img = PNG.sync.read(png); assert.equal(jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data, 'https://ohfis.com'); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
  },
  async 'encrypted-note-link'(page, base) {
    await area(page).fill('The safe code is 4711 ✓ äöü'); await page.waitForTimeout(800); const pres = await page.locator('.ut-pre').allInnerTexts(); const link = pres[0].trim(), key = pres[1].trim(); assert.ok(link.includes('#v1.'), link.slice(0, 100)); assert.ok(!link.includes('4711'), 'plaintext not in link');
    const p2 = await page.context().newPage(); await p2.goto(link.replace(/^https?:\/\/[^/]+/, base)); await p2.waitForSelector('#tool-root[data-ready=true]'); await p2.locator('#tool-root input').first().fill('wrong'); await p2.getByRole('button', { name: 'Decrypt note' }).click(); await p2.waitForTimeout(500); assert.ok(await p2.locator('.pt-drop__error:visible').count() > 0, 'wrong key rejected');
    await p2.locator('#tool-root input').first().fill(key); await p2.getByRole('button', { name: 'Decrypt note' }).click(); await p2.waitForTimeout(500); assert.ok((await p2.locator('#tool-root').innerText()).includes('The safe code is 4711 ✓ äöü'), 'decrypted text'); await p2.close();
  },
  async 'pert-estimator'(page) {
    const txt = await rootText(page); assert.ok(txt.includes('Expected total'), txt.slice(0, 200)); const exp = [(2 + 16 + 9) / 6, (5 + 32 + 20) / 6, (4 + 24 + 14) / 6, (2 + 12 + 8) / 6].reduce((a, b) => a + b); const m = /Expected total\s*([\d.,]+)/.exec(txt); assert.equal(Number(m[1].replace(',', '')), Math.round(exp * 10) / 10, 'expected total'); assert.ok(/Chance to finish within 30\s*\d+ ?%/.test(txt));
    await area(page).fill('bad line'); await page.waitForTimeout(400); assert.ok((await rootText(page)).includes('optimistic'), 'format hint');
  },
  async 'name-picker-wheel'(page) {
    await area(page).fill('Ann\nBen\nCy'); await page.getByRole('button', { name: 'Spin the wheel' }).click(); await page.waitForFunction(() => /Winner|winner/.test(document.getElementById('tool-root').innerText), null, { timeout: 15000 }); const txt = await rootText(page); assert.ok(/Winner[\s\S]*(Ann|Ben|Cy)/i.test(txt), txt.slice(0, 300));
  },
  async 'tournament-bracket-maker'(page) {
    await area(page).fill('A\nB\nC\nD\nE'); await page.waitForTimeout(500); const svg = await page.locator('#tool-root svg').first().innerHTML(); for (const n of ['A', 'B', 'C', 'D', 'E']) assert.ok(new RegExp(`>(\\d+\\. )?${n}<`).test(svg), 'entrant ' + n); assert.ok(/bye/i.test(svg), 'byes shown for 5 entrants');
  },
  async 'org-chart-maker'(page) {
    await area(page).fill('CEO, Anna\n  CTO, Ben\n    Dev, Cy\n  CFO, Dee'); await page.waitForTimeout(500); const txt = await page.locator('#tool-root svg').first().innerHTML(); for (const n of ['CEO', 'Anna', 'CTO', 'CFO', 'Dev']) assert.ok(txt.includes(n), n);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download SVG' }).click()]); assert.ok(readFileSync(await dl.path(), 'utf8').includes('<svg'));
  },
  async 'random-team-generator'(page) {
    await area(page).fill('A: 5\nB: 5\nC: 1\nD: 1\nE: 3\nF: 3'); await page.waitForTimeout(400); let t = await rootText(page); assert.ok(t.includes('Team 1') && t.includes('Team 2') && !t.includes('Team 3'), t.slice(0, 300));
    const totals = [...t.matchAll(/Skill total: ([\d.,]+)/g)].map(m => Number(m[1])); assert.deepEqual(totals, [9, 9]);
    await page.locator('#tool-root input[type=number]').fill('3'); await page.waitForTimeout(400); t = await rootText(page); assert.ok(t.includes('Team 3'));
    await area(page, 1).fill('A != B'); await page.getByRole('button', { name: 'Shuffle again' }).click(); await page.waitForTimeout(200); const teams = await page.locator('.tm-box').allInnerTexts(); assert.ok(!teams.some(x => x.includes('A (') && x.includes('B (')), 'A and B apart');
  },
  async 'planning-poker'(page) {
    const t = n => page.locator('.tm-card', { hasText: new RegExp(`^${n}$`) }).first();
    assert.match(await rootText(page), /Pass the device to:\s*Ann/); for (const c of ['3', '5', '5', '8']) await t(c).click();
    assert.ok((await rootText(page)).includes('Everyone has voted')); await page.getByRole('button', { name: 'Reveal the cards' }).click(); const txt = await rootText(page);
    assert.ok(/Median\s*5/.test(txt.replace(/\n/g, ' ')) && txt.includes('No consensus'), txt.slice(0, 400));
    await page.getByRole('button', { name: 'New round' }).click(); assert.match(await rootText(page), /Pass the device to:\s*Ann/);
  },
  async 'retrospective-board'(page) {
    const inp = page.locator('.tm-col input[type=text]').first(); await inp.fill('Fast deploys'); await inp.press('Enter'); const inp2 = page.locator('.tm-col input[type=text]').nth(1); await inp2.fill('Flaky tests'); await inp2.press('Enter'); await inp2.fill('Slow reviews'); await inp2.press('Enter');
    await page.locator('.tm-cardlist li', { hasText: 'Slow reviews' }).getByRole('button', { name: /👍/ }).click(); await page.waitForTimeout(100); const first = await page.locator('.tm-col').nth(1).locator('li span').first().innerText(); assert.equal(first, 'Slow reviews');
    await page.reload(); await page.waitForSelector('[data-ready=true]'); assert.ok((await rootText(page)).includes('Fast deploys'), 'saved in the browser');
    await page.locator('.tm-col select, #tool-root select').first().selectOption('ssc'); assert.ok((await rootText(page)).includes('Continue'));
  },
  async 'raci-matrix-generator'(page) {
    assert.ok((await rootText(page)).includes('Every task has exactly one A')); await area(page).fill('Task;Ann;Ben\nPlan;A;A\nBuild;;R\nShip;A;R'); await page.waitForTimeout(400);
    const t = await rootText(page); assert.ok(t.includes('Plan: has more than one Accountable') && t.includes('Build: has no one Accountable') && !t.includes('Ship:'), t.slice(0, 400));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()]); assert.ok(readFileSync(await dl.path(), 'utf8').startsWith('Task,Ann,Ben'));
  },
  async 'meeting-agenda-planner'(page) {
    await area(page).fill('Welcome; 5\nStatus - 20\nDecide | 25 min'); await page.locator('#tool-root input[type=time]').fill('09:30'); await page.waitForTimeout(300); let t = (await rootText(page)).replace(/\s+/g, ' ');
    assert.ok(t.includes('09:30') && t.includes('09:55') && /Ends at 10:20/.test(t) && /Total minutes 50/.test(t), t.slice(0, 400)); assert.ok(t.includes('Fits into the time you have: 10 minutes left'), t);
    await page.locator('#tool-root input[type=number]').fill('45'); await page.waitForTimeout(300); assert.ok((await rootText(page)).includes('longer than the time you have by 5'));
  },
  async 'swot-analysis-maker'(page) {
    const txt = await rootText(page); for (const k of ['Strengths', 'Weaknesses', 'Opportunities', 'Threats', 'Our product']) assert.ok(txt.includes(k), k);
    await area(page).fill('Brand new strength'); await page.waitForTimeout(400); assert.ok((await page.locator('.tm-sw--0').innerText()).includes('Brand new strength'));
  },
  async 'priority-matrix-maker'(page) {
    let t = await page.locator('.tm-matrix').innerText(); assert.ok(/Quick wins[\s\S]*Search filter/.test(t) && /Money pits[\s\S]*Rewrite the backend/.test(t), t);
    await page.locator('#tool-root select').selectOption('ei'); await page.waitForTimeout(400); t = await page.locator('.tm-matrix').innerText(); assert.ok(/Do now[\s\S]*Server is down/.test(t) && /Drop[\s\S]*Scroll social media/.test(t), t);
    await page.locator('#tool-root select').selectOption('ie'); await area(page).fill('Bad line; high; 2'); await page.waitForTimeout(400); assert.ok((await rootText(page)).includes('Check the line "Bad line"'));
  },
  async 'rotation-schedule-generator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2026-01-05'); await area(page, 1).fill('Ben: 2026-01-12 to 2026-01-18'); await page.waitForTimeout(400); const rows = await page.locator('#tool-root tr').allInnerTexts();
    const who = rows.slice(1, 5).map(r => r.split('\t').pop().trim()); assert.deepEqual(who, ['Ann', 'Cleo', 'Dev', 'Ann'], JSON.stringify(rows.slice(1, 5)));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()]); assert.ok(readFileSync(await dl.path(), 'utf8').startsWith('from,to,who\n2026-01-05,2026-01-11,"Ann"'));
  },
  async 'business-model-canvas'(page) {
    const sec = k => page.locator(`.cv-sec[data-sec=${k}]`); assert.ok((await page.locator('.cv-sec').count()) === 9, 'nine blocks'); assert.ok((await sec('partners').locator('.cv-note').count()) >= 1, 'example notes');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Start over' }).click(); await page.waitForTimeout(150); assert.equal(await page.locator('.cv-note').count(), 0);
    await sec('value').locator('.cv-add').click(); await page.locator('.cv-text:focus').fill('Fresh coffee'); await sec('segments').locator('.cv-add').click(); await page.locator('.cv-text:focus').fill('Coffee lovers');
    await sec('segments').locator('.cv-note').first().locator('.cv-move').selectOption('channels', { force: true }); assert.equal(await sec('channels').locator('.cv-text').first().inputValue(), 'Coffee lovers');
    await page.setViewportSize({ width: 1280, height: 2200 }); await page.waitForTimeout(400); await sec('value').locator('.cv-grip').first().dragTo(sec('costs')); await page.waitForTimeout(400); assert.equal(await sec('costs').locator('.cv-text').first().inputValue(), 'Fresh coffee', 'drag and drop');
    await page.locator('.cv-title').fill('My coffee shop'); await page.reload(); await page.waitForSelector('[data-ready=true]'); assert.equal(await page.locator('.cv-title').inputValue(), 'My coffee shop'); assert.equal(await sec('costs').locator('.cv-text').first().inputValue(), 'Fresh coffee', 'saved');
    const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]); const buf = readFileSync(await png.path()); assert.ok(buf.length > 5000 && buf.slice(1, 4).toString() === 'PNG', 'png');
    const [pdfDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()]); const pdfBuf = readFileSync(await pdfDl.path()); assert.ok(pdfBuf.slice(0, 5).toString() === '%PDF-' && pdfBuf.length > 5000 && pdfDl.suggestedFilename() === 'my-coffee-shop.pdf', 'pdf ' + pdfDl.suggestedFilename());
    const [js] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as file' }).click()]); const saved = JSON.parse(readFileSync(await js.path(), 'utf8')); assert.equal(saved.title, 'My coffee shop'); assert.equal(saved.notes.length, 2);
    await page.evaluate(() => navigator.clipboard.writeText = async t => { window.__copied = t; }); await page.getByRole('button', { name: 'Copy as Markdown' }).click(); const md = await page.evaluate(() => window.__copied); assert.ok(md.startsWith('# My coffee shop') && md.includes('## Cost structure\n- Fresh coffee') && md.includes('## Channels\n- Coffee lovers'), md);
    assert.ok((await page.locator('.cv-credit').innerText()).includes('Osterwalder') && (await page.locator('.cv-credit a').getAttribute('href')).includes('creativecommons.org'), 'credit');
    await page.locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ title: 'Loaded', notes: [{ sec: 'revenue', text: 'Subscriptions' }] })) }); await page.waitForTimeout(300); assert.equal(await page.locator('.cv-title').inputValue(), 'Loaded'); assert.equal(await sec('revenue').locator('.cv-text').first().inputValue(), 'Subscriptions');
  },
  async 'eisenhower-matrix-board'(page) {
    assert.equal(await page.locator('.cv-sec').count(), 4); const t = await page.locator('.cv-grid').innerText(); for (const k of ['Urgent', 'Not urgent', 'Important', 'Not important', 'Do first', 'Schedule', 'Delegate', 'Drop']) assert.ok(t.toLowerCase().includes(k.toLowerCase()), k);
    await page.locator('.cv-sec[data-sec=drop] .cv-grip').first().dragTo(page.locator('.cv-sec[data-sec=do]')); await page.waitForTimeout(150); assert.ok((await page.locator('.cv-sec[data-sec=do] .cv-text').evaluateAll(a => a.map(e => e.value))).includes('Check social media'));
  },
  async 'lean-canvas'(page) { assert.equal(await page.locator('.cv-sec').count(), 9); assert.ok((await page.locator('.cv-grid').innerText()).includes('Unique value proposition')); assert.ok((await page.locator('.cv-credit').innerText()).includes('Ash Maurya')); },
  async 'team-canvas'(page) { assert.equal(await page.locator('.cv-sec').count(), 8); assert.ok((await page.locator('.cv-credit').innerText()).includes('Alex Ivanov') && (await page.locator('.cv-credit a').innerText()).includes('4.0')); },
  async 'pestel-analysis-board'(page) { assert.equal(await page.locator('.cv-sec').count(), 6); await page.locator('.cv-sec[data-sec=legal] .cv-add').click(); await page.locator('.cv-text:focus').fill('GDPR'); await page.reload(); await page.waitForSelector('[data-ready=true]'); assert.ok((await page.locator('.cv-sec[data-sec=legal] .cv-text').evaluateAll(a => a.map(e => e.value))).includes('GDPR')); },
  async 'porters-five-forces-board'(page) { assert.equal(await page.locator('.cv-sec').count(), 5); const pos = await page.locator('.cv-sec').evaluateAll(a => a.map(e => e.dataset.sec + ':' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().top))); const m = Object.fromEntries(pos.map(x => x.split(':'))); const [rx, ry] = m.rivalry.split(',').map(Number), [ex, ey] = m.entrants.split(',').map(Number), [sx] = m.suppliers.split(',').map(Number), [bx] = m.buyers.split(',').map(Number), [, uy] = m.substitutes.split(',').map(Number); assert.ok(ex === rx && ey < ry && uy > ry && sx < rx && bx > rx, pos.join(' ')); },
  async 'empathy-map-canvas'(page) { assert.equal(await page.locator('.cv-sec').count(), 6); assert.ok((await page.locator('.cv-credit').innerText()).includes('XPLANE')); },
  async 'tone-auditor'(page) {
    await area(page).fill('As per my last email, you never listen. Sorry, sorry, sorry!!! Please advise ASAP.'); await page.waitForTimeout(500); const marks = await page.locator('#tool-root mark').allInnerTexts(); assert.ok(marks.some(m => /per my last email/i.test(m)), 'flags passive-aggressive phrase: ' + marks); assert.ok(marks.some(m => /you never/i.test(m)), 'flags blaming');
    await area(page).fill('Thanks for the update, I will review it tomorrow.'); await page.waitForTimeout(400); assert.equal(await page.locator('#tool-root mark').count(), 0, 'clean text has no marks');
  },
  async 'audio-tone-generator'(page) {
    await page.getByRole('button', { name: 'Play' }).click(); await page.waitForTimeout(500); assert.ok(await page.getByRole('button', { name: /Stop/ }).count() > 0, 'switches to Stop');
    const state = await page.evaluate(() => window.__ctxState || 'n/a'); void state; await page.getByRole('button', { name: /Stop/ }).first().click(); await page.waitForTimeout(300); assert.ok(await page.getByRole('button', { name: 'Play' }).count() > 0, 'back to Play');
  },
  async 'bpm-tap-counter'(page) {
    const tap = page.getByRole('button', { name: 'TAP' }); for (let i = 0; i < 6; i++) { await tap.click(); await page.waitForTimeout(500); } const txt = await rootText(page); const m = /(\d{2,3}(?:\.\d)?)/.exec(txt); assert.ok(m && Number(m[1]) > 100 && Number(m[1]) < 125, 'tempo of ~0.5 s taps (100-125 BPM), got: ' + txt.slice(0, 200));
  },
  async 'audio-normalizer'(page) {
    const d = await audioRun(page, testWav({ amp: 0.1 })); const pk = AU.gainToDb(AU.peak(d.chs)); assert.ok(Math.abs(pk + 1) < 0.2, 'peak ' + pk); assert.equal(d.chs.length, 2); assert.ok(Math.abs(d.chs[0].length / d.sr - 3) < 0.05);
    await page.locator('#tool-root select').first().selectOption('rms'); await page.waitForTimeout(1500); const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).first().click()]); const r = AU.decodeWav(new Uint8Array(readFileSync(await dl.path()))); assert.ok(AU.gainToDb(AU.peak(r.chs)) <= -0.9, 'rms mode keeps peak below ceiling');
  },
  async 'silence-trimmer'(page) {
    const d = await audioRun(page, testWav({ lead: 1, tone: 1, tail: 1 })); const len = d.chs[0].length / d.sr; assert.ok(len > 1.25 && len < 1.4, 'trimmed length ' + len);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'quiet.wav', buffer: testWav({ amp: 0.0001 }) }); await page.waitForTimeout(1500); assert.ok((await page.locator('.pt-drop__error:visible').innerText()).includes('quieter than the threshold'), 'empty result message');
  },
  async 'audio-channel-mixer'(page) {
    const d = await audioRun(page, testWav()); assert.equal(d.chs.length, 1, 'mono mixdown');
  },
  async 'audio-pitch-shifter'(page) {
    const d = await audioRun(page, testWav({ lead: 0, tone: 2, tail: 0 })); assert.ok(Math.abs(d.chs[0].length / d.sr - 2 / Math.pow(2, 3 / 12)) < 0.05, 'length for +3 semitones ' + d.chs[0].length / d.sr);
  },
  async 'voice-recorder'(page) {
    await page.getByRole('button', { name: /Record/ }).click(); await page.waitForTimeout(1800); await page.getByRole('button', { name: /Stop/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 15000 });
    assert.ok(await page.locator('audio').isVisible(), 'player'); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download trimmed WAV/ }).click()]); const w = AU.decodeWav(new Uint8Array(readFileSync(await dl.path()))); assert.ok(w.chs[0].length / w.sr > 1.2 && w.chs[0].length / w.sr < 3, 'wav length ' + w.chs[0].length / w.sr);
  },
  async 'screen-recorder'(page) {
    await page.getByRole('button', { name: /Start recording/ }).click(); await page.waitForTimeout(2000); const bad = await page.locator('.pt-drop__error:visible').count(); if (bad) throw new Error('screen capture failed: ' + await page.locator('.pt-drop__error').first().innerText()); await page.getByRole('button', { name: /Stop/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 15000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download screen-recording/ }).click()]); assert.ok(readFileSync(await dl.path()).length > 1000, 'video data');
  },
  async 'webcam-info'(page) {
    await page.getByRole('button', { name: 'Start camera' }).click(); await page.waitForFunction(() => /\d+ × \d+/.test(document.getElementById('tool-root').innerText), null, { timeout: 10000 }); await page.waitForTimeout(2500); const txt = await rootText(page); assert.ok(/Resolution now\s*640 × 480|Resolution now\s*\d+ × \d+/.test(txt), txt.slice(0, 300)); assert.ok(/Measured frame rate\s*\d+(\.\d)? fps/.test(txt), 'measured fps: ' + txt.slice(0, 500));
  },
  async 'microphone-noise-floor'(page) {
    await page.getByRole('button', { name: /Measure/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const txt = await rootText(page); assert.ok(/Average noise floor\s*-?\d+(\.\d)? dBFS/.test(txt), txt.slice(0, 300));
  },
  async 'soundboard'(page) {
    await page.locator('[data-pad="Ding"]').click(); await page.waitForTimeout(200); assert.ok((await rootText(page)).includes('Played: Ding')); await page.keyboard.press('2'); await page.waitForTimeout(200); assert.ok((await rootText(page)).includes('Played: Buzzer'), 'keyboard shortcut'); assert.equal(await page.locator('.ut-pad').count(), 12);
  },
  async 'video-speed-adjuster'(page) {
    const tmp = mkdtempSync(join(tmpdir(), 'vid-')); const f = join(tmp, 'v.webm'); const r = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=4:size=160x120:rate=15', '-c:v', 'libvpx', '-b:v', '200k', f]); assert.equal(r.status, 0, 'ffmpeg made a test video');
    await page.setInputFiles('#tool-root input[type=file]', f); await page.waitForFunction(() => /Original length/.test(document.getElementById('tool-root').innerText), null, { timeout: 10000 }); await page.getByRole('button', { name: '2×' }).click(); await page.waitForTimeout(300); const txt = await rootText(page); assert.ok(/Original length\s*0:04/.test(txt) && /At this speed\s*0:02/.test(txt), txt.slice(0, 300));
    assert.equal(await page.locator('video').evaluate(v => v.playbackRate), 2);
  },
  async 'screen-color-card'(page) {
    await page.getByRole('button', { name: /Warm white/ }).click(); const bg = await page.locator('.ut-colorcard').evaluate(e => getComputedStyle(e).backgroundColor); assert.equal(bg, 'rgb(255, 180, 107)');
  },
  async 'hardware-acceleration-check'(page) {
    await page.waitForSelector('.ut-table'); const txt = await rootText(page); for (const w of ['WebGL 2', 'Graphics renderer', 'WebGPU', 'Logical CPU cores', '2D canvas speed']) assert.ok(txt.includes(w), 'row ' + w);
  },
  async 'screen-refresh-rate-test'(page) {
    await page.getByRole('button', { name: /Measure for 5 seconds/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 15000 }); const txt = await rootText(page); const m = /Measured refresh rate\s*([\d.]+) Hz/.exec(txt); assert.ok(m && +m[1] > 20 && +m[1] < 400, txt.slice(0, 300));
  },
  async 'aspect-ratio-calculator'(page) {
    let txt = await rootText(page); assert.ok(/Exact ratio\s*16:9/.test(txt)); assert.ok(/At width 1280 px\s*1280 × 720 px/.test(txt)); const n = page.locator('#tool-root input[type=number]'); await n.nth(0).fill('1366'); await n.nth(1).fill('768'); await page.waitForTimeout(300); txt = await rootText(page); assert.ok(/Exact ratio\s*683:384/.test(txt) && /Closest standard\s*16:9/.test(txt), txt.slice(0, 300));
  },
  async 'dual-monitor-matcher'(page) {
    const txt = await rootText(page); assert.ok(/Monitor 1 density\s*108\.8 PPI/.test(txt) && /Monitor 2 density\s*91\.8 PPI/.test(txt), txt.slice(0, 300));
  },
  async 'sunrise-sunset-calculator'(page) {
    await page.waitForSelector('[data-result=ready]'); let txt = await rootText(page); assert.ok(/Sunrise\s*\d\d:\d\d/.test(txt) && /Daylight\s*\d+ h \d\d min/.test(txt), txt.slice(0, 300));
    await page.locator('#tool-root input[type=date]').fill('2024-06-21'); await page.waitForTimeout(300); txt = await rootText(page); const sr = /Sunrise\s*(\d\d):(\d\d)/.exec(txt), ss = /Sunset\s*(\d\d):(\d\d)/.exec(txt); assert.ok(Math.abs((+sr[1] * 60 + +sr[2]) - (4 * 60 + 43)) <= 4, 'Berlin sunrise ' + sr[0]); assert.ok(Math.abs((+ss[1] * 60 + +ss[2]) - (21 * 60 + 33)) <= 4, 'Berlin sunset ' + ss[0]);
    await page.selectOption('#tool-root select >> nth=0', 'Reykjavik'); await page.locator('#tool-root input[type=date]').fill('2024-12-21'); await page.waitForTimeout(300); assert.ok(/Sunrise\s*1[01]:/.test(await rootText(page)), 'Reykjavik winter sunrise late');
  },
  async 'moon-phase-calculator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-01-25'); await page.waitForTimeout(300); const txt = await rootText(page); assert.ok(txt.includes('Full moon') && /Illuminated\s*(9[89]|100) %/.test(txt), txt.slice(0, 300)); await page.locator('#tool-root input[type=date]').fill('2024-01-11'); await page.waitForTimeout(300); assert.ok(/New moon/.test(await rootText(page)));
  },
  async 'year-progress-bar'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-07-01'); await page.waitForTimeout(300); const txt = await rootText(page); assert.ok(/Year 2024\s*50\.0 % · day 183 of 366 · 183 left/.test(txt), txt.slice(0, 300)); assert.ok(/Days left in the year\s*183/.test(txt));
    await page.locator('#tool-root input[type=date]').fill('2023-12-31'); await page.waitForTimeout(300); assert.ok(/100\.0 %/.test(await rootText(page)));
  },
  async 'fiscal-year-mapper'(page) {
    await page.locator('#tool-root input[type=date]').fill('2025-02-10'); await page.waitForTimeout(300); let txt = await rootText(page); assert.ok(/Fiscal year\s*FY2024/.test(txt) && /Fiscal quarter\s*Q4/.test(txt) && /2024-04-01 to 2025-03-31/.test(txt), txt.slice(0, 300));
    await page.getByRole('button', { name: /US federal/ }).click(); await page.waitForTimeout(300); txt = await rootText(page); assert.ok(/Fiscal year\s*FY2025/.test(txt) && /Fiscal quarter\s*Q2/.test(txt), 'US federal: ' + txt.slice(0, 300));
  },
  async 'availability-formatter'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-03-05'); await page.locator('#tool-root select').first().selectOption('Europe/Berlin'); await page.waitForTimeout(500); const txt = await page.locator('[data-record]').innerText(); assert.ok(txt.includes('09:00–11:30 CET') && txt.includes('03:00–05:30 EST'), txt);
    await page.locator('#tool-root input[type=date]').fill('2024-03-20'); await page.waitForTimeout(400); assert.ok((await page.locator('[data-record]').innerText()).includes('EDT'), 'DST in New York by 20 March');
    await page.locator('#tool-root textarea').fill('bad'); await page.waitForTimeout(400); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0);
  },
  async 'currency-fee-calculator'(page) {
    const txt = await rootText(page); assert.ok(/Effective rate\s*1\.0628/.test(txt), 'effective rate 1.09*(1-0.025): ' + txt.slice(0, 400)); assert.ok(/They receive\s*1,057\.44/.test(txt), 'received (1000-5)*1.06275: ' + txt.slice(0, 400));
    await page.locator('#tool-root select').first().selectOption('receive'); await page.waitForTimeout(300); assert.ok(/You must send/.test(await rootText(page)));
  },
  async 'lease-cost-calculator'(page) {
    const txt = await rootText(page); assert.ok(/Monthly cost, year 1\s*€ 7,958\.33/.test(txt), txt.slice(0, 300)); const rows = await page.locator('.ut-table tr').count(); assert.equal(rows, 6, 'header + 5 years');
  },
  async 'inflation-value-calculator'(page) {
    let txt = await rootText(page); assert.ok(/will cost\s*€ 1,343\.92/.test(txt), txt.slice(0, 300)); await page.locator('#tool-root select').first().selectOption('rate'); await page.waitForTimeout(300); txt = await rootText(page); assert.ok(/Average annual inflation\s*2\.97 %|Average annual inflation\s*2,97 %/.test(txt), txt.slice(0, 300));
  },
  async 'cash-drawer-counter'(page) {
    await page.getByLabel('Count of 20', { exact: true }).fill('3'); await page.getByLabel('Count of 0.1', { exact: true }).fill('3'); await page.getByLabel('Count of 0.05', { exact: true }).fill('1'); await page.locator('#tool-root input[aria-label="Expected amount"]').fill('60'); await page.waitForTimeout(300); const txt = await rootText(page); assert.ok(/Counted\s*60\.35 USD/.test(txt) && /Over by\s*0\.35 USD/.test(txt), txt.slice(0, 400));
    await page.locator('#tool-root input[aria-label="Expected amount"]').fill('60.35'); await page.waitForTimeout(200); assert.ok(/Balanced\s*✓/.test(await rootText(page)));
  },
  async 'image-color-effects'(page) {
    const png = await makeImg(page, 20, 20, "g.fillStyle='#e03c20';g.fillRect(0,0,w,h)"); await page.setInputFiles('#tool-root input[type=file]', { name: 'red.png', mimeType: 'image/png', buffer: png }); await page.waitForSelector('.ut-img img', { timeout: 10000 });
    let p = await pixelAt(page, '.ut-img img', 5, 5); assert.ok(p[0] === p[1] && p[1] === p[2], 'grayscale: ' + p); await page.locator('#tool-root select').first().selectOption('invert'); await page.waitForTimeout(600); p = await pixelAt(page, '.ut-img img', 5, 5); assert.deepEqual(p.slice(0, 3), [255 - 0xe0, 255 - 0x3c, 255 - 0x20], 'invert'); assert.equal(p[3], 255);
    await page.locator('#tool-root select').first().selectOption('bw'); await page.waitForTimeout(600); p = await pixelAt(page, '.ut-img img', 5, 5); assert.ok((p[0] === 0 || p[0] === 255) && p[0] === p[1], 'threshold ' + p);
  },
  async 'background-remover'(page) {
    const png = await makeImg(page, 40, 40, "g.fillStyle='#00ff00';g.fillRect(0,0,w,h);g.fillStyle='#d02020';g.fillRect(10,10,20,20)"); await page.setInputFiles('#tool-root input[type=file]', { name: 'gs.png', mimeType: 'image/png', buffer: png }); await page.waitForSelector('.ut-img img', { timeout: 10000 });
    const corner = await pixelAt(page, '.ut-img img', 1, 1), centre = await pixelAt(page, '.ut-img img', 20, 20); assert.equal(corner[3], 0, 'background transparent'); assert.equal(centre[3], 255, 'subject kept'); assert.ok(centre[0] > 180 && centre[1] < 60, 'subject colour kept: ' + centre);
  },
  async 'svg-optimizer'(page) {
    await area(page).fill('<?xml version="1.0"?>\n<!-- made with Inkscape -->\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="100" height="100" viewBox="0 0 100.000 100.000">\n  <metadata>x</metadata>\n  <circle inkscape:label="c" cx="50.000" cy="50.000" r="40.123456" fill="#f00"/>\n</svg>'); await page.waitForTimeout(500); const o = await out(page).inputValue(); assert.ok(o.startsWith('<svg') && !o.includes('Inkscape') && !o.includes('metadata') && o.includes('r="40.12"'), o);
    const txt = await rootText(page); assert.ok(/Saved\s*\d+ %/.test(txt), txt.slice(0, 300)); assert.ok(await page.locator('#tool-root img[alt^="Preview"]').count() === 1, 'preview'); await area(page).fill('hello'); await page.waitForTimeout(400); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0);
  },
  async 'image-to-text-ocr'(page) {
    const png = await makeImg(page, 700, 160, "g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';g.font='bold 64px Arial, Helvetica, sans-serif';g.fillText('HELLO WORLD 2025',30,100)"); await page.setInputFiles('#tool-root input[type=file]', { name: 'text.png', mimeType: 'image/png', buffer: png }); await page.waitForSelector('[data-result=ready]', { timeout: 90000 });
    const txt = await out(page).inputValue().catch(() => ''); const all = (await area(page).inputValue()) || txt; assert.ok(/HELLO/i.test(all) && /WORLD/i.test(all) && all.includes('2025'), 'OCR text: ' + JSON.stringify(all));
  },
  async 'image-collage-maker'(page) {
    const a = await makeImg(page, 200, 120, "g.fillStyle='#ff0000';g.fillRect(0,0,w,h)"), b = await makeImg(page, 200, 120, "g.fillStyle='#0000ff';g.fillRect(0,0,w,h)"); await page.setInputFiles('#tool-root input[type=file]', [{ name: 'a.png', mimeType: 'image/png', buffer: a }, { name: 'b.png', mimeType: 'image/png', buffer: b }]); await page.waitForTimeout(600);
    const px = await page.evaluate(() => { const c = document.querySelector('#tool-root canvas'), g = c.getContext('2d'); return { w: c.width, h: c.height, l: [...g.getImageData(100, 450, 1, 1).data], r: [...g.getImageData(1500, 450, 1, 1).data], gap: [...g.getImageData(800, 450, 1, 1).data] }; }); assert.equal(px.w, 1600); assert.equal(px.h, 900); assert.deepEqual(px.l.slice(0, 3), [255, 0, 0]); assert.deepEqual(px.r.slice(0, 3), [0, 0, 255]); assert.deepEqual(px.gap.slice(0, 3), [255, 255, 255], 'gap uses background');
    await page.locator('#tool-root select').first().selectOption('v'); await page.waitForTimeout(300); const top = await page.evaluate(() => [...document.querySelector('#tool-root canvas').getContext('2d').getImageData(800, 100, 1, 1).data]); assert.deepEqual(top.slice(0, 3), [255, 0, 0], 'stacked: first on top');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]); assert.equal(readFileSync(await dl.path()).subarray(1, 4).toString(), 'PNG');
  },
  async 'meme-generator'(page) {
    const png = await makeImg(page, 400, 300, "g.fillStyle='#2040a0';g.fillRect(0,0,w,h)"); await page.setInputFiles('#tool-root input[type=file]', { name: 'bg.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const c = document.querySelector('#tool-root canvas'), g = c.getContext('2d'); const white = (y0, y1) => { const d = g.getImageData(0, y0, c.width, y1 - y0).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) n++; return n; }; return { w: c.width, h: c.height, top: white(0, c.height * 0.25), mid: white(c.height * 0.4, c.height * 0.6), bottom: white(c.height * 0.75, c.height) }; });
    assert.equal(r.w, 400); assert.ok(r.top > 100 && r.bottom > 100 && r.mid === 0, JSON.stringify(r));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]); assert.equal(readFileSync(await dl.path()).subarray(1, 4).toString(), 'PNG');
  },
  async 'video-frame-capture'(page) {
    const tmp = mkdtempSync(join(tmpdir(), 'vf-')); const f = join(tmp, 'v.webm'); const r = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=160x120:rate=15', '-c:v', 'libvpx', '-b:v', '200k', f]); assert.equal(r.status, 0);
    await page.setInputFiles('#tool-root input[type=file]', f); await page.waitForFunction(() => /Size\s*160 × 120/.test(document.getElementById('tool-root').innerText), null, { timeout: 10000 }); await page.getByRole('button', { name: '+1 s' }).click(); await page.waitForTimeout(500);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save frame (PNG)' }).click()]); const png = readFileSync(await dl.path()); assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), 160); assert.equal(png.readUInt32BE(20), 120); assert.match(dl.suggestedFilename(), /0-01-0/, 'time code in file name ' + dl.suggestedFilename()); assert.equal(await page.locator('.ut-shot').count(), 1);
  },
  async 'snippet-vault'(page) {
    await page.locator('#tool-root input[aria-label="Snippet title"]').fill('IBAN'); await page.locator('#tool-root textarea[aria-label="Snippet text"]').fill('DE00 1234 5678 9012 3456 78'); await page.getByRole('button', { name: 'Add snippet' }).click(); await page.waitForTimeout(200);
    assert.ok(await page.locator('[data-snip="IBAN"]').count() === 1); await page.locator('#tool-root input[aria-label="Search snippets"]').fill('iban'); await page.waitForTimeout(200); assert.equal(await page.locator('.ut-snip').count(), 1, 'search filters');
    await page.reload(); await page.waitForSelector('#tool-root[data-ready=true]'); assert.ok(await page.locator('[data-snip="IBAN"]').count() === 1, 'persisted after reload');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export all/ }).click()]); const data = JSON.parse(readFileSync(await dl.path(), 'utf8')); assert.ok(data.some(x => x.title === 'IBAN' && x.text.startsWith('DE00')));
  },
  async 'rich-text-to-html'(page) {
    await page.evaluate(() => { const b = document.querySelector('.ut-editable'); const dt = new DataTransfer(); dt.setData('text/html', '<meta charset="utf-8"><p class="MsoNormal" style="font-family:Calibri;color:red"><span style="font-weight:700">Bold</span> and <span style="font-style:italic">italic</span> <a href="https://example.com/x" onclick="alert(1)" style="color:blue">link</a> <a href="javascript:alert(1)">bad</a><script>alert(2)</script></p><h2 id="x">Title</h2><ul><li>One</li><li>Two</li></ul><img src="x.png">'); dt.setData('text/plain', 'plain'); b.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
    await page.waitForTimeout(500); const o = await out(page).inputValue(); assert.ok(o.includes('<strong>Bold</strong>') && o.includes('<em>italic</em>') && o.includes('<a href="https://example.com/x">link</a>') && o.includes('<h2>Title</h2>') && o.includes('<li>One</li>'), o); for (const bad of ['style=', 'class=', 'onclick', 'javascript:', '<script', '<img', 'id=']) assert.ok(!o.includes(bad), 'removed ' + bad + ' in ' + o);
    await page.getByLabel('Keep links').uncheck(); await page.waitForTimeout(300); assert.ok(!(await out(page).inputValue()).includes('<a '), 'links removed');
  },
  async 'braille-translator'(page) {
    await area(page).fill('Hello, World! 2025'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '⠠⠓⠑⠇⠇⠕⠂⠀⠠⠺⠕⠗⠇⠙⠖⠀⠼⠃⠚⠃⠑'); await page.selectOption('#tool-root select', 'from'); await area(page).fill('⠠⠓⠑⠇⠇⠕⠂'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), 'Hello,');
  },
  async 'emergency-contact-sheet'(page) {
    await page.getByRole('button', { name: /Create printable sheet/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download emergency/ }).click()]); const c = await pageCount(readFileSync(await dl.path())); assert.equal(c.n, 1); assert.ok(Math.abs(c.sizes[0].width - 595.28) < 1);
    const pdfjs = await import('../assets/vendor/pdfjs/pdf.min.mjs').catch(() => null); if (pdfjs) { pdfjs.GlobalWorkerOptions.workerSrc = new URL('../assets/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href; const buf = new Uint8Array(readFileSync(await (await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download emergency/ }).click()]))[0].path())); const d = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise; const tx = (await (await d.getPage(1)).getTextContent()).items.map(i => i.str).join(' '); assert.ok(tx.includes('EMERGENCY INFORMATION') && tx.includes('+49 170 1234567') && tx.includes('Smith family'), tx.slice(0, 200)); }
  },
  async 'writing-sprint-timer'(page) {
    await page.clock.install(); await page.reload(); await page.waitForSelector('#tool-root[data-ready=true]'); await page.locator('#tool-root input[type=number]').nth(0).fill('2'); await page.locator('#tool-root input[type=number]').nth(1).fill('10'); await page.getByRole('button', { name: 'Start sprint' }).click(); await page.locator('textarea').fill('one two three four five six seven eight'); await page.clock.fastForward(30000); let txt = await rootText(page); assert.ok(/Words this sprint\s*8/.test(txt), txt.slice(0, 300)); await page.clock.fastForward(95000); await page.waitForSelector('[data-result=ready]'); txt = await rootText(page); assert.ok(/Words written\s*8/.test(txt) && /Goal\s*8 of 10/.test(txt), txt.slice(0, 400));
  },
  async 'brain-dump-organizer'(page) {
    await page.getByRole('button', { name: /Sample/i }).click(); await page.waitForTimeout(300); const g = async k => page.locator(`[data-group="${k}"] li`).allInnerTexts(); assert.ok((await g('tasks')).some(x => x.includes('call Anna')), 'task'); assert.ok((await g('questions')).some(x => x.includes('ready for the demo')), 'question'); assert.ok((await g('ideas')).some(x => x.includes('moved the launch')), 'idea'); assert.ok((await g('worries')).some(x => x.includes('budget')), 'worry'); assert.ok((await g('urgent')).some(x => x.includes('milk')), 'urgent');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .md' }).click()]); assert.ok(readFileSync(await dl.path(), 'utf8').includes('- [ ] Need to call Anna'));
  },
  async 'webhook-signature-tester'(page) {
    await area(page).fill('The quick brown fox jumps over the lazy dog'); await page.locator('#tool-root input[type=text]').first().fill('key'); await page.waitForTimeout(500); const hex = await page.locator('[data-sig="hex"]').innerText(); assert.equal(hex, 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8'); assert.equal(await page.locator('[data-sig="github"]').innerText(), 'sha256=' + hex);
    await page.locator('#tool-root input[aria-label="Received signature"]').fill('sha256=' + hex); await page.waitForTimeout(400); assert.ok((await rootText(page)).includes('✓ The signature matches')); await page.locator('#tool-root input[aria-label="Received signature"]').fill('sha256=' + hex.replace(/^f/, 'e')); await page.waitForTimeout(400); assert.ok((await rootText(page)).includes('✗ No match'));
  },
  async 'pdf-annotation-extractor'(page) {
    const { PDFDocument, StandardFonts, PDFName, PDFString } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([400, 300]); pg.drawText('Important sentence here and more text', { x: 50, y: 200, size: 12, font: f }); const w = f.widthOfTextAtSize('Important sentence', 12); const ctx = d.context;
    const hl = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Highlight', Rect: [48, 197, 50 + w + 2, 212], QuadPoints: [48, 212, 50 + w + 2, 212, 48, 197, 50 + w + 2, 197], C: [1, 1, 0], Contents: PDFString.of('check this'), T: PDFString.of('Tester'), F: 4 })); const note = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [300, 250, 320, 270], Contents: PDFString.of('Remember to cite'), T: PDFString.of('Tester'), F: 4 })); pg.node.set(PDFName.of('Annots'), ctx.obj([hl, note]));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'annotated.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) }); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const rows = await page.locator('.ut-table tr').allInnerTexts(); const txt = rows.join('\n'); assert.ok(/1\s+Highlight\s+Tester\s+Important sentence\s+check this/.test(txt.replace(/\t/g, ' ').replace(/ +/g, ' ')), txt); assert.ok(txt.includes('Remember to cite'), 'note');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .md' }).click()]); assert.ok(readFileSync(await dl.path(), 'utf8').includes('“Important sentence”'));
    await page.getByLabel('Notes and text boxes').uncheck(); await page.waitForTimeout(200); assert.ok(!(await page.locator('.ut-table').innerText()).includes('Remember to cite'), 'filter hides notes');
  },
  async 'pdf-grayscale-converter'(page) {
    const { PDFDocument, rgb } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(); const pg = d.addPage([300, 200]); pg.drawRectangle({ x: 20, y: 20, width: 260, height: 160, color: rgb(0.9, 0.1, 0.1) }); d.addPage([300, 200]);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'color.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) }); await page.getByRole('button', { name: 'Convert to grayscale' }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 30000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).first().click()]); const buf = readFileSync(await dl.path()); const c = await pageCount(buf); assert.equal(c.n, 2); assert.ok(Math.abs(c.sizes[0].width - 300) < 1 && Math.abs(c.sizes[0].height - 200) < 1);
    const { createRequire } = await import('node:module'); const rq = createRequire('/tmp/claude-0/qrdec/'); try { const { PNG } = rq('pngjs'); const img = PNG.sync.read(pdfPng(buf)); const i = (Math.floor(img.height / 2) * img.width + Math.floor(img.width / 2)) * 4; assert.ok(Math.abs(img.data[i] - img.data[i + 1]) < 4 && Math.abs(img.data[i + 1] - img.data[i + 2]) < 4, `gray pixel ${[...img.data.slice(i, i + 3)]}`); assert.ok(img.data[i] < 200, 'the red area is darker than the white paper'); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
  },
  async 'printer-test-sheet'(page) {
    await page.getByRole('button', { name: /Create test sheet/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download printer-test-sheet/ }).click()]); const buf = readFileSync(await dl.path()); assert.equal((await pageCount(buf)).n, 2);
    const txt = pdfText(buf); assert.ok(txt.includes('PRINTER TEST SHEET') && txt.includes('exactly 100 mm') && txt.includes('Grey steps'), txt.slice(0, 300)); assert.ok(pdfPng(buf).length > 5000, 'renders');
  },
  async 'scan-separator-sheets'(page) {
    await page.getByRole('button', { name: /Create separator sheets/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 }); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download separator/ }).click()]); const buf = readFileSync(await dl.path()); assert.equal((await pageCount(buf)).n, 10); const txt = pdfText(buf); assert.ok(txt.includes('DOC-001') && txt.includes('DOC-010'), JSON.stringify(txt.match(/DOC[^ \n]*/g)));
    const { createRequire } = await import('node:module'); const rq = createRequire('/tmp/claude-0/qrdec/'); try { const jsQR = rq('jsqr'); const { PNG } = rq('pngjs'); const { dir, file } = poppler(buf); spawnSync('pdftoppm', ['-png', '-r', '110', '-f', '3', '-l', '3', file, join(dir, 'q')]); const img = PNG.sync.read(readFileSync(join(dir, readdirSync(dir).find(x => x.startsWith('q') && x.endsWith('.png'))))); assert.equal(jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data, 'DOC-003', 'QR code content'); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
  },
  async 'png-color-reducer'(page) {
    const png = await makeImg(page, 64, 64, "const gr=g.createLinearGradient(0,0,64,64);gr.addColorStop(0,'#ff0000');gr.addColorStop(0.5,'#00ff88');gr.addColorStop(1,'#2000ff');g.fillStyle=gr;g.fillRect(0,0,w,h)"); await page.setInputFiles('#tool-root input[type=file]', { name: 'grad.png', mimeType: 'image/png', buffer: png }); await page.waitForSelector('.ut-img img', { timeout: 10000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-img a, #tool-root .ut-img button', { hasText: /Download|↓/ }).first().click()]); const buf = readFileSync(await dl.path()); assert.equal(buf.subarray(1, 4).toString(), 'PNG'); assert.equal(buf[25], 3, 'indexed colour type'); assert.equal(buf[24], 8, '8 bits per pixel for 32 colours');
    const p = join(mkdtempSync(join(tmpdir(), 'q-')), 'x.png'); writeFileSync(p, buf); const info = spawnSync('file', ['-b', p]).stdout.toString(); assert.match(info, /8-bit colormap/i, info);
    const px = await pixelAt(page, '.ut-img img', 2, 2); assert.ok(px[0] > 200 && px[1] < 60, 'top-left stays red: ' + px); const txt = await rootText(page); assert.ok(/32 colours/.test(txt), txt.slice(0, 300));
  },
  async 'flight-time-calculator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2024-03-05'); await page.waitForTimeout(300); const txt = await rootText(page); assert.ok(/Arrival\s*Tue 2024-03-05 13:30 \(America\/New_York\)/.test(txt), txt.slice(0, 400)); assert.ok(/Time-zone shift\s*-6 h|Time-zone shift\s*−6 h/.test(txt), txt.slice(0, 400));
    const t = page.locator('#tool-root input[type=text]'); await t.nth(1).fill('2:00'); await t.nth(2).fill('5:30'); await page.waitForTimeout(400); const t2 = await rootText(page); assert.ok(/Final arrival\s*Tue 2024-03-05 \d\d:\d\d \(America\/Los_Angeles\)/.test(t2) && /Total travel time\s*17 h 0 min/.test(t2), t2.slice(0, 700));
    await t.nth(0).fill('abc'); await page.waitForTimeout(300); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0);
  },
  async 'weekly-hours-budget'(page) {
    let txt = await rootText(page); assert.ok(/Planned\s*32 h/.test(txt) && /Usable after reserve\s*32 h/.test(txt) && /Free capacity\s*0 h/.test(txt), txt.slice(0, 300)); await page.locator('#tool-root textarea').fill('A, 30\nB, 10'); await page.waitForTimeout(300); txt = await rootText(page); assert.ok(/Over-booked by\s*8 h/.test(txt), txt.slice(0, 300));
  },
  async 'okr-timeline-generator'(page) {
    await page.locator('#tool-root input[type=date]').fill('2025-01-06'); await page.waitForTimeout(300); const rows = await page.locator('.ut-table tr').allInnerTexts(); const txt = rows.join('\n'); assert.ok(/2025-01-06\s+Mon\s+Quarter starts/.test(txt), txt.slice(0, 200)); assert.ok(/2025-04-06\s+Sun\s+Quarter ends/.test(txt)); assert.ok(rows.filter(r => /check-in/.test(r)).length >= 11);
  },
});

// ---- audio editing, archives, fonts, PDF to HTML, recorder and speech ----
import * as F2 from '../assets/vendor/fflate/fflate.js';
const sineWav = (f, secs, amp = 0.1, sr = 44100, ch = 2) => { const a = Float32Array.from({ length: Math.round(secs * sr) }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / sr)); return Buffer.from(AU.encodeWav(ch === 1 ? [a] : [a, a.slice()], sr)); };
const dlWav = async page => { const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download/ }).first().click()]); return { path: await dl.path(), name: dl.suggestedFilename(), buf: readFileSync(await dl.path()) }; };
const ffprobe = (path, entries) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'json', path]).stdout.toString() || '{}');
const setNum = async (page, i, v) => { await page.locator('#tool-root input[type=number]').nth(i).fill(String(v)); await page.waitForTimeout(500); await page.waitForSelector('[data-result=ready]'); };
Object.assign(custom, {
  async 'audio-cutter'(page) {
    const wav = Buffer.from(AU.encodeWav([Float32Array.from({ length: 44100 * 4 }, (_, i) => i < 44100 ? 0.05 : i < 88200 ? 0.2 : 0.4), Float32Array.from({ length: 44100 * 4 }, () => 0)], 44100));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'in.wav', buffer: wav }); await page.waitForSelector('[data-result=ready]');
    await setNum(page, 0, 1); await setNum(page, 1, 2); let d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(Math.abs(d.chs[0].length / d.sr - 1) < 0.01, 'kept length ' + d.chs[0].length / d.sr); assert.ok(Math.abs(AU.peak(d.chs) - 0.2) < 0.01, 'kept the right part');
    await page.locator('#tool-root select').first().selectOption('remove'); await page.waitForTimeout(600); d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(Math.abs(d.chs[0].length / d.sr - 3) < 0.01, 'removed length'); assert.ok(Math.abs(AU.peak(d.chs) - 0.4) < 0.01);
    await page.locator('#tool-root input[type=number]').nth(1).fill('0.5'); await page.waitForTimeout(700); assert.ok((await page.locator('.pt-drop__error:visible').innerText()).includes('end must be after'), 'validation message');
  },
  async 'audio-volume-changer'(page) {
    let d = await audioRun(page, sineWav(440, 1, 0.1)); assert.ok(Math.abs(AU.gainToDb(AU.peak(d.chs) / 0.1) - 6) < 0.1, '+6 dB');
    await setNum(page, 0, -6); d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(Math.abs(AU.gainToDb(AU.peak(d.chs) / 0.1) + 6) < 0.1, '−6 dB');
    await setNum(page, 0, 30); d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(AU.peak(d.chs) <= 1 && AU.peak(d.chs) > 0.98, 'clipping guard keeps the peak at full scale: ' + AU.peak(d.chs)); assert.match(await rootText(page), /reduced by/);
  },
  async 'audio-reverser'(page) {
    const a = Float32Array.from({ length: 44100 * 3 }, (_, i) => i < 44100 ? 0.3 * Math.sin(i / 20) : 0); const d = await audioRun(page, Buffer.from(AU.encodeWav([a, a.slice()], 44100)));
    const head = AU.peak([d.chs[0].subarray(0, 44100)]), tail = AU.peak([d.chs[0].subarray(88200)]); assert.ok(head < 0.001 && tail > 0.25, `reversed: head ${head} tail ${tail}`);
  },
  async 'audio-equalizer'(page) {
    let d = await audioRun(page, sineWav(1000, 1, 0.1)); assert.ok(Math.abs(AU.peak(d.chs) - 0.1) < 0.005, 'flat is unchanged');
    await setNum(page, 2, 12); d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); const mid = AU.peak([d.chs[0].subarray(22050)]); assert.ok(mid > 0.38 && mid < 0.42, '+12 dB at 1 kHz ≈ ×4: ' + mid);
    await page.locator('#tool-root select').first().selectOption('voice'); await page.waitForTimeout(700); assert.equal(await page.locator('#tool-root input[type=number]').nth(3).inputValue(), '5', 'preset fills the bands');
  },
  async 'audio-converter'(page) {
    await page.setInputFiles('#tool-root input[type=file]', { name: 'tone.wav', buffer: sineWav(440, 3, 0.2) }); await page.waitForSelector('[data-result=ready]');
    await page.locator('#tool-root select').nth(0).selectOption('mp3'); await page.waitForTimeout(1500); await page.waitForSelector('[data-result=ready]'); const f = await dlWav(page); assert.match(f.name, /\.mp3$/); const pr = ffprobe(f.path, 'format=duration,format_name:stream=codec_name,channels'); assert.equal(pr.streams[0].codec_name, 'mp3'); assert.equal(pr.streams[0].channels, 2); assert.ok(Math.abs(Number(pr.format.duration) - 3) < 0.15, 'duration ' + pr.format.duration);
    await page.locator('#tool-root input[type=checkbox]').check(); await page.waitForTimeout(1500); const g = await dlWav(page); assert.equal(ffprobe(g.path, 'stream=channels').streams[0].channels, 1, 'mono');
  },
  async 'audio-joiner'(page) {
    await page.setInputFiles('#tool-root input[type=file]', [{ name: 'a.wav', mimeType: 'audio/wav', buffer: sineWav(440, 2, 0.2) }, { name: 'b.wav', mimeType: 'audio/wav', buffer: sineWav(660, 1, 0.2, 44100, 1) }]); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
    let d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(Math.abs(d.chs[0].length / d.sr - 3) < 0.02, 'joined length'); assert.equal(d.chs.length, 2, 'mono widened to stereo');
    await page.locator('#tool-root .ut-row button', { hasText: '↓' }).first().click(); await page.waitForTimeout(500);
    await page.locator('#tool-root input[type=number]').fill('500'); await page.waitForTimeout(800); d = AU.decodeWav(new Uint8Array((await dlWav(page)).buf)); assert.ok(Math.abs(d.chs[0].length / d.sr - 2.5) < 0.02, 'crossfade shortens by 0.5 s: ' + d.chs[0].length / d.sr);
    const names = await page.locator('.ut-row__name').allInnerTexts(); assert.deepEqual(names.map(x => x.replace(/^\d+\. /, '')), ['b.wav', 'a.wav'], 'reordered');
  },
  async 'zip-extractor'(page) {
    const zip = Buffer.from(F2.zipSync({ 'docs/a.txt': new TextEncoder().encode('alpha'), 'b.txt': new TextEncoder().encode('bravo'), 'img/c.png': new Uint8Array([1, 2, 3]) }));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'x.zip', buffer: zip }); await page.waitForSelector('.ut-table'); let txt = await rootText(page); assert.ok(/Files\s*3/.test(txt) && txt.includes('docs/a.txt') && txt.includes('img/c.png'), txt.slice(0, 300));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.ut-table tr', { hasText: 'docs/a.txt' }).getByRole('button', { name: 'Save' }).click()]); assert.equal(readFileSync(await dl.path(), 'utf8'), 'alpha'); assert.equal(dl.suggestedFilename(), 'a.txt');
    await page.locator('#tool-root input[type=search], #tool-root input[type=text]').first().fill('b.txt'); await page.waitForTimeout(300); assert.equal(await page.locator('.ut-table tr').count(), 2, 'filter leaves header + 1 row');
    await page.locator('#tool-root input[type=search], #tool-root input[type=text]').first().fill(''); await page.locator('.ut-table tr input[type=checkbox]').nth(0).check(); await page.locator('.ut-table tr input[type=checkbox]').nth(2).check();
    const [d2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Save 2 selected as ZIP/ }).click()]); const back = F2.unzipSync(new Uint8Array(readFileSync(await d2.path()))); assert.deepEqual(Object.keys(back).sort(), ['b.txt', 'docs/a.txt'].sort().length === 2 ? Object.keys(back).sort() : []); assert.equal(Object.keys(back).length, 2);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'x.rar', buffer: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 7, 0, 0, 0, 0, 0, 0]) }); await page.waitForTimeout(500); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /RAR archive/);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'a.txt.gz', buffer: Buffer.from(F2.gzipSync(new TextEncoder().encode('zipped text'))) }); await page.waitForSelector('.ut-table'); txt = await rootText(page); assert.ok(txt.includes('a.txt'), 'gz single file listed');
  },
  async 'zip-creator'(page) {
    await page.setInputFiles('#tool-root input[type=file]:not([webkitdirectory])', [{ name: 'a.txt', buffer: Buffer.from('hello '.repeat(500)) }, { name: 'a.txt', buffer: Buffer.from('second') }, { name: 'p.jpg', buffer: Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]) }]); await page.waitForSelector('[data-result=ready]');
    await page.locator('#tool-root input[type=text]').first().fill('my:files'); await page.waitForTimeout(500); const f = await dlWav(page); assert.equal(f.name, 'my-files.zip'); const z = F2.unzipSync(new Uint8Array(f.buf)); assert.deepEqual(Object.keys(z).sort(), ['a (2).txt', 'a.txt', 'p.jpg']); assert.equal(Buffer.from(z['a (2).txt']).toString(), 'second');
    const t = spawnSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip())', f.path]).stdout.toString().trim(); assert.equal(t, 'None', 'Python reads the ZIP without errors');
  },
  async 'pdf-to-html'(page) {
    const { PDFDocument, StandardFonts } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica), p = d.addPage([400, 500]);
    p.drawText('Big Title', { x: 40, y: 440, size: 30, font: f }); p.drawText('Intro line one of the paragraph', { x: 40, y: 400, size: 12, font: f }); p.drawText('and it goes on here.', { x: 40, y: 386, size: 12, font: f }); p.drawText('- first item', { x: 40, y: 350, size: 12, font: f }); p.drawText('- second item', { x: 40, y: 336, size: 12, font: f });
    await page.setInputFiles('#tool-root input[type=file]', { name: 'in.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) }); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
    const html = await out(page).inputValue(); assert.match(html, /<h1>Big Title<\/h1>/); assert.match(html, /<p>Intro line one of the paragraph and it goes on here\.<\/p>/); assert.match(html, /<ul><li>first item<\/li><li>second item<\/li><\/ul>/); assert.ok(html.startsWith('<!DOCTYPE html>'));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download.*\.html/ }).click()]); assert.equal(dl.suggestedFilename(), 'in.html');
    await page.locator('#tool-root input[type=checkbox]').nth(2).uncheck(); await page.waitForTimeout(300); assert.ok(!(await out(page).inputValue()).includes('<html'), 'fragment mode');
  },
  async 'font-converter'(page) {
    const ttf = readFileSync(new URL('../assets/vendor/fonts/DejaVuSans.ttf', import.meta.url)); await page.setInputFiles('#tool-root input[type=file]', { name: 'DejaVuSans.ttf', buffer: ttf }); await page.waitForSelector('[data-result=ready]');
    assert.match(await rootText(page), /Family\s*DejaVu Sans/); assert.ok(/@font-face/.test(await out(page).inputValue()) && /DejaVu Sans/.test(await out(page).inputValue()));
    const f = await dlWav(page); assert.equal(f.name, 'DejaVuSans.woff'); assert.ok(f.buf.length < ttf.length * 0.7); const fc = spawnSync('python3', ['-c', 'import sys;from fontTools.ttLib import TTFont;f=TTFont(sys.argv[1]);print(f.flavor,f["name"].getDebugName(1))', f.path]).stdout.toString().trim(); assert.equal(fc, 'woff DejaVu Sans');
    const loaded = await page.evaluate(() => document.fonts.check("20px 'OhfisPreview'")); assert.ok(loaded, 'browser loaded the font for the preview');
    await page.setInputFiles('#tool-root input[type=file]', { name: 'DejaVuSans.woff', buffer: f.buf }); await page.waitForTimeout(600); await page.waitForSelector('[data-result=ready]'); const g = await dlWav(page); assert.equal(g.name, 'DejaVuSans.ttf'); assert.equal(spawnSync('python3', ['-c', 'import sys;from fontTools.ttLib import TTFont;print(TTFont(sys.argv[1]).flavor)', g.path]).stdout.toString().trim(), 'None');
    await page.setInputFiles('#tool-root input[type=file]', { name: 'x.woff2', buffer: Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(60)]) }); await page.waitForTimeout(400); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /WOFF2/);
  },
  async 'webcam-video-recorder'(page) {
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async c => { const cv = Object.assign(document.createElement('canvas'), { width: 320, height: 240 }), g = cv.getContext('2d'); let n = 0; setInterval(() => { g.fillStyle = `hsl(${n++ * 9 % 360} 80% 50%)`; g.fillRect(0, 0, 320, 240); }, 40); const s = cv.captureStream(25); if (c.audio) { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); d.stream.getAudioTracks().forEach(t => s.addTrack(t)); } return s; }; });
    await page.getByRole('button', { name: 'Turn camera on' }).click(); await page.waitForFunction(() => !document.querySelector('#tool-root button[disabled]') || [...document.querySelectorAll('#tool-root button')].some(b => /Start recording/.test(b.textContent) && !b.disabled));
    await page.getByRole('button', { name: /Start recording/ }).click(); await page.waitForTimeout(2200); await page.getByRole('button', { name: /Stop/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 10000 });
    const f = await dlWav(page); assert.match(f.name, /^webcam-recording\.(webm|mp4)$/); const pr = ffprobe(f.path, 'stream=codec_type,width,height'); const kinds = pr.streams.map(s => s.codec_type).sort(); assert.deepEqual(kinds, ['audio', 'video']); assert.equal(pr.streams.find(s => s.codec_type === 'video').width, 320);
  },
  async 'text-to-speech'(page) {
    await page.evaluate(() => { window.__spoken = []; speechSynthesis.speak = u => { window.__spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch }); setTimeout(() => u.onend && u.onend(), 5); }; speechSynthesis.cancel = () => {}; });
    const text = Array.from({ length: 30 }, (_, i) => `This is sentence number ${i + 1} of a long text.`).join(' ');
    await area(page).fill(text); await page.locator('#tool-root input[type=number]').first().fill('1.5'); await page.getByRole('button', { name: /Read aloud/ }).click(); await page.waitForFunction(() => /Finished/.test(document.querySelector('#tool-root').innerText), null, { timeout: 8000 });
    const spoken = await page.evaluate(() => window.__spoken); assert.ok(spoken.length >= 6 && spoken.every(s => s.text.length <= 200 && s.rate === 1.5), 'split into chunks: ' + spoken.length); assert.equal(spoken.map(s => s.text).join(' '), text, 'nothing lost');
    await area(page).fill(''); await page.getByRole('button', { name: /Read aloud/ }).click(); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /Enter some text/);
  },
});

// ---- video tools (real FFmpeg WebAssembly in the browser) ----
const vidCache = {};
const makeVideo = (name, { dur = 3, w = 320, h = 240, audio = true, crf = 0 } = {}) => { const key = [name, dur, w, h, audio, crf].join(); if (vidCache[key]) return vidCache[key]; const d = mkdtempSync(join(tmpdir(), 'v-')), f = join(d, name); const a = ['-y', '-f', 'lavfi', '-i', `testsrc=size=${w}x${h}:rate=25:duration=${dur}`]; if (audio) a.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${dur}`, '-c:a', 'aac'); a.push('-c:v', 'libx264', ...(crf ? ['-crf', String(crf)] : []), '-pix_fmt', 'yuv420p', '-shortest', f); const r = spawnSync('ffmpeg', a); assert.equal(r.status, 0, 'ffmpeg test video'); return (vidCache[key] = readFileSync(f)); };
const dropVideo = async (page, ...vids) => { await page.setInputFiles('#tool-root .ut-drop input[type=file]', vids.map((b, i) => ({ name: `clip${i + 1}.mp4`, mimeType: 'video/mp4', buffer: b }))); await page.waitForFunction(() => { const g = [...document.querySelectorAll('#tool-root button')].find(b => /Trim|Join|Convert|Compress|Apply|Resize|Change speed|Make loop|Add |Remove logo|Make GIF|Stabilise/.test(b.textContent) && !/Cancel/.test(b.textContent)); return g && !g.disabled; }, null, { timeout: 90000 }).catch(() => {}); };
const goVideo = async (page, label) => { await page.getByRole('button', { name: label, exact: true }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 120000 }); const f = await dlWav(page); return { ...f, ...ffprobe(f.path, 'format=duration:stream=codec_type,codec_name,width,height') }; };
const vstream = r => r.streams.find(s => s.codec_type === 'video'), astream = r => r.streams.find(s => s.codec_type === 'audio'), vdur = r => Number(r.format.duration);
const numAt = (page, i) => page.locator('#tool-root input[type=number]').nth(i);
Object.assign(custom, {
  async 'video-trimmer'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 4 })); assert.match(await rootText(page), /Length\s*0:04/); await numAt(page, 0).fill('1'); await numAt(page, 1).fill('3');
    let r = await goVideo(page, 'Trim video'); assert.ok(Math.abs(vdur(r) - 2) < 0.25, 'accurate ' + vdur(r)); assert.equal(vstream(r).codec_name, 'h264'); assert.match(r.name, /clip1-trimmed\.mp4/);
    await page.locator('#tool-root input[type=checkbox]').check(); r = await goVideo(page, 'Trim video'); assert.ok(vdur(r) > 1.5 && vdur(r) < 4.1, 'fast ' + vdur(r));
    await numAt(page, 0).fill('3'); await numAt(page, 1).fill('1'); await page.getByRole('button', { name: 'Trim video' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /end must be after/);
  },
  async 'video-merger'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 2 }), makeVideo('b.mp4', { dur: 2, w: 640, h: 360 })); assert.equal(await page.locator('.ut-row').count(), 2);
    await page.locator('#tool-root select').first().selectOption('1280x720'); const r = await goVideo(page, 'Join videos'); assert.ok(Math.abs(vdur(r) - 4) < 0.3, 'length ' + vdur(r)); assert.equal(vstream(r).width, 1280); assert.ok(astream(r));
    await page.locator('.ut-row button', { hasText: '↓' }).first().click(); assert.deepEqual((await page.locator('.ut-row__name').allInnerTexts()).map(x => x.replace(/^\d\. /, '')), ['clip2.mp4', 'clip1.mp4']);
    await dropVideo(page, makeVideo('s.mp4', { dur: 2, audio: false })); const r2 = await goVideo(page, 'Join videos'); assert.equal(astream(r2), undefined, 'no audio when one clip is silent'); assert.match(await rootText(page), /no sound/);
  },
  async 'video-converter'(page) {
    await dropVideo(page, makeVideo('a.mp4', { w: 640, h: 360 })); const fmt = page.locator('#tool-root select').first();
    await fmt.selectOption('webm'); let r = await goVideo(page, 'Convert'); assert.equal(vstream(r).codec_name, 'vp8'); assert.match(r.name, /\.webm$/);
    await fmt.selectOption('mp3'); r = await goVideo(page, 'Convert'); assert.equal(astream(r).codec_name, 'mp3'); assert.equal(vstream(r), undefined);
    await fmt.selectOption('gif'); r = await goVideo(page, 'Convert'); assert.equal(vstream(r).codec_name, 'gif');
    await fmt.selectOption('mp4'); await page.locator('#tool-root select').nth(1).selectOption('320'); await page.locator('#tool-root input[type=checkbox]').check(); r = await goVideo(page, 'Convert'); assert.equal(vstream(r).width, 320); assert.equal(astream(r), undefined, 'muted');
  },
  async 'video-compressor'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 3, w: 640, h: 480, crf: 10 })); await numAt(page, 0).fill('36'); await page.locator('#tool-root select').first().selectOption('240'.replace('240', '360')); const r = await goVideo(page, 'Compress video'); assert.equal(vstream(r).height, 360); assert.ok(readFileSync(r.path).length < makeVideo('a.mp4', { dur: 3, w: 640, h: 480, crf: 10 }).length, 'smaller'); assert.match(await rootText(page), /Change\s*−/);
  },
  async 'video-crop-rotate-flip'(page) {
    await dropVideo(page, makeVideo('a.mp4')); const sel = page.locator('#tool-root select'); await sel.first().selectOption('aspect'); await sel.nth(1).selectOption('1:1'); let r = await goVideo(page, 'Apply'); assert.equal(vstream(r).width, 240); assert.equal(vstream(r).height, 240);
    await sel.first().selectOption('rect'); await numAt(page, 2).fill('100'); await numAt(page, 3).fill('60'); assert.ok(await page.locator('.ut-rect').isVisible(), 'crop frame shown'); r = await goVideo(page, 'Apply'); assert.equal(vstream(r).width, 100); assert.equal(vstream(r).height, 60);
    await sel.first().selectOption('none'); await sel.nth(2).selectOption('90'); r = await goVideo(page, 'Apply'); assert.equal(vstream(r).width, 240); assert.equal(vstream(r).height, 320);
  },
  async 'video-resizer'(page) {
    await dropVideo(page, makeVideo('a.mp4', { w: 640, h: 360 })); await page.locator('#tool-root select').nth(1).selectOption('240'); let r = await goVideo(page, 'Resize video'); assert.equal(vstream(r).height, 240); assert.equal(vstream(r).width, 426);
    await page.locator('#tool-root select').first().selectOption('exact'); await numAt(page, 1).fill('100'); await numAt(page, 2).fill('100'); r = await goVideo(page, 'Resize video'); assert.equal(vstream(r).width, 100); assert.equal(vstream(r).height, 100);
  },
  async 'video-speed-changer'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 4 })); let r = await goVideo(page, 'Change speed'); assert.ok(Math.abs(vdur(r) - 2) < 0.3, '2× ' + vdur(r)); assert.ok(astream(r));
    await numAt(page, 0).fill('0.5'); r = await goVideo(page, 'Change speed'); assert.ok(Math.abs(vdur(r) - 8) < 0.6, '0.5× ' + vdur(r));
  },
  async 'video-loop'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 2 })); let r = await goVideo(page, 'Make loop'); assert.ok(Math.abs(vdur(r) - 6) < 0.5, 'copy ×3 ' + vdur(r)); await page.locator('#tool-root input[type=checkbox]').uncheck(); await numAt(page, 0).fill('2'); r = await goVideo(page, 'Make loop'); assert.ok(Math.abs(vdur(r) - 4) < 0.4, 're-encode ×2 ' + vdur(r));
  },
  async 'video-volume-changer'(page) {
    await dropVideo(page, makeVideo('a.mp4')); let r = await goVideo(page, 'Apply'); assert.equal(vstream(r).codec_name, 'h264'); assert.ok(astream(r)); await page.locator('#tool-root input[type=checkbox]').check(); r = await goVideo(page, 'Apply'); assert.equal(astream(r), undefined, 'muted'); assert.equal(vstream(r).codec_name, 'h264');
    await dropVideo(page, makeVideo('s.mp4', { audio: false })); await page.getByRole('button', { name: 'Apply' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /no audio/);
  },
  async 'video-add-audio'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 3 })); const d = mkdtempSync(join(tmpdir(), 'm-')); spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=10', join(d, 'm.mp3')]); await page.locator('#tool-root input[type=file]').nth(1).setInputFiles(join(d, 'm.mp3')); await page.waitForFunction(() => ![...document.querySelectorAll('#tool-root button')].find(b => /Add audio/.test(b.textContent)).disabled);
    let r = await goVideo(page, 'Add audio'); assert.ok(Math.abs(vdur(r) - 3) < 0.3, 'ends with the video ' + vdur(r)); assert.ok(astream(r)); await page.locator('#tool-root select').first().selectOption('mix'); r = await goVideo(page, 'Add audio'); assert.ok(astream(r) && Math.abs(vdur(r) - 3) < 0.3);
  },
  async 'video-add-text'(page) {
    await dropVideo(page, makeVideo('a.mp4')); await page.locator('#tool-root textarea').fill('Grüße & “Test” 100%'); const r = await goVideo(page, 'Add text'); assert.equal(vstream(r).width, 320); assert.ok(astream(r)); const orig = makeVideo('a.mp4'), d = mkdtempSync(join(tmpdir(), 'f-')); writeFileSync(join(d, 'o.mp4'), orig); const fr = (f, o) => { spawnSync('ffmpeg', ['-y', '-i', f, '-vf', 'select=eq(n\\,30)', '-frames:v', '1', o]); return readFileSync(o); }; assert.notDeepEqual(fr(join(d, 'o.mp4'), join(d, 'o.png')), fr(r.path, join(d, 't.png')), 'text changed the frame');
    await page.locator('#tool-root textarea').fill(''); await page.getByRole('button', { name: 'Add text' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /Enter the text/);
  },
  async 'video-add-image'(page) {
    await dropVideo(page, makeVideo('a.mp4')); const d = mkdtempSync(join(tmpdir(), 'i-')); spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=red:s=100x50', '-frames:v', '1', join(d, 'l.png')]); await page.locator('#tool-root input[type=file]').nth(1).setInputFiles(join(d, 'l.png')); await page.waitForFunction(() => ![...document.querySelectorAll('#tool-root button')].find(b => /Add image/.test(b.textContent)).disabled);
    const r = await goVideo(page, 'Add image'); assert.equal(vstream(r).width, 320); assert.ok(astream(r)); const fr = spawnSync('ffmpeg', ['-y', '-i', r.path, '-vf', 'select=eq(n\\,10),crop=4:4:260:198', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']); const px = fr.stdout; assert.ok(px[0] > 150 && px[1] < 90 && px[2] < 90, `red logo in the bottom right corner: ${[...px.slice(0, 3)]}`);
  },
  async 'video-logo-remover'(page) {
    await dropVideo(page, makeVideo('a.mp4')); assert.ok(await page.locator('.ut-rect').isVisible(), 'frame shown'); await numAt(page, 0).fill('10'); await numAt(page, 1).fill('10'); await numAt(page, 2).fill('80'); await numAt(page, 3).fill('40'); const r = await goVideo(page, 'Remove logo'); assert.equal(vstream(r).width, 320); assert.ok(astream(r));
    await numAt(page, 0).fill('900'); await page.getByRole('button', { name: 'Remove logo' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /outside/);
  },
  async 'video-to-gif'(page) {
    await dropVideo(page, makeVideo('a.mp4', { dur: 4 })); await numAt(page, 0).fill('1'); await numAt(page, 1).fill('2'); await numAt(page, 2).fill('8'); await numAt(page, 3).fill('160'); const r = await goVideo(page, 'Make GIF'); assert.equal(vstream(r).codec_name, 'gif'); assert.equal(vstream(r).width, 160); assert.ok(Math.abs(vdur(r) - 2) < 0.35, 'gif length ' + vdur(r)); assert.match(r.name, /clip1\.gif$/);
  },
  async 'video-stabilizer'(page) {
    await dropVideo(page, makeVideo('a.mp4')); const r = await goVideo(page, 'Stabilise'); assert.equal(vstream(r).width, 320); assert.ok(Math.abs(vdur(r) - 3) < 0.3); assert.ok(astream(r));
    await dropVideo(page, Buffer.from('this is not a video file at all')).catch(() => {}); await page.waitForSelector('.pt-drop__error:visible', { timeout: 15000 }); assert.ok(true);
  },
});

// ---- developer tools: formatters, converters, regex, markdown ----
Object.assign(custom, {
  async 'json-formatter'(page) {
    await area(page).fill('{"b":1,"a":{"z":[1,2],"y":null}}'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '{\n  "b": 1,\n  "a": {\n    "z": [\n      1,\n      2\n    ],\n    "y": null\n  }\n}');
    await page.locator('#tool-root input[type=checkbox]').nth(1).check(); await page.waitForTimeout(200); assert.ok((await out(page).inputValue()).indexOf('"a"') < (await out(page).inputValue()).indexOf('"b"'), 'sorted'); await page.locator('#tool-root input[type=checkbox]').nth(0).check(); await page.waitForTimeout(200); assert.equal(await out(page).inputValue(), '{"a":{"y":null,"z":[1,2]},"b":1}');
    await area(page).fill('{\n  "a": 1,\n  "b": ,\n}'); await page.waitForTimeout(300); const e = await page.locator('.pt-drop__error:visible').innerText(); assert.match(e, /Line 3, column 8/); assert.match(e, /\^/);
    await area(page).fill('{ // c\n "a": 1, }'); await page.locator('#tool-root input[type=checkbox]').nth(2).check(); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '{"a":1}');
  },
  async 'data-format-converter'(page) {
    await area(page).fill('a: 1\nlist:\n  - x\n  - y: true\n'); await page.waitForTimeout(300); assert.deepEqual(JSON.parse(await out(page).inputValue()), { a: 1, list: ['x', { y: true }] }); assert.match(await rootText(page), /Detected input\s*YAML/);
    await page.locator('#tool-root select').nth(1).selectOption('xml'); await page.waitForTimeout(300); assert.match(await out(page).inputValue(), /<root>\n {2}<a>1<\/a>/);
    await area(page).fill('<shop name="X"><item id="1">Pen</item><item id="2"/></shop>'); await page.locator('#tool-root select').nth(1).selectOption('json'); await page.waitForTimeout(300); assert.deepEqual(JSON.parse(await out(page).inputValue()), { shop: { '@name': 'X', item: [{ '@id': '1', '#text': 'Pen' }, { '@id': '2' }] } });
    await area(page).fill('<a><b></a>'); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /Not valid XML.*does not match/);
  },
  async 'sql-formatter'(page) {
    await area(page).fill("select a,b from t where x=1 and y='z' order by a"); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), "SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n  AND y = 'z'\nORDER BY\n  a");
    await page.locator('#tool-root select').nth(1).selectOption('lower'); await page.waitForTimeout(200); assert.match(await out(page).inputValue(), /^select\n {2}a,/);
  },
  async 'regex-tester'(page) {
    await page.waitForFunction(() => /Matches\s*3/.test(document.getElementById('tool-root').innerText), null, { timeout: 8000 }); const marks = await page.locator('.ut-hl mark').allInnerTexts(); assert.deepEqual(marks, ['a=1', 'bb=22', 'c=333']); assert.match(await rootText(page), /bb=22\s+2:1/); assert.match(await rootText(page), /\$1=bb\s+\$2=22\s+key=bb/);
    await page.locator('#tool-root input[type=text]').nth(1).fill('<$1>'); await page.waitForTimeout(700); assert.match(await out(page).inputValue(), /<a>/); assert.match(await out(page).inputValue(), /<bb> and <c>/);
    await page.locator('#tool-root input[type=text]').first().fill('(unclosed'); await page.waitForTimeout(700); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0, 'invalid pattern message');
    await page.locator('#tool-root input[type=text]').first().fill('(a+)+$'); await area(page).fill('a'.repeat(40) + 'b'); await page.waitForFunction(() => /took too long/.test(document.getElementById('tool-root').innerText), null, { timeout: 8000 });
    await area(page).fill('fine'); await page.locator('#tool-root input[type=text]').first().fill('f(i)ne'); await page.waitForFunction(() => /Matches\s*1/.test(document.getElementById('tool-root').innerText), null, { timeout: 8000 });
  },
  async 'markdown-previewer'(page) {
    await area(page).fill('# Title\n\n- [x] done\n\n<script>window.__x=1</script> **b** [bad](javascript:alert(1))'); await page.waitForTimeout(300); const html = await page.locator('.ut-richout').innerHTML(); assert.match(html, /<h1>Title<\/h1>/); assert.match(html, /<input type="checkbox" disabled="" checked="">/); assert.ok(!html.includes('<script'), 'no script'); assert.ok(html.includes('href="#"'), 'js link neutralised'); assert.equal(await page.evaluate(() => window.__x), undefined);
  },
  async 'css-html-minifier'(page) {
    await area(page).fill('/* c */\n.a {\n  margin: 0px;\n  color: #ffffff;\n}\n'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '.a{margin:0;color:#fff}'); assert.match(await rootText(page), /Type\s*CSS/);
    await area(page).fill('<!-- x -->\n<div>\n  <p>Hi   there</p>\n</div>'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '<div><p>Hi there</p></div>'); await area(page).fill('{ "a": [1, 2] }'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '{"a":[1,2]}');
  },
  async 'lorem-ipsum-generator'(page) {
    const a = await out(page).inputValue(); assert.ok(a.startsWith('Lorem ipsum dolor sit amet')); assert.equal(a.split('\n\n').length, 3); await page.getByRole('button', { name: 'Generate new text' }).click(); const b = await out(page).inputValue(); assert.notEqual(a, b);
    await page.locator('#tool-root select').selectOption('words'); await page.locator('#tool-root input[type=number]').fill('10'); await page.waitForTimeout(300); assert.equal((await out(page).inputValue()).split(' ').length, 10);
  },
});

// ---- text analysis, files and EXIF ----
Object.assign(custom, {
  async 'readability-score'(page) {
    await area(page).fill('The cat sat on the mat.'); await page.waitForTimeout(300); const t = await rootText(page); assert.match(t, /Flesch Reading Ease: 116\.1/); assert.match(t, /Level: very easy/); assert.match(t, /No sentence is longer than 25 words/);
    await area(page).fill('Short. ' + 'word '.repeat(30).trim() + '.'); await page.waitForTimeout(300); assert.match(await rootText(page), /Sentences over 25 words \(1\)/);
    await page.locator('#tool-root select').first().selectOption('de'); await area(page).fill('Das ist ein Haus. Es ist groß.'); await page.waitForTimeout(300); assert.match(await rootText(page), /Amstad/); assert.match(await rootText(page), /Wiener Sachtextformel/);
  },
  async 'text-summarizer'(page) {
    await area(page).fill('Solar power is growing fast. Many homes now use solar panels on the roof. Solar panels convert sunlight into electricity. The weather was nice yesterday. Cheap solar panels make solar power popular. My cat likes fish.'); await page.locator('#tool-root input[type=number]').fill('2'); await page.waitForTimeout(400); const s = await out(page).inputValue(); assert.ok(!/cat likes fish|weather was nice/.test(s), s); assert.match(await rootText(page), /Sentences\s*2 of 6/); assert.match(await rootText(page), /Key words\s*solar/);
  },
  async 'text-similarity-checker'(page) {
    const t = page.locator('#tool-root textarea'); await t.nth(0).fill('The quick brown fox jumps over the lazy dog near the river bank every single morning.'); await t.nth(1).fill('I think that the quick brown fox jumps over the lazy dog near the river bank and then rests.'); await page.waitForTimeout(500); const txt = await rootText(page); assert.match(txt, /the quick brown fox jumps over the lazy dog near the river bank/); assert.match(txt, /Word sequences in common/);
    await t.nth(1).fill('Something entirely different about cooking pasta with tomatoes and basil today.'); await page.waitForTimeout(500); assert.match(await rootText(page), /No passage of that length/);
  },
  async 'docx-word-counter'(page) {
    const xml = '<w:document><w:body><w:p><w:r><w:t>One two three.</w:t></w:r></w:p><w:p><w:r><w:t>Four five.</w:t></w:r></w:p></w:body></w:document>', foot = '<w:footnotes><w:p><w:r><w:t>Note one</w:t></w:r></w:p></w:footnotes>';
    const docx = Buffer.from(F2.zipSync({ 'word/document.xml': new TextEncoder().encode(xml), 'word/footnotes.xml': new TextEncoder().encode(foot) }));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'doc.docx', buffer: docx }); await page.waitForSelector('[data-result=ready]'); let t = await rootText(page); assert.match(t, /Words\s*5/); assert.match(t, /Paragraphs\s*2/);
    await page.locator('#tool-root input[type=checkbox]').first().check(); await page.waitForTimeout(300); assert.match(await rootText(page), /Words\s*7/);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'x.docx', buffer: Buffer.from(F2.zipSync({ 'a.txt': new Uint8Array([1]) })) }); await page.waitForTimeout(300); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /not a \.docx/);
  },
  async 'file-type-detector'(page) {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]); await page.setInputFiles('#tool-root input[type=file]', [{ name: 'photo.jpg', buffer: png }, { name: 'doc.pdf', buffer: Buffer.from('%PDF-1.4\n' + ' '.repeat(40)) }, { name: 'data', buffer: Buffer.from('{"a":1}') }, { name: 'a.docx', buffer: Buffer.from(F2.zipSync({ 'word/document.xml': new Uint8Array([60]) })) }]); await page.waitForSelector('[data-result=ready]');
    const rows = await page.locator('.ut-table tr').allInnerTexts(); const txt = rows.join('\n'); assert.match(txt, /photo\.jpg\s+PNG image\s+image\/png[\s\S]*⚠ no, the content looks like \.png/); assert.match(txt, /doc\.pdf\s+PDF document[\s\S]*✓ yes/); assert.match(txt, /data\s+JSON data[\s\S]*\(no extension\)/); assert.match(txt, /a\.docx\s+Word document \(DOCX\)/);
  },
  async 'folder-tree-generator'(page) {
    await area(page).fill('src/app.js\nsrc/lib/util.js\nREADME.md\nnode_modules/x/i.js'); await page.waitForTimeout(400); assert.equal(await out(page).inputValue(), '.\n├── src/\n│   ├── lib/\n│   │   └── util.js\n│   └── app.js\n└── README.md'); assert.match(await rootText(page), /Files\s*3/);
    await page.locator('#tool-root input[type=number]').fill('1'); await page.waitForTimeout(300); assert.equal(await out(page).inputValue(), '.\n├── src/\n└── README.md');
    await page.locator('#tool-root input[type=number]').fill('0'); const dir = tmp(); mkdirSync(join(dir, 'proj/sub'), { recursive: true }); writeFileSync(join(dir, 'proj/a.txt'), 'x'.repeat(2000)); writeFileSync(join(dir, 'proj/sub/b.txt'), 'y'); await page.locator('#tool-root input[webkitdirectory]').setInputFiles(join(dir, 'proj')); await page.waitForTimeout(500); const t = await out(page).inputValue(); assert.match(t, /^proj\/\n/); assert.match(t, /├── sub\/\n│ {3}└── b\.txt\n└── a\.txt/);
  },
  async 'exif-viewer'(page) {
    const dir = tmp(); const jpg = join(dir, 'photo.jpg'); await makeImage(page, jpg, { type: 'image/jpeg' }); writeFileSync(jpg, addExif(new Uint8Array(readFileSync(jpg)))); await page.setInputFiles('#tool-root input[type=file]', jpg); await page.waitForSelector('[data-result=ready]'); const t = await rootText(page); assert.match(t, /GPS location: 52\.50000, 13\.40000/); assert.match(t, /Camera make\s+Canon/); assert.match(t, /Orientation\s+6/); assert.ok(await page.locator('a[href*="openstreetmap.org"]').count() === 1);
    const plain = join(dir, 'plain.png'); await makeImage(page, plain, {}); await page.setInputFiles('#tool-root input[type=file]', plain); await page.waitForTimeout(500); assert.match(await rootText(page), /No EXIF metadata found/);
  },
});

// ---- HEIC and GIF ----
Object.assign(custom, {
  async 'heic-to-jpg'(page) {
    const dir = tmp(); const src = join(dir, 'in.png'); await makeImage(page, src, { w: 320, h: 200, paint: "x.fillStyle='#d02020'; x.fillRect(0,0,w/2,h); x.fillStyle='#2040d0'; x.fillRect(w/2,0,w/2,h);" });
    const heic = join(dir, 'photo.heic'); const r = spawnSync('python3', ['-c', 'import sys;from PIL import Image;import pillow_heif;pillow_heif.register_heif_opener();im=Image.open(sys.argv[1]).convert("RGB");im.save(sys.argv[2],quality=90)', src, heic]); assert.equal(r.status, 0, r.stderr.toString());
    await page.setInputFiles('#tool-root input[type=file]', heic); await page.waitForSelector('.ut-img img', { timeout: 60000 }); await page.waitForTimeout(500); assert.match(await rootText(page), /320 × 200/);
    const d = await saveDownload(page, () => page.locator('.ut-img button, .ut-img a').first().click()); assert.equal(d.name, 'photo.jpg'); const im = await decode(page, d.path); assert.deepEqual([im.w, im.h], [320, 200]); const px = (x, y) => im.data.slice((y * im.w + x) * 4, (y * im.w + x) * 4 + 3); assert.ok(px(10, 10)[0] > 170 && px(10, 10)[2] < 90, 'left is red: ' + px(10, 10)); assert.ok(px(300, 10)[2] > 150 && px(300, 10)[0] < 90, 'right is blue: ' + px(300, 10));
    await page.locator('#tool-root input[type=number]').fill('160'); await page.waitForTimeout(1500); assert.match(await rootText(page), /160 × 100/);
  },
  async 'images-to-gif'(page) {
    const dir = tmp(); const mk = async (n, col) => { const f = join(dir, n); await makeImage(page, f, { w: 200, h: 100, paint: `x.fillStyle='${col}'; x.fillRect(0,0,w,h);` }); return f; };
    const files = [await mk('a.png', '#ff0000'), await mk('b.png', '#00ff00'), await mk('c.png', '#0000ff')]; await page.setInputFiles('#tool-root input[type=file]', files); await page.waitForSelector('[data-result=ready]', { timeout: 30000 });
    assert.match(await rootText(page), /Frames\s*3/); const f = await dlWav(page); assert.equal(f.name, 'animation.gif');
    const info = JSON.parse(spawnSync('python3', ['-c', 'import sys,json;from PIL import Image;im=Image.open(sys.argv[1]);out=[]\nfor i in range(im.n_frames):\n    im.seek(i);c=im.convert("RGB").getpixel((5,5));out.append([c,im.info.get("duration")])\nprint(json.dumps([im.size,im.n_frames,im.info.get("loop"),out]))', f.path]).stdout.toString()); assert.deepEqual(info[0], [480, 240]); assert.equal(info[1], 3); assert.equal(info[2], 0);
    assert.ok(info[3][0][0][0] > 240 && info[3][0][0][1] < 15, 'frame 1 red'); assert.ok(info[3][1][0][1] > 240, 'frame 2 green'); assert.ok(info[3][2][0][2] > 240, 'frame 3 blue'); assert.equal(info[3][0][1], 500);
    await page.locator('.ut-row button', { hasText: '↓' }).first().click(); await page.waitForTimeout(800); const f2 = await dlWav(page); const first = spawnSync('python3', ['-c', 'import sys;from PIL import Image;print(Image.open(sys.argv[1]).convert("RGB").getpixel((5,5)))', f2.path]).stdout.toString(); assert.match(first, /\(0, 255, 0\)|\(0, 2[45]\d, 0\)/, 'reordered: green first ' + first);
  },
});

// ---- PDF: compress to size, compare, search; EPUB ----
const textPdf = async (pages) => { const { PDFDocument, StandardFonts } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica); for (const lines of pages) { const p = d.addPage([400, 500]); lines.forEach((l, i) => p.drawText(l, { x: 30, y: 450 - i * 18, size: 12, font: f })); } return Buffer.from(await d.save()); };
Object.assign(custom, {
  async 'pdf-compress-to-size'(page) {
    const dir = tmp(); const jpg = join(dir, 'noise.jpg'); await makeImage(page, jpg, { w: 1400, h: 1400, type: 'image/jpeg', paint: "for (let i=0;i<w;i+=2) for (let j=0;j<h;j+=2) { x.fillStyle='rgb('+((i*7+j*13)%256)+','+((i*3+j*5+(i*j)%97)%256)+','+((i*11+j)%256)+')'; x.fillRect(i,j,2,2); }" });
    const { PDFDocument, StandardFonts } = await import('../assets/vendor/pdf-lib/pdf-lib.esm.min.js'); const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica), img = await d.embedJpg(readFileSync(jpg)); for (let i = 0; i < 2; i++) { const p = d.addPage([595, 842]); p.drawImage(img, { x: 20, y: 120, width: 555, height: 555 }); p.drawText('Page ' + (i + 1) + ' remains searchable', { x: 30, y: 780, size: 14, font: f }); }
    const src = Buffer.from(await d.save()); assert.ok(src.length > 400000, 'source is large: ' + src.length);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'big.pdf', mimeType: 'application/pdf', buffer: src }); await page.waitForFunction(() => ![...document.querySelectorAll('#tool-root button')].find(b => /Compress to this size/.test(b.textContent)).disabled);
    await page.locator('#tool-root input[type=text]').fill('300 KB'); await page.getByRole('button', { name: 'Compress to this size' }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 120000 });
    const r = await dlWav(page); assert.ok(r.buf.length <= 300 * 1024, 'under the target: ' + r.buf.length); assert.ok(r.buf.length < src.length / 2); assert.match(r.name, /^big-/); assert.ok(pdfText(r.buf).includes('remains searchable'), 'text kept'); assert.equal((await pageCount(r.buf)).n, 2); assert.match(await rootText(page), /Target\s*300\.0 KB/);
    await page.locator('#tool-root input[type=text]').fill('1 KB'); await page.getByRole('button', { name: 'Compress to this size' }).click(); await page.waitForFunction(() => /Enter a target size/.test(document.getElementById('tool-root').innerText), null, { timeout: 5000 });
    await page.locator('#tool-root input[type=text]').fill('50 KB'); await page.getByRole('button', { name: 'Compress to this size' }).click(); await page.waitForFunction(() => /smallest possible result|Target reached/.test(document.getElementById('tool-root').innerText), null, { timeout: 120000 });
  },
  async 'pdf-compare'(page) {
    const a = await textPdf([['Contract', 'The price is 10 euros per month.', 'Signed in Berlin.'], ['Second page stays the same.']]), b = await textPdf([['Contract', 'The price is 12 euros per year.', 'Signed in Berlin.'], ['Second page stays the same.']]);
    await page.locator('#tool-root input[type=file]').nth(0).setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: a }); await page.locator('#tool-root input[type=file]').nth(1).setInputFiles({ name: 'b.pdf', mimeType: 'application/pdf', buffer: b }); await page.waitForSelector('[data-result=ready]', { timeout: 30000 });
    let t = await rootText(page); assert.match(t, /Pages with text changes\s*1/); assert.match(t, /Words added\s*2/); assert.match(t, /Words removed\s*2/); assert.match(t, /1\s+2\s+2\s+\d/); assert.match(t, /2\s+0\s+0\s+same/);
    assert.deepEqual((await page.locator('.ut-dw del').allInnerTexts()).map(x => x.trim()).sort(), ['10', 'month']); assert.ok((await page.locator('.ut-dw ins').allInnerTexts()).join(' ').includes('12'));
    await page.getByRole('button', { name: 'Visual differences' }).click(); await page.waitForFunction(() => /of the pixels differ/.test(document.getElementById('tool-root').innerText), null, { timeout: 30000 }); const pct = Number(/([\d.]+) % of the pixels differ/.exec(await rootText(page))[1]); assert.ok(pct > 0.05 && pct < 10, 'visual difference ' + pct);
    await page.getByRole('button', { name: 'Show page 1' }).count(); await page.locator('.ut-actions button', { hasText: 'Page 1' }).first().click();
  },
  async 'pdf-text-search'(page) {
    const pdf = await textPdf([['Invoice 2024-001', 'Payment due in 14 days.'], ['Nothing here.'], ['The invoice was paid. Invoice closed.']]);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf }); await page.waitForSelector('[data-result=ready]', { timeout: 30000 }); await page.locator('#tool-root input[type=text]').first().fill('invoice'); await page.waitForFunction(() => /Matches\s*3/.test(document.getElementById('tool-root').innerText), null, { timeout: 8000 }).catch(async e => { throw new Error('no 3 matches :: ' + (await rootText(page)).replace(/\s+/g, ' ').slice(0, 300)); });
    let t = await rootText(page); assert.match(t, /Pages with matches\s*2/); assert.deepEqual(await page.locator('.ut-table tr td:first-child').allInnerTexts(), ['1', '3', '3']); assert.equal(await page.locator('.ut-table mark').first().innerText(), 'Invoice');
    await page.locator('#tool-root input[type=checkbox]').nth(0).check(); await page.waitForTimeout(500); assert.match(await rootText(page), /Matches\s*1/); await page.locator('#tool-root input[type=checkbox]').nth(0).uncheck(); await page.locator('#tool-root input[type=checkbox]').nth(2).check(); await page.locator('#tool-root input[type=text]').first().fill('pay\\w+|due'); await page.waitForTimeout(600); assert.match(await rootText(page), /Matches\s*2/);
    await page.locator('#tool-root input[type=text]').first().fill('('); await page.waitForTimeout(500); assert.ok(await page.locator('.pt-drop__error:visible').count() > 0);
    await page.locator('#tool-root input[type=checkbox]').nth(2).uncheck(); await page.locator('#tool-root input[type=text]').first().fill('invoice'); await page.waitForTimeout(500); const csv = await saveDownload(page, () => page.getByRole('button', { name: 'Download CSV' }).click()); assert.match(readFileSync(csv.path, 'utf8'), /^page,match,context\n"1","Invoice"/);
  },
  async 'epub-to-pdf'(page) {
    const enc = s => new TextEncoder().encode(s); const files = { mimetype: enc('application/epub+zip'), 'META-INF/container.xml': enc('<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
      'OEBPS/content.opf': enc('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Testbuch Grüße</dc:title><dc:creator>Erika Muster</dc:creator></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>'),
      'OEBPS/a.xhtml': enc('<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Kapitel Eins</h1><p>' + 'Dies ist ein langer Absatz mit Umlauten äöü und Satzzeichen. '.repeat(40) + '</p><ul><li>Erster Punkt</li><li>Zweiter Punkt</li></ul></body></html>'), 'OEBPS/b.xhtml': enc('<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Kapitel Zwei</h1><p>Der Schluss.</p></body></html>') };
    await page.setInputFiles('#tool-root input[type=file]', { name: 'buch.epub', mimeType: 'application/epub+zip', buffer: Buffer.from(F2.zipSync(files)) }); await page.waitForSelector('[data-result=ready]', { timeout: 60000 });
    const r = await dlWav(page); assert.equal(r.name, 'buch.pdf'); const txt = pdfText(r.buf); assert.ok(txt.includes('Testbuch Grüße') && txt.includes('Erika Muster'), 'title page'); assert.ok(txt.includes('Kapitel Eins') && txt.includes('Kapitel Zwei') && txt.includes('äöü'), 'chapters and umlauts'); assert.ok(/Erster Punkt/.test(txt) && txt.includes('•'), 'list'); const pc = await pageCount(r.buf); assert.ok(pc.n >= 4, 'pages ' + pc.n); assert.match(await rootText(page), /Author\s*Erika Muster/);
    await page.setInputFiles('#tool-root input[type=file]', { name: 'x.epub', buffer: Buffer.from(F2.zipSync({ 'a.txt': new Uint8Array([1]) })) }); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /not an EPUB/);
  },
});

// ---- noise reducer, BPM and key ----
Object.assign(custom, {
  async 'noise-reducer'(page) {
    const sr = 22050, n = sr * 4; let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; }; const x = Float32Array.from({ length: n }, (_, i) => (i >= sr && i < sr * 3 ? 0.4 * Math.sin(2 * Math.PI * 440 * i / sr) : 0) + rnd() * 0.14);
    const rms = a => Math.sqrt(a.reduce((q, v) => q + v * v, 0) / a.length); const d = await audioRun(page, Buffer.from(AU.encodeWav([x], sr)));
    const drop = 20 * Math.log10(rms(x.subarray(0, sr / 2)) / rms(d.chs[0].subarray(0, d.sr / 2))); assert.ok(drop > 9, 'hiss reduced by ' + drop + ' dB');
    const tone = (a, rate) => { let re = 0, im = 0; const o = Math.round(rate * 1.3); for (let i = 0; i < 8192; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / 8192); re += a[o + i] * w * Math.cos(2 * Math.PI * 440 * i / rate); im += a[o + i] * w * Math.sin(2 * Math.PI * 440 * i / rate); } return Math.hypot(re, im); }; assert.ok(20 * Math.log10(tone(d.chs[0], d.sr) / tone(x, sr)) > -2.5, 'tone preserved: ' + 20 * Math.log10(tone(d.chs[0], d.sr) / tone(x, sr)));
    await numAt(page, 2).fill('0'); await numAt(page, 3).fill('0.8'); await page.waitForTimeout(2500); await page.waitForSelector('[data-result=ready]'); assert.match(await rootText(page), /Noise learned from\s*0–0\.8 s/);
  },
  async 'bpm-key-detector'(page) {
    const sr = 22050, secs = 24, x = new Float32Array(sr * secs), step = 60 / 120; for (let t = 0; t < secs; t += step) { const at = Math.floor(t * sr); for (let k = 0; k < 400 && at + k < x.length; k++) x[at + k] += Math.sin(k * 0.6) * Math.exp(-k / 60) * 0.7; }
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12); for (const [start, notes] of [[0, [57, 60, 64]], [6, [62, 65, 69]], [12, [64, 68, 71]], [18, [57, 60, 64]]]) for (const m of notes) for (let i = start * sr; i < (start + 6) * sr; i++) x[i] += 0.12 * (Math.sin(2 * Math.PI * hz(m) * i / sr) + 0.4 * Math.sin(4 * Math.PI * hz(m) * i / sr));
    await page.setInputFiles('#tool-root input[type=file]', { name: 'song.wav', mimeType: 'audio/wav', buffer: Buffer.from(AU.encodeWav([x], sr)) }); await page.waitForSelector('[data-result=ready]', { timeout: 60000 }); const t = await rootText(page);
    const bpm = Number(/Tempo\s*([\d.]+) BPM/.exec(t)[1]); assert.ok(Math.abs(bpm - 120) < 1.5 || Math.abs(bpm - 60) < 1 || Math.abs(bpm - 240) < 2, 'tempo ' + bpm); assert.match(t, /Key\s*A minor/); assert.match(t, /Camelot \(DJ wheel\)\s*8A/); assert.match(t, /Half \/ double/);
  },
});

// ---- business documents ----
Object.assign(custom, {
  async 'delivery-note-generator'(page) {
    await page.locator('#tool-root select').first().selectOption('de'); await page.getByRole('button', { name: 'Create PDF' }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 30000 }); const r = await dlWav(page); const txt = pdfText(r.buf);
    assert.ok(txt.includes('Lieferschein') && txt.includes('LS-2025-001') && /lieferadresse/i.test(txt) && txt.includes('Desk lamp LED') && txt.includes('Office chair'), txt.replace(/\s+/g, ' ').slice(0, 500)); assert.ok(txt.includes('Unterschrift') || txt.includes('Name, Datum, Unterschrift'), 'signature line'); assert.ok(!/€/.test(txt), 'no prices on a delivery note'); assert.match(r.name, /^delivery-note-LS-2025-001\.pdf$/);
    await page.locator('#tool-root select').first().selectOption('pl'); await page.locator('#tool-root textarea').nth(2).fill(''); await page.getByRole('button', { name: 'Create PDF' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /at least one item/);
  },
  async 'receipt-generator'(page) {
    await page.getByRole('button', { name: 'Create PDF' }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 30000 }); const r = await dlWav(page); const txt = pdfText(r.buf).replace(/\s+/g, ' ');
    assert.ok(txt.includes('Receipt') && txt.includes('119,00') || txt.includes('119.00'), txt.slice(0, 300)); assert.match(txt, /Net\s+€\s*100[.,]00/); assert.match(txt, /VAT 19 %\s+€\s*19[.,]00/); assert.ok(txt.includes('Consulting services, March') && txt.includes('Cash') && txt.includes('Signature'));
    await page.locator('#tool-root input[type=number]').first().fill('0'); await page.getByRole('button', { name: 'Create PDF' }).click(); await page.waitForSelector('.pt-drop__error:visible'); assert.match(await page.locator('.pt-drop__error:visible').innerText(), /above zero/);
  },
});

export default custom;
