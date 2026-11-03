# OHFIS

Free PDF tools that run entirely in your browser: merge, split, compress, convert, edit, sign, protect and more.
Nothing is uploaded. Available in English, German, Polish and Czech (`/en`, `/de`, `/pl`, `/cs`).

Live at https://ohfis.com (GitHub Pages serves the committed output).

## Working on the site

```bash
npm run build                                         # regenerate every page (no dependencies)
python3 -m http.server 8000                           # preview at http://localhost:8000
PW=$(npm root -g)/playwright node build/make-icons.mjs # re-render PNG icons after a logo change
```

- `build/registry.mjs` – tools, categories, localized URLs
- `build/content/{en,de,pl,cs}.mjs` – all copy
- `build/icons.mjs` – tool icons and the logo
- `assets/css/site.css` – design (tokens at the top, Open Online blue `#2557D6`, Inter)
- `assets/js/pdf/` – the PDF tools; `assets/vendor/` – self-hosted pdf-lib, PDF.js, qpdf, Tesseract

Pages under `en/ de/ pl/ cs/`, `sitemap.xml`, `service-worker.js` and `manifest.webmanifest` are generated; edit the sources above instead.
The previous Bootstrap site (calculators, text, image and developer tools) is in git history before this redesign.
