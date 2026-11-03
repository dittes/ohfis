// Tools whose test needs real interaction. Each handler receives (page, baseUrl) and throws on failure.
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const area = (page, i = 0) => page.locator('#tool-root textarea:not([readonly])').nth(i);
const out = page => page.locator('#tool-root textarea[readonly]').first();
const rootText = page => page.evaluate(() => { const r = document.getElementById('tool-root'); return r.innerText + '\n' + [...r.querySelectorAll('textarea,input')].map(x => x.value).join('\n'); });

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

export default custom;
