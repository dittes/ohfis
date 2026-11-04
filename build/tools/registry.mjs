// registry.mjs (utility tools)
// Categories, cross-site links and the U() helper that every tool definition uses.
// Names and short descriptions exist in all four languages (en, de, pl, cs).
// The longer explanation (about, steps, faqs) is English; pages in other languages show it with lang="en".

export const UCATS = {
  documents: { slug: 'documents-print', icon: 'doc',
    name: ['Documents & Print', 'Dokumente & Druck', 'Dokumenty i druk', 'Dokumenty a tisk'],
    short: ['Booklets, labels, Bates numbers and Word conversion.', 'Broschüren, Etiketten, Bates-Nummern und Word-Umwandlung.', 'Broszury, etykiety, numeracja Batesa i konwersja Worda.', 'Brožury, štítky, Batesovo číslování a převod Wordu.'],
    h1: ['Document and print tools', 'Tools für Dokumente und Druck', 'Narzędzia do dokumentów i druku', 'Nástroje pro dokumenty a tisk'] },
  text: { slug: 'text-tools', icon: 'text',
    name: ['Text Tools', 'Text-Tools', 'Narzędzia tekstowe', 'Textové nástroje'],
    short: ['Clean, convert, count, compare and extract text.', 'Text bereinigen, umwandeln, zählen, vergleichen und extrahieren.', 'Czyść, konwertuj, licz, porównuj i wyodrębniaj tekst.', 'Čistěte, převádějte, počítejte, porovnávejte a extrahujte text.'],
    h1: ['Free online text tools', 'Kostenlose Text-Tools online', 'Darmowe narzędzia tekstowe online', 'Bezplatné online textové nástroje'] },
  data: { slug: 'spreadsheet-csv-tools', icon: 'table',
    name: ['Spreadsheet & CSV Tools', 'Tabellen- & CSV-Tools', 'Arkusze i CSV', 'Tabulky a CSV'],
    short: ['Fix, convert, merge, compare and reshape CSV and spreadsheet data.', 'CSV- und Tabellendaten reparieren, umwandeln, zusammenführen und vergleichen.', 'Napraw, konwertuj, łącz i porównuj dane CSV i arkuszy.', 'Opravujte, převádějte, slučujte a porovnávejte data CSV a tabulek.'],
    h1: ['CSV and spreadsheet tools', 'CSV- und Tabellen-Tools', 'Narzędzia do CSV i arkuszy', 'Nástroje pro CSV a tabulky'] },
  images: { slug: 'image-tools', icon: 'image',
    name: ['Image Tools', 'Bild-Tools', 'Narzędzia graficzne', 'Obrazové nástroje'],
    short: ['Resize, convert, blur, crop and clean images without uploading them.', 'Bilder skalieren, umwandeln, verpixeln, zuschneiden und bereinigen, ohne Upload.', 'Zmieniaj rozmiar, konwertuj, rozmywaj i przycinaj obrazy bez przesyłania.', 'Měňte velikost, převádějte, rozmazávejte a ořezávejte obrázky bez nahrávání.'],
    h1: ['Free online image tools', 'Kostenlose Bild-Tools online', 'Darmowe narzędzia graficzne online', 'Bezplatné online obrazové nástroje'] },
  time: { slug: 'time-calendar-tools', icon: 'clock',
    name: ['Time & Calendar', 'Zeit & Kalender', 'Czas i kalendarz', 'Čas a kalendář'],
    short: ['Time zones, working days, timestamps, calendar files and timers.', 'Zeitzonen, Arbeitstage, Zeitstempel, Kalenderdateien und Timer.', 'Strefy czasowe, dni robocze, znaczniki czasu, pliki kalendarza i minutniki.', 'Časová pásma, pracovní dny, časová razítka, kalendářní soubory a časovače.'],
    h1: ['Time, date and calendar tools', 'Tools für Zeit, Datum und Kalender', 'Narzędzia czasu, dat i kalendarza', 'Nástroje pro čas, datum a kalendář'] },
  finance: { slug: 'business-finance-tools', icon: 'coins',
    name: ['Business & Finance', 'Business & Finanzen', 'Biznes i finanse', 'Byznys a finance'],
    short: ['Margins, runway, NPV, VAT, pricing and other business maths.', 'Margen, Runway, Kapitalwert, MwSt., Preise und weitere Business-Rechnungen.', 'Marże, runway, NPV, VAT, ceny i inne obliczenia biznesowe.', 'Marže, runway, NPV, DPH, ceny a další podnikatelské výpočty.'],
    h1: ['Business and finance calculators', 'Business- und Finanzrechner', 'Kalkulatory biznesowe i finansowe', 'Podnikatelské a finanční kalkulačky'] },
  dev: { slug: 'it-web-tools', icon: 'code',
    name: ['IT & Web Tools', 'IT- & Web-Tools', 'Narzędzia IT i web', 'IT a webové nástroje'],
    short: ['Hashes, encoders, cron, JWT, colours, networks and web snippets.', 'Hashes, Encoder, Cron, JWT, Farben, Netzwerke und Web-Snippets.', 'Hashe, enkodery, cron, JWT, kolory, sieci i fragmenty webowe.', 'Hashe, kodéry, cron, JWT, barvy, sítě a webové úryvky.'],
    h1: ['IT and web helper tools', 'Hilfs-Tools für IT und Web', 'Narzędzia pomocnicze IT i web', 'Pomocné nástroje pro IT a web'] },
  notes: { slug: 'notes-privacy-tools', icon: 'note',
    name: ['Notes & Privacy', 'Notizen & Privatsphäre', 'Notatki i prywatność', 'Poznámky a soukromí'],
    short: ['Scratchpads, checklists, passwords, QR codes and encrypted notes.', 'Notizblöcke, Checklisten, Passwörter, QR-Codes und verschlüsselte Notizen.', 'Notatniki, listy kontrolne, hasła, kody QR i szyfrowane notatki.', 'Poznámkové bloky, checklisty, hesla, QR kódy a šifrované poznámky.'],
    h1: ['Notes, passwords and privacy tools', 'Tools für Notizen, Passwörter und Privatsphäre', 'Notatki, hasła i narzędzia prywatności', 'Poznámky, hesla a nástroje soukromí'] },
  team: { slug: 'team-meeting-tools', icon: 'team',
    name: ['Team & Meetings', 'Team & Meetings', 'Zespół i spotkania', 'Tým a schůzky'],
    short: ['Estimates, decision tools, brackets, pickers and org charts.', 'Schätzungen, Entscheidungshilfen, Turnierbäume, Zufallsauswahl und Organigramme.', 'Szacowanie, decyzje, drabinki, losowanie i schematy organizacyjne.', 'Odhady, rozhodovací nástroje, pavouky, losování a organigramy.'],
    h1: ['Team and meeting tools', 'Tools für Team und Meetings', 'Narzędzia dla zespołu i spotkań', 'Nástroje pro tým a schůzky'] },
  media: { slug: 'audio-video-tools', icon: 'wave',
    name: ['Audio & Video', 'Audio & Video', 'Audio i wideo', 'Audio a video'],
    short: ['Tone generators, teleprompter, recorders and display tests.', 'Tongeneratoren, Teleprompter, Rekorder und Display-Tests.', 'Generatory tonu, teleprompter, rejestratory i testy ekranu.', 'Generátory tónů, teleprompter, rekordéry a testy displeje.'],
    h1: ['Audio, video and hardware tools', 'Audio-, Video- und Hardware-Tools', 'Narzędzia audio, wideo i sprzętowe', 'Audio, video a hardwarové nástroje'] },
};
UCATS.video = { slug: 'video-tools', icon: 'film',
  name: ['Video Tools', 'Video-Tools', 'Narzędzia wideo', 'Video nástroje'],
  short: ['Trim, join, convert, compress, crop, resize and edit videos without uploading them.', 'Videos schneiden, verbinden, umwandeln, komprimieren, zuschneiden und bearbeiten, ohne Upload.', 'Przycinaj, łącz, konwertuj, kompresuj i edytuj wideo bez przesyłania.', 'Stříhejte, spojujte, převádějte, komprimujte a upravujte videa bez nahrávání.'],
  h1: ['Free online video tools', 'Kostenlose Video-Tools online', 'Darmowe narzędzia wideo online', 'Bezplatné online video nástroje'] };
export const UCAT_ORDER = ['documents', 'text', 'data', 'images', 'time', 'finance', 'dev', 'notes', 'team', 'media', 'video'];


/**
 * The seven top-level sections shown in the navigation. Each groups one or more of the
 * finer categories above; "pdf" is the PDF-tools hub (its URL lives in PAGES.pdfTools).
 * slug = URL segment per language (en, de, pl, cs).
 */
export const GROUPS = {
  pdf: { icon: 'merge', cats: ['documents'],
    name: ['PDF & Documents', 'PDF & Dokumente', 'PDF i dokumenty', 'PDF a dokumenty'] },
  text: { icon: 'text', cats: ['text', 'notes'],
    slug: ['text-tools', 'text-werkzeuge', 'narzedzia-tekstowe', 'textove-nastroje'],
    name: ['Text & Notes', 'Text & Notizen', 'Tekst i notatki', 'Text a poznámky'],
    short: ['Clean, convert, count and compare text; scratchpads, checklists, passwords, QR codes and encrypted notes.', 'Text bereinigen, umwandeln, zählen und vergleichen; Notizblöcke, Checklisten, Passwörter, QR-Codes und verschlüsselte Notizen.', 'Czyść, konwertuj, licz i porównuj tekst; notatniki, listy kontrolne, hasła, kody QR i szyfrowane notatki.', 'Čistěte, převádějte, počítejte a porovnávejte text; poznámkové bloky, checklisty, hesla, QR kódy a šifrované poznámky.'],
    h1: ['Free online text and notes tools', 'Kostenlose Text- und Notiz-Tools online', 'Darmowe narzędzia do tekstu i notatek online', 'Bezplatné online nástroje pro text a poznámky'] },
  data: { icon: 'table', cats: ['data'],
    slug: ['spreadsheet-csv-tools', 'tabellen-csv-werkzeuge', 'arkusze-i-csv', 'tabulky-a-csv'],
    name: ['Spreadsheets & CSV', 'Tabellen & CSV', 'Arkusze i CSV', 'Tabulky a CSV'],
    short: UCATS.data.short,
    h1: ['CSV and spreadsheet tools', 'CSV- und Tabellen-Tools', 'Narzędzia do CSV i arkuszy', 'Nástroje pro CSV a tabulky'] },
  images: { icon: 'image', cats: ['images', 'video', 'media'],
    slug: ['image-media-tools', 'bild-und-medien-werkzeuge', 'grafika-i-media', 'obrazky-a-media'],
    name: ['Images & Media', 'Bilder & Medien', 'Grafika i media', 'Obrázky a média'],
    short: ['Resize, convert, blur and crop images; edit, trim and convert videos; audio tools, recorders and display tests.', 'Bilder skalieren, umwandeln, verpixeln und zuschneiden; Videos schneiden und umwandeln; Audio-Tools, Rekorder und Display-Tests.', 'Zmieniaj rozmiar, konwertuj, rozmywaj i przycinaj obrazy; edytuj i konwertuj wideo; narzędzia audio, rejestratory i testy ekranu.', 'Měňte velikost, převádějte, rozmazávejte a ořezávejte obrázky; upravujte a převádějte videa; zvukové nástroje, rekordéry a testy displeje.'],
    h1: ['Free online image and media tools', 'Kostenlose Bild- und Medien-Tools online', 'Darmowe narzędzia graficzne i medialne online', 'Bezplatné online nástroje pro obrázky a média'] },
  time: { icon: 'clock', cats: ['time'],
    slug: ['time-calendar-tools', 'zeit-und-kalender-werkzeuge', 'czas-i-kalendarz', 'cas-a-kalendar'],
    name: ['Time & Calendar', 'Zeit & Kalender', 'Czas i kalendarz', 'Čas a kalendář'],
    short: UCATS.time.short,
    h1: ['Time, date and calendar tools', 'Tools für Zeit, Datum und Kalender', 'Narzędzia czasu, dat i kalendarza', 'Nástroje pro čas, datum a kalendář'] },
  business: { icon: 'coins', cats: ['finance', 'team'],
    slug: ['business-team-tools', 'business-und-team-werkzeuge', 'biznes-i-zespol', 'byznys-a-tym'],
    name: ['Business & Team', 'Business & Team', 'Biznes i zespół', 'Byznys a tým'],
    short: ['Margins, runway, VAT and pricing; estimates, decision tools, brackets, pickers and org charts.', 'Margen, Runway, MwSt. und Preise; Schätzungen, Entscheidungshilfen, Turnierbäume, Zufallsauswahl und Organigramme.', 'Marże, runway, VAT i ceny; szacowanie, decyzje, drabinki, losowanie i schematy organizacyjne.', 'Marže, runway, DPH a ceny; odhady, rozhodovací nástroje, pavouky, losování a organigramy.'],
    h1: ['Business and team tools', 'Business- und Team-Tools', 'Narzędzia biznesowe i zespołowe', 'Byznys a týmové nástroje'] },
  dev: { icon: 'code', cats: ['dev'],
    slug: ['it-web-tools', 'it-und-web-werkzeuge', 'narzedzia-it-i-web', 'it-a-web-nastroje'],
    name: ['IT & Web', 'IT & Web', 'IT i web', 'IT a web'],
    short: UCATS.dev.short,
    h1: ['IT and web helper tools', 'Hilfs-Tools für IT und Web', 'Narzędzia pomocnicze IT i web', 'Pomocné nástroje pro IT a web'] },
};
export const GROUP_ORDER = ['pdf', 'text', 'data', 'images', 'time', 'business', 'dev'];
export const GROUP_OF = Object.fromEntries(Object.entries(GROUPS).flatMap(([g, v]) => v.cats.map(c => [c, g])));

/** Links to the sister sites. key → [site, path, labels (en, de, pl, cs)] */
export const SITES = {
  files: 'https://files-online.com', open: 'https://open-online.com', culators: 'https://culators.com', test: 'https://test.institute',
};
export const SITE_NAMES = { files: 'Files Online', open: 'Open Online', culators: 'Culators', test: 'test.institute' };
export const LINKS = {
  'culators:compound-interest': ['culators', 'compound-interest-calculator/', ['Compound interest calculator', 'Zinseszinsrechner', 'Kalkulator procentu składanego', 'Kalkulačka složeného úročení']],
  'culators:break-even': ['culators', 'break-even-calculator/', ['Break-even calculator', 'Break-even-Rechner', 'Kalkulator progu rentowności', 'Kalkulačka bodu zvratu']],
  'culators:margin': ['culators', 'margin-calculator/', ['Margin calculator', 'Margenrechner', 'Kalkulator marży', 'Kalkulačka marže']],
  'culators:inflation': ['culators', 'inflation-calculator/', ['Inflation calculator', 'Inflationsrechner', 'Kalkulator inflacji', 'Kalkulačka inflace']],
  'culators:depreciation': ['culators', 'depreciation-calculator/', ['Depreciation calculator', 'Abschreibungsrechner', 'Kalkulator amortyzacji', 'Kalkulačka odpisů']],
  'culators:present-value': ['culators', 'present-value-calculator/', ['Present value calculator', 'Barwertrechner', 'Kalkulator wartości bieżącej', 'Kalkulačka současné hodnoty']],
  'culators:irr': ['culators', 'irr-calculator/', ['IRR calculator', 'IRR-Rechner', 'Kalkulator IRR', 'Kalkulačka IRR']],
  'culators:debt-payoff': ['culators', 'debt-payoff-calculator/', ['Debt payoff calculator', 'Schuldentilgungsrechner', 'Kalkulator spłaty długu', 'Kalkulačka splácení dluhu']],
  'culators:commission': ['culators', 'commission-calculator/', ['Commission calculator', 'Provisionsrechner', 'Kalkulator prowizji', 'Kalkulačka provize']],
  'culators:date': ['culators', 'date-calculator/', ['Date calculator', 'Datumsrechner', 'Kalkulator dat', 'Kalkulačka dat']],
  'culators:hours': ['culators', 'hours-calculator/', ['Hours calculator', 'Stundenrechner', 'Kalkulator godzin', 'Kalkulačka hodin']],
  'culators:subnet': ['culators', 'ip-subnet-calculator/', ['IP subnet calculator', 'IP-Subnetzrechner', 'Kalkulator podsieci IP', 'Kalkulačka IP podsítí']],
  'culators:password': ['culators', 'password-generator/', ['Password generator', 'Passwortgenerator', 'Generator haseł', 'Generátor hesel']],
  'culators:percent': ['culators', 'percent-calculator/', ['Percentage calculator', 'Prozentrechner', 'Kalkulator procentowy', 'Procentní kalkulačka']],
  'culators:conversion': ['culators', 'conversion-calculator/', ['Unit conversion calculator', 'Einheitenrechner', 'Przelicznik jednostek', 'Převodník jednotek']],
  'culators:fuel': ['culators', 'fuel-cost-calculator/', ['Fuel cost calculator', 'Spritkostenrechner', 'Kalkulator kosztu paliwa', 'Kalkulačka nákladů na palivo']],
  'culators:roi': ['culators', 'payback-period-calculator/', ['Payback period calculator', 'Amortisationsrechner', 'Kalkulator okresu zwrotu', 'Kalkulačka doby návratnosti']],
  'files:merge': ['files', { en: 'merge-pdf/', de: 'pdf-zusammenfuegen/', pl: 'polacz-pdf/', cs: 'spojit-pdf/' }, ['Merge PDF files', 'PDFs zusammenfügen', 'Połącz pliki PDF', 'Spojit soubory PDF']],
  'files:pdf-tools': ['files', { en: 'pdf-tools/', de: 'pdf-tools/', pl: 'narzedzia-pdf/', cs: 'pdf-nastroje/' }, ['More PDF tools', 'Weitere PDF-Tools', 'Więcej narzędzi PDF', 'Další nástroje PDF']],
  'files:inspector': ['files', { en: 'file-metadata-viewer/', de: 'datei-metadaten-anzeigen/', pl: 'metadane-pliku/', cs: 'metadata-souboru/' }, ['File metadata viewer', 'Datei-Metadaten anzeigen', 'Podgląd metadanych pliku', 'Zobrazení metadat souboru']],
  'files:md': ['files', { en: 'open-md-file/', de: 'md-datei-oeffnen/', pl: 'otworz-plik-md/', cs: 'otevrit-soubor-md/' }, ['Markdown viewer and editor', 'Markdown-Viewer und -Editor', 'Przeglądarka i edytor Markdown', 'Prohlížeč a editor Markdownu']],
  'files:mbox': ['files', { en: 'open-mbox-file/', de: 'mbox-datei-oeffnen/', pl: 'otworz-plik-mbox/', cs: 'otevrit-soubor-mbox/' }, ['MBOX email viewer', 'MBOX-E-Mail-Viewer', 'Przeglądarka MBOX', 'Prohlížeč MBOX']],
  'open:csv': ['open', 'csv', ['Open a CSV file', 'CSV-Datei öffnen', 'Otwórz plik CSV', 'Otevřít soubor CSV']],
  'open:xlsx': ['open', 'xlsx', ['Open an Excel file', 'Excel-Datei öffnen', 'Otwórz plik Excela', 'Otevřít soubor Excelu']],
  'open:docx': ['open', 'docx', ['Open a Word file', 'Word-Datei öffnen', 'Otwórz plik Worda', 'Otevřít soubor Wordu']],
  'open:epub': ['open', 'epub', ['Open an EPUB e-book', 'EPUB-E-Book öffnen', 'Otwórz e-book EPUB', 'Otevřít e-knihu EPUB']],
  'open:json': ['open', 'json', ['Open a JSON file', 'JSON-Datei öffnen', 'Otwórz plik JSON', 'Otevřít soubor JSON']],
  'open:png': ['open', 'png', ['Open an image file', 'Bilddatei öffnen', 'Otwórz plik obrazu', 'Otevřít obrázek']],
  'open:formats': ['open', 'formats', ['All formats you can open', 'Alle öffenbaren Formate', 'Wszystkie formaty do otwarcia', 'Všechny otevíratelné formáty']],
  'test:keyboard': ['test', 'keyboard-test/', ['Keyboard test', 'Tastaturtest', 'Test klawiatury', 'Test klávesnice']],
  'test:mouse': ['test', 'mouse-test/', ['Mouse test', 'Maustest', 'Test myszy', 'Test myši']],
  'test:microphone': ['test', 'microphone-test/', ['Microphone test', 'Mikrofontest', 'Test mikrofonu', 'Test mikrofonu']],
  'test:headphone': ['test', 'headphone-test/', ['Headphone and stereo test', 'Kopfhörer- und Stereotest', 'Test słuchawek i stereo', 'Test sluchátek a stereo']],
  'test:webcam': ['test', 'webcam-test/', ['Webcam test', 'Webcam-Test', 'Test kamery', 'Test webkamery']],
  'test:screen': ['test', 'screen-test/', ['Screen test (dead pixels)', 'Bildschirmtest (tote Pixel)', 'Test ekranu (martwe piksele)', 'Test obrazovky (mrtvé pixely)']],
  'test:gamepad': ['test', 'gamepad-test/', ['Gamepad test', 'Gamepad-Test', 'Test gamepada', 'Test gamepadu']],
  'test:sound': ['test', 'sound-test/', ['Sound test', 'Soundtest', 'Test dźwięku', 'Test zvuku']],
  'test:print': ['test', 'print-test-page/', ['Print test page', 'Druckertestseite', 'Strona testowa drukarki', 'Zkušební stránka tiskárny']],
  'test:typing': ['test', 'typing-test/', ['Typing speed test', 'Tipptest', 'Test szybkości pisania', 'Test rychlosti psaní']],
  'test:wifi': ['test', 'wifi-speed-test/', ['Wi-Fi speed test', 'WLAN-Speedtest', 'Test prędkości Wi-Fi', 'Test rychlosti Wi-Fi']],
  'test:qr': ['test', 'qr-code-test/', ['QR code test', 'QR-Code-Test', 'Test kodu QR', 'Test QR kódu']],
  'test:pitch': ['test', 'pitch-detector/', ['Pitch detector', 'Tonhöhen-Erkennung', 'Detektor wysokości dźwięku', 'Detektor výšky tónu']],
};
export const LI = { en: 0, de: 1, pl: 2, cs: 3 };

/**
 * Define one tool.
 * names/shorts: [en, de, pl, cs]. x: { about[], steps[], faqs[][], related[], links[], test, title, h1, lede, icon, noscript }
 */
export function U(id, cat, names, shorts, x = {}) { return { id, cat, names, shorts, ...x }; }
