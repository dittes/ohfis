
import os
import re

def update_seo_tags(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    filename = os.path.basename(filepath)

    # 1. Update <title>
    # Search for <title>Content</title>
    # If "Free Online" is not in the title, prepend it?
    # Or append " | Free Online Tool" if it fits. 
    # Current titles usually are "Tool Name | Category | OHFIS"
    # User request: "add the keywords 'Free' and 'Online' to the pages - in the title headline and also in the text."
    
    # Strategy: Replace <title>Foo</title> with <title>Free Online Foo</title> if not present.
    # Regex for title tag content
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)
    if title_match:
        current_title = title_match.group(1)
        if "Free Online" not in current_title and "Free" not in current_title: 
            # Avoid double "Free" if tool name has "Free"
            # Prepend "Free Online "
            new_title = f"Free Online {current_title}"
            content = content.replace(f'<title>{current_title}</title>', f'<title>{new_title}</title>')
            print(f"Updated Title: {new_title}")

    # 2. Update <h1> and Text
    # This is trickier as <h1> might be inside complex divs.
    # Usually: <h1 class="fw-bold mb-3">Tool Name</h1>
    # We can use regex to find the h1 content.
    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE)
    if h1_match:
        current_h1 = h1_match.group(1)
        if "Free Online" not in current_h1:
             # Just prepend to h1 content? Might break layout if too long.
             # User said: "in the title headline and also in the text"
             # Maybe add a subheader or append to h1?
             # Let's try prepending "Free Online" to the H1 text.
             new_h1 = f"Free Online {current_h1}"
             # Replace only the content part
             # We need to reconstruction the match string to replace it safely
             full_h1_tag = h1_match.group(0)
             new_h1_tag = full_h1_tag.replace(current_h1, new_h1)
             content = content.replace(full_h1_tag, new_h1_tag)
             print(f"Updated H1: {new_h1}")

    # 3. Add holistic description if missing
    # We can look for <p class="lead text-muted mx-auto" ...>
    # Append a sentence if it's short? 
    # Or inject a new section at the bottom?
    # User said: "holistic long form text on every tool page"
    # A robust way is to append a <article class="prose"> section at the bottom if not present.
    # Some pages (like Base64) already have it.
    
    if '<article class="prose">' not in content:
        # Check if we can insert it before footer.
        footer_idx = content.find('<footer')
        if footer_idx != -1:
            # We want to insert inside the main container but usually files are structured:
            # nav, section (hero), div.container (tool), footer.
            # Ideally we place it after the tool container.
            # Finding the last closing div before footer? Risky.
            # Let's look for the closing </div> of the main tool container. 
            # Most of my pages end with </div>\n\n    <!-- Footer -->
            
            description_block = f"""
    <div class="container mb-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <article class="prose">
                    <h3>About High-Quality Free Online Tools</h3>
                    <p>
                        Explore our collection of <strong>Free Online</strong> utilities designed to make your daily tasks easier. 
                        Whether you need to calculate complex formulas, convert documents, or format code, OHFIS provides a secure, client-side, and ad-free experience.
                    </p>
                    <p>
                        Our local-first architecture ensures your data never leaves your browser, offering maximum privacy and speed. 
                        Bookmark this page for instant access to powerful, premium-grade tools without any cost.
                    </p>
                </article>
            </div>
        </div>
    </div>
"""
            # Insert before footer
            content = content[:footer_idx] + description_block + content[footer_idx:]
            print(f"Added description block to {filename}")

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Saved changes to {filepath}")
    else:
        print(f"No SEO changes needed for {filepath}")

# Walk and run
root_dir = "/Users/dittes/Documents/GitHub/ohfis"
for dirpath, dirnames, filenames in os.walk(root_dir):
    if "/." in dirpath: continue
    for filename in filenames:
        if filename == "index.html":
            # Skip root index.html for H1/Title update as it's the home page 'OHFIS | ...'
            if dirpath == root_dir:
                continue
            update_seo_tags(os.path.join(dirpath, filename))
