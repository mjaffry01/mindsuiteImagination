"""
Makes the link-preview images that LinkedIn, WhatsApp, Teams, X and others show when a
MindSuite page is shared, plus the browser icons.

    python seo/make-share-images.py

Writes (into public/, so the build copies them as they are):
  share/mindsuite.png        home and general pages     1200 x 627 (LinkedIn's size)
  share/<family-slug>.png    each service family page, and every offering page in that family
  favicon.png 32 px, apple-touch-icon.png 180 px, icon-512.png 512 px   the logo mark

Run it again after renaming a service family or changing its tagline. Needs Pillow and the
Windows fonts Segoe UI / Segoe UI Bold (falls back to Arial).
"""
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
W, H = 1200, 627

NAVY_TOP, NAVY_BOTTOM = (29, 35, 64), (40, 49, 82)
INK, MUTED = (241, 242, 248), (196, 203, 224)
VIOLET, CYAN, PINK = (198, 185, 242), (138, 211, 227), (227, 178, 207)
BRAND = [(82, 201, 234), (101, 83, 165), (211, 138, 187)]  # logo: cyan, violet, pink


def font(bold, size):
    names = ["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]
    for name in names:
        for folder in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/msttcorefonts")):
            if (folder / name).exists():
                return ImageFont.truetype(str(folder / name), size)
    return ImageFont.load_default(size)


def slugify(text):  # same rule as seo/pages.mjs and src/hooks/useRoute.js
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", text.lower().replace("&", " ")))


logo = Image.open(ROOT / "src/assets/logo.png").convert("RGBA")
mark = logo.crop((0, 0, 165, 165))  # the three-piece logo mark at the left of the wordmark


def background():
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = min(1, (y / H) * 0.8 + (x / W) * 0.2)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(NAVY_TOP, NAVY_BOTTOM))
    # Wireframe globe on the right, like the website hero.
    lines = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lines)
    cx, cy, r = 930, 330, 300
    col = (141, 183, 233, 46)
    for lat in range(-75, 76, 15):
        y = cy - r * math.sin(math.radians(lat))
        rx = r * math.cos(math.radians(lat))
        d.ellipse((cx - rx, y - rx * 0.16, cx + rx, y + rx * 0.16), outline=col, width=2)
    for lon in range(0, 180, 20):
        rx = abs(r * math.cos(math.radians(lon)))
        d.ellipse((cx - rx, cy - r, cx + rx, cy + r), outline=col, width=2)
    d.ellipse((cx - r * 1.25, cy - r * 0.42, cx + r * 1.25, cy + r * 0.42), outline=(198, 185, 242, 60), width=2)
    img.paste(lines, (0, 0), lines)
    # Logo mark at the globe's centre with a soft glow.
    big = mark.resize((250, 250), Image.LANCZOS)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow.paste((116, 97, 173, 120), (cx - 125, cy - 125), big.split()[3])
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    img.paste(glow, (0, 0), glow)
    img.paste(big, (cx - 125, cy - 125), big)
    # Brand stripe along the bottom edge.
    d = ImageDraw.Draw(img)
    for i, c in enumerate(BRAND):
        d.rectangle((i * W // 3, H - 8, (i + 1) * W // 3, H), fill=c)
    # Wordmark top left.
    word = logo.resize((316, round(316 * logo.height / logo.width)), Image.LANCZOS)
    img.paste(word, (72, 58), word)
    return img


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=fnt) <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    return lines + ([line] if line else [])


def card(path, eyebrow, title_parts, subtitle):
    img = background()
    d = ImageDraw.Draw(img)
    x, max_w = 72, 640
    d.text((x, 196), eyebrow.upper(), font=font(True, 22), fill=VIOLET, spacing=0)
    title_text = " ".join(t for t, _ in title_parts)
    size = 64
    while size > 40:
        tf = font(True, size)
        lines = wrap(d, title_text, tf, max_w)
        if len(lines) <= 3:
            break
        size -= 4
    colour_of = {}
    for text, colour in title_parts:
        for w in text.split():
            colour_of.setdefault(w, colour)
    y = 240
    for line in lines:
        cx = x
        for i, w in enumerate(line.split()):
            piece = (" " if i else "") + w
            d.text((cx, y), piece, font=tf, fill=colour_of.get(w, INK))
            cx += d.textlength(piece, font=tf)
        y += round(size * 1.18)
    sf = font(False, 27)
    for line in wrap(d, subtitle, sf, max_w)[:3]:
        d.text((x, y + 16), line, font=sf, fill=MUTED)
        y += 38
    img.save(path, optimize=True)
    print("wrote", path.relative_to(ROOT))


def main():
    (OUT / "share").mkdir(parents=True, exist_ok=True)
    catalogue = json.loads((ROOT / "src/data/catalogue.json").read_text(encoding="utf-8"))
    total = sum(len(a["offerings"]) for f in catalogue for a in f["areas"])

    card(
        OUT / "share/mindsuite.png",
        f"MindSuite · {total} offerings",
        [("Architect", INK), ("Intelligence.", VIOLET), ("Integrate", INK), ("Securely.", CYAN), ("Transform", INK), ("Business.", PINK)],
        "Software, cloud, AI, cybersecurity, ERP and business systems: every offering with scope, deliverables and business value.",
    )
    for f in catalogue:
        count = sum(len(a["offerings"]) for a in f["areas"])
        card(
            OUT / f"share/{slugify(f['short'])}.png",
            f"Service family · {count} offerings",
            [(f["name"], INK)],
            f.get("tagline") or "",
        )

    # Browser and home-screen icons: the logo mark on a rounded navy tile.
    for size, name in ((32, "favicon.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
        tile = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle((0, 0, 511, 511), radius=112, fill=NAVY_TOP + (255,))
        m = mark.resize((360, 360), Image.LANCZOS)
        tile.paste(m, (76, 76), m)
        if name == "apple-touch-icon.png":  # iOS rounds the corners itself and dislikes transparency
            flat = Image.new("RGB", (512, 512), NAVY_TOP)
            flat.paste(tile, (0, 0), tile)
            tile = flat
        tile.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print("wrote", (OUT / name).relative_to(ROOT))


if __name__ == "__main__":
    main()
