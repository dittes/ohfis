// "Not advice" notices shown under tools where a result could be relied on, and the third-party component list for the imprint.

const T = {
  en: {
    legal: 'Note: this tool produces a template, not legal advice. The wording is a general model; mandatory details, deadlines, interest rates and formal rules differ by country and case. Check the result before you use it and ask a lawyer or tax adviser when in doubt. No warranty is given for correctness or completeness.',
    finance: 'Note: results are calculation aids and estimates, not tax, financial or investment advice. Check important figures yourself and get professional advice before you decide. No warranty is given for correctness or completeness.',
    redact: 'Note: check the result before you share the file. We cannot guarantee that every piece of sensitive information has been removed.',
    sign: 'Note: this adds an image of your signature to the PDF. It is not a qualified electronic signature and may not satisfy legal requirements for contracts that need one.',
    protect: 'Note: password protection keeps casual readers out, but it is no guarantee of confidentiality. Do not rely on it alone for highly sensitive documents.',
  },
  de: {
    legal: 'Hinweis: Dieses Werkzeug erstellt eine Vorlage und keine Rechtsberatung. Die Formulierungen sind allgemeine Muster; Pflichtangaben, Fristen, Zinssätze und Formvorschriften unterscheiden sich je nach Land und Fall. Prüfe das Ergebnis vor der Verwendung und lass dich im Zweifel rechtlich oder steuerlich beraten. Für Richtigkeit und Vollständigkeit wird keine Gewähr übernommen.',
    finance: 'Hinweis: Die Ergebnisse sind Rechenhilfen und Schätzungen, keine Steuer-, Finanz- oder Anlageberatung. Prüfe wichtige Zahlen selbst und hole vor Entscheidungen fachkundigen Rat ein. Für Richtigkeit und Vollständigkeit wird keine Gewähr übernommen.',
    redact: 'Hinweis: Prüfe das Ergebnis, bevor du die Datei weitergibst. Wir können nicht garantieren, dass wirklich alle sensiblen Angaben entfernt sind.',
    sign: 'Hinweis: Hier wird das Bild deiner Unterschrift in das PDF eingefügt. Das ist keine qualifizierte elektronische Signatur und genügt womöglich nicht den gesetzlichen Anforderungen für Verträge, die eine solche verlangen.',
    protect: 'Hinweis: Ein Passwortschutz hält Gelegenheitsleser fern, garantiert aber keine Vertraulichkeit. Verlasse dich bei sehr sensiblen Dokumenten nicht allein darauf.',
  },
  pl: {
    legal: 'Uwaga: to narzędzie tworzy wzór, a nie poradę prawną. Sformułowania są ogólnymi wzorcami; obowiązkowe elementy, terminy, stopy odsetek i wymogi formalne różnią się w zależności od kraju i sprawy. Sprawdź wynik przed użyciem, a w razie wątpliwości skonsultuj się z prawnikiem lub doradcą podatkowym. Nie udzielamy gwarancji poprawności ani kompletności.',
    finance: 'Uwaga: wyniki są pomocą w obliczeniach i szacunkami, a nie poradą podatkową, finansową ani inwestycyjną. Ważne liczby sprawdź samodzielnie, a przed decyzją zasięgnij fachowej porady. Nie udzielamy gwarancji poprawności ani kompletności.',
    redact: 'Uwaga: sprawdź wynik, zanim udostępnisz plik. Nie możemy zagwarantować, że usunięto wszystkie wrażliwe informacje.',
    sign: 'Uwaga: to narzędzie wstawia do PDF obraz Twojego podpisu. Nie jest to kwalifikowany podpis elektroniczny i może nie spełniać wymogów prawnych dla umów, które go wymagają.',
    protect: 'Uwaga: ochrona hasłem powstrzymuje przypadkowych czytelników, ale nie gwarantuje poufności. W przypadku bardzo wrażliwych dokumentów nie polegaj wyłącznie na niej.',
  },
  cs: {
    legal: 'Upozornění: tento nástroj vytváří vzor, nikoli právní poradenství. Formulace jsou obecné šablony; povinné náležitosti, lhůty, úrokové sazby a formální požadavky se liší podle země a případu. Výsledek před použitím zkontrolujte a v případě pochybností se obraťte na právníka nebo daňového poradce. Za správnost a úplnost neposkytujeme záruku.',
    finance: 'Upozornění: výsledky jsou pomůckou pro výpočty a odhady, nikoli daňové, finanční ani investiční poradenství. Důležité údaje si ověřte sami a před rozhodnutím vyhledejte odbornou radu. Za správnost a úplnost neposkytujeme záruku.',
    redact: 'Upozornění: výsledek zkontrolujte, než soubor sdílíte. Nemůžeme zaručit, že byly odstraněny všechny citlivé údaje.',
    sign: 'Upozornění: nástroj vloží do PDF obrázek vašeho podpisu. Nejde o kvalifikovaný elektronický podpis a nemusí splňovat zákonné požadavky u smluv, které jej vyžadují.',
    protect: 'Upozornění: ochrana heslem zabrání náhodným čtenářům, ale nezaručuje důvěrnost. U velmi citlivých dokumentů se na ni nespoléhejte samotnou.',
  },
  es: {
    legal: 'Nota: esta herramienta genera una plantilla, no asesoramiento jurídico. Las formulaciones son modelos generales; los datos obligatorios, los plazos, los tipos de interés y los requisitos formales varían según el país y el caso. Revisa el resultado antes de usarlo y consulta a un abogado o asesor fiscal en caso de duda. No se ofrece garantía de exactitud ni de integridad.',
    finance: 'Nota: los resultados son ayudas de cálculo y estimaciones, no asesoramiento fiscal, financiero ni de inversión. Comprueba tú mismo las cifras importantes y busca asesoramiento profesional antes de decidir. No se ofrece garantía de exactitud ni de integridad.',
    redact: 'Nota: revisa el resultado antes de compartir el archivo. No podemos garantizar que se haya eliminado toda la información sensible.',
    sign: 'Nota: esto añade una imagen de tu firma al PDF. No es una firma electrónica cualificada y puede no cumplir los requisitos legales de los contratos que la exijan.',
    protect: 'Nota: la protección con contraseña aleja a los lectores casuales, pero no garantiza la confidencialidad. En documentos muy sensibles no confíes solo en ella.',
  },
  fr: {
    legal: 'Remarque : cet outil produit un modèle, pas un conseil juridique. Les formulations sont des modèles généraux ; les mentions obligatoires, les délais, les taux d\'intérêt et les exigences de forme varient selon le pays et le cas. Vérifiez le résultat avant de l\'utiliser et consultez un avocat ou un conseiller fiscal en cas de doute. Aucune garantie d\'exactitude ni d\'exhaustivité n\'est donnée.',
    finance: 'Remarque : les résultats sont des aides au calcul et des estimations, pas des conseils fiscaux, financiers ou d\'investissement. Vérifiez vous-même les chiffres importants et demandez un avis professionnel avant de décider. Aucune garantie d\'exactitude ni d\'exhaustivité n\'est donnée.',
    redact: 'Remarque : vérifiez le résultat avant de partager le fichier. Nous ne pouvons pas garantir que toutes les informations sensibles ont été supprimées.',
    sign: 'Remarque : cela ajoute une image de votre signature au PDF. Ce n\'est pas une signature électronique qualifiée et elle peut ne pas satisfaire aux exigences légales des contrats qui en demandent une.',
    protect: 'Remarque : la protection par mot de passe tient à l\'écart les lecteurs occasionnels, mais ne garantit pas la confidentialité. Pour des documents très sensibles, ne vous y fiez pas seule.',
  },
  pt: {
    legal: 'Observação: esta ferramenta gera um modelo, não aconselhamento jurídico. As redações são modelos gerais; dados obrigatórios, prazos, taxas de juros e exigências formais variam conforme o país e o caso. Confira o resultado antes de usá-lo e consulte um advogado ou contador em caso de dúvida. Não é dada garantia de correção nem de completude.',
    finance: 'Observação: os resultados são auxílios de cálculo e estimativas, não aconselhamento tributário, financeiro nem de investimento. Confira você mesmo os números importantes e busque orientação profissional antes de decidir. Não é dada garantia de correção nem de completude.',
    redact: 'Observação: confira o resultado antes de compartilhar o arquivo. Não podemos garantir que todas as informações sensíveis tenham sido removidas.',
    sign: 'Observação: isto adiciona uma imagem da sua assinatura ao PDF. Não é uma assinatura eletrônica qualificada e pode não atender às exigências legais de contratos que a exijam.',
    protect: 'Observação: a proteção por senha afasta leitores casuais, mas não garante confidencialidade. Em documentos muito sensíveis, não confie só nela.',
  },
  it: {
    legal: 'Nota: questo strumento produce un modello, non una consulenza legale. Le formulazioni sono modelli generali; dati obbligatori, scadenze, tassi di interesse e requisiti formali variano a seconda del paese e del caso. Controlla il risultato prima di usarlo e, in caso di dubbio, rivolgiti a un avvocato o a un commercialista. Non viene fornita alcuna garanzia di correttezza o completezza.',
    finance: 'Nota: i risultati sono ausili di calcolo e stime, non consulenza fiscale, finanziaria o d\'investimento. Controlla tu stesso le cifre importanti e chiedi un parere professionale prima di decidere. Non viene fornita alcuna garanzia di correttezza o completezza.',
    redact: 'Nota: controlla il risultato prima di condividere il file. Non possiamo garantire che tutte le informazioni sensibili siano state rimosse.',
    sign: 'Nota: questo aggiunge al PDF un\'immagine della tua firma. Non è una firma elettronica qualificata e può non soddisfare i requisiti di legge per i contratti che la richiedono.',
    protect: 'Nota: la protezione con password tiene lontani i lettori occasionali, ma non garantisce la riservatezza. Per documenti molto sensibili non affidarti solo a essa.',
  },
};

const LEGAL_IDS = new Set(['delivery-note-generator', 'receipt-generator', 'certificate-generator', 'vat-calculator', 'ics-event-generator']);
LEGAL_IDS.delete('ics-event-generator');
const CANVAS_IDS = new Set(['business-model-canvas', 'lean-canvas', 'eisenhower-matrix-board', 'pestel-analysis-board', 'porters-five-forces-board', 'empathy-map-canvas', 'team-canvas']);
const REDACT_IDS = new Set(['redact', 'image-blur-redact', 'image-metadata-remover', 'metadata']);

/** Returns the notice text for a tool (PDF tool or utility) or '' when none applies. */
export function disclaimerFor(lang, tool) {
  const t = T[lang] || T.en;
  if (LEGAL_IDS.has(tool.id)) return t.legal;
  if (CANVAS_IDS.has(tool.id)) return '';
  if (tool.cat === 'finance') return t.finance;
  if (REDACT_IDS.has(tool.id)) return t.redact;
  if (tool.id === 'sign') return t.sign;
  if (tool.id === 'protect') return t.protect;
  return '';
}

// [name, version, licence, url]
export const COMPONENTS = [
  ['pdf-lib + fontkit', '1.17', 'MIT', 'https://github.com/Hopding/pdf-lib'],
  ['PDF.js', '', 'Apache-2.0', 'https://github.com/mozilla/pdf.js'],
  ['qpdf (WebAssembly)', '', 'Apache-2.0', 'https://github.com/qpdf/qpdf'],
  ['Tesseract.js + Tesseract OCR core and language data', '', 'Apache-2.0', 'https://github.com/naptha/tesseract.js'],
  ['FFmpeg.wasm (@ffmpeg/ffmpeg 0.12.10, core 0.12.6 = FFmpeg 5.1.4 with x264, libvpx, LAME, Opus)', '', 'LGPL-2.1+ / GPL-2.0+ (FFmpeg, x264); MIT (wrapper)', 'https://ffmpeg.org'],
  ['lamejs (LAME MP3 encoder)', '', 'LGPL-3.0', 'https://github.com/zhuker/lamejs'],
  ['libheif-js (libheif)', '', 'LGPL-3.0', 'https://github.com/catdad-experiments/libheif-js'],
  ['fflate', '', 'MIT', 'https://github.com/101arrowz/fflate'],
  ['qrcode-generator', '1.4.4', 'MIT', 'https://github.com/kazuhikoarase/qrcode-generator'],
  ['js-yaml', '', 'MIT', 'https://github.com/nodeca/js-yaml'],
  ['sql-formatter', '', 'MIT', 'https://github.com/sql-formatter-org/sql-formatter'],
  ['Inter (typeface)', '', 'SIL OFL 1.1', 'https://rsms.me/inter/'],
  ['DejaVu Sans (typeface)', '', 'Bitstream Vera licence (free)', 'https://dejavu-fonts.github.io'],
  ['EFF Large Wordlist for passphrases', '', 'CC BY 3.0 US', 'https://www.eff.org/dice'],
];

const H = {
  en: { h: 'Open-source components', p: 'Ohfis is built on the following third-party components, which are served from this site and run in your browser. Each stays under its own licence; copyright remains with the respective authors. The LGPL/GPL components (FFmpeg, x264, LAME, libheif) are used unmodified as separate files; their source code is available from the linked projects.', dh: 'Disclaimer', dp: 'The tools on Ohfis are provided free of charge and without warranty of any kind. Results are generated automatically in your browser, may contain errors, and are not legal, tax, financial or medical advice. You are responsible for checking results before relying on them. Our liability is limited to intent and gross negligence, except where mandatory law provides otherwise.', ver: 'version' },
  de: { h: 'Open-Source-Komponenten', p: 'Ohfis nutzt die folgenden Komponenten Dritter, die von dieser Website ausgeliefert werden und in deinem Browser laufen. Jede bleibt unter ihrer eigenen Lizenz; die Urheberrechte liegen bei den jeweiligen Autoren. Die LGPL-/GPL-Komponenten (FFmpeg, x264, LAME, libheif) werden unverändert als eigene Dateien eingesetzt; ihren Quellcode findest du bei den verlinkten Projekten.', dh: 'Haftungsausschluss', dp: 'Die Werkzeuge auf Ohfis werden kostenlos und ohne jede Gewähr bereitgestellt. Die Ergebnisse entstehen automatisch in deinem Browser, können Fehler enthalten und sind keine Rechts-, Steuer-, Finanz- oder medizinische Beratung. Du bist selbst dafür verantwortlich, Ergebnisse zu prüfen, bevor du dich auf sie verlässt. Unsere Haftung beschränkt sich auf Vorsatz und grobe Fahrlässigkeit, soweit zwingende gesetzliche Vorschriften nichts anderes vorsehen.', ver: 'Version' },
  pl: { h: 'Komponenty open source', p: 'Ohfis korzysta z następujących komponentów stron trzecich, które są udostępniane z tej witryny i działają w Twojej przeglądarce. Każdy podlega własnej licencji; prawa autorskie należą do poszczególnych autorów. Komponenty LGPL/GPL (FFmpeg, x264, LAME, libheif) są używane bez zmian jako osobne pliki; ich kod źródłowy jest dostępny w podlinkowanych projektach.', dh: 'Wyłączenie odpowiedzialności', dp: 'Narzędzia w Ohfis są udostępniane bezpłatnie i bez jakiejkolwiek gwarancji. Wyniki powstają automatycznie w Twojej przeglądarce, mogą zawierać błędy i nie stanowią porady prawnej, podatkowej, finansowej ani medycznej. Sprawdzenie wyników przed poleganiem na nich należy do Ciebie. Nasza odpowiedzialność ogranicza się do winy umyślnej i rażącego niedbalstwa, o ile bezwzględnie obowiązujące przepisy nie stanowią inaczej.', ver: 'wersja' },
  cs: { h: 'Open-source komponenty', p: 'Ohfis využívá následující komponenty třetích stran, které se doručují z tohoto webu a běží ve vašem prohlížeči. Každá zůstává pod vlastní licencí; autorská práva náleží příslušným autorům. Komponenty LGPL/GPL (FFmpeg, x264, LAME, libheif) se používají beze změn jako samostatné soubory; jejich zdrojový kód je k dispozici u odkazovaných projektů.', dh: 'Vyloučení odpovědnosti', dp: 'Nástroje na Ohfis jsou poskytovány zdarma a bez jakékoli záruky. Výsledky vznikají automaticky ve vašem prohlížeči, mohou obsahovat chyby a nejsou právním, daňovým, finančním ani lékařským poradenstvím. Za kontrolu výsledků před jejich použitím odpovídáte vy. Naše odpovědnost je omezena na úmysl a hrubou nedbalost, pokud závazné právní předpisy nestanoví jinak.', ver: 'verze' },
  es: { h: 'Componentes de código abierto', p: 'Ohfis se basa en los siguientes componentes de terceros, que se sirven desde este sitio y se ejecutan en tu navegador. Cada uno sigue bajo su propia licencia; los derechos de autor pertenecen a sus respectivos autores. Los componentes LGPL/GPL (FFmpeg, x264, LAME, libheif) se usan sin modificar como archivos independientes; su código fuente está disponible en los proyectos enlazados.', dh: 'Exención de responsabilidad', dp: 'Las herramientas de Ohfis se ofrecen gratis y sin garantía de ningún tipo. Los resultados se generan automáticamente en tu navegador, pueden contener errores y no constituyen asesoramiento jurídico, fiscal, financiero ni médico. Eres responsable de comprobar los resultados antes de fiarte de ellos. Nuestra responsabilidad se limita al dolo y la negligencia grave, salvo que la ley imperativa disponga otra cosa.', ver: 'versión' },
  fr: { h: 'Composants open source', p: 'Ohfis repose sur les composants tiers suivants, servis par ce site et exécutés dans votre navigateur. Chacun reste sous sa propre licence ; les droits d\'auteur appartiennent à leurs auteurs respectifs. Les composants LGPL/GPL (FFmpeg, x264, LAME, libheif) sont utilisés sans modification, comme fichiers distincts ; leur code source est disponible auprès des projets liés.', dh: 'Exclusion de responsabilité', dp: 'Les outils d\'Ohfis sont fournis gratuitement et sans garantie d\'aucune sorte. Les résultats sont générés automatiquement dans votre navigateur, peuvent contenir des erreurs et ne constituent pas un conseil juridique, fiscal, financier ou médical. Il vous appartient de vérifier les résultats avant de vous y fier. Notre responsabilité est limitée à l\'intention dolosive et à la faute lourde, sauf disposition légale impérative contraire.', ver: 'version' },
  pt: { h: 'Componentes de código aberto', p: 'O Ohfis se baseia nos seguintes componentes de terceiros, servidos por este site e executados no seu navegador. Cada um permanece sob a sua própria licença; os direitos autorais pertencem aos respectivos autores. Os componentes LGPL/GPL (FFmpeg, x264, LAME, libheif) são usados sem modificação, como arquivos separados; o código-fonte deles está disponível nos projetos indicados.', dh: 'Isenção de responsabilidade', dp: 'As ferramentas do Ohfis são oferecidas gratuitamente e sem garantia de qualquer tipo. Os resultados são gerados automaticamente no seu navegador, podem conter erros e não constituem aconselhamento jurídico, tributário, financeiro nem médico. Você é responsável por conferir os resultados antes de confiar neles. Nossa responsabilidade se limita a dolo e culpa grave, salvo disposição legal imperativa em contrário.', ver: 'versão' },
  it: { h: 'Componenti open source', p: 'Ohfis si basa sui seguenti componenti di terze parti, serviti da questo sito e eseguiti nel tuo browser. Ciascuno resta sotto la propria licenza; il diritto d\'autore appartiene ai rispettivi autori. I componenti LGPL/GPL (FFmpeg, x264, LAME, libheif) sono usati senza modifiche come file separati; il loro codice sorgente è disponibile presso i progetti collegati.', dh: 'Esclusione di responsabilità', dp: 'Gli strumenti di Ohfis sono forniti gratuitamente e senza garanzie di alcun tipo. I risultati sono generati automaticamente nel tuo browser, possono contenere errori e non costituiscono consulenza legale, fiscale, finanziaria o medica. Sei tu responsabile di controllare i risultati prima di farvi affidamento. La nostra responsabilità è limitata a dolo e colpa grave, salvo diversa disposizione inderogabile di legge.', ver: 'versione' },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML appended below the imprint: disclaimer and component list. */
export function imprintExtras(lang) {
  const h = H[lang] || H.en;
  const items = COMPONENTS.map(([n, v, l, u]) => `<li><a href="${u}" rel="noopener">${esc(n)}</a>${v ? ` (${h.ver} ${esc(v)})` : ''} – ${esc(l)}</li>`).join('\n        ');
  return `\n      <h2>${esc(h.dh)}</h2>\n      <p>${esc(h.dp)}</p>\n      <h2>${esc(h.h)}</h2>\n      <p>${esc(h.p)}</p>\n      <ul>\n        ${items}\n      </ul>`;
}
