
import os
import re

def get_nav_block(depth):
    prefix = "../" * depth
    if depth == 0:
        prefix = ""
    
    return f"""            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
                    <li class="nav-item"><a class="nav-link" href="{prefix}calculators/index.html">Calculators</a></li>
                    <li class="nav-item"><a class="nav-link" href="{prefix}text-utilities/index.html">Text Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="{prefix}image-tools/index.html">Image Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="{prefix}pdf-tools/index.html">PDF Tools</a></li>
                    <li class="nav-item"><a class="nav-link" href="{prefix}developer-tools/index.html">Dev Tools</a></li>
                    <li class="nav-item ms-lg-3">
                        <div class="input-group input-group-sm">
                             <span class="input-group-text bg-light border-end-0"><i class="bi bi-search small"></i></span>
                             <input type="text" class="form-control bg-light border-start-0 ps-0 tool-search-input" placeholder="Search..." aria-label="Search" style="max-width: 150px;">
                        </div>
                    </li>
                </ul>
            </div>"""

def update_navbar(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    start_tag = '<div class="collapse navbar-collapse" id="navbarNav">'
    if start_tag not in content:
        # print(f"Skipping {filepath}: No navbar found")
        return

    # Find the end of the surrounding <nav> element to ensure we replace everything between the start of navbar-collapse and the end of the nav container.
    # We want to keep the </nav> but replace everything from start_tag until it.
    nav_end_idx = content.find('</nav>', content.find(start_tag))
    
    if nav_end_idx == -1:
        print(f"Error: Could not find </nav> after navbar start in {filepath}")
        return

    rel_path = os.path.relpath(filepath, "/Users/dittes/Documents/GitHub/ohfis")
    depth = rel_path.count(os.sep)
    
    target_block = get_nav_block(depth)
    
    # Re-construct the file:
    # 1. Start until the beginning of the navbar-collapse div
    # 2. Our fresh navbar-collapse div
    # 3. The closing </div> for the .container
    # 4. The closing </nav> and everything after
    
    cut_start = content.find(start_tag)
    prefix_content = content[:cut_start]
    suffix_content = content[nav_end_idx:]
    
    # We add </div> for the container because our previous broken script likely ate it.
    new_content = prefix_content + target_block + "\n        </div>\n    " + suffix_content

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Repaired and Updated {filepath}")
    else:
        # print(f"No changes needed for {filepath}")
        pass

# Walk through directories
root_dir = "/Users/dittes/Documents/GitHub/ohfis"
for dirpath, dirnames, filenames in os.walk(root_dir):
    if "/." in dirpath:
        continue
        
    for filename in filenames:
        if filename == "index.html":
            full_path = os.path.join(dirpath, filename)
            update_navbar(full_path)
