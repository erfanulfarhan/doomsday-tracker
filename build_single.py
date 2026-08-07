#!/usr/bin/env python3
"""Inline styles.css, data.js and app.js into one portable file.

Two outputs:
  dist/index.html   a complete standalone page — email it, open it from disk
  dist/fragment.html  head-less body content, for hosts that supply the shell

Usage:  python3 build_single.py
"""

import base64
import pathlib
import re

HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def data_uri(name: str, mime: str) -> str:
    blob = base64.b64encode((HERE / name).read_bytes()).decode("ascii")
    return f"data:{mime};base64,{blob}"


html = read("index.html")
css = read("styles.css")
js = read("data.js") + "\n" + read("app.js")

# The bundle has no sibling files to fetch, so drop what can't resolve.
html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
html = html.replace('<script src="data.js"></script>\n<script src="app.js"></script>',
                    f"<script>\n{js}\n</script>")
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")
html = html.replace('href="icon.svg"', f'href="{data_uri("icon.svg", "image/svg+xml")}"')
html = html.replace('href="icon-180.png"', f'href="{data_uri("icon-180.png", "image/png")}"')

DIST.mkdir(exist_ok=True)
(DIST / "index.html").write_text(html, encoding="utf-8")

# Fragment: everything between <body> and </body>, plus the <style> block,
# for hosts that wrap content in their own document shell.
style = re.search(r"<style>.*?</style>", html, re.S).group(0)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
(DIST / "fragment.html").write_text(f"<title>{title}</title>\n{style}\n{body}", encoding="utf-8")

for f in ("index.html", "fragment.html"):
    kb = (DIST / f).stat().st_size / 1024
    print(f"dist/{f}  {kb:.0f} KB")
