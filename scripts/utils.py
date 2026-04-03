"""Shared utilities for Artemis 2 data pipeline scripts."""

from pathlib import Path

# Repo root (scripts/ is one level below)
REPO_ROOT = Path(__file__).parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
TEXTURES_DIR = PUBLIC_DIR / "textures"
DATA_DIR = PUBLIC_DIR / "data"
KERNELS_DIR = Path(__file__).parent / "kernels"


def ensure_dirs() -> None:
    """Create output directories if they don't exist."""
    TEXTURES_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    KERNELS_DIR.mkdir(parents=True, exist_ok=True)


def download_file(url: str, dest: Path, label: str = "", referer: str = "") -> Path:
    """Download a file with progress display, skip if already exists.

    Sends browser-like headers to satisfy hotlink protection on sites like
    Solar System Scope and NASA SVS.
    """
    import requests
    from tqdm import tqdm

    if dest.exists():
        print(f"  [skip] {dest.name} already exists")
        return dest

    label = label or dest.name
    print(f"  [download] {label} ...")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0"
        ),
        "Accept": "image/tiff,image/jpeg,image/png,image/*,*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer

    r = requests.get(url, stream=True, timeout=300, headers=headers)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True, desc=label) as bar:
        for chunk in r.iter_content(chunk_size=65536):
            f.write(chunk)
            bar.update(len(chunk))
    return dest
