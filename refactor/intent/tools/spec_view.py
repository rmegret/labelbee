#!/usr/bin/env python3
"""Render a spec source file (plain Markdown) into a view with working links.

Source: items are `### CAP-403: Title` headings; the lines `- **Group:**`, `- **Links:**`
hold plain IDs, `- **Code:**` holds file and symbol names (no paths, no line numbers).
View: IDs become links; a code file is shown with its path from the project root and
linked by a path relative to the view; symbol names stay as plain names (no line numbers)
but must still be found in the file, otherwise a warning is printed;
`<!-- toc -->` becomes a table of contents.

usage: python3 -I spec_view.py SOURCE OUTPUT [--spec-dir DIR] [--check]
       python3 -I spec_view.py --all [--check]   (every spec file of refactor/intent -> docs/)
"""
import argparse
import os
import re
import sys

KINDS = 'CAP|BEH|ENT|INV|DEC|DEBT|OQ|SEAM|EPIC|STEP|SPIKE'
ID_RE = re.compile(r'\b(?:%s)-\d{3}\b' % KINDS)
HEAD_RE = re.compile(r'^(#{2,4})\s+((?:%s)-\d{3}):\s*(.+?)\s*$' % KINDS)
TOKEN_RE = re.compile(r'(`[^`]*`|\[[^\]]*\]\([^)]*\))')
CODE_EXT = {'.js', '.py', '.html', '.css', '.md', '.sh', '.txt'}
SKIP_DIRS = {'.git', '.claude', 'node_modules', 'extern', 'legacy', 'build', 'venv',
             '__pycache__', 'scratch', 'data', 'uploads'}


def slug(text):
    s = re.sub(r'[^a-z0-9 _-]', '', text.lower())
    return s.replace(' ', '-')


def find_root(start):
    d = os.path.abspath(start)
    while d != os.path.dirname(d):
        if os.path.isdir(os.path.join(d, 'refactor')) and os.path.isdir(os.path.join(d, 'labelbee')):
            return d
        d = os.path.dirname(d)
    sys.exit('repo root not found')


class Resolver:
    def __init__(self, root, source, output, spec_dir, warn):
        self.root, self.source, self.output = root, source, output
        self.spec_dir = os.path.abspath(spec_dir)
        self.outdir = os.path.dirname(output)
        self.warn = warn
        self.files = []
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                if os.path.splitext(fn)[1] in CODE_EXT:
                    self.files.append(os.path.relpath(os.path.join(dp, fn), root))
        self.ids = {}  # ID -> (file, anchor, title)
        for p in sorted(os.listdir(spec_dir)):
            if p.endswith('.md'):
                self._index_spec(os.path.join(spec_dir, p))
        self._index_spec(source)
        q = os.path.join(os.path.dirname(spec_dir), 'QUESTIONS.md')
        if os.path.exists(q):
            for m in re.finditer(r"<a id='(oq-\d+)'>(OQ-\d+)</a>: ([^*\n]+)", open(q).read()):
                self.ids[m.group(2)] = (q, m.group(1), m.group(3).strip())

    def _index_spec(self, path):
        for line in open(path).read().split('\n'):
            m = HEAD_RE.match(line)
            if m:
                self.ids[m.group(2)] = (path, slug('%s: %s' % (m.group(2), m.group(3))), m.group(3))

    def view_of(self, path):
        """Link to the generated view of a spec file when building into docs/, else to the file."""
        if os.path.abspath(path) == os.path.abspath(self.source):
            return self.output
        docs = os.path.join(self.spec_dir, 'docs')
        if os.path.dirname(self.output) == docs and os.path.dirname(path) == self.spec_dir:
            return os.path.join(docs, 'view_' + os.path.basename(path))
        return path

    def rel(self, path):
        return os.path.relpath(path, self.outdir)

    def id_link(self, ident):
        if ident not in self.ids:
            self.warn('unknown ID %s' % ident)
            return ident
        path, anchor, title = self.ids[ident]
        target = self.view_of(path)
        base = '' if os.path.abspath(target) == os.path.abspath(self.output) else self.rel(target)
        return '[%s](%s#%s "%s")' % (ident, base, anchor, title.replace('"', "'"))

    def find_file(self, name):
        hits = [f for f in self.files if f == name or f.endswith('/' + name)]
        if len(hits) != 1:
            self.warn('file %r: %d matches' % (name, len(hits)))
            return None
        return os.path.join(self.root, hits[0])

    def find_line(self, path, sym):
        if sym.startswith('#'):
            pats = [r'''id=["']%s["']''' % re.escape(sym[1:])]
        else:
            e = re.escape(re.split(r'[.:]', sym)[-1])
            pats = [r'\bfunction\s+%s\b' % e, r'\b(?:class|def)\s+%s\b' % e,
                    r'\.%s\s*=\s*(?:async\s*)?(?:function|\()' % e,
                    r'^\s*%s\s*[:=]\s*(?:async\s*)?(?:function|\()' % e,
                    r'\b%s\s*=\s*function' % e, r'\b%s\s*[:=]' % e, r'\b%s\b' % e]
        lines = open(path, errors='replace').read().split('\n')
        for pat in pats:
            for n, line in enumerate(lines, 1):
                if re.search(pat, line):
                    return n
        self.warn('symbol %r not found in %s' % (sym, os.path.relpath(path, self.root)))
        return None

    def code_entry(self, part):
        m = re.match(r'`([^`]+)`\s*:?\s*(.*)$', part)
        if not m:
            return part
        fname, rest = m.group(1), m.group(2)
        path = self.find_file(fname)
        if not path:
            return part
        link = self.rel(path)
        syms = []
        for sym in re.findall(r'`([^`]+)`', rest):
            if sym.startswith('~'):  # general name for a block: no lookup
                syms.append('`%s`' % sym[1:].strip())
                continue
            self.find_line(path, sym)  # warns when the symbol is not in the file
            syms.append('`%s`' % sym)
        out = '[%s](%s)' % (os.path.relpath(path, self.root), link)
        return out + (': ' + ', '.join(syms) if syms else '')


def link_ids(line, res):
    parts = TOKEN_RE.split(line)
    for k in range(0, len(parts), 2):
        parts[k] = ID_RE.sub(lambda m: res.id_link(m.group(0)), parts[k])
    for k in range(1, len(parts), 2):  # links to other documents: keep valid from the view's folder
        m = re.match(r'^(\[[^\]]*\]\()(?!https?:|mailto:|#)([^)#\s]+)(.*\))$', parts[k])
        if m:
            target = os.path.normpath(os.path.join(os.path.dirname(res.source), m.group(2)))
            parts[k] = m.group(1) + res.rel(target) + m.group(3)
    return ''.join(parts)


def render(src, res):
    lines = src.split('\n')
    items = [HEAD_RE.match(l).groups() for l in lines if HEAD_RE.match(l)]
    levels = {len(h) for h, _, _ in items}
    toc = ['| ID | Name |', '|---|---|']
    for hashes, ident, title in items:
        a = slug('%s: %s' % (ident, title))
        bold = '**' if len(levels) > 1 and len(hashes) == min(levels) else ''
        toc.append('| %s%s%s | %s[%s](#%s)%s |' % (bold, ident, bold, bold, title, a, bold))
    out, i, fenced = [], 0, False
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'):
            fenced = not fenced
        if fenced or line.startswith('```') or HEAD_RE.match(line):
            out.append(line)
        elif line.strip() == '<!-- toc -->':
            out.extend(toc)
        elif re.match(r'^- \*\*Code:\*\*', line):
            block = [re.sub(r'^- \*\*Code:\*\*\s*', '', line)]
            while i + 1 < len(lines) and lines[i + 1].startswith('  '):
                i += 1
                block.append(re.sub(r'^\s*-\s*', '', lines[i]))
            parts = [p.strip() for b in block for p in b.split(';') if p.strip()]
            out.append('- **Code:**')
            out.extend('  - ' + res.code_entry(p) for p in parts)
        else:
            out.append(link_ids(line, res))
        i += 1
    return '\n'.join(out)


def build(source, output, spec_dir, check):
    source, output = os.path.abspath(source), os.path.abspath(output)
    root = find_root(source)
    warnings = []
    res = Resolver(root, source, output, spec_dir or os.path.dirname(source), warnings.append)
    text = '<!-- GENERATED from %s by refactor/intent/tools/spec_view.py. Do not edit. -->\n' % \
        os.path.relpath(source, os.path.dirname(output)) + render(open(source).read(), res)
    for w in warnings:
        print('warning: %s: %s' % (os.path.basename(source), w), file=sys.stderr)
    if check:
        same = os.path.exists(output) and open(output).read() == text
        print('%s: %s' % (os.path.basename(output), 'up to date' if same else 'OUT OF DATE'))
        return same and not warnings
    os.makedirs(os.path.dirname(output), exist_ok=True)
    open(output, 'w').write(text)
    print('wrote %s (%d warnings)' % (os.path.relpath(output, root), len(warnings)))
    return not warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source', nargs='?')
    ap.add_argument('output', nargs='?')
    ap.add_argument('--spec-dir', default=None)
    ap.add_argument('--all', action='store_true', help='render every spec file of the spec dir into docs/')
    ap.add_argument('--check', action='store_true', help='compare with existing output, write nothing')
    a = ap.parse_args()
    if a.all:
        d = os.path.abspath(a.spec_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
        names = [n for n in sorted(os.listdir(d)) if n.endswith('.md') and n != 'README.md']
        ok = [build(os.path.join(d, n), os.path.join(d, 'docs', 'view_' + n), d, a.check) for n in names]
        sys.exit(0 if all(ok) else 1)
    if not (a.source and a.output):
        ap.error('SOURCE and OUTPUT, or --all')
    sys.exit(0 if build(a.source, a.output, a.spec_dir, a.check) else 1)


if __name__ == '__main__':
    main()
