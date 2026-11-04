# Ohfis

Free online tools that run entirely in the browser: 26 PDF tools and 280 utilities for documents, text, CSV and spreadsheets, images, time and calendars, business maths, notes and privacy, IT and web work, teams and audio/video. Nothing is uploaded. English, German, Polish and Czech (`/en`, `/de`, `/pl`, `/cs`).

Live at https://ohfis.com (GitHub Pages serves the committed output). What exists compared with the original request list is in [TOOLS_COVERAGE.md](TOOLS_COVERAGE.md).

## Working on the site

```bash
npm run build                    # regenerate every page, sitemap, llms.txt, search index (no dependencies)
python3 -m http.server 8000      # preview at http://localhost:8000
npm test                         # unit tests (node:test, no dependencies)
PW=$(npm root -g)/playwright node tests/e2e.mjs [tool-id ...]   # browser tests; no ids = every tool
node build/coverage.mjs          # regenerate TOOLS_COVERAGE.md (fails if it names a tool that does not exist)
```

Pages under `en/ de/ pl/ cs/`, `sitemap.xml`, `llms*.txt`, `robots.txt`, `service-worker.js`, `manifest.webmanifest` and `assets/i18n/search.*.js` are generated: edit the sources, then build and commit the output.

## Layout

| Path | What it is |
|---|---|
| `build/build.mjs` | the generator: pages, header menu, footer, home, category pages, JSON-LD, hreflang, CSP, sitemap, llms.txt |
| `build/registry.mjs` | the 26 PDF tools, languages, site URL |
| `build/tools/registry.mjs` | utility categories, links to the sister sites, the `U()` helper |
| `build/tools/<category>.mjs` | one file per category with the metadata of each tool: names and short texts in 4 languages, long explanation, steps, FAQ, related tools, links, test hint |
| `build/content/{en,de,pl,cs}.mjs`, `ui.mjs` | home and interface copy |
| `assets/js/tools/<category>.js` | the interface of each tool (`export const tools = { id(root) {…} }`) |
| `assets/js/tools/lib/*.js` | pure logic, unit-tested without a browser (text, csv, time, astro, fin, it, image, notes, audio, docs, …) |
| `assets/js/tools/{kit,calctool,tabletool}.js` | shared helpers: DOM, `textTool`, `calcTool`, `tableTool`, charts |
| `assets/js/pdf/` | the PDF tools; `assets/vendor/` holds self-hosted pdf-lib, PDF.js, qpdf, Tesseract, fflate, qrcode, fonts and the EFF word list |
| `tests/*.test.mjs` | unit tests; `tests/e2e.mjs` + `e2e-custom.mjs` open every tool in Chromium (English and German page, console and HTTP errors fail the run) and drive the tools that need real interaction |

## Adding a tool

1. Put the logic in `assets/js/tools/lib/<area>.js` and test it in `tests/<area>.test.mjs`.
2. Add the interface to `assets/js/tools/<category>.js` (use `textTool`, `calcTool` or write a custom `(root) => …`).
3. Add the metadata with `U(id, category, names[4], shorts[4], { title, about[], steps[], faqs[], related[], links[], test })` to `build/tools/<category>.mjs`. Choose names people would search for; write what the tool does and what its limits are.
4. Add a behaviour test to `tests/e2e-custom.mjs` and run `node tests/e2e.mjs <id>`.
5. Run `npm run build`, `npm test` and `node build/coverage.mjs`, and commit the generated pages.

## Design notes

- All 280 utility tools have their explanations (how it works, steps, FAQs) translated into German, Polish and Czech by hand, in `build/tools/i18n/<lang>/NN.mjs`. A tool without a translation falls back to the English text (marked `lang="en"` with a note). Interface strings that are not tool-specific are localised in `build/content`.
- The translations are written by an AI model without a native-speaker review; corrections are welcome as edits to those files.
- Navigation: seven sections (PDF & Documents, Text & Notes, Spreadsheets & CSV, Images & Media, Time & Calendar, Business & Team, IT & Web), defined as `GROUPS` in `build/tools/registry.mjs`. The ten finer categories still exist inside a section page. The footer only holds the legal links; the language is switched in the header.
- URLs are translated in every language. PDF tool slugs are set in `build/registry.mjs`; utility tool slugs are generated from the translated tool name (English keeps the tool id) and section slugs come from `GROUPS`. The former English slugs and category URLs stay alive as small redirect pages. `tests/urls.test.mjs` checks canonicals, redirects, links and the navigation.
- Video tools run FFmpeg compiled to WebAssembly (`assets/vendor/ffmpeg`, 31 MB, loaded only when a video tool is used). The command lines are built in `assets/js/tools/lib/video.js` and tested against a native FFmpeg (`tests/video.test.mjs`); `tests/e2e-custom.mjs` runs every video tool with the real WebAssembly build. The browser build has no VP9 encoder that works (it crashes the page), so WebM uses VP8.
- HEIC to JPG uses libheif (WebAssembly, LGPL) whose Emscripten runtime builds functions at run time; that single page therefore adds `'unsafe-eval'` to its Content-Security-Policy (see `NEEDS_EVAL` in `build/build.mjs`). `connect-src` stays `'self'`, so nothing can be sent anywhere.
- Logo: flat blue tile with a white page and an "O" ring (`build/icons.mjs`); `build/make-icons.mjs` renders the PNG icons and the social card.
- Content-Security-Policy allows only this origin (plus `wasm-unsafe-eval`, `blob:` and `data:`), so tools cannot send data elsewhere. Features that need a server (URL unshortening, network jitter tests) are therefore not part of the site.
- Links to files-online.com, open-online.com, test.institute and culators.com are placed where they help (hardware tests, file viewers, standard calculators), not on every page.
- Sunrise and moon calculations follow NOAA and Meeus; tests compare against published almanac values.
