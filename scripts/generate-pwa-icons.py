#!/usr/bin/env python3
"""Regenerate StretchBreak PWA icons (192 / 512 / apple-touch). Requires Pillow."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"
TEAL = (12, 124, 116, 255)
CREAM = (244, 247, 246, 255)
SUN = (227, 155, 46, 255)


def make_icon(size: int, path: Path) -> None:
    radius = int(size * 0.22)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg.paste(Image.new("RGBA", (size, size), TEAL), mask=mask)
    draw = ImageDraw.Draw(bg)

    stroke = max(2, size // 14)
    pad = size * 0.22
    draw.arc([pad, size * 0.28, size - pad, size * 0.95], start=200, end=340, fill=CREAM, width=stroke)
    stroke2 = max(1, size // 20)
    pad2 = size * 0.30
    draw.arc(
        [pad2, size * 0.38, size - pad2, size * 0.92],
        start=205,
        end=335,
        fill=(244, 247, 246, 140),
        width=stroke2,
    )

    sun_r = int(size * 0.10)
    sun_cx, sun_cy = int(size * 0.73), int(size * 0.30)
    draw.ellipse([sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r], fill=SUN)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", int(size * 0.28))
    except OSError:
        font = ImageFont.load_default()
    text = "SB"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, size * 0.52 - th / 2), text, fill=CREAM, font=font)
    bg.save(path, "PNG")
    print(f"Wrote {path} ({size}x{size})")


if __name__ == "__main__":
    make_icon(192, OUT / "icon-192.png")
    make_icon(512, OUT / "icon-512.png")
    make_icon(180, OUT / "apple-touch-icon.png")
