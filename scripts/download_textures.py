#!/usr/bin/env python3
"""
Download Earth and Moon texture maps for the Artemis 2 Tracker.

Run with:
    uv run python scripts/download_textures.py [--quality 2K|4K|8K]

Outputs to public/textures/:
  earth_day_{Q}.jpg       — NASA Blue Marble day texture
  earth_night_{Q}.jpg     — NASA Black Marble city lights
  earth_normal_{Q}.jpg    — Earth surface normal map
  earth_specular_{Q}.jpg  — Earth ocean specular map
  moon_{Q}.jpg            — Moon LROC albedo
  moon_normal_{Q}.jpg     — Moon normal map
"""

import argparse
import sys
from pathlib import Path

# Allow running from repo root or scripts/
sys.path.insert(0, str(Path(__file__).parent))
from utils import ensure_dirs, download_file, TEXTURES_DIR


# Texture source URLs by quality tier
TEXTURE_SOURCES: dict[str, dict[str, str]] = {
    "2K": {
        "earth_day": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
        "earth_night": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
        "earth_normal": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
        "earth_specular": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
        "moon": "https://raw.githubusercontent.com/nicktacular/WebGL-Globe/master/globe/textures/moon-2k.jpg",
        "moon_normal": "",  # fallback: generated flat normal map below
    },
    "4K": {
        # NASA Visible Earth 4K-equivalent (publicly available)
        "earth_day": "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200412.3x5400x2700.jpg",
        "earth_night": "https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144897/BlackMarble_2016_3km_geo_gray.jpg",
        "earth_normal": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
        "earth_specular": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
        "moon": "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.jpg",
        "moon_normal": "",
    },
    "8K": {
        "earth_day": "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200412.3x21600x10800.jpg",
        "earth_night": "https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144897/BlackMarble_2016_01deg_geo.jpg",
        "earth_normal": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
        "earth_specular": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
        "moon": "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.jpg",
        "moon_normal": "",
    },
}

# Key-to-output-filename mapping
FILENAME_MAP = {
    "earth_day":     "earth_day_{Q}.jpg",
    "earth_night":   "earth_night_{Q}.jpg",
    "earth_normal":  "earth_normal_{Q}.jpg",
    "earth_specular": "earth_specular_{Q}.jpg",
    "moon":          "moon_{Q}.jpg",
    "moon_normal":   "moon_normal_{Q}.jpg",
}

# Symlinks that Scene.tsx expects (without quality suffix)
ALIASES = {
    "earth_day_{Q}.jpg":     "earth_day_8k.jpg",
    "earth_night_{Q}.jpg":   "earth_night_8k.jpg",
    "earth_normal_{Q}.jpg":  "earth_normal_8k.jpg",
    "earth_specular_{Q}.jpg": "earth_specular_8k.jpg",
    "moon_{Q}.jpg":          "moon_8k.jpg",
    "moon_normal_{Q}.jpg":   "moon_normal_8k.jpg",
}


def generate_flat_normal_map(dest: Path, width: int = 1024, height: int = 512) -> None:
    """Generate a neutral flat normal map (all normals pointing out) as PNG."""
    try:
        import numpy as np
        from PIL import Image  # type: ignore
        arr = np.full((height, width, 3), [128, 128, 255], dtype=np.uint8)
        Image.fromarray(arr, "RGB").save(dest)
        print(f"  [generated] flat normal map -> {dest.name}")
    except ImportError:
        print("  [skip] Pillow not available for normal map generation")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Earth/Moon textures")
    parser.add_argument("--quality", choices=["2K", "4K", "8K"], default="4K",
                        help="Texture resolution (default: 4K)")
    args = parser.parse_args()
    Q = args.quality

    ensure_dirs()
    sources = TEXTURE_SOURCES[Q]

    print(f"\nDownloading {Q} textures to {TEXTURES_DIR}\n")

    downloaded: list[Path] = []
    for key, url in sources.items():
        fname = FILENAME_MAP[key].replace("{Q}", Q.lower())
        dest = TEXTURES_DIR / fname
        if not url:
            if "normal" in key and not dest.exists():
                generate_flat_normal_map(dest)
            continue
        downloaded.append(download_file(url, dest, label=fname))

    # Create canonical symlinks/copies expected by the frontend
    print("\nCreating aliases for frontend ...")
    for template, alias in ALIASES.items():
        src_name = template.replace("{Q}", Q.lower())
        src = TEXTURES_DIR / src_name
        alias_path = TEXTURES_DIR / alias
        if not src.exists():
            continue
        if alias_path.exists() or alias_path.is_symlink():
            alias_path.unlink()
        try:
            alias_path.symlink_to(src_name)
            print(f"  {alias} -> {src_name}")
        except Exception as e:
            print(f"  [warn] Could not create symlink {alias}: {e}")

    print(f"\n✓ Texture download complete ({Q})\n")


if __name__ == "__main__":
    main()
