// Tools whose test needs real interaction. Each handler receives (page, baseUrl) and throws on failure.
import assert from 'node:assert/strict';

const area = (page, i = 0) => page.locator('#tool-root textarea:not([readonly])').nth(i);
const out = page => page.locator('#tool-root textarea[readonly]').first();
const rootText = page => page.evaluate(() => { const r = document.getElementById('tool-root'); return r.innerText + '\n' + [...r.querySelectorAll('textarea,input')].map(x => x.value).join('\n'); });

export default {
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
