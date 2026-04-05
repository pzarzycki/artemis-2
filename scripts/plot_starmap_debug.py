"""Render a local NASA sky EXR to PNG and overlay known J2000 objects.

This is a validation aid for the raw map asset itself, independent of the WebGL
sky-sphere registration logic.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import OpenEXR
import Imath
from matplotlib.patheffects import withStroke


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs" / "debug"

# SIMBAD ICRS / J2000 coordinates.
OBJECTS = [
    {"name": "M31", "ra_deg": 10.684708, "dec_deg": 41.268750, "color": "#ff5a5f"},
    {"name": "M33", "ra_deg": 23.462069, "dec_deg": 30.660175, "color": "#ffa94d"},
    {"name": "MW Center", "ra_deg": 266.416817, "dec_deg": -29.007825, "color": "#f783ac"},
    {"name": "Vega", "ra_deg": 279.234735, "dec_deg": 38.783689, "color": "#4dabf7"},
    {"name": "Deneb", "ra_deg": 310.357980, "dec_deg": 45.280339, "color": "#74c0fc"},
    {"name": "Betelgeuse", "ra_deg": 88.792939, "dec_deg": 7.407064, "color": "#ffd43b"},
    {"name": "Sirius", "ra_deg": 101.287155, "dec_deg": -16.716116, "color": "#63e6be"},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "inputs",
        nargs="*",
        help="EXR files to render. Defaults to local 4k hiptyc and starmap assets if present.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for rendered debug PNGs.",
    )
    return parser.parse_args()


def read_exr_rgb(path: Path) -> np.ndarray:
    exr = OpenEXR.InputFile(str(path))
    data_window = exr.header()["dataWindow"]
    width = data_window.max.x - data_window.min.x + 1
    height = data_window.max.y - data_window.min.y + 1
    pixel_type = Imath.PixelType(Imath.PixelType.FLOAT)

    channels = []
    for name in ("R", "G", "B"):
        raw = exr.channel(name, pixel_type)
        channels.append(np.frombuffer(raw, dtype=np.float32).reshape(height, width))

    return np.stack(channels, axis=-1)


def tonemap(image: np.ndarray) -> np.ndarray:
    finite = np.clip(image, 0, None)
    scale = np.quantile(finite, 0.995)
    if not np.isfinite(scale) or scale <= 0:
        scale = 1.0
    normalized = finite / scale
    mapped = normalized / (1.0 + normalized)
    return np.power(np.clip(mapped, 0, 1), 1 / 2.2)


def ra_dec_to_pixel(width: int, height: int, ra_deg: float, dec_deg: float) -> tuple[float, float]:
    x = ((0.5 - (ra_deg / 360.0)) % 1.0) * width
    y = (0.5 - (dec_deg / 180.0)) * height
    return x, y


def render_overlay(input_path: Path, output_dir: Path) -> Path:
    rgb = tonemap(read_exr_rgb(input_path))
    height, width, _ = rgb.shape

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{input_path.stem}_debug.png"

    fig, ax = plt.subplots(figsize=(16, 9), dpi=160)
    ax.imshow(rgb, origin="upper")

    for ra_deg in range(0, 360, 30):
        x, _ = ra_dec_to_pixel(width, height, ra_deg, 0)
        ax.axvline(x, color=(1, 1, 1, 0.12), linewidth=0.6)
        ax.text(
            x + 6,
            18,
            f"RA {ra_deg}°",
            color="white",
            fontsize=7,
            path_effects=[withStroke(linewidth=2, foreground="black")],
        )

    for dec_deg in range(-60, 90, 30):
        _, y = ra_dec_to_pixel(width, height, 0, dec_deg)
        ax.axhline(y, color=(1, 1, 1, 0.12), linewidth=0.6)
        ax.text(
            10,
            y - 6,
            f"Dec {dec_deg:+d}°",
            color="white",
            fontsize=7,
            path_effects=[withStroke(linewidth=2, foreground="black")],
        )

    for item in OBJECTS:
        x, y = ra_dec_to_pixel(width, height, item["ra_deg"], item["dec_deg"])
        ax.scatter(
            x,
            y,
            s=150,
            facecolors="none",
            edgecolors=item["color"],
            linewidths=1.8,
            zorder=5,
        )
        ax.text(
            x + 10,
            y - 10,
            f'{item["name"]}\nRA {item["ra_deg"]:.3f}°\nDec {item["dec_deg"]:.3f}°',
            color=item["color"],
            fontsize=8,
            va="bottom",
            ha="left",
            path_effects=[withStroke(linewidth=2.5, foreground="black")],
        )

    ax.set_title(
        f"{input_path.name} | celestial plate carree | center RA 0h | RA increases left",
        color="white",
        fontsize=12,
        pad=12,
    )
    ax.set_xticks([])
    ax.set_yticks([])
    fig.patch.set_facecolor("black")
    ax.set_facecolor("black")
    fig.tight_layout()
    fig.savefig(output_path, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)
    return output_path


def main() -> int:
    args = parse_args()
    inputs = [Path(p) for p in args.inputs]
    if not inputs:
        candidates = [
            REPO_ROOT / "public" / "starmaps" / "hiptyc_2020_4k.exr",
            REPO_ROOT / "public" / "starmaps" / "starmap_2020_4k.exr",
        ]
        inputs = [path for path in candidates if path.exists()]

    if not inputs:
        raise SystemExit("No EXR inputs found.")

    for input_path in inputs:
        output_path = render_overlay(input_path, args.output_dir)
        print(output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
