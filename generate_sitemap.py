import os
from datetime import datetime

def generate_sitemap(root_dir, base_url="https://ohfis.com"):
    urls = []
    
    # Static pages in root
    root_pages = ['index.html', 'terms.html', 'imprint.html']
    for page in root_pages:
        if os.path.exists(os.path.join(root_dir, page)):
            urls.append(f"{base_url}/{page}")

    # Tool pages
    dirs_to_scan = ['calculators', 'text-utilities', 'developer-tools', 'pdf-tools', 'image-tools', 'document-converters']
    
    for d in dirs_to_scan:
        path = os.path.join(root_dir, d)
        if not os.path.exists(path):
            continue
            
        for root, dirs, files in os.walk(path):
            if 'index.html' in files:
                rel_path = os.path.relpath(os.path.join(root, 'index.html'), root_dir)
                urls.append(f"{base_url}/{rel_path}")

    # Generate XML
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    
    now = datetime.now().strftime('%Y-%m-%d')
    for url in sorted(list(set(urls))):
        xml.append('  <url>')
        xml.append(f'    <loc>{url}</loc>')
        xml.append(f'    <lastmod>{now}</lastmod>')
        xml.append('    <changefreq>monthly</changefreq>')
        xml.append('    <priority>0.8</priority>')
        xml.append('  </url>')
        
    xml.append('</urlset>')
    
    with open(os.path.join(root_dir, 'sitemap.xml'), 'w') as f:
        f.write('\n'.join(xml))
    
    print(f"Sitemap generated with {len(urls)} URLs")

if __name__ == "__main__":
    generate_sitemap(os.getcwd())
