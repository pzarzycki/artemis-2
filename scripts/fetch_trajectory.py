#!/usr/bin/env python3
"""
Fetch Artemis 2 spacecraft trajectory data from JPL Horizons.

Target: -1024 (Orion EM-2 / Artemis 2 crew capsule)
Source: JPL Horizons REST API, geocentric J2000, km, km/s

Outputs public/assets/data/trajectory.json.

Run with:
    uv run python scripts/fetch_trajectory.py
    uv run python scripts/fetch_trajectory.py --step-minutes 1  # higher resolution
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import ensure_dirs, DATA_DIR, download_file, KERNELS_DIR

HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"
NAIF_LSK_URL = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls"

# Confirmed JPL Horizons identifier for Artemis II / Orion EM-2.
# Horizons also accepts names such as "Artemis II" and "EM-2".
DEFAULT_HORIZONS_COMMAND = "-1024"

# Actual launch: 2026-Apr-01 22:35:12 UTC → JD 2461132.441111111
LAUNCH_JD = 2461132.441111111

# Horizons trajectory window (confirmed by probing the API):
#   Data starts: 2026-APR-02 01:58:32.305 TDB  → JD 2461132.577
#   Data ends:   2026-APR-10 23:54:07.802 TDB  → JD 2461141.496
# Use JD format to avoid URL-encoding issues with spaces in date strings.
TRAJ_START_JD = "JD2461132.584028"   # 2026-Apr-02 02:01 TDB (just after ICPS sep)
TRAJ_STOP_JD  = "JD2461141.490278"  # 2026-Apr-10 23:46 TDB (8 min before data ends)

# Real mission phase data derived from JPL OBJ_DATA / mission timeline
# All JDs computed from confirmed UTC event times
PHASES = [
    # Launch through TLI burn (Apr 1 22:35 → Apr 2 23:54 UTC)
    {"name": "Launch/Ascent/TLI",
     "startJD": 2461132.441111,   # 2026-Apr-01 22:35:12 UTC
     "endJD":   2461133.495833,   # 2026-Apr-02 23:54:00 UTC
     "color": "#ff6b6b"},
    # Outbound cruise: TLI to Moon approach (Apr 2 23:54 → Apr 6 12:00 UTC)
    {"name": "Outbound Coast",
     "startJD": 2461133.495833,
     "endJD":   2461137.000000,   # ~36h before closest approach
     "color": "#ffd166"},
    # Lunar flyby (Apr 6 12:00 → Apr 7 12:00 UTC)
    # Closest approach: Apr 6 23:06 UTC, max dist from Earth: Apr 6 23:09 UTC
    {"name": "Lunar Flyby",
     "startJD": 2461137.000000,
     "endJD":   2461138.000000,
     "color": "#00d4aa"},
    # Return coast (Apr 7 12:00 → Apr 10 22:00 UTC)
    {"name": "Return Coast",
     "startJD": 2461138.000000,
     "endJD":   2461141.416667,   # ~2026-Apr-11 22:00 UTC
     "color": "#4488cc"},
    # Reentry through splashdown (Apr 10 22:00 → Apr 11 00:17 UTC)
    {"name": "Reentry/Splashdown",
     "startJD": 2461141.416667,
     "endJD":   2461141.511806,   # 2026-Apr-11 00:17:00 UTC
     "color": "#888899"},
]


def query_horizons(command: str, start_time: str, stop_time: str, step_min: int) -> dict | None:
    """
    Query JPL Horizons for Artemis 2 ECI J2000 state vectors.

    Uses CSV_FORMAT=YES so each data record is a single comma-separated line:
      JDTDB, CalDate, X(km), Y(km), Z(km), VX(km/s), VY(km/s), VZ(km/s), LT, RG, RR
    """
    try:
        import requests

        params = {
            "format":     "json",
            "COMMAND":    command,
            "OBJ_DATA":   "NO",
            "EPHEM_TYPE": "VECTORS",
            "CENTER":     "500@399",   # Earth geocenter
            "REF_SYSTEM": "J2000",
            "REF_PLANE":  "FRAME",
            "OUT_UNITS":  "KM-S",
            "START_TIME": start_time,
            "STOP_TIME":  stop_time,
            "STEP_SIZE":  f"{step_min}m",
            "VEC_TABLE":  "2",         # position + velocity only
            "CSV_FORMAT": "YES",
        }

        print(f"  GET {HORIZONS_API}")
        print(f"  COMMAND={command}  START={start_time}  STOP={stop_time}  STEP={step_min}m")
        r = requests.get(HORIZONS_API, params=params, timeout=60)
        r.raise_for_status()
        result = r.json()

        if "error" in result:
            print(f"  Horizons error: {result['error']}")
            return None

        raw = result.get("result", "")
        return parse_horizons_csv(raw)

    except Exception as e:
        print(f"  Horizons query failed: {e}")
        return None


def tdb_jd_to_utc_jd(jd_tdb: float) -> float:
    import spiceypy as spice

    lsk_path = download_file(NAIF_LSK_URL, KERNELS_DIR / "naif0012.tls", label="naif0012.tls")
    spice.furnsh(str(lsk_path))
    try:
        et = spice.unitim(jd_tdb, "JDTDB", "ET")
        utc_str = spice.et2utc(et, "ISOC", 3)
        dt = datetime.strptime(utc_str, "%Y-%m-%dT%H:%M:%S.%f").replace(tzinfo=timezone.utc)
        return dt.timestamp() / 86400.0 + 2440587.5
    finally:
        spice.kclear()


def tdb_jds_to_utc_jds(jd_tdb_values: list[float]) -> list[float]:
    """Convert Horizons JDTDB samples to UTC-facing Julian Dates using SPICE once."""
    import spiceypy as spice

    lsk_path = download_file(NAIF_LSK_URL, KERNELS_DIR / "naif0012.tls", label="naif0012.tls")
    spice.furnsh(str(lsk_path))
    try:
        utc_jds: list[float] = []
        for jd_tdb in jd_tdb_values:
            et = spice.unitim(jd_tdb, "JDTDB", "ET")
            utc_str = spice.et2utc(et, "ISOC", 3)
            dt = datetime.strptime(utc_str, "%Y-%m-%dT%H:%M:%S.%f").replace(tzinfo=timezone.utc)
            utc_jds.append(dt.timestamp() / 86400.0 + 2440587.5)
        return utc_jds
    finally:
        spice.kclear()


def parse_horizons_csv(text: str) -> dict | None:
    """
    Parse Horizons CSV vector table.

    Between $$SOE / $$EOE, each data line has the format:
      JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ, LT, RG, RR

    Columns (0-indexed): 0=JD, 1=CalDate, 2=X, 3=Y, 4=Z, 5=VX, 6=VY, 7=VZ
    """
    lines = text.split("\n")
    in_data = False
    jd_list: list[float] = []
    pos_eci: list[list[float]] = []
    vel_eci: list[list[float]] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("$$SOE"):
            in_data = True
            continue
        if stripped.startswith("$$EOE"):
            break
        if not in_data or not stripped:
            continue
        # Skip header / comment lines that don't start with a number
        if stripped.startswith("*") or stripped.startswith("C") or stripped.startswith("S"):
            continue

        parts = [p.strip() for p in stripped.split(",")]
        if len(parts) < 8:
            continue
        try:
            jd  = float(parts[0])
            # Sanity check: valid JD for early 21st century
            if not (2451545 < jd < 2470000):
                continue
            x, y, z    = float(parts[2]), float(parts[3]), float(parts[4])
            vx, vy, vz = float(parts[5]), float(parts[6]), float(parts[7])
            jd_list.append(jd)
            pos_eci.append([round(x, 3), round(y, 3), round(z, 3)])
            vel_eci.append([round(vx, 6), round(vy, 6), round(vz, 6)])
        except (ValueError, IndexError):
            continue

    if not pos_eci:
        print("  ⚠ No data records parsed — printing first 40 chars of raw response for debug:")
        for ln in text.split("\n")[:30]:
            print(f"    {ln}")
        return None

    actual_start_jd = jd_list[0]
    actual_end_jd   = jd_list[-1]

    # Compute actual step in minutes from first two JD values
    if len(jd_list) >= 2:
        step_days = jd_list[1] - jd_list[0]
        actual_step_min = round(step_days * 24 * 60)
    else:
        actual_step_min = 5

    jd_list_utc = tdb_jds_to_utc_jds(jd_list)
    actual_start_jd = jd_list_utc[0]
    actual_end_jd = jd_list_utc[-1]
    if len(jd_list_utc) >= 2:
        step_days = jd_list_utc[1] - jd_list_utc[0]
        actual_step_min = round(step_days * 24 * 60)

    return {
        "posECI": pos_eci,
        "velECI": vel_eci,
        "count": len(pos_eci),
        "startJD": actual_start_jd,
        "endJD": actual_end_jd,
        "intervalMinutes": actual_step_min,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Artemis 2 trajectory from JPL Horizons")
    parser.add_argument("--command", default=DEFAULT_HORIZONS_COMMAND,
                        help=f"Horizons target identifier (default: {DEFAULT_HORIZONS_COMMAND})")
    parser.add_argument("--step-minutes", type=int, default=5,
                        help="Trajectory step size in minutes (default: 5)")
    parser.add_argument("--start", default=TRAJ_START_JD,
                        help=f"Start time JD (default: {TRAJ_START_JD})")
    parser.add_argument("--stop",  default=TRAJ_STOP_JD,
                        help=f"Stop time JD (default: {TRAJ_STOP_JD})")
    args = parser.parse_args()

    ensure_dirs()

    print(f"\n{'='*60}")
    print(f"Artemis 2 trajectory fetch — JPL Horizons target {args.command}")
    print(f"  Start: {args.start}")
    print(f"  Stop:  {args.stop}")
    print(f"  Step:  {args.step_minutes} min")
    print(f"{'='*60}")

    try:
        import spiceypy  # noqa: F401
    except ModuleNotFoundError as e:
        print(f"  ✗ Missing required dependency for JDTDB->UTC conversion: {e}")
        sys.exit(1)

    traj_data = query_horizons(args.command, args.start, args.stop, args.step_minutes)

    if traj_data is None:
        print("\n✗ Horizons returned no data. Cannot proceed without real trajectory.")
        print(f"  Check that Horizons target {args.command!r} has published ephemeris coverage.")
        sys.exit(1)

    print(f"\n  ✓ Parsed {traj_data['count']} points")
    print(f"  JD range: {traj_data['startJD']:.6f} → {traj_data['endJD']:.6f}")

    output = {
        "launchJD":        round(LAUNCH_JD, 9),
        "startJD":         round(traj_data["startJD"], 9),
        "endJD":           round(traj_data["endJD"],   9),
        "intervalMinutes": traj_data["intervalMinutes"],
        "count":           traj_data["count"],
        "timeScale":       "UTC",
        "coordinateFrame": "Earth-centered J2000/ICRF-aligned",
        "trajectorySource": (
            f"JPL Horizons vectors for COMMAND={args.command}, CENTER=500@399, "
            "REF_SYSTEM=J2000, REF_PLANE=FRAME, OUT_UNITS=KM-S"
        ),
        "sourceTimeScale": "JDTDB from Horizons vectors, converted to UTC-facing JD grid for app playback",
        "phases":          PHASES,
        "posECI":          traj_data["posECI"],
        "velECI":          traj_data["velECI"],
    }

    out_path = DATA_DIR / "trajectory.json"
    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / 1e6
    print(f"\n✓ Trajectory written to {out_path} ({size_mb:.2f} MB, {traj_data['count']} points)\n")


if __name__ == "__main__":
    main()
