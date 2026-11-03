// formula.js — translate, format and generate spreadsheet formulas.
import { colLetter } from './data.js';

const FN = `SUM|SUMME|SOMME|SUMA
IF|WENN|SI|SI
VLOOKUP|SVERWEIS|RECHERCHEV|BUSCARV
HLOOKUP|WVERWEIS|RECHERCHEH|BUSCARH
XLOOKUP|XVERWEIS|RECHERCHEX|BUSCARX
INDEX|INDEX|INDEX|INDICE
MATCH|VERGLEICH|EQUIV|COINCIDIR
AVERAGE|MITTELWERT|MOYENNE|PROMEDIO
COUNT|ANZAHL|NB|CONTAR
COUNTA|ANZAHL2|NBVAL|CONTARA
COUNTBLANK|ANZAHLLEEREZELLEN|NB.VIDE|CONTAR.BLANCO
COUNTIF|ZÄHLENWENN|NB.SI|CONTAR.SI
COUNTIFS|ZÄHLENWENNS|NB.SI.ENS|CONTAR.SI.CONJUNTO
SUMIF|SUMMEWENN|SOMME.SI|SUMAR.SI
SUMIFS|SUMMEWENNS|SOMME.SI.ENS|SUMAR.SI.CONJUNTO
AVERAGEIF|MITTELWERTWENN|MOYENNE.SI|PROMEDIO.SI
AND|UND|ET|Y
OR|ODER|OU|O
NOT|NICHT|NON|NO
IFERROR|WENNFEHLER|SIERREUR|SI.ERROR
IFNA|WENNNV|SI.NON.DISP|SI.ND
IFS|WENNS|SI.CONDITIONS|SI.CONJUNTO
SWITCH|ERSTERWERT|SI.MULTIPLE|CAMBIAR
MAX|MAX|MAX|MAX
MIN|MIN|MIN|MIN
ROUND|RUNDEN|ARRONDI|REDONDEAR
ROUNDUP|AUFRUNDEN|ARRONDI.SUP|REDONDEAR.MAS
ROUNDDOWN|ABRUNDEN|ARRONDI.INF|REDONDEAR.MENOS
ABS|ABS|ABS|ABS
INT|GANZZAHL|ENT|ENTERO
MOD|REST|MOD|RESIDUO
SQRT|WURZEL|RACINE|RAIZ
POWER|POTENZ|PUISSANCE|POTENCIA
RAND|ZUFALLSZAHL|ALEA|ALEATORIO
RANDBETWEEN|ZUFALLSBEREICH|ALEA.ENTRE.BORNES|ALEATORIO.ENTRE
MEDIAN|MEDIAN|MEDIANE|MEDIANA
LARGE|KGRÖSSTE|GRANDE.VALEUR|K.ESIMO.MAYOR
SMALL|KKLEINSTE|PETITE.VALEUR|K.ESIMO.MENOR
RANK|RANG|RANG|JERARQUIA
SUMPRODUCT|SUMMENPRODUKT|SOMMEPROD|SUMAPRODUCTO
CONCATENATE|VERKETTEN|CONCATENER|CONCATENAR
CONCAT|TEXTKETTE|CONCAT|CONCAT
TEXTJOIN|TEXTVERKETTEN|JOINDRE.TEXTE|UNIRCADENAS
LEFT|LINKS|GAUCHE|IZQUIERDA
RIGHT|RECHTS|DROITE|DERECHA
MID|TEIL|STXT|EXTRAE
LEN|LÄNGE|NBCAR|LARGO
TRIM|GLÄTTEN|SUPPRESPACE|ESPACIOS
UPPER|GROSS|MAJUSCULE|MAYUSC
LOWER|KLEIN|MINUSCULE|MINUSC
PROPER|GROSS2|NOMPROPRE|NOMPROPIO
SUBSTITUTE|WECHSELN|SUBSTITUE|SUSTITUIR
FIND|FINDEN|TROUVE|ENCONTRAR
SEARCH|SUCHEN|CHERCHE|HALLAR
TEXT|TEXT|TEXTE|TEXTO
VALUE|WERT|CNUM|VALOR
TODAY|HEUTE|AUJOURDHUI|HOY
NOW|JETZT|MAINTENANT|AHORA
DATE|DATUM|DATE|FECHA
YEAR|JAHR|ANNEE|AÑO
MONTH|MONAT|MOIS|MES
DAY|TAG|JOUR|DIA
WEEKDAY|WOCHENTAG|JOURSEM|DIASEM
EDATE|EDATUM|MOIS.DECALER|FECHA.MES
EOMONTH|MONATSENDE|FIN.MOIS|FIN.MES
NETWORKDAYS|NETTOARBEITSTAGE|NB.JOURS.OUVRES|DIAS.LAB
ISBLANK|ISTLEER|ESTVIDE|ESBLANCO
ISNUMBER|ISTZAHL|ESTNUM|ESNUMERO
ISERROR|ISTFEHLER|ESTERREUR|ESERROR
ROW|ZEILE|LIGNE|FILA
COLUMN|SPALTE|COLONNE|COLUMNA
OFFSET|BEREICH.VERSCHIEBEN|DECALER|DESREF
INDIRECT|INDIREKT|INDIRECT|INDIRECTO
CHOOSE|WAHL|CHOISIR|ELEGIR
FILTER|FILTERN|FILTRE|FILTRAR
SORT|SORTIEREN|TRIER|ORDENAR
UNIQUE|EINDEUTIG|UNIQUE|UNICOS
PMT|RMZ|VPM|PAGO
NPV|NBW|VAN|VNA
IRR|IKV|TRI|TIR
TRUE|WAHR|VRAI|VERDADERO
FALSE|FALSCH|FAUX|FALSO`.split('\n').map(l => l.split('|'));
export const SHEET_LANGS = { en: 0, de: 1, fr: 2, es: 3 };
export const SHEET_LANG_NAMES = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' };
const maps = Object.fromEntries(Object.keys(SHEET_LANGS).map(l => [l, new Map(FN.map(r => [r[SHEET_LANGS[l]].toUpperCase(), r]))]));
const SEP = { en: { arg: ',', dec: '.' }, de: { arg: ';', dec: ',' }, fr: { arg: ';', dec: ',' }, es: { arg: ';', dec: ',' } };

export function translateFormula(formula, from, to) {
  const unknown = new Set(); let out = ''; let i = 0; const f = formula;
  const A = SEP[from], B = SEP[to];
  while (i < f.length) {
    const ch = f[i];
    if (ch === '"') { let j = i + 1; while (j < f.length && !(f[j] === '"' && f[j + 1] !== '"')) j += f[j] === '"' ? 2 : 1; out += f.slice(i, j + 1); i = j + 1; continue; }
    if (ch === "'") { const j = f.indexOf("'", i + 1); const end = j < 0 ? f.length : j; out += f.slice(i, end + 1); i = end + 1; continue; }
    if (ch === '{') { const j = f.indexOf('}', i); const end = j < 0 ? f.length : j; out += f.slice(i, end + 1); i = end + 1; continue; }
    const id = f.slice(i).match(/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*/);
    if (id) {
      const w = id[0]; const next = f[i + w.length]; const row = maps[from].get(w.toUpperCase());
      if (next === '(' || (row && (row[0] === 'TRUE' || row[0] === 'FALSE'))) { if (row) out += row[SHEET_LANGS[to]]; else { out += w; if (next === '(') unknown.add(w); } }
      else out += w; i += w.length; continue;
    }
    const num = f.slice(i).match(A.dec === '.' ? /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/ : /^\d+(?:,\d+)?(?:[eE][+-]?\d+)?/);
    if (num && !/[A-Za-z$]/.test(f[i - 1] || '')) { out += num[0].replace(A.dec, B.dec); i += num[0].length; continue; }
    if (ch === A.arg) { out += B.arg; i++; continue; }
    out += ch; i++;
  }
  return { formula: out, unknown: [...unknown] };
}

function tokenizeFormula(f) {
  const t = []; let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') { let j = i + 1; while (j < f.length && !(f[j] === '"' && f[j + 1] !== '"')) j += f[j] === '"' ? 2 : 1; t.push({ k: 'x', v: f.slice(i, j + 1) }); i = j + 1; continue; }
    if (ch === '(') { t.push({ k: '(' }); i++; continue; } if (ch === ')') { t.push({ k: ')' }); i++; continue; }
    if (ch === ',' || ch === ';') { t.push({ k: ',', v: ch }); i++; continue; }
    const m = f.slice(i).match(/^(?:'[^']*'!)?[A-Za-zÀ-ÿ_$][A-Za-zÀ-ÿ0-9_.$:!]*|^\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?%?|^<=|^>=|^<>|^[+\-*/^&=<>%:]|^[{}]|^[^\s]/);
    const v = m ? m[0] : ch; const isFn = /^[A-Za-zÀ-ÿ_]/.test(v) && f.slice(i + v.length).match(/^\s*\(/); t.push({ k: isFn ? 'fn' : 'x', v }); i += v.length;
  }
  return t;
}
export function formatFormula(formula, { width = 60, indent = 2 } = {}) {
  let src = formula.trim(); const lead = src.startsWith('=') ? '=' : ''; if (lead) src = src.slice(1);
  const toks = tokenizeFormula(src); let p = 0;
  const parseSeq = () => { const items = []; while (p < toks.length && toks[p].k !== ')' && toks[p].k !== ',') { const t = toks[p++]; if (t.k === 'fn') { p++; /* ( */ const args = []; let cur = parseSeq(); args.push(cur); while (toks[p]?.k === ',') { p++; args.push(parseSeq()); } if (toks[p]?.k === ')') p++; items.push({ fn: t.v, args }); } else if (t.k === '(') { const inner = parseSeq(); if (toks[p]?.k === ')') p++; items.push({ group: inner }); } else items.push(t.v); } return items; };
  const tree = parseSeq();
  const flat = items => items.map(it => typeof it === 'string' ? it : it.group ? '(' + flat(it.group) + ')' : `${it.fn}(${it.args.map(flat).join(', ')})`).join(/[A-Za-z0-9"')]$/.test('') ? '' : '').replace(/([=<>+\-*/&^]|<=|>=|<>)/g, ' $1 ').replace(/\s+/g, ' ').replace(/ ([<>]) = /g, ' $1= ').replace(/ < > /g, ' <> ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/\s+,/g, ',').replace(/^\s*-\s/, '-').replace(/([(,]) - /g, '$1-').replace(/\s+%/g, '%').trim();
  const render = (items, depth) => {
    const one = flat(items); const pad = ' '.repeat(depth * indent);
    if (one.length + pad.length <= width || !items.some(it => typeof it === 'object')) return one;
    return items.map(it => {
      if (typeof it === 'string') return it;
      if (it.group) return '(' + render(it.group, depth) + ')';
      const sub = `${it.fn}(${it.args.map(flat).join(', ')})`; if (sub.length + pad.length <= width) return sub;
      const inner = ' '.repeat((depth + 1) * indent);
      return `${it.fn}(\n${it.args.map(a => inner + render(a, depth + 1)).join(',\n')}\n${pad})`;
    }).join(' ');
  };
  const joined = render(tree, 0);
  return lead + joined;
}

export function lookupFormulas({ lookup = 'A2', searchCol = 'D', returnCol = 'F', firstRow = 2, lastRow = 100, sheet = '', notFound = 'Not found', wrap = true, exact = true }) {
  const pre = sheet ? `${/[^A-Za-z0-9_]/.test(sheet) ? `'${sheet}'` : sheet}!` : '';
  const sc = searchCol.toUpperCase(), rc = returnCol.toUpperCase();
  const sRange = `${pre}$${sc}$${firstRow}:$${sc}$${lastRow}`, rRange = `${pre}$${rc}$${firstRow}:$${rc}$${lastRow}`;
  const si = colIndexOf(sc), ri = colIndexOf(rc); const left = ri < si;
  const nf = /^-?\d+(\.\d+)?$/.test(notFound) ? notFound : `"${notFound.replaceAll('"', '""')}"`;
  const lo = Math.min(si, ri);
  const table = `${pre}$${colLetter(si)}$${firstRow}:$${colLetter(Math.max(si, ri))}$${lastRow}`;
  const vl = !left ? `VLOOKUP(${lookup},${pre}$${sc}$${firstRow}:$${rc}$${lastRow},${ri - si + 1},${exact ? 'FALSE' : 'TRUE'})` : null;
  const w = f => wrap ? `IFERROR(${f},${nf})` : f;
  return {
    xlookup: `=XLOOKUP(${lookup},${sRange},${rRange},${nf},${exact ? 0 : -1})`,
    vlookup: vl ? '=' + w(vl) : null,
    indexMatch: '=' + w(`INDEX(${rRange},MATCH(${lookup},${sRange},${exact ? 0 : 1}))`),
    note: left ? `The return column ${rc} is to the left of the search column ${sc}. VLOOKUP cannot look to the left; use XLOOKUP or INDEX/MATCH.` : `VLOOKUP counts columns from the first column of the table: column ${rc} is number ${ri - si + 1} in ${sc}:${rc}.`,
  };
}
const colIndexOf = L => [...L].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
