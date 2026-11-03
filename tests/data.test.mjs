import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/tools/lib/csv.js';
import * as D from '../assets/js/tools/lib/data.js';
import { formatValue, splitSections } from '../assets/js/tools/lib/numfmt.js';
import * as F from '../assets/js/tools/lib/formula.js';

test('parseCSV handles quotes, embedded newlines, CRLF, BOM and empty fields', () => {
  assert.deepEqual(C.parseCSV('a,b\r\n"x, y","say ""hi"""\r\n,\r\n'), [['a', 'b'], ['x, y', 'say "hi"'], ['', '']]);
  assert.deepEqual(C.parseCSV('﻿a;b\n"line1\nline2";2', ';'), [['a', 'b'], ['line1\nline2', '2']]);
  assert.deepEqual(C.parseCSV('a,b'), [['a', 'b']]); assert.deepEqual(C.parseCSV(''), []);
  assert.deepEqual(C.parseCSV('a,"",c\n'), [['a', '', 'c']]);
});
test('toCSV round-trips and quotes only when needed', () => {
  const rows = [['a', 'b,c', 'd"e', 'f\ng', '']]; assert.deepEqual(C.parseCSV(C.toCSV(rows)), rows);
  assert.equal(C.toCSV([['a', 'b']], { quoteAll: true }), '"a","b"'); assert.equal(C.toCSV([['x', 'y']], { delimiter: ';' }), 'x;y');
  assert.equal(C.toCSV([['=SUM(A1)', '-5', 'ok']], { escapeFormulas: true }), "'=SUM(A1),-5,ok");
});
test('detectDelimiter', () => {
  assert.equal(C.detectDelimiter('a;b;c\n1;2,5;3\n4;5;6'), ';'); assert.equal(C.detectDelimiter('a\tb\n1\t2'), '\t'); assert.equal(C.detectDelimiter('a|b|c\n1|2|3'), '|');
  assert.equal(C.detectDelimiter('name,city\n"Doe; Jane",Berlin\nBob,Rome'), ','); assert.equal(C.detectDelimiter('single column\nvalue'), ',');
});
test('fixMojibake repairs UTF-8 read as Windows-1252 and leaves good text alone', () => {
  assert.equal(C.fixMojibake('MÃ¼ller und GrÃ¶ÃŸe'), 'Müller und Größe'); assert.equal(C.fixMojibake('cafÃ© â€“ naÃ¯ve'), 'café – naïve');
  assert.equal(C.fixMojibake('Müller café'), 'Müller café'); assert.equal(C.fixMojibake('Ã¤Ã¶Ã¼'), 'äöü'); assert.equal(C.fixMojibake('plain text'), 'plain text');
  assert.equal(C.fixMojibake('ZaÅ¼Ã³Å‚Ä‡'), 'Zażółć'.replace('ć', 'ć'));
  assert.equal(C.guessEncoding(new Uint8Array([0x4d, 0xfc, 0x6c])), 'windows-1252'); assert.equal(C.guessEncoding(new TextEncoder().encode('Müller')), 'utf-8');
  assert.equal(C.decodeBytes(new Uint8Array([0x4d, 0xfc, 0x6c]), 'windows-1252'), 'Mül');
});
test('leading zeros', () => {
  const rows = [['zip', 'id'], ['2134', '7'], ['10115', '8'], ['501', '9'], ['90210', '10'], ['60601', '11']]; const w = D.guessWidths(rows); assert.deepEqual(w, { 0: 5 });
  assert.deepEqual(D.restoreLeadingZeros(rows, { width: w }).rows.slice(0, 4), [['zip', 'id'], ['02134', '7'], ['10115', '8'], ['00501', '9']]);
  assert.equal(D.restoreLeadingZeros(rows, { width: { 1: 4 }, columns: [1] }).fixed, 5);
  assert.deepEqual(D.guessWidths([['a'], ['1'], ['2']]), {});
});
test('Excel serial dates', () => {
  assert.equal(D.serialToISO(45231), '2023-11-01'); assert.equal(D.serialToISO(45292), '2024-01-01'); assert.equal(D.serialToISO(1), '1900-01-01'); assert.equal(D.serialToISO(59), '1900-02-28'); assert.equal(D.serialToISO(61), '1900-03-01');
  assert.match(D.serialToISO(60), /1900-02-29/); assert.equal(D.serialToISO(44927.5), '2023-01-01 12:00:00'); assert.equal(D.serialToISO(0, { date1904: true }), '1904-01-01'); assert.equal(D.serialToISO(-1), null);
  assert.equal(D.dateToSerial('2023-11-01'), 45231); assert.equal(D.dateToSerial('1900-03-01'), 61); assert.equal(D.dateToSerial('1900-01-01'), 1); assert.equal(D.dateToSerial('2023-01-01 12:00'), 44927.5);
  assert.equal(D.dateToSerial('2023-02-30'), null); assert.equal(D.dateToSerial('nope'), null); assert.equal(D.dateToSerial('1904-01-02', { date1904: true }), 1);
  for (const s of [1, 59, 61, 40000, 45231, 60000]) assert.equal(D.dateToSerial(D.serialToISO(s)), s);
});
test('JSON ⇄ table', () => {
  const rows = D.jsonToRows('[{"id":1,"user":{"name":"Ann","tags":["a","b"]}},{"id":2,"user":{"name":"Bo"},"extra":null}]');
  assert.deepEqual(rows[0], ['id', 'user.name', 'user.tags.0', 'user.tags.1', 'extra']); assert.deepEqual(rows[2], ['2', 'Bo', '', '', '']);
  assert.deepEqual(D.jsonToRows('[{"t":["x","y"]}]', { arrays: 'join' }), [['t'], ['x; y']]); assert.deepEqual(D.jsonToRows('{"data":[{"a":1}]}'), [['a'], ['1']]); assert.deepEqual(D.jsonToRows('[1,2]'), [['value'], ['1'], ['2']]);
  const json = D.rowsToJson([['id', 'a.b', 'ok'], ['1', 'x', 'true'], ['', '2.5', 'false']], { nested: true });
  assert.deepEqual(json, [{ id: 1, a: { b: 'x' }, ok: true }, { id: null, a: { b: 2.5 }, ok: false }]);
  assert.deepEqual(D.rowsToJson([['zip'], ['01234']], { types: true }), [{ zip: 1234 }].map(() => ({ zip: '01234' })));
  assert.deepEqual(D.unflatten({ 'a.0': 1, 'a.1': 2 }), { a: [1, 2] });
});
test('transpose, pivot, split, diff, fill', () => {
  assert.deepEqual(D.transpose([['a', 'b'], ['1']]), [['a', '1'], ['b', '']]);
  const data = [['region', 'q', 'sales'], ['N', 'Q1', '10'], ['N', 'Q2', '5'], ['S', 'Q1', '7'], ['N', 'Q1', '3']];
  assert.deepEqual(D.pivot(data, { row: 0, value: 2, agg: 'sum' }), [['region', 'sum(sales)'], ['N', '18'], ['S', '7']]);
  assert.deepEqual(D.pivot(data, { row: 0, col: 1, value: 2, agg: 'sum' }), [['region', 'Q1', 'Q2', 'Total'], ['N', '13', '5', '18'], ['S', '7', '', '7']]);
  assert.equal(D.pivot(data, { row: 0, value: 2, agg: 'avg' })[1][1], '6'); assert.equal(D.pivot(data, { row: 0, value: 2, agg: 'count' })[1][1], '3');
  const sp = D.splitColumn([['name', 'x'], ['Ann Lee', '1'], ['Bo', '2']], { col: 0, delimiter: ' ' }); assert.deepEqual(sp, [['name 1', 'name 2', 'x'], ['Ann', 'Lee', '1'], ['Bo', '', '2']]);
  assert.deepEqual(D.splitColumn([['id'], ['AB1234']], { col: 0, mode: 'positions', positions: [2] }), [['id 1', 'id 2'], ['AB', '1234']]);
  assert.deepEqual(D.splitColumn([['t'], ['a-b-c-d']], { col: 0, delimiter: '-', max: 2 }).slice(1), [['a', 'b-c-d']]);
  assert.deepEqual(D.splitColumn([['d'], ['2024-05-06']], { col: 0, mode: 'pattern', delimiter: '(\\d+)-(\\d+)-(\\d+)', names: ['Y', 'M', 'D'] }), [['Y', 'M', 'D'], ['2024', '05', '06']]);
  const d = D.diffTables([['id', 'v'], ['1', 'a'], ['2', 'b'], ['3', 'c']], [['id', 'v'], ['1', 'a'], ['2', 'B'], ['4', 'd']], { key: 0 });
  assert.deepEqual([d.added, d.removed, d.changed, d.same], [1, 1, 1, 1]); assert.equal(d.changes.find(c => c.type === 'changed').cells[0].to, 'B');
  const f = D.fillBlanks([['a', 'b'], ['1', ''], ['', '3'], ['5', '']], { mode: 'previous' }); assert.deepEqual(f.rows, [['a', 'b'], ['1', ''], ['1', '3'], ['5', '3']]); assert.equal(f.filled, 2);
  assert.deepEqual(D.fillBlanks([['n'], ['2'], [''], ['4']], { mode: 'average' }).rows, [['n'], ['2'], ['3'], ['4']]);
  assert.deepEqual(D.fillBlanks([['n'], [''], ['x']], { mode: 'next' }).rows, [['n'], ['x'], ['x']]);
});
test('cleaning helpers', () => {
  assert.deepEqual(D.trimCells([[' a ', 'b​  c ']], { inner: true }).rows, [['a', 'b c']]);
  assert.deepEqual(D.sanitizeHeaders(['First Name', 'Zip/Postal Code', 'ÄÖÜ Größe', '2024 Sales', 'Name', 'name', '', 'Revenue (€)', '% Change', 'userID']),
    ['first_name', 'zip_postal_code', 'aou_grosse', 'col_2024_sales', 'name', 'name_2', 'column_7', 'revenue', 'pct_change', 'user_id']);
  assert.deepEqual(D.sanitizeHeaders(['A b'], { style: 'camel' }), ['aB']); assert.deepEqual(D.sanitizeHeaders(['select', 'From']), ['select_col', 'from_col']);
  const m = D.mergeTables([[['a', 'b'], ['1', '2']], [['b', 'c'], ['3', '4']]]); assert.deepEqual(m.rows, [['a', 'b', 'c'], ['1', '2', ''], ['', '3', '4']]); assert.equal(m.warnings.length, 2);
  assert.deepEqual(D.mergeTables([[['a'], ['1']], [['a'], ['2']]], { mode: 'strict' }).rows, [['a'], ['1'], ['2']]);
  assert.deepEqual(D.unpivot([['id', 'Jan', 'Feb'], ['x', '1', ''], ['y', '3', '4']], { idCols: [0] }), [['id', 'attribute', 'value'], ['x', 'Jan', '1'], ['y', 'Jan', '3'], ['y', 'Feb', '4']]);
  const z = D.normalizeColumns([['v'], ['1'], ['2'], ['3']], { columns: [0], method: 'zscore' }); assert.deepEqual(z.rows.map(r => r[0]), ['v_zscore', '-1', '0', '1']);
  assert.deepEqual(D.normalizeColumns([['v'], ['10'], ['20'], ['30']], { columns: [0], method: 'minmax' }).rows.map(r => r[0]), ['v_minmax', '0', '0.5', '1']);
  assert.deepEqual(D.percentChange([['a', 'b'], ['100', '125'], ['0', '5'], ['x', '1'], ['-50', '-25']], { from: 0, to: 1 }).map(r => r[2]), ['% change', '25.0', 'n/a', '', '50.0']);
});
test('parseMoney handles US, EU, Swiss and accounting notation', () => {
  const v = (s, h) => D.parseMoney(s, { hint: h })?.value;
  assert.equal(v('$1,234.56'), 1234.56); assert.equal(v('1.234,56 €'), 1234.56); assert.equal(v('(1,234.00)'), -1234); assert.equal(v("CHF 1'234.50"), 1234.5); assert.equal(v('-$5'), -5); assert.equal(v('5-'), -5);
  assert.equal(v('1 234,56 zł'), 1234.56); assert.equal(v('1,234,567'), 1234567); assert.equal(v('1.234.567,8'), 1234567.8); assert.equal(v('1,5'), 1.5); assert.equal(v('1,234'), 1234); assert.equal(v('1,234', 'eu'), 1.234); assert.equal(v('1.234', 'eu'), 1234); assert.equal(v('1.234', 'us'), 1.234);
  assert.equal(v('abc'), undefined); assert.equal(D.parseMoney('€ 9,99').currency, 'EUR'); assert.equal(D.parseMoney('£3').currency, 'GBP'); assert.equal(v('12.50 USD'), 12.5);
});
test('SQL generation', () => {
  const rows = [['id', 'name', 'price', 'ok'], ['1', "O'Brien", '9.5', 'true'], ['2', '', '10', 'false']];
  const sql = D.toSQL(rows, { table: 'people', dialect: 'postgres', create: true });
  assert.match(sql, /CREATE TABLE "people" \(\n  "id" BIGINT,\n  "name" TEXT,\n  "price" NUMERIC,\n  "ok" BOOLEAN\n\);/); assert.match(sql, /\(1, 'O''Brien', 9\.5, true\),\n  \(2, NULL, 10, false\);/);
  assert.match(D.toSQL(rows, { dialect: 'mysql', table: 't' }), /INSERT INTO `t` \(`id`, `name`, `price`, `ok`\) VALUES/); assert.match(D.toSQL(rows, { dialect: 'mssql' }), /N'O''Brien'/);
  assert.equal(D.toSQL(rows, { mode: 'update', key: [0], table: 't', dialect: 'sqlite' }).split('\n\n')[0], `UPDATE "t" SET "name" = 'O''Brien', "price" = 9.5, "ok" = 1 WHERE "id" = 1;`);
  assert.deepEqual(['007', '12'].map(x => D.inferType([x])), ['TEXT', 'INTEGER']); assert.equal(D.inferType(['2024-01-02']), 'DATE');
  assert.equal(D.toSQL([['a'], ['1'], ['2'], ['3']], { batch: 2, table: 't' }).split('INSERT').length - 1, 2);
});
test('GeoJSON', () => {
  const r = D.toGeoJSON([['name', 'lat', 'lon'], ['A', '52.5', '13.4'], ['B', 'x', '1'], ['C', '95', '1'], ['D', '-33,9', '151,2']], { lat: 1, lon: 2 });
  assert.equal(r.geojson.features.length, 2); assert.deepEqual(r.geojson.features[0].geometry.coordinates, [13.4, 52.5]); assert.deepEqual(r.geojson.features[1].geometry.coordinates, [151.2, -33.9]); assert.equal(r.skipped.length, 2);
  assert.equal(D.toGeoJSON([['n', 'lat', 'lon'], ['E', '52,5abc', '1,234.5']], { lat: 1, lon: 2 }).skipped.length, 1); assert.ok(Number.isNaN(D.parseCoord('')));
  assert.deepEqual(D.guessLatLon(['Name', 'Latitude', 'Longitude']), { lat: 1, lon: 2 });
});
test('markdown table formatting keeps alignment', () => {
  const out = D.formatMarkdownTable('|Name|Qty|\n|:--|--:|\n|Pen|10|\n|Notebook|3|');
  assert.equal(out, '| Name     | Qty |\n| :------- | --: |\n| Pen      |  10 |\n| Notebook |   3 |'); assert.equal(D.formatMarkdownTable('a|b\n1|2'), '| a   | b   |\n| --- | --- |\n| 1   | 2   |');
  assert.equal(D.formatMarkdownTable('| a | b |\n|---|---|\n| 1 |', { compact: true }), '| a | b |\n| --- | --- |\n| 1 |  |');
});
test('phone normalisation', () => {
  const p = (n, c, s) => D.normalizePhone(n, { country: c, style: s });
  assert.equal(p('(415) 555-0132', 'US').value, '+14155550132'); assert.equal(p('1-415-555-0132', 'US').value, '+14155550132'); assert.equal(p('030 1234567', 'DE').value, '+49301234567'); assert.equal(p('+49 (0)30 1234567', 'US').value, '+49301234567');
  assert.equal(p('0049 30 1234567', 'US').value, '+49301234567'); assert.equal(p('020 7946 0958', 'GB').value, '+442079460958'); assert.equal(p('601 234 567', 'PL').value, '+48601234567'); assert.equal(p('777 123 456', 'CZ').value, '+420777123456');
  assert.equal(p('415 555 0132 ext. 12', 'US').value, '+14155550132'); assert.equal(p('12345', 'US').ok, false); assert.equal(p('', 'US').ok, false); assert.equal(p('(415) 555-0132', 'US', 'national').value, '(415) 555-0132');
  assert.equal(p('415-555-0132', 'US', 'international').value, '+1 415 555 0132'); assert.equal(p('+14155550132', 'DE', 'digits').value, '14155550132'); assert.equal(p('+44 20 7946 0958', 'US', 'international').value.startsWith('+44 '), true);
});
test('address parsing', () => {
  assert.deepEqual(D.parseAddress('123 Main St Apt 4B, Springfield, IL 62704'), { street: 'Main St', number: '123', unit: 'Apt 4B', city: 'Springfield', state: 'IL', zip: '62704', country: 'USA', format: 'US' });
  assert.deepEqual(D.parseAddress('Hauptstraße 12a, 10115 Berlin'), { street: 'Hauptstraße', number: '12a', unit: '', city: 'Berlin', state: '', zip: '10115', country: '', format: 'EU' });
  assert.equal(D.parseAddress('Friedrichstr. 5 10117 Berlin').city, 'Berlin'); assert.equal(D.parseAddress('10 Downing Street, London, SW1A 2AA').zip, 'SW1A 2AA');
  assert.equal(D.parseAddress('742 Evergreen Terrace, Springfield, OR 97477-1234, USA').zip, '97477-1234'); assert.equal(D.parseAddress('').street, '');
});
test('sample size matches the textbook values', () => {
  assert.ok(Math.abs(D.zScore(95) - 1.95996) < 1e-4); assert.ok(Math.abs(D.zScore(99) - 2.57583) < 1e-4); assert.ok(Math.abs(D.zScore(90) - 1.64485) < 1e-4);
  assert.equal(D.sampleSize({ confidence: 95, margin: 5 }).n, 385); assert.equal(D.sampleSize({ confidence: 95, margin: 5, population: 1000 }).n, 278); assert.equal(D.sampleSize({ confidence: 99, margin: 1 }).n, 16588);
  assert.equal(D.sampleSize({ confidence: 95, margin: 5, population: 100 }).n, 80);
});
test('Excel number formats', () => {
  const f = formatValue;
  assert.equal(f(1234.5, '#,##0.00'), '1,234.50'); assert.equal(f(0.256, '0%'), '26%'); assert.equal(f(0.256, '0.0%'), '25.6%'); assert.equal(f(12345, '0.0E+00'), '1.2E+04'); assert.equal(f(0.00012, '0.00E+00'), '1.20E-04');
  assert.equal(f(5, '000'), '005'); assert.equal(f(1234567, '#,##0'), '1,234,567'); assert.equal(f(1234567, '#,##0,'), '1,235'); assert.equal(f(1234567, '0.0,,"M"'), '1.2M'); assert.equal(f(0.5, '#.##'), '.5'); assert.equal(f(5, '0.00'), '5.00'); assert.equal(f(5.1, '0.##'), '5.1'); assert.equal(f(5, '0.##'), '5');
  assert.equal(f(-1234.5, '#,##0.00'), '-1,234.50'); assert.equal(f(-5, '0;(0)'), '(5)'); assert.equal(f(0, '0;-0;"zero"'), 'zero'); assert.equal(f(1234, '$#,##0'), '$1,234'); assert.equal(f(12, '0 "units"'), '12 units');
  assert.equal(f(1234, '_($* #,##0_);_($* (#,##0);_("-"_);_(@_)'), ' $ 1,234 '); assert.equal(f(-1234, '_($* #,##0_);_($* (#,##0);_("-"_);_(@_)'), ' $ (1,234)'); assert.equal(f(0, '_($* #,##0_);_($* (#,##0);_("-"_);_(@_)'), ' - '); assert.equal(f('abc', '_($* #,##0_);_($* (#,##0);_("-"_);_(@_)'), ' abc ');
  assert.equal(f(150, '[>100]"big";"small"'), 'big'); assert.equal(f(50, '[>100]"big";"small"'), 'small'); assert.equal(f(7, '[Red]0'), '7'); assert.equal(f('hi', '@" there"'), 'hi there'); assert.equal(f(3, '#?'), '3'); assert.equal(f(1.5, '0.0?'), '1.5 ');
  assert.equal(f(45231, 'yyyy-mm-dd'), '2023-11-01'); assert.equal(f(45231, 'dd/mm/yy'), '01/11/23'); assert.equal(f(45231, 'dddd, mmmm d, yyyy'), 'Wednesday, November 1, 2023'); assert.equal(f(45231.75, 'hh:mm'), '18:00'); assert.equal(f(45231.75, 'h:mm AM/PM'), '6:00 PM');
  assert.equal(f(45231.5104, 'yyyy-mm-dd hh:mm:ss'), '2023-11-01 12:14:59'); assert.equal(f(1.5, '[h]:mm'), '36:00'); assert.equal(f(45231, 'ddd mmm'), 'Wed Nov'); assert.equal(f(99, 'General'), '99');
  assert.deepEqual(splitSections('0;"a;b";[Red]@'), ['0', '"a;b"', '[Red]@']);
});
test('formula translation en ⇄ de/fr/es', () => {
  const T = (f, a, b) => F.translateFormula(f, a, b).formula;
  assert.equal(T('=IF(A1>0.5,SUM(B1:B5),"a,b")', 'en', 'de'), '=WENN(A1>0,5;SUMME(B1:B5);"a,b")'); assert.equal(T('=WENN(A1>0,5;SUMME(B1:B5);"x;y")', 'de', 'en'), '=IF(A1>0.5,SUM(B1:B5),"x;y")');
  assert.equal(T('=VLOOKUP(A2,Sheet1!$A$1:$C$9,3,FALSE)', 'en', 'de'), '=SVERWEIS(A2;Sheet1!$A$1:$C$9;3;FALSCH)'); assert.equal(T('=SVERWEIS(A2;B:C;2;FALSCH)', 'de', 'fr'), '=RECHERCHEV(A2;B:C;2;FAUX)');
  assert.equal(T('=IFERROR(XLOOKUP(A1,B:B,C:C),"n/a")', 'en', 'es'), '=SI.ERROR(BUSCARX(A1;B:B;C:C);"n/a")'); assert.equal(T('=SUM(1.5,2)', 'en', 'fr'), '=SOMME(1,5;2)');
  assert.equal(T('=MYFUNC(1,2)', 'en', 'de'), '=MYFUNC(1;2)'); assert.deepEqual(F.translateFormula('=MYFUNC(1)+SUM(2)', 'en', 'de').unknown, ['MYFUNC']); assert.equal(T('=A1+B1', 'en', 'de'), '=A1+B1'); assert.equal(T('=TODAY()', 'en', 'de'), '=HEUTE()');
  assert.equal(T("='My Sheet'!A1+SUM(B1,B2)", 'en', 'de'), "='My Sheet'!A1+SUMME(B1;B2)");
});
test('formula formatter', () => {
  assert.equal(F.formatFormula('=IF(A1>0,SUM(B1:B5),0)'), '=IF(A1 > 0, SUM(B1:B5), 0)');
  const long = F.formatFormula('=IFERROR(INDEX(Sheet2!$B$2:$B$500,MATCH(1,(Sheet2!$A$2:$A$500=A2)*(Sheet2!$C$2:$C$500=B2),0)),IF(ISBLANK(A2),"",VLOOKUP(A2,Sheet3!$A$1:$D$900,4,FALSE)))', { width: 50 });
  assert.match(long, /^=IFERROR\(\n  INDEX\(/); assert.ok(long.split('\n').every(l => l.length < 90)); assert.equal(long.replace(/\s+/g, ''), '=IFERROR(INDEX(Sheet2!$B$2:$B$500,MATCH(1,(Sheet2!$A$2:$A$500=A2)*(Sheet2!$C$2:$C$500=B2),0)),IF(ISBLANK(A2),"",VLOOKUP(A2,Sheet3!$A$1:$D$900,4,FALSE)))'.replace(/\s+/g, ''));
  assert.equal(F.formatFormula('=A1&" - "&B1'), '=A1 & " - " & B1');
});
test('lookup formula generator', () => {
  const r = F.lookupFormulas({ lookup: 'A2', searchCol: 'D', returnCol: 'F', firstRow: 2, lastRow: 100 });
  assert.equal(r.xlookup, '=XLOOKUP(A2,$D$2:$D$100,$F$2:$F$100,"Not found",0)'); assert.equal(r.vlookup, '=IFERROR(VLOOKUP(A2,$D$2:$F$100,3,FALSE),"Not found")'); assert.equal(r.indexMatch, '=IFERROR(INDEX($F$2:$F$100,MATCH(A2,$D$2:$D$100,0)),"Not found")');
  const left = F.lookupFormulas({ searchCol: 'F', returnCol: 'B' }); assert.equal(left.vlookup, null); assert.match(left.note, /cannot look to the left/);
  assert.match(F.lookupFormulas({ sheet: 'My Data', wrap: false }).indexMatch, /^=INDEX\('My Data'!\$F\$2/);
});
