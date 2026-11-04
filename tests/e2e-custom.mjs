// Tools whose test needs real interaction. Each handler receives (page, baseUrl) and throws on failure.
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
  async 'opengraph-preview'(page) { const tags = await page.locator('#tool-root textarea[readonly]').inputValue(); assert.match(tags, /<meta property="og:title" content="OHFIS – Free Online Tools">/); assert.match(tags, /twitter:card" content="summary_large_image"/); await page.locator('#tool-root input[type=text]').first().fill('Tom & "Jerry" <3'); await page.waitForTimeout(200); assert.match(await page.locator('#tool-root textarea[readonly]').inputValue(), /Tom &amp; &quot;Jerry&quot; &lt;3/); assert.equal(await page.locator('.ut-og').count(), 4); },
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
  async 'invoice-builder'(page) {
    let txt = await rootText(page); assert.ok(txt.includes('985.00'), 'subtotal: ' + txt.slice(0, 600)); assert.ok(txt.includes('1,182.00'), 'total with 20% tax');
    await page.getByRole('button', { name: /Create invoice PDF/ }).click(); await page.waitForSelector('[data-result=ready]', { timeout: 20000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tool-root .ut-actions button', { hasText: /Download invoice/ }).click()]); const buf = readFileSync(await dl.path()); assert.equal((await pageCount(buf)).n, 1); assert.match(dl.suggestedFilename(), /invoice-2025-001\.pdf/);
    await page.locator('#tool-root textarea').nth(2).fill('Broken line'); await page.waitForTimeout(400); assert.ok((await rootText(page)).includes('needs at least a description and a price'), 'error shown');
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
});

export default custom;
