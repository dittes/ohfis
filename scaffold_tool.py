
import os
import sys

def create_tool(category, tool_id, tool_name, description, keywords):
    base_dir = "/Users/dittes/Documents/GitHub/ohfis"
    target_dir = os.path.join(base_dir, category, tool_id)
    
    if os.path.exists(target_dir):
        print(f"Tool {tool_id} already exists. Skipping.")
        return

    os.makedirs(target_dir)
    
    # Calculate depth path for resources (css/js)
    # category/tool_id -> depth 2 -> ../../
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Free Online {tool_name} | {category.capitalize()} | OHFIS</title>
    <meta name="description" content="{description}">
    <meta name="keywords" content="{keywords}">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
</head>
<body>
    <nav class="navbar navbar-expand-lg sticky-top">
        <div class="container">
            <a class="navbar-brand" href="../../index.html">
                <i class="bi bi-box-seam-fill me-2"></i>OHFIS
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
                    <li class="nav-item"><a class="nav-link" href="../../index.html#calculators">Calculators</a></li>
                    <li class="nav-item"><a class="nav-link" href="../../index.html#text-tools">Text Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="../../index.html#image-tools">Image Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="../../index.html#pdf-tools">PDF Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="../../index.html#dev-tools">Dev Tools</a></li>
                    <li class="nav-item ms-lg-3">
                        <div class="input-group input-group-sm">
                             <span class="input-group-text bg-light border-end-0"><i class="bi bi-search small"></i></span>
                             <input type="text" class="form-control bg-light border-start-0 ps-0 tool-search-input" placeholder="Search..." aria-label="Search" style="max-width: 150px;">
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <section class="bg-light py-5">
        <div class="container text-center">
            <h1 class="fw-bold mb-3">Free Online {tool_name}</h1>
            <p class="lead text-muted mx-auto" style="max-width: 600px;">
                {description}
            </p>
        </div>
    </section>

    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="card shadow-sm border-0">
                    <div class="card-body p-4">
                        <form id="toolForm">
                            <!-- Inputs will be injected here -->
                            <div class="mb-3">
                                <label class="form-label">Placeholder Input</label>
                                <input type="number" class="form-control" id="input1">
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Calculate</button>
                                <button type="button" class="btn btn-outline-secondary" id="resetBtn">Reset</button>
                            </div>
                        </form>
                        
                        <div id="resultContainer" class="mt-4 p-3 bg-light rounded d-none">
                            <h4 class="h6 text-muted text-uppercase mb-2">Result</h4>
                            <div id="resultOutput" class="fs-4 fw-bold text-primary">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SEO Content Block -->
        <div class="row justify-content-center mt-5">
            <div class="col-lg-8">
                <article class="prose">
                    <h3>About {tool_name}</h3>
                    <p>
                        Our <strong>Free Online {tool_name}</strong> is designed to help you quickly and accurately perform calculations directly in your browser. 
                        No data is sent to any server, ensuring your privacy and speed.
                    </p>
                    <p>
                        Whether you are a student, professional, or just need a quick answer, {tool_name} provides reliable results instantly.
                    </p>
                </article>
            </div>
        </div>
    </div>

    <footer class="mt-auto">
        <div class="container text-center py-4 border-top">
             <p class="text-muted small mb-0">&copy; 2025 OHFIS. <a href="../../index.html">Home</a></p>
             <div class="mt-2">
                 <a href="../../terms.html" class="text-decoration-none text-muted small me-2">Privacy & Terms</a>
                 <a href="../../imprint.html" class="text-decoration-none text-muted small">Imprint</a>
             </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../../js/search.js"></script>
    <script src="script.js"></script>
</body>
</html>"""

    js_content = f"""document.addEventListener('DOMContentLoaded', () => {{
    const form = document.getElementById('toolForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultOutput = document.getElementById('resultOutput');

    form.addEventListener('submit', (e) => {{
        e.preventDefault();
        calculate();
    }});

    resetBtn.addEventListener('click', () => {{
        form.reset();
        resultContainer.classList.add('d-none');
    }});

    function calculate() {{
        // Logic goes here
        const val = document.getElementById('input1').value;
        const result = "Implement Logic";
        
        resultOutput.textContent = result;
        resultContainer.classList.remove('d-none');
    }}
}});
"""

    with open(os.path.join(target_dir, "index.html"), "w") as f:
        f.write(html_content)
    
    with open(os.path.join(target_dir, "script.js"), "w") as f:
        f.write(js_content)

    print(f"Created {tool_name} at {target_dir}")

# List of tools to generate
tools = [
     ("developer-tools", "zip-manager", "ZIP Manager", "Create and extract ZIP files online.", "zip, archive, compress, extract, file"),
     ("image-tools", "meme-generator", "Meme Generator", "Create memes with custom text.", "meme, generator, image, text, caption, funny"),
     ("image-tools", "social-resizer", "Social Media Image Resizer", "Resize images for social media platforms.", "social, resize, instagram, facebook, twitter, image"),
     ("image-tools", "metadata-editor", "EXIF Metadata Editor", "View and remove EXIF metadata from images.", "exif, metadata, clean, remove, privacy, image"),
     ("text-utilities", "markdown-to-pdf", "Markdown to PDF", "Convert Markdown text to PDF documents.", "markdown, pdf, convert, document")
]

for t in tools:
    create_tool(t[0], t[1], t[2], t[3], t[4])
