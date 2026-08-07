#!/usr/bin/env python3
"""Generate the app icons: a gauge ring, the same motif as the progress bar."""

from PIL import Image, ImageDraw

INK = (10, 12, 10)
BRASS = (200, 153, 60)
GREEN = (59, 107, 78)

SS = 4  # supersample factor


def make(size: int) -> Image.Image:
    s = size * SS
    img = Image.new("RGB", (s, s), INK)
    d = ImageDraw.Draw(img)

    pad = s * 0.20
    box = (pad, pad, s - pad, s - pad)
    width = int(s * 0.115)

    # unfilled remainder, then the filled sweep
    d.arc(box, start=-90, end=270, fill=(38, 44, 34), width=width)
    d.arc(box, start=-90, end=150, fill=GREEN, width=width)
    d.arc(box, start=-90, end=60, fill=BRASS, width=width)

    # the tick at top, where the sweep starts
    r = s * 0.045
    c = s / 2
    d.ellipse((c - r, pad - r + width / 2, c + r, pad + r + width / 2), fill=BRASS)

    return img.resize((size, size), Image.LANCZOS)


for n in (180, 192, 512):
    make(n).save(f"icon-{n}.png")
    print(f"wrote icon-{n}.png")
