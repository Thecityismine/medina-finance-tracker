"""
Generate PWA / Apple Touch icons from M-Logo.png.
Knocks out the white background, centres the logo on #000000 with 12% safe margin,
then exports fully-opaque PNGs at 180, 192, and 512 px.
"""
from pathlib import Path
from PIL import Image
import numpy as np

base = Path(__file__).resolve().parent.parent
pub  = base / "public"
src_path = pub / "M-Logo.png"

# ── 1. Load source & knock out white background ─────────────────────────────
src  = Image.open(src_path).convert("RGBA")
data = np.array(src, dtype=np.float32)

r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]

# Whiteness = min channel — high only when all three channels are bright (white/near-white)
whiteness = np.minimum(r, np.minimum(g, b))

# Linear ramp: whiteness 210 → 240 maps alpha 255 → 0
lo, hi    = 210.0, 240.0
alpha_factor = 1.0 - np.clip((whiteness - lo) / (hi - lo), 0.0, 1.0)
data[:, :, 3] = (alpha_factor * 255).astype(np.uint8)

logo_rgba = Image.fromarray(data.astype(np.uint8), "RGBA")

# ── 2. Compose 1024×1024 master on pure-black background ────────────────────
MASTER    = 1024
MARGIN    = int(MASTER * 0.12)   # 12% safe zone ≈ 123 px each side
LOGO_SIZE = MASTER - 2 * MARGIN  # ≈ 778 px

logo_sized = logo_rgba.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
canvas     = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 255))
canvas.paste(logo_sized, (MARGIN, MARGIN), logo_sized)

# Flatten → fully opaque RGB
master = canvas.convert("RGB")
master.save(pub / "master-1024.png", "PNG")
print("OK master-1024.png")

# ── 3. Export final icons ────────────────────────────────────────────────────
exports = [
    ("apple-touch-icon.png", 180),
    ("icon-192.png",         192),
    ("icon-512.png",         512),
]

for name, size in exports:
    img  = master.resize((size, size), Image.LANCZOS)
    # Guarantee alpha = 255 everywhere
    arr  = np.array(img.convert("RGBA"))
    arr[:, :, 3] = 255
    Image.fromarray(arr, "RGBA").convert("RGB").save(pub / name, "PNG")
    print(f"OK {name}  ({size}x{size})")

print("All icons generated.")
