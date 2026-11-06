// Extra search words per tool (synonyms in English, German, Polish, Czech). A tool matches when its id matches the pattern.
// The words are only used by the search; they are never shown.
export const SYNONYMS = [
  [/^merge$|merge-csv|booklet|zip-creator|join/, 'combine join append zusammenfügen verbinden kombinieren zusammenführen połączyć scalić spojit sloučit'],
  [/^split$|^extract$|^delete$|text-splitter|split-column/, 'cut separate divide teilen trennen aufteilen podzielić rozdzielić rozdělit oddělit'],
  [/^compress|image-compressor|compress-to-size|png-color-reducer|svg-optimizer/, 'shrink reduce smaller size verkleinern komprimieren zmniejszyć kompresja zmenšit komprese'],
  [/pdf-to-word|docx|markdown-to-docx/, 'word office convert umwandeln konwertuj převést'],
  [/ocr|text-recognition/, 'scan scanner recognition texterkennung rozpoznawanie rozpoznání skenovat'],
  [/^sign$|certificate|signature/, 'signature unterschrift unterschreiben podpis podepsat'],
  [/^protect$|^unlock$|password|passphrase|encrypted-note/, 'password passwort kennwort hasło heslo encrypt decrypt verschlüsseln entschlüsseln szyfrować zašifrovat'],
  [/csv|excel|pivot|table|vlookup|spreadsheet/, 'spreadsheet sheet tabelle tabellenkalkulation arkusz tabulka'],
  [/receipt|delivery-note/, 'invoice bill rechnung quittung beleg faktura pokwitowanie paragon doklad'],
  [/^image-|^png|^jpg|jpg|photo|meme|favicon|heic|svg|exif|avatar|screenshot|collage|background-remover/, 'photo picture foto bild grafik obraz zdjęcie obrázek fotka'],
  [/zip-|archive/, 'archive archiv archiwum unzip unpack entpacken rozpakować rozbalit'],
  [/audio|mp3|noise|bpm|voice|soundboard|tone|speech|equalizer|pitch/, 'sound music musik ton dźwięk muzyka zvuk hudba'],
  [/video|screen-recorder|webcam|gif/, 'film movie clip recording aufnahme nagranie nahrávka'],
  [/qr|vcard|wifi/, 'code barcode scan'],
  [/percentage|discount|sales-tax/, 'prozent prozentrechner procent procentní procento rabatt sleva rabat sconto descuento remise desconto'],
  [/fraction|ratio|average|standard-deviation|rounding|scientific|random-number/, 'bruch brüche ułamek zlomek mittelwert durchschnitt średnia průměr runden zaokrąglanie zaokrouhlování taschenrechner kalkulator zufall losowa náhodné'],
  [/bmi|bmr|calorie|body-fat|water-intake|pace-calculator|pregnancy/, 'gesundheit health zdrowie zdraví gewicht weight waga váha diät diet kalorie kalorien abnehmen schwangerschaft geburtstermin těhotenství ciąża laufen běh bieganie marathon'],
  [/age-calculator|gpa/, 'alter geburtstag wiek urodziny věk narozeniny noten note ocena známka'],
  [/mortgage|loan-calculator|simple-interest|investment-return|salary-converter|unit-price|fuel-cost/, 'hypothek baufinanzierung kredyt hipoteka hypotéka gehalt lohn wynagrodzenie mzda grundpreis sprit benzin paliwo palivo rendite'],
  [/vat|margin|roi|npv|break-even|tip-calculator|bill-splitter|inflation|salary|discount/, 'tax calculator rechner kalkulator kalkulačka steuer mwst podatek daň prozent procent'],
  [/loan|debt|compound|interest|rule-of-72|lease|depreciation/, 'credit kredit zins zinsen odsetki úrok pożyczka půjčka'],
  [/date|calendar|ics|working-days|week|julian|fiscal|countdown|recurring/, 'datum kalender termin data kalendarz termín kalendář den day tag'],
  [/time|clock|timezone|timecard|stopwatch|pomodoro|world-clock/, 'uhr zeit zeitzone czas zegar strefa čas hodiny pásmo hours stunden'],
  [/character|word-frequency|readab|summar|case-converter|text-diff|text-similar|lorem/, 'text count zählen liczyć počítat words wörter zeichen znaki slova letters'],
  [/json|yaml|xml|html|css|regex|sql|base64|jwt|uuid|curl|cron|hash|http|dns|spf|robots|sitemap|opengraph|subnet|url|query/, 'developer entwickler programmer dev programista vývojář code coding'],
  [/pdf/, 'document dokument dokumenty file datei plik soubor'],
  [/checklist|kanban|decision|standup|brain|template|scratchpad|snippet|org-chart|tournament|wheel|secret-santa|okr|sprint/, 'team planning planung planowanie plánování notes notizen notatki poznámky'],
];

export function synonymsFor(id) {
  const out = new Set();
  for (const [re, words] of SYNONYMS) if (re.test(id)) words.split(' ').forEach(w => out.add(w));
  return [...out].join(' ');
}
