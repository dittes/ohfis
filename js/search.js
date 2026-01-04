const toolsIndex = [
    // Calculators
    { name: "BMI Calculator", url: "/calculators/bmi-calculator/", keywords: "body mass index health weight" },
    { name: "Loan Calculator", url: "/calculators/loan-calculator/", keywords: "mortgage finance interest payment" },
    { name: "Mortgage Calculator", url: "/calculators/mortgage-calculator/", keywords: "house home loan interest rate" },
    { name: "Compound Interest Calculator", url: "/calculators/compound-interest-calculator/", keywords: "investment growth savings wealth" },
    { name: "Simple Interest Calculator", url: "/calculators/simple-interest-calculator/", keywords: "loan interest principal rate" },
    { name: "Investment Return Calculator", url: "/calculators/investment-return-calculator/", keywords: "profit return roi money growth" },
    { name: "VAT / Sales Tax Calculator", url: "/calculators/vat-calculator/", keywords: "tax sales vat value added" },
    { name: "BMR Calculator", url: "/calculators/bmr-calculator/", keywords: "basal metabolic rate calories health" },
    { name: "Calorie Calculator", url: "/calculators/calorie-calculator/", keywords: "tdee diet fitness weight loss" },
    { name: "Body Fat Percentage Calculator", url: "/calculators/body-fat-calculator/", keywords: "navy method waist hip neck" },
    { name: "Percentage Calculator", url: "/calculators/percentage-calculator/", keywords: "math percent increase change" },
    { name: "Random Number Generator", url: "/calculators/random-number-generator/", keywords: "rng random dice chance" },
    { name: "Age Calculator", url: "/calculators/age-calculator/", keywords: "birthday years months days" },
    { name: "Date Difference Calculator", url: "/calculators/date-difference/", keywords: "days between dates duration range time" },
    // Text Utilities
    { name: "Word Counter", url: "/text-utilities/word-counter/", keywords: "character count sentence text write" },
    { name: "Character Counter", url: "/text-utilities/character-counter/", keywords: "letters density twitter sms limit" },
    { name: "Text Cleaner", url: "/text-utilities/text-cleaner/", keywords: "format strip html remove spaces" },
    { name: "Lorem Ipsum Generator", url: "/text-utilities/lorem-ipsum-generator/", keywords: "placeholder dummy text generator" },
    { name: "Remove Line Breaks", url: "/text-utilities/remove-line-breaks/", keywords: "fix formatting pdf email lines" },
    { name: "Case Converter", url: "/text-utilities/case-converter/", keywords: "uppercase lowercase title case text" },
    // Document Converters
    { name: "Word to PDF", url: "/document-converters/word-to-pdf/", keywords: "doc docx pdf convert" },
    { name: "PDF to Word", url: "/document-converters/pdf-to-word/", keywords: "pdf doc docx convert edit" },
    // Developer Tools
    { name: "JSON Formatter", url: "/developer-tools/json-formatter/", keywords: "json pretty print lint validate" },
    { name: "Base64 Converter", url: "/developer-tools/base64-converter/", keywords: "base64 encode decode string" },
    { name: "URL Encoder", url: "/developer-tools/url-encoder/", keywords: "url encode decode escape safe string" },
    // Image Tools
    { name: "Image Resizer", url: "/image-tools/image-resizer/", keywords: "resize scale dimension pixel" },
    { name: "Image Converter", url: "/image-tools/image-converter/", keywords: "png jpg webp convert format" },
    { name: "Image Compressor", url: "/image-tools/image-compressor/", keywords: "compress optimize reduce size" },
    // Placeholder for future tools (to enable search discovery even before implementation if desired, or just add as we go)
];

document.addEventListener('DOMContentLoaded', () => {
    // Look for search inputs
    const searchInputs = document.querySelectorAll('.tool-search-input');

    // Create results container if not exists
    let resultsContainer = document.getElementById('search-results-dropdown');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'search-results-dropdown';
        resultsContainer.className = 'dropdown-menu w-100 p-2 start-0 shadow-lg';
        resultsContainer.style.display = 'none';
        resultsContainer.style.position = 'absolute';
        resultsContainer.style.marginTop = '5px';
        document.body.appendChild(resultsContainer);
    }

    searchInputs.forEach(input => {
        // Wrap input in relative container for positioning if not already
        if (input.parentElement.style.position !== 'relative') {
            input.parentElement.style.position = 'relative';
        }

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) {
                hideResults();
                return;
            }

            const results = toolsIndex.filter(tool =>
                tool.name.toLowerCase().includes(query) ||
                tool.keywords.includes(query)
            );

            showResults(results, input);
        });

        // Hide on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== resultsContainer) {
                hideResults();
            }
        });
    });

    function showResults(results, inputEl) {
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="dropdown-item text-muted">No tools found</div>';
        } else {
            results.forEach(tool => {
                const a = document.createElement('a');
                a.href = tool.url; // Relative path adjustment might be needed depending on depth
                // Quick fix for relative paths: check if we are in a subdir
                // Ideally, we use absolute paths in the index or handle base URL
                // For this static site, let's try to infer depth or just use absolute if on domain
                // We'll stick to the url in index and let the browser handle implicit relative from root or adjust below

                // Absolute path fix for local files vs server:
                // If running locally without server, paths starting with / might fail.
                // Assuming standard web server behavior (localhost:3000/), / works.
                // If file:// protocol, this is tricky. We'll assume relative-safe paths
                // Or just prepending '../' based on current location.

                // For now, assume relative to root is handled by <base> or standard server.
                // Let's manually adjust if current path is deep.
                let finalUrl = tool.url;
                const depth = window.location.pathname.split('/').length - 2;
                if (depth > 0 && !tool.url.startsWith('http')) {
                    // logic to go up levels? 
                    // actually, let's just make the tool objects use standard root-relative paths
                    // and rely on a server. If file://, we might need a smart prefixer.
                    // The user is likely using a dev server.
                }

                a.className = 'dropdown-item d-flex align-items-center py-2';
                a.innerHTML = `<i class="bi bi-tools me-2 text-primary opacity-75"></i> <span>${tool.name}</span>`;
                // Fix path for click
                a.onclick = (e) => {
                    // e.preventDefault();
                    // window.location.href = ...
                }
                resultsContainer.appendChild(a);
            });
        }

        // Position results below the active input
        const rect = inputEl.getBoundingClientRect();
        resultsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        resultsContainer.style.left = (rect.left + window.scrollX) + 'px';
        resultsContainer.style.width = rect.width + 'px';
        resultsContainer.style.display = 'block';
    }

    function hideResults() {
        resultsContainer.style.display = 'none';
    }
});
