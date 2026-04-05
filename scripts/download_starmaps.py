"""Download NASA SVS Deep Star Maps 2020 EXR files for local dev and Docker builds."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
STARMAPS_DIR = REPO_ROOT / "public" / "starmaps"
BASE_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851"
SUPPORTED_RESOLUTIONS = ("4k", "8k", "16k")
SUPPORTED_LAYERS = ("starmap", "hiptyc", "milkyway")
MANIFEST_PATH = STARMAPS_DIR / "manifest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download NASA SVS Deep Star Maps 2020 EXR assets into public/starmaps/."
    )
    parser.add_argument(
        "resolutions",
        nargs="*",
        choices=SUPPORTED_RESOLUTIONS,
        default=list(SUPPORTED_RESOLUTIONS),
        help="Resolutions to download. Defaults to all supported resolutions.",
    )
    parser.add_argument(
        "--layers",
        nargs="+",
        choices=SUPPORTED_LAYERS,
        default=list(SUPPORTED_LAYERS),
        help="Celestial sky layers to download. Defaults to all supported layers.",
    )
    return parser.parse_args()


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)

    if destination.exists():
        print(f"[skip] {destination.name} already exists")
        return

    tmp = destination.with_suffix(destination.suffix + ".part")
    print(f"[download] {destination.name}")

    with urllib.request.urlopen(url) as response, tmp.open("wb") as fh:
        total = int(response.headers.get("Content-Length", "0"))
        transferred = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            fh.write(chunk)
            transferred += len(chunk)
            if total:
                percent = transferred / total * 100
                print(
                    f"\r  {transferred / (1024 * 1024):7.1f} MiB / {total / (1024 * 1024):7.1f} MiB"
                    f"  ({percent:5.1f}%)",
                    end="",
                    flush=True,
                )
            else:
                print(
                    f"\r  {transferred / (1024 * 1024):7.1f} MiB",
                    end="",
                    flush=True,
                )

    tmp.replace(destination)
    print("\n  done")


def main() -> int:
    args = parse_args()

    for layer in args.layers:
        for resolution in args.resolutions:
            filename = f"{layer}_2020_{resolution}.exr"
            download(f"{BASE_URL}/{filename}", STARMAPS_DIR / filename)

    available = {
        layer: [
            resolution
            for resolution in SUPPORTED_RESOLUTIONS
            if (STARMAPS_DIR / f"{layer}_2020_{resolution}.exr").exists()
        ]
        for layer in SUPPORTED_LAYERS
    }
    MANIFEST_PATH.write_text(
        json.dumps({"available": available}, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Star maps available in {STARMAPS_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
