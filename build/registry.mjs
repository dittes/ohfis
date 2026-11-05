// registry.mjs
// Structure of the site: languages, URLs, tools and their cross-links.
// Copy lives in content/<lang>.mjs; this file holds what is the same in every language.

export const SITE = 'https://ohfis.com';
/** Languages that exist on the site and the original four, whose texts live inside the registries; the others come from build/langs/<lang>.mjs. */
export const CORE_LANGS = ['en', 'de', 'pl', 'cs'];
export const LANGS = ['en', 'de', 'pl', 'cs', 'es'];
export const LANG_NAMES = { en: 'English', de: 'Deutsch', pl: 'Polski', cs: 'Čeština', es: 'Español', fr: 'Français', pt: 'Português', nl: 'Nederlands', sv: 'Svenska', da: 'Dansk' };
export const LOCALES = { en: 'en_US', de: 'de_DE', pl: 'pl_PL', cs: 'cs_CZ', es: 'es_ES', fr: 'fr_FR', pt: 'pt_BR', nl: 'nl_NL', sv: 'sv_SE', da: 'da_DK' };

/** Localized slug of the non-tool pages. */
export const PAGES = {
  home: { en: '', de: '', pl: '', cs: '' },
  pdfTools: { en: 'pdf-tools', de: 'pdf-tools', pl: 'narzedzia-pdf', cs: 'pdf-nastroje' },
  privacy: { en: 'privacy', de: 'datenschutz', pl: 'prywatnosc', cs: 'soukromi' },
  imprint: { en: 'imprint', de: 'impressum', pl: 'nota-prawna', cs: 'tiraz' },
};

/**
 * PDF tools in display order, grouped by category.
 * slugs follow what people search for in each language, as Smallpdf does.
 */
export const CATEGORIES = ['organize', 'optimize', 'convert', 'edit', 'security'];

export const TOOLS = [
  // Organize
  { id: 'merge', cat: 'organize', icon: 'merge', accept: 'pdf', multiple: true, popular: true,
    slugs: { en: 'merge-pdf', de: 'pdf-zusammenfuegen', pl: 'polacz-pdf', cs: 'spojit-pdf' },
    related: ['split', 'organize', 'compress', 'jpg-to-pdf'],
    sister: ['open:pdf'] },
  { id: 'split', cat: 'organize', icon: 'split', accept: 'pdf', popular: true,
    slugs: { en: 'split-pdf', de: 'pdf-teilen', pl: 'podziel-pdf', cs: 'rozdelit-pdf' },
    related: ['extract', 'merge', 'delete', 'compress'],
    sister: ['open:pdf'] },
  { id: 'extract', cat: 'organize', icon: 'extract', accept: 'pdf',
    slugs: { en: 'extract-pdf-pages', de: 'pdf-seiten-extrahieren', pl: 'wyodrebnij-strony-pdf', cs: 'extrahovat-stranky-pdf' },
    related: ['split', 'delete', 'merge', 'pdf-to-jpg'],
    sister: ['open:pdf'] },
  { id: 'delete', cat: 'organize', icon: 'delete', accept: 'pdf',
    slugs: { en: 'delete-pdf-pages', de: 'pdf-seiten-loeschen', pl: 'usun-strony-pdf', cs: 'odstranit-stranky-pdf' },
    related: ['extract', 'organize', 'split', 'redact'],
    sister: [] },
  { id: 'organize', cat: 'organize', icon: 'organize', accept: 'pdf', multiple: true,
    slugs: { en: 'organize-pdf', de: 'pdf-sortieren', pl: 'uporzadkuj-pdf', cs: 'usporadat-pdf' },
    related: ['merge', 'rotate', 'delete', 'page-numbers'],
    sister: ['open:pdf'] },
  { id: 'rotate', cat: 'organize', icon: 'rotate', accept: 'pdf',
    slugs: { en: 'rotate-pdf', de: 'pdf-drehen', pl: 'obroc-pdf', cs: 'otocit-pdf' },
    related: ['organize', 'crop', 'merge', 'compress'],
    sister: ['open:pdf'] },
  { id: 'crop', cat: 'organize', icon: 'crop', accept: 'pdf',
    slugs: { en: 'crop-pdf', de: 'pdf-zuschneiden', pl: 'przytnij-pdf', cs: 'oriznout-pdf' },
    related: ['rotate', 'organize', 'compress', 'page-numbers'],
    sister: ['open:pdf'] },

  // Optimize
  { id: 'compress', cat: 'optimize', icon: 'compress', accept: 'pdf', popular: true,
    slugs: { en: 'compress-pdf', de: 'pdf-verkleinern', pl: 'kompresuj-pdf', cs: 'komprimovat-pdf' },
    related: ['merge', 'split', 'pdf-to-jpg', 'protect'],
    sister: [] },
  { id: 'ocr', cat: 'optimize', icon: 'ocr', accept: 'pdf', popular: true,
    slugs: { en: 'ocr-pdf', de: 'pdf-ocr', pl: 'ocr-pdf', cs: 'ocr-pdf' },
    related: ['pdf-to-word', 'pdf-to-text', 'compress', 'pdf-to-excel'],
    sister: ['open:pdf'] },
  { id: 'flatten', cat: 'optimize', icon: 'flatten', accept: 'pdf',
    slugs: { en: 'flatten-pdf', de: 'pdf-reduzieren', pl: 'splaszcz-pdf', cs: 'zplostit-pdf' },
    related: ['form-filler', 'protect', 'sign', 'compress'],
    sister: ['open:pdf'] },

  // Convert
  { id: 'pdf-to-word', cat: 'convert', icon: 'toWord', accept: 'pdf', popular: true,
    slugs: { en: 'pdf-to-word', de: 'pdf-in-word', pl: 'pdf-na-word', cs: 'pdf-na-word' },
    related: ['ocr', 'pdf-to-text', 'pdf-to-excel', 'edit'],
    sister: ['open:docx'] },
  { id: 'pdf-to-excel', cat: 'convert', icon: 'toExcel', accept: 'pdf',
    slugs: { en: 'pdf-to-excel', de: 'pdf-in-excel', pl: 'pdf-na-excel', cs: 'pdf-na-excel' },
    related: ['pdf-to-word', 'pdf-to-text', 'ocr', 'split'],
    sister: ['open:xlsx'] },
  { id: 'pdf-to-jpg', cat: 'convert', icon: 'toImage', accept: 'pdf', popular: true,
    slugs: { en: 'pdf-to-jpg', de: 'pdf-in-jpg', pl: 'pdf-na-jpg', cs: 'pdf-na-jpg' },
    related: ['pdf-to-png', 'jpg-to-pdf', 'extract', 'compress'],
    sister: [] },
  { id: 'pdf-to-png', cat: 'convert', icon: 'toImage', accept: 'pdf',
    slugs: { en: 'pdf-to-png', de: 'pdf-in-png', pl: 'pdf-na-png', cs: 'pdf-na-png' },
    related: ['pdf-to-jpg', 'png-to-pdf', 'extract', 'crop'],
    sister: [] },
  { id: 'pdf-to-text', cat: 'convert', icon: 'toText', accept: 'pdf',
    slugs: { en: 'pdf-to-text', de: 'pdf-in-text', pl: 'pdf-na-tekst', cs: 'pdf-na-text' },
    related: ['ocr', 'pdf-to-word', 'pdf-to-excel', 'metadata'],
    sister: ['open:txt'] },
  { id: 'jpg-to-pdf', cat: 'convert', icon: 'fromImage', accept: 'image', multiple: true, popular: true,
    slugs: { en: 'jpg-to-pdf', de: 'jpg-in-pdf', pl: 'jpg-na-pdf', cs: 'jpg-na-pdf' },
    related: ['png-to-pdf', 'merge', 'compress', 'pdf-to-jpg'],
    sister: [] },
  { id: 'png-to-pdf', cat: 'convert', icon: 'fromImage', accept: 'image', multiple: true,
    slugs: { en: 'png-to-pdf', de: 'png-in-pdf', pl: 'png-na-pdf', cs: 'png-na-pdf' },
    related: ['jpg-to-pdf', 'merge', 'compress', 'pdf-to-png'],
    sister: [] },

  // Edit
  { id: 'edit', cat: 'edit', icon: 'edit', accept: 'pdf', popular: true,
    slugs: { en: 'edit-pdf', de: 'pdf-bearbeiten', pl: 'edytuj-pdf', cs: 'upravit-pdf' },
    related: ['sign', 'form-filler', 'watermark', 'redact'],
    sister: ['open:pdf'] },
  { id: 'sign', cat: 'edit', icon: 'sign', accept: 'pdf', popular: true,
    slugs: { en: 'sign-pdf', de: 'pdf-unterschreiben', pl: 'podpisz-pdf', cs: 'podepsat-pdf' },
    related: ['form-filler', 'flatten', 'edit', 'protect'],
    sister: ['open:pdf'] },
  { id: 'form-filler', cat: 'edit', icon: 'form', accept: 'pdf',
    slugs: { en: 'fill-pdf-form', de: 'pdf-formular-ausfuellen', pl: 'wypelnij-formularz-pdf', cs: 'vyplnit-pdf-formular' },
    related: ['sign', 'flatten', 'edit', 'protect'],
    sister: ['open:pdf'] },
  { id: 'watermark', cat: 'edit', icon: 'watermark', accept: 'pdf',
    slugs: { en: 'add-watermark-to-pdf', de: 'pdf-wasserzeichen', pl: 'znak-wodny-pdf', cs: 'vodoznak-pdf' },
    related: ['page-numbers', 'protect', 'edit', 'flatten'],
    sister: [] },
  { id: 'page-numbers', cat: 'edit', icon: 'numbers', accept: 'pdf',
    slugs: { en: 'add-page-numbers-to-pdf', de: 'pdf-seitenzahlen', pl: 'numeracja-stron-pdf', cs: 'cislovani-stran-pdf' },
    related: ['watermark', 'merge', 'organize', 'edit'],
    sister: ['open:pdf'] },

  // Security
  { id: 'protect', cat: 'security', icon: 'protect', accept: 'pdf', popular: true,
    slugs: { en: 'protect-pdf', de: 'pdf-verschluesseln', pl: 'zabezpiecz-pdf', cs: 'zaheslovat-pdf' },
    related: ['unlock', 'redact', 'watermark', 'flatten'],
    sister: [] },
  { id: 'unlock', cat: 'security', icon: 'unlock', accept: 'pdf',
    slugs: { en: 'unlock-pdf', de: 'pdf-entsperren', pl: 'odblokuj-pdf', cs: 'odemknout-pdf' },
    related: ['protect', 'edit', 'compress', 'merge'],
    sister: ['open:pdf'] },
  { id: 'redact', cat: 'security', icon: 'redact', accept: 'pdf',
    slugs: { en: 'redact-pdf', de: 'pdf-schwaerzen', pl: 'zaczernij-pdf', cs: 'zacernit-pdf' },
    related: ['metadata', 'protect', 'delete', 'flatten'],
    sister: [] },
  { id: 'metadata', cat: 'security', icon: 'metadata', accept: 'pdf',
    slugs: { en: 'edit-pdf-metadata', de: 'pdf-metadaten-bearbeiten', pl: 'edytuj-metadane-pdf', cs: 'upravit-metadata-pdf' },
    related: ['redact', 'protect', 'flatten', 'compress'],
    sister: [] },
];

/** Pages on the sister sites. */
export const SISTER_SITES = {
  open: { host: 'https://open-online.com', name: 'Open Online' },
};

export const SISTER_PATHS = {
  // Open Online (no trailing slash on its format pages)
  'open:pdf': 'pdf', 'open:docx': 'docx', 'open:xlsx': 'xlsx', 'open:txt': 'txt', 'open:md': 'md',
  'open:eml': 'eml', 'open:zip': 'zip', 'open:7z': '7z', 'open:formats': 'formats', 'open:archives': 'archives',
  // Remove Online
  'remove:pdfPageRemover': 'tools/pdf-page-remover/',
  'remove:removePagesGuide': 'documents/remove-pages-from-pdf/',
  'remove:pdfMetadataRemover': 'tools/pdf-metadata-remover/',
  'remove:imageMetadataRemover': 'tools/image-metadata-remover/',
  'remove:officeMetadataRemover': 'tools/office-metadata-remover/',
  'remove:removePasswordGuide': 'documents/remove-password-from-pdf/',
  'remove:removeWatermark': 'media/remove-watermark/',
  'remove:backgroundRemover': 'tools/background-remover/',
  'remove:textCleaner': 'tools/text-cleaner/',
  // AintoB
  'aintob:fileConverter': 'file-converter/',
  'aintob:documentConverter': 'document-converter/',
  'aintob:imageConverter': 'image-converter/',
  'aintob:spreadsheetConverter': 'spreadsheet-converter/',
  'aintob:pdfConverter': 'document/pdf-converter/',
  'aintob:pdfEdit': 'document/pdf-edit/',
  'aintob:pdfToSearchable': 'document/pdf-to-searchable/',
  'aintob:pdfToWebp': 'document/pdf-to-webp/',
  'aintob:wordConverter': 'document/word-converter/',
  'aintob:excelConverter': 'spreadsheet/excel-converter/',
  'aintob:markdownConverter': 'document/markdown-converter/',
  'aintob:emlConverter': 'document/eml-converter/',
  'aintob:emlToPdf': 'document/eml-to-pdf/',
  'aintob:compressImage': 'image/compress-image/',
  'aintob:resizeImage': 'image/resize-image/',
  'aintob:jpgConverter': 'image/jpg-converter/',
  'aintob:pngConverter': 'image/png-converter/',
  'aintob:wordToPdf': 'document/word-to-pdf/',
  'aintob:excelToPdf': 'document/excel-to-pdf/',
  'aintob:pptxToPdf': 'document/pptx-to-pdf/',
  'aintob:odtToPdf': 'document/odt-to-pdf/',
  'aintob:epubToPdf': 'document/epub-to-pdf/',
  'aintob:txtToPdf': 'document/txt-to-pdf/',
  'aintob:csvToPdf': 'document/csv-to-pdf/',
  'aintob:heicToPdf': 'document/heic-to-pdf/',
  'aintob:webpToPdf': 'document/webp-to-pdf/',
  'aintob:gifToPdf': 'document/gif-to-pdf/',
};

/** Shown on the PDF hub: conversions AintoB handles, listed next to our own tools. */
export const CONVERT_TO_PDF = [];


export function sisterUrl(key, lang) {
  const [site] = key.split(':');
  return `${SISTER_SITES[site].host}/${CORE_LANGS.includes(lang) ? lang : 'en'}/${SISTER_PATHS[key]}`;
}

export function pagePath(key, lang) {
  const slug = PAGES[key][lang];
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}

export function toolPath(tool, lang) {
  return `/${lang}/${tool.slugs[lang]}/`;
}
