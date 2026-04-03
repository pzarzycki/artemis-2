#!/usr/bin/env python3
"""
Compute Earth/Moon/Sun ephemeris data for the Artemis 2 Tracker.

Uses SPICE kernels (spiceypy) as primary source with analytical fallback.
Outputs public/data/ephemeris.json covering the Artemis 2 mission window.

Run with:
    uv run python scripts/fetch_ephemeris.py [--start 2026-09-15] [--days 14] [--step-hours 0.25]
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import ensure_dirs, download_file, DATA_DIR, KERNELS_DIR

# NAIF SPICE kernel URLs (from naif.jpl.nasa.gov)
SPICE_KERNELS = {
    "de440s.bsp": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp",
    "pck00011.tpc": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
    "naif0012.tls": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
}

# NAIF body codes
EARTH_BARYCENTER = 399
MOON_BODY = 301
SUN_BODY = 10
EARTH_BODY = 399


def dt_to_jd(dt: datetime) -> float:
    """Convert datetime (UTC) to Julian Date."""
    return dt.timestamp() / 86400.0 + 2440587.5


def jd_to_utc_str(jd: float) -> str:
    """Convert UTC Julian Date to ISO UTC string for SPICE str2et."""
    dt = datetime.fromtimestamp((jd - 2440587.5) * 86400.0, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]


def try_load_spice() -> bool:
    try:
        import spiceypy as spice  # noqa: F401
        return True
    except ImportError:
        return False


def compute_with_spice(
    start_jd: float,
    n_steps: int,
    step_hours: float,
) -> dict:
    """Compute ephemeris using SPICE kernels."""
    import spiceypy as spice

    # Download and load kernels
    print("  Loading SPICE kernels ...")
    for name, url in SPICE_KERNELS.items():
        path = download_file(url, KERNELS_DIR / name, label=name)
        spice.furnsh(str(path))

    moon_pos_eci = []
    sun_pos_eci = []
    earth_pos_bcrs = []
    gmst_rad = []
    moon_orient = []

    step_days = step_hours / 24.0

    # NAIF ID for Solar System Barycenter
    SSB = 0

    for i in range(n_steps):
        jd = start_jd + i * step_days
        # The sampling grid is defined in UTC-facing Julian Date for the app.
        # Convert each UTC sample instant to SPICE ephemeris time before querying states.
        et = spice.str2et(jd_to_utc_str(jd))

        # Moon position in GCRS J2000 (km) — observer = Earth center
        moon_state, _ = spice.spkez(MOON_BODY, et, "J2000", "NONE", EARTH_BODY)
        moon_pos_eci.append([round(moon_state[0], 3), round(moon_state[1], 3), round(moon_state[2], 3)])

        # Sun position in GCRS J2000 (km) — observer = Earth center
        sun_state, _ = spice.spkez(SUN_BODY, et, "J2000", "NONE", EARTH_BODY)
        sun_pos_eci.append([round(sun_state[0], 3), round(sun_state[1], 3), round(sun_state[2], 3)])

        # Earth position in BCRS J2000 (km from Solar System Barycenter)
        # BCRS origin = SSB (NAIF ID 0), axes = ICRF/J2000
        # This is the vector from SSB to Earth center
        earth_state, _ = spice.spkez(EARTH_BODY, et, "J2000", "NONE", SSB)
        earth_pos_bcrs.append([round(earth_state[0], 3), round(earth_state[1], 3), round(earth_state[2], 3)])

        # Earth body orientation about inertial +Z.
        # pxform("J2000", "IAU_EARTH") is an inertial->body-fixed transform,
        # so the Greenwich angle in inertial coordinates has the opposite sign.
        rot = spice.pxform("J2000", "IAU_EARTH", et)
        gmst = math.atan2(-rot[1][0], rot[0][0])
        if gmst < 0:
            gmst += 2 * math.pi
        gmst_rad.append(round(gmst, 8))  # unwrapped after loop

        # Moon orientation (IAU Moon body-fixed from J2000)
        # Use pxform to get Moon orientation
        try:
            moon_rot = spice.pxform("J2000", "IAU_MOON", et)
            # Extract pole RA, Dec, W from rotation matrix
            # For output we store the transformation matrix components as [poleRA, poleDec, W]
            # Simplified: use the Z-column direction for pole, and matrix[0][2]/[1][2] for W
            pole_ra = math.degrees(math.atan2(moon_rot[0][2], -moon_rot[1][2]))
            pole_dec = math.degrees(math.asin(moon_rot[2][2]))
            w = math.degrees(math.atan2(moon_rot[2][0], moon_rot[2][1]))
            moon_orient.append([round(pole_ra, 4), round(pole_dec, 4), round(w, 4)])
        except spice.utils.exceptions.SpiceyError:
            # If IAU_MOON frame not available, use analytical approximation
            d = jd - 2451545.0
            e1 = math.radians(125.045 - 0.0529921 * d)
            pole_ra = 269.9949 - 3.8787 * math.sin(e1)
            pole_dec = 66.5392 + 1.5419 * math.cos(e1)
            w = (38.3213 + 13.17635815 * d) % 360
            moon_orient.append([round(pole_ra, 4), round(pole_dec, 4), round(w, 4)])

    spice.kclear()
    import numpy as np
    gmst_rad_unwrapped = np.unwrap(gmst_rad).tolist()
    moon_w = [o[2] for o in moon_orient]
    moon_w_unwrapped = np.degrees(np.unwrap(np.radians(moon_w))).tolist()
    for i, o in enumerate(moon_orient):
        moon_orient[i] = [o[0], o[1], round(moon_w_unwrapped[i], 4)]
    return {
        "moonPosECI": moon_pos_eci,
        "sunPosECI": sun_pos_eci,
        "earthPosBCRS": earth_pos_bcrs,
        "gmstRad": [round(g, 8) for g in gmst_rad_unwrapped],
        "moonOrientation": moon_orient,
    }


def compute_analytical(start_jd: float, n_steps: int, step_hours: float) -> dict:
    """Analytical ephemeris (fallback, ~0.5° accuracy). No BCRS data — requires SPICE."""
    print("  Using analytical ephemeris (no SPICE) ...")

    moon_pos_eci = []
    sun_pos_eci = []
    gmst_rad = []
    moon_orient = []

    step_days = step_hours / 24.0

    for i in range(n_steps):
        jd = start_jd + i * step_days
        d = jd - 2451545.0

        # Moon position (GCRS, simplified)
        L = math.radians(218.316 + 13.176396 * d)
        M = math.radians(134.963 + 13.064993 * d)
        F = math.radians(93.272 + 13.229350 * d)
        lon = L + math.radians(6.289 * math.sin(M))
        lat = math.radians(5.128 * math.sin(F))
        dist = 385001 - 20905 * math.cos(M)
        moon_pos_eci.append([
            round(dist * math.cos(lat) * math.cos(lon), 3),
            round(dist * math.cos(lat) * math.sin(lon), 3),
            round(dist * math.sin(lat), 3),
        ])

        # Sun position (GCRS, simplified)
        g = math.radians(357.529 + 0.98560028 * d)
        q = 280.459 + 0.98564736 * d
        e_lon = math.radians(q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g))
        eps = math.radians(23.439)
        R = (1.00014 - 0.01671 * math.cos(g) - 0.00014 * math.cos(2 * g)) * 149597870.7
        sun_pos_eci.append([
            round(R * math.cos(e_lon), 3),
            round(R * math.cos(eps) * math.sin(e_lon), 3),
            round(R * math.sin(eps) * math.sin(e_lon), 3),
        ])

        # GMST (IAU 1982, corrected rate)
        jd0 = math.floor(jd - 0.5) + 0.5
        H = (jd - jd0) * 24
        T0 = (jd0 - 2451545.0) / 36525.0
        gmst0 = 24110.54841 + 8640184.812866 * T0 + 0.093104 * T0**2 - 6.2e-6 * T0**3
        gmst_sec = gmst0 + 86636.55536790872 * (H / 24)
        gmst = ((gmst_sec % 86400) / 86400) * 2 * math.pi
        if gmst < 0:
            gmst += 2 * math.pi
        gmst_rad.append(round(gmst, 8))

        # Moon orientation (IAU 2009 simplified)
        e1 = math.radians(125.045 - 0.0529921 * d)
        pole_ra = 269.9949 - 3.8787 * math.sin(e1)
        pole_dec = 66.5392 + 1.5419 * math.cos(e1)
        w = 38.3213 + 13.17635815 * d  # unwrapped (cumulative)
        moon_orient.append([round(pole_ra, 4), round(pole_dec, 4), round(w, 4)])

    import numpy as np
    gmst_rad_unwrapped = np.unwrap(gmst_rad).tolist()
    return {
        "moonPosECI": moon_pos_eci,
        "sunPosECI": sun_pos_eci,
        # earthPosBCRS omitted — SPICE required for accurate heliocentric positions
        "gmstRad": [round(g, 8) for g in gmst_rad_unwrapped],
        "moonOrientation": moon_orient,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch/compute Artemis 2 ephemeris data")
    parser.add_argument("--start", default="2026-04-01",
                        help="Mission window start date (YYYY-MM-DD, UTC)")
    parser.add_argument("--days", type=float, default=12.0,
                        help="Mission window duration in days (default: 12, covers full Artemis 2 mission)")
    parser.add_argument("--step-hours", type=float, default=0.25,
                        help="Ephemeris step in hours (default: 0.25 = 15 min)")
    parser.add_argument("--no-spice", action="store_true",
                        help="Force analytical ephemeris (skip SPICE download)")
    args = parser.parse_args()

    ensure_dirs()

    start_dt = datetime.strptime(args.start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    start_jd = dt_to_jd(start_dt)
    n_steps = int(args.days * 24 / args.step_hours) + 1

    print(f"\nComputing ephemeris: {args.start} + {args.days} days, step={args.step_hours}h ({n_steps} points)")

    use_spice = not args.no_spice and try_load_spice()

    if use_spice:
        print("  SPICE available — using high-accuracy kernels")
        try:
            data = compute_with_spice(start_jd, n_steps, args.step_hours)
        except Exception as e:
            print(f"  SPICE error: {e}")
            print("  Falling back to analytical ephemeris ...")
            data = compute_analytical(start_jd, n_steps, args.step_hours)
    else:
        data = compute_analytical(start_jd, n_steps, args.step_hours)

    output = {
        "startJD": round(start_jd, 8),
        "intervalHours": args.step_hours,
        "count": n_steps,
        "timeScale": "UTC",
        "coordinateFrame": "Earth-centered J2000/ICRF-aligned",
        "barycentricFrame": "Solar-system-barycentric J2000/ICRF-aligned",
        "earthRotationModel": "GMST-like angle sampled from SPICE J2000->IAU_EARTH transform",
        "moonOrientationModel": "SPICE IAU_MOON with analytical IAU 2009 fallback",
        **data,
    }

    out_path = DATA_DIR / "ephemeris.json"
    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / 1e6
    print(f"\n✓ Ephemeris written to {out_path} ({size_mb:.1f} MB, {n_steps} points)\n")


if __name__ == "__main__":
    main()
