#!/usr/bin/env python3
"""
Download and prepare high-quality Earth and Moon texture maps for Artemis 2 Tracker.

Run with:
    uv run python scripts/download_textures.py [--quality 2K|4K|8K]

Sources:
  Earth  — Solar System Scope (CC BY 4.0) based on NASA Blue Marble / Black Marble
  Moon   — NASA SVS CGI Moon Kit (2025 LROC color + LOLA displacement for normals)

Outputs to public/assets/textures/ with canonical names expected by the frontend:
  earth_day_8k.jpg        earth_night_8k.jpg    earth_clouds_8k.jpg
  earth_normal_8k.jpg     earth_specular_8k.jpg
  moon_8k.jpg             moon_normal_8k.jpg
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from utils import RAW_CACHE_DIR, TEXTURES_DIR, download_file, ensure_dirs

# ---------------------------------------------------------------------------
# Source URLs — always highest-quality originals; we resize for lower tiers
# ---------------------------------------------------------------------------

# Earth: Solar System Scope 8K (CC BY 4.0, based on NASA Blue Marble / Black Marble)
EARTH_SOURCES = {
    "earth_day":      "https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg",
    "earth_night":    "https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg",
    "earth_clouds":   "https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg",
    # These come as 16-bit TIFF; we convert to JPG after download
    "earth_normal":   "https://www.solarsystemscope.com/textures/download/8k_earth_normal_map.tif",
    "earth_specular": "https://www.solarsystemscope.com/textures/download/8k_earth_specular_map.tif",
}

# Moon color: NASA SVS CGI Moon Kit, 2025 LROC version (16-bit sRGB TIFF → JPG)
MOON_COLOR_URL = (
    "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_8k.tif"
)
# Moon elevation (LOLA, 16px/deg, 5760×2880 unsigned 16-bit half-metres)
# Used to derive a proper tangent-space normal map via gradient computation.
MOON_DISP_URL = (
    "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif"
)

# Output pixel dimensions per quality tier
QUALITY_DIMS: dict[str, tuple[int, int]] = {
    "2K": (2048, 1024),
    "4K": (4096, 2048),
    "8K": (8192, 4096),
}

# Canonical filenames expected by the React components (always *_8k.jpg regardless of tier)
CANONICAL: list[str] = [
    "earth_day_8k.jpg",
    "earth_night_8k.jpg",
    "earth_clouds_8k.jpg",
    "earth_normal_8k.jpg",
    "earth_specular_8k.jpg",
    "moon_8k.jpg",
    "moon_normal_8k.jpg",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def tiff_to_jpg(src: Path, dest: Path, size: tuple[int, int], quality: int = 95) -> None:
    """Convert a TIFF (possibly 16-bit) to an 8-bit JPG at the requested size."""
    print(f"  [convert] {src.name} → {dest.name}  ({size[0]}×{size[1]})")
    img = Image.open(src)

    # Normalise bit depth: 16-bit → 8-bit
    if img.mode in ("I;16", "I;16B") or (img.mode == "I"):
        arr = np.array(img, dtype=np.float32)
        arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-9) * 255
        img = Image.fromarray(arr.astype(np.uint8), "L")
    elif img.mode == "RGB" and img.getextrema()[0][1] > 255:
        # Some TIFFs store 16-bit per channel in RGB mode
        arr = np.array(img, dtype=np.float32)
        arr = (arr / 65535.0 * 255).astype(np.uint8)
        img = Image.fromarray(arr, "RGB")

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    if img.size != size:
        img = img.resize(size, Image.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=quality, optimize=True)


def jpg_resize(src: Path, dest: Path, size: tuple[int, int], quality: int = 95) -> None:
    """Resize an existing JPG to the requested size and save."""
    if src == dest and tuple(Image.open(src).size) == size:
        print(f"  [skip] {dest.name} already correct size")
        return
    print(f"  [resize] {src.name} → {dest.name}  ({size[0]}×{size[1]})")
    img = Image.open(src).convert("RGB")
    if img.size != size:
        img = img.resize(size, Image.LANCZOS)
    img.save(dest, "JPEG", quality=quality, optimize=True)


def generate_normal_map(disp_path: Path, dest: Path, size: tuple[int, int]) -> None:
    """
    Generate a tangent-space normal map from a 16-bit unsigned LOLA displacement TIFF.

    The LOLA uint16 encoding stores elevation = (raw_uint16 - 20000) * 0.5 metres
    relative to the 1737.4 km reference sphere.  We care only about relative height
    for gradient computation, so the offset doesn't matter.
    """
    print(f"  [normals] computing from {disp_path.name} …")

    # Load displacement as float32 (metres)
    disp_img = Image.open(disp_path)
    disp = np.array(disp_img, dtype=np.float32) * 0.5  # half-metres → metres

    h, w = disp.shape

    # Physical scale: Moon circumference / pixel count per row
    moon_radius_m = 1_737_400.0
    metres_per_px_x = (2 * np.pi * moon_radius_m) / w
    metres_per_px_y = (np.pi * moon_radius_m) / h

    # Sobel-style finite differences (central differences, wrapping longitude)
    dzdx = (np.roll(disp, -1, axis=1) - np.roll(disp, 1, axis=1)) / (2 * metres_per_px_x)
    dzdy = (np.roll(disp, -1, axis=0) - np.roll(disp, 1, axis=0)) / (2 * metres_per_px_y)

    # Clamp extreme values at crater walls (99.9th percentile)
    limit = np.percentile(np.abs(dzdx), 99.9)
    dzdx = np.clip(dzdx, -limit, limit)
    dzdy = np.clip(dzdy, -limit, limit)

    # Build normal vectors [-dz/dx, -dz/dy, 1], then normalise
    nx = -dzdx
    ny = dzdy  # +y = north in equirect
    nz = np.ones_like(nx)
    length = np.sqrt(nx**2 + ny**2 + nz**2)
    nx /= length
    ny /= length
    nz /= length

    # Map [-1, 1] → [0, 255]  (OpenGL convention: R=X, G=Y, B=Z)
    r = ((nx + 1.0) * 0.5 * 255).astype(np.uint8)
    g = ((ny + 1.0) * 0.5 * 255).astype(np.uint8)
    b = ((nz + 1.0) * 0.5 * 255).astype(np.uint8)
    normal_img = Image.fromarray(np.stack([r, g, b], axis=-1), "RGB")

    if normal_img.size != size:
        normal_img = normal_img.resize(size, Image.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    normal_img.save(dest, "JPEG", quality=95, optimize=True)
    print(f"  [normals] saved → {dest.name}")


def make_symlink(src_name: str, alias: str) -> None:
    """Create / replace a symlink in TEXTURES_DIR."""
    alias_path = TEXTURES_DIR / alias
    if alias_path.exists() or alias_path.is_symlink():
        alias_path.unlink()
    alias_path.symlink_to(src_name)
    print(f"  {alias} → {src_name}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Download & prepare Earth/Moon textures")
    parser.add_argument(
        "--quality", choices=["2K", "4K", "8K"], default="8K",
        help="Output resolution tier (default: 8K)",
    )
    args = parser.parse_args()
    Q = args.quality
    size = QUALITY_DIMS[Q]
    w, h = size

    ensure_dirs()
    cache = RAW_CACHE_DIR
    cache.mkdir(parents=True, exist_ok=True)

    print(f"\n━━━ Artemis 2 Tracker — texture pipeline  [{Q} = {w}×{h}] ━━━\n")

    # ------------------------------------------------------------------
    # 1. Earth textures (Solar System Scope)
    # ------------------------------------------------------------------
    print("▶ Earth textures (Solar System Scope, CC BY 4.0)")

    SSS_REFERER = "https://www.solarsystemscope.com/textures/"

    for key, url in EARTH_SOURCES.items():
        raw_name = url.split("/")[-1]          # e.g. 8k_earth_daymap.jpg
        raw_path = cache / raw_name
        out_name = f"{key}_{Q.lower()}.jpg"
        out_path = TEXTURES_DIR / out_name

        if out_path.exists():
            print(f"  [skip] {out_name} already exists")
            continue

        download_file(url, raw_path, label=raw_name, referer=SSS_REFERER)

        if raw_path.suffix.lower() in (".tif", ".tiff"):
            tiff_to_jpg(raw_path, out_path, size)
        else:
            jpg_resize(raw_path, out_path, size)

    # ------------------------------------------------------------------
    # 2. Moon color (NASA LROC 2025, 8K 16-bit sRGB TIFF)
    # ------------------------------------------------------------------
    print("\n▶ Moon color (NASA SVS CGI Moon Kit 2025)")

    moon_raw = cache / "lroc_color_16bit_srgb_8k.tif"
    moon_out = TEXTURES_DIR / f"moon_{Q.lower()}.jpg"
    if moon_out.exists():
        print(f"  [skip] moon_{Q.lower()}.jpg already exists")
    else:
        download_file(MOON_COLOR_URL, moon_raw, label=moon_raw.name)
        tiff_to_jpg(moon_raw, moon_out, size)

    # ------------------------------------------------------------------
    # 3. Moon normal map (derived from NASA LOLA displacement)
    # ------------------------------------------------------------------
    print("\n▶ Moon normal map (NASA LOLA displacement, 16px/deg → gradient normals)")

    disp_raw = cache / "ldem_16_uint.tif"
    moon_normal_out = TEXTURES_DIR / f"moon_normal_{Q.lower()}.jpg"
    if moon_normal_out.exists():
        print(f"  [skip] moon_normal_{Q.lower()}.jpg already exists")
    else:
        download_file(MOON_DISP_URL, disp_raw, label=disp_raw.name)
        generate_normal_map(disp_raw, moon_normal_out, size)

    # ------------------------------------------------------------------
    # 4. Canonical symlinks (frontend always references *_8k.jpg)
    #    Only needed when Q != 8K; at 8K the files already use canonical names.
    # ------------------------------------------------------------------
    print("\n▶ Creating canonical symlinks …")
    pairs = [
        (f"earth_day_{Q.lower()}.jpg",      "earth_day_8k.jpg"),
        (f"earth_night_{Q.lower()}.jpg",    "earth_night_8k.jpg"),
        (f"earth_clouds_{Q.lower()}.jpg",   "earth_clouds_8k.jpg"),
        (f"earth_normal_{Q.lower()}.jpg",   "earth_normal_8k.jpg"),
        (f"earth_specular_{Q.lower()}.jpg", "earth_specular_8k.jpg"),
        (f"moon_{Q.lower()}.jpg",           "moon_8k.jpg"),
        (f"moon_normal_{Q.lower()}.jpg",    "moon_normal_8k.jpg"),
    ]
    for src_name, alias in pairs:
        if src_name == alias:
            print(f"  {alias} (native — no symlink needed)")
            continue
        if (TEXTURES_DIR / src_name).exists():
            make_symlink(src_name, alias)
        else:
            print(f"  [warn] {src_name} missing — skipping alias {alias}")

    # Verify all canonical files are reachable
    print("\n▶ Verification")
    all_ok = True
    for canon in CANONICAL:
        p = TEXTURES_DIR / canon
        if p.exists():
            size_kb = p.stat().st_size // 1024
            print(f"  ✓ {canon}  ({size_kb} KB)")
        else:
            print(f"  ✗ MISSING: {canon}")
            all_ok = False

    if all_ok:
        print(f"\n✓ All textures ready  [{Q}]\n")
    else:
        print("\n✗ Some textures are missing — see above\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
