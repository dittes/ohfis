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

export default custom;
