"""Stamp each page in _src/pages/ into the shared shell (_src/shell.html).

Run from the repo root:  python3 tools/build.py
Output: index.html, life-insurance/index.html, life-settlements/index.html, about/index.html, contact/index.html
Each page starts with a front-matter block (title, description, path, hero3d: yes|no).
"""
import os, re, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_src')
shell = open(os.path.join(SRC, 'shell.html')).read()
importmap = open(os.path.join(SRC, 'importmap.html')).read()
NAV = ['/', '/life-insurance/', '/life-settlements/', '/about/', '/contact/']

def bust(html):
    # append ?v=<content hash> to local CSS/JS so a deploy is never mixed with a cached older file
    def rep(m):
        rel = m.group(2)
        h = hashlib.sha1(open(os.path.join(ROOT, rel.lstrip('/')), 'rb').read()).hexdigest()[:10]
        return '%s%s?v=%s"' % (m.group(1), rel, h)
    return re.sub(r'((?:src|href)=")(/assets/(?:css|js)/[^"?]+)"', rep, html)

for name in sorted(os.listdir(os.path.join(SRC, 'pages'))):
    raw = open(os.path.join(SRC, 'pages', name)).read()
    m = re.match(r'---\n(.*?)\n---\n(.*)', raw, re.S)
    meta = dict(line.split(': ', 1) for line in m.group(1).splitlines())
    body = m.group(2)
    path = meta['path']
    three = meta.get('hero3d') == 'yes'
    out = shell
    out = out.replace('{{title}}', meta['title']).replace('{{description}}', meta['description']).replace('{{path}}', path)
    for p in NAV:
        out = out.replace('{{cur:%s}}' % p, ' aria-current="page"' if p == path else '')
    out = out.replace('{{importmap}}', importmap if three else '')
    out = out.replace('{{module}}', '<script type="module" src="/assets/js/hero3d.js"></script>' if three else '')
    out = out.replace('{{main}}', body)
    dest = os.path.join(ROOT, path.strip('/'), 'index.html') if path != '/' else os.path.join(ROOT, 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w').write(bust(out))
    print('built', os.path.relpath(dest, ROOT))
