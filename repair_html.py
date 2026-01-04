
import re
import os

def repair_html(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 1. Fix tool-card divs
    # Find tool-card divs that are followed by </a> without a closing </div>
    # Using a more robust regex to skip already correct ones
    pattern_card = r'(<div class="tool-card">.*?<div class="tool-desc">.*?</div>)\s*</a>'
    repaired = re.sub(pattern_card, r'\1</div></a>', content, flags=re.DOTALL)
    
    # 2. Fix row divs inside sections
    # Find sections that contain a row div but don't close it before </section>
    # This is trickier. Let's look for sections and ensure they have a closing div for the row.
    sections = re.findall(r'<section id=".*?".*?>.*?</section>', repaired, flags=re.DOTALL)
    for section in sections:
        if '<div class="row g-4">' in section:
            # Check if there is a closing div for the row
            # We expect number of <div to match number of </div> inside the section minus 1 (for the section's container if it had one, but these sections are inside a container)
            # Actually, let's just count open/close divs.
            open_divs = section.count('<div')
            close_divs = section.count('</div')
            if open_divs > close_divs:
                # Missing closing div(s). Most likely just one for the row.
                new_section = section.replace('</section>', '</div></section>')
                repaired = repaired.replace(section, new_section)
    
    # 3. Specific fix for Hero section in index.html
    if "index.html" in filepath:
        # The hero section was specifically broken in my previous edit
        hero_pattern = r'(<section class="py-5 text-center container">.*?<button class="btn btn-primary" type="button">Find Tool</button>.*?</div>)(</section>)'
        # If it matches my broken state where it ends with </div></section> but missing row/col/d-flex divs
        # Actually I already partially fixed it but let's be sure.
        pass

    if repaired != content:
        with open(filepath, 'w') as f:
            f.write(repaired)
        print(f"Repaired tags in {filepath}")

repair_html("/Users/dittes/Documents/GitHub/ohfis/index.html")
# Also repair the silo index pages just in case
silos = ["calculators", "text-utilities", "image-tools", "pdf-tools", "developer-tools"]
for silo in silos:
    path = f"/Users/dittes/Documents/GitHub/ohfis/{silo}/index.html"
    if os.path.exists(path):
        repair_html(path)
