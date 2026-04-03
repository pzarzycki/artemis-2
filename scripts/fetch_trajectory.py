#!/usr/bin/env python3
"""
Fetch / generate Artemis 2 spacecraft trajectory data.

Primary source: JPL Horizons REST API (when spacecraft data is available).
Fallback: Simulated free-return trajectory for pre-launch planning.

Outputs public/data/trajectory.json with ECI J2000 positions/velocities.

Run with:
    uv run python scripts/fetch_trajectory.py [--source horizons|simulated]
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import ensure_dirs, DATA_DIR

# JPL Horizons REST API endpoint
HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"

# Artemis 2 / Orion spacecraft Horizons target
# NOTE: This ID (-91) is a placeholder. The actual Artemis 2 NAIF ID will be
# assigned by JPL when trajectory data becomes available.
ARTEMIS2_HORIZONS_ID = "-91"

# Mission epoch (placeholder — update when confirmed)
LAUNCH_JD = 2461300.5  # ~2026-09-15 00:00 UTC (notional)
MISSION_DURATION_DAYS = 10.3  # ~10.3 day mission for Artemis 2

PHASES = [
    {"name": "Launch/TLI", "startDayOffset": 0.0,  "endDayOffset": 0.25,  "color": "#ff6b6b"},
    {"name": "Outbound",   "startDayOffset": 0.25,  "endDayOffset": 4.0,   "color": "#ffd166"},
    {"name": "Lunar",      "startDayOffset": 4.0,   "endDayOffset": 7.5,   "color": "#00d4aa"},
    {"name": "Return",     "startDayOffset": 7.5,   "endDayOffset": 10.0,  "color": "#4488cc"},
    {"name": "Reentry",    "startDayOffset": 10.0,  "endDayOffset": 10.3,  "color": "#888899"},
]


def query_horizons(start_jd: float, end_jd: float, step_min: int) -> dict | None:
    """Query JPL Horizons for Artemis 2 state vectors in J2000 ECI."""
    try:
        import requests

        start_dt = datetime.fromtimestamp((start_jd - 2440587.5) * 86400, tz=timezone.utc)
        end_dt   = datetime.fromtimestamp((end_jd   - 2440587.5) * 86400, tz=timezone.utc)

        params = {
            "format": "json",
            "COMMAND": ARTEMIS2_HORIZONS_ID,
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "VECTORS",
            "CENTER": "500@399",   # Geocenter
            "REF_FRAME": "J2000",
            "REF_SYSTEM": "ICRF",
            "START_TIME": start_dt.strftime("%Y-%b-%d %H:%M"),
            "STOP_TIME":  end_dt.strftime("%Y-%b-%d %H:%M"),
            "STEP_SIZE": f"{step_min}m",
            "VEC_TABLE": "2",      # Position + velocity
            "CSV_FORMAT": "NO",
        }

        r = requests.get(HORIZONS_API, params=params, timeout=30)
        r.raise_for_status()
        result = r.json()

        if "error" in result:
            print(f"  Horizons error: {result['error']}")
            return None

        return parse_horizons_response(result.get("result", ""), start_jd)

    except Exception as e:
        print(f"  Horizons query failed: {e}")
        return None


def parse_horizons_response(text: str, start_jd: float) -> dict | None:
    """Parse Horizons vector table output into trajectory arrays."""
    lines = text.split("\n")
    in_data = False
    pos_eci = []
    vel_eci = []

    for line in lines:
        line = line.strip()
        if line.startswith("$$SOE"):
            in_data = True
            continue
        if line.startswith("$$EOE"):
            break
        if not in_data or not line:
            continue

        parts = line.split(",") if "," in line else line.split()
        if len(parts) < 7:
            continue
        try:
            x, y, z = float(parts[2]), float(parts[3]), float(parts[4])
            vx, vy, vz = float(parts[5]), float(parts[6]), float(parts[7])
            pos_eci.append([round(x, 3), round(y, 3), round(z, 3)])
            vel_eci.append([round(vx, 6), round(vy, 6), round(vz, 6)])
        except (ValueError, IndexError):
            continue

    if not pos_eci:
        return None

    return {"posECI": pos_eci, "velECI": vel_eci, "count": len(pos_eci)}


def simulate_trajectory(
    launch_jd: float,
    duration_days: float,
    step_min: int,
) -> dict:
    """
    Generate a simulated Artemis 2 free-return trajectory.

    This is a simplified analytical model for visualisation purposes:
    - Launches from LEO (~200 km altitude)
    - Trans-Lunar Injection (TLI) burn
    - Free-return trajectory around the Moon
    - Transearth Injection (TEI) and reentry

    NOT suitable for flight planning — replace with real Horizons data
    when available.
    """
    print("  Generating simulated free-return trajectory ...")

    EARTH_RADIUS = 6371.0  # km
    MOON_RADIUS = 1737.4   # km
    AU = 149597870.7        # km

    step_days = step_min / (24 * 60)
    n = int(duration_days / step_days) + 1

    # Orbital mechanics constants
    EARTH_GM = 398600.4418   # km³/s²
    MOON_GM  = 4902.8001     # km³/s²
    MOON_MEAN_DIST = 384400  # km

    # Moon position (simplified circular orbit)
    moon_angular_velocity = 2 * math.pi / (27.321 * 86400)  # rad/s

    pos_eci = []
    vel_eci = []

    for i in range(n):
        t_days = i * step_days
        t_sec = t_days * 86400

        # Fractional mission progress
        frac = t_days / duration_days

        # Moon position at this time (simplified circular orbit in ecliptic)
        moon_angle = math.radians(218.316) + moon_angular_velocity * t_sec
        moon_x = MOON_MEAN_DIST * math.cos(moon_angle)
        moon_y = MOON_MEAN_DIST * math.sin(moon_angle)
        moon_z = 0.0  # simplified: no inclination

        if frac < 0.025:
            # Pre-TLI: parking orbit at ~200 km
            alt = 200  # km
            r = EARTH_RADIUS + alt
            omega = math.sqrt(EARTH_GM / r**3)  # rad/s
            theta = omega * t_sec
            x = r * math.cos(theta)
            y = r * math.sin(theta)
            z = 0.0
            vx = -r * omega * math.sin(theta)
            vy =  r * omega * math.cos(theta)
            vz = 0.0

        elif frac < 0.35:
            # Outbound coast (TLI to Moon): simple cubic interpolation
            t_frac = (frac - 0.025) / (0.35 - 0.025)
            # Start: LEO position, end: approach Moon from 40000 km out
            approach_dist = 40000  # km from Moon center
            approach_x = moon_x - approach_dist * math.cos(moon_angle)
            approach_y = moon_y - approach_dist * math.sin(moon_angle)
            leo_r = EARTH_RADIUS + 200

            # Cubic Hermite interpolation
            h = t_frac
            x = (1 - h)**2 * (1 + 2*h) * leo_r + h**2 * (3 - 2*h) * approach_x
            y = (1 - h)**2 * (1 + 2*h) * 0    + h**2 * (3 - 2*h) * approach_y
            z = 0.0

            # Approximate velocity (finite difference)
            dt_next = min(t_frac + 0.01, 1.0)
            xn = (1 - dt_next)**2 * (1 + 2*dt_next) * leo_r + dt_next**2 * (3 - 2*dt_next) * approach_x
            yn = (1 - dt_next)**2 * (1 + 2*dt_next) * 0    + dt_next**2 * (3 - 2*dt_next) * approach_y
            dt_t = (0.01 * (0.35 - 0.025) * 86400) or 1
            vx = (xn - x) / dt_t * 86400
            vy = (yn - y) / dt_t * 86400
            vz = 0.0

        elif frac < 0.65:
            # Lunar flyby / free-return arc around Moon
            t_frac = (frac - 0.35) / (0.65 - 0.35)
            # Hyperbolic trajectory around Moon
            periapsis = 8000  # km from Moon center
            theta_max = math.pi * 1.2  # swing-around angle
            theta = (t_frac - 0.5) * theta_max
            r = periapsis / (1 - 0.9 * math.cos(theta + math.pi))
            r = max(r, periapsis)
            # Position relative to Moon
            dx = r * math.cos(theta + moon_angle + math.pi)
            dy = r * math.sin(theta + moon_angle + math.pi)
            x = moon_x + dx
            y = moon_y + dy
            z = 0.0
            # Orbital velocity around Moon
            v_mag = math.sqrt(MOON_GM * (2/r - 2/periapsis) + 2 * MOON_GM / periapsis)
            v_mag = min(v_mag, 3.0)  # cap for stability
            vx = -v_mag * math.sin(theta + moon_angle + math.pi)
            vy =  v_mag * math.cos(theta + moon_angle + math.pi)
            vz = 0.0

        elif frac < 0.97:
            # Return coast (Moon to Earth)
            t_frac = (frac - 0.65) / (0.97 - 0.65)
            moon_x_past = moon_x
            moon_y_past = moon_y
            target_r = EARTH_RADIUS + 200

            x = (1 - t_frac)**2 * (1 + 2*t_frac) * (moon_x_past + 8000) + t_frac**2 * (3 - 2*t_frac) * target_r
            y = (1 - t_frac)**2 * (1 + 2*t_frac) * (moon_y_past) + t_frac**2 * (3 - 2*t_frac) * 0
            z = 0.0
            dt_t = step_days * 86400
            vx = (x - pos_eci[-1][0]) / dt_t if pos_eci else 0.0
            vy = (y - pos_eci[-1][1]) / dt_t if pos_eci else 0.0
            vz = 0.0

        else:
            # Reentry and splashdown — spiral down
            t_frac = (frac - 0.97) / (1.0 - 0.97)
            alt = max(0, 200 * (1 - t_frac))
            r = EARTH_RADIUS + alt
            omega = math.sqrt(EARTH_GM / max(r, EARTH_RADIUS)**3)
            theta = omega * t_sec
            x = r * math.cos(theta)
            y = r * math.sin(theta)
            z = 0.0
            vx = 0.0
            vy = 0.0
            vz = 0.0

        pos_eci.append([round(x, 3), round(y, 3), round(z, 3)])
        vel_eci.append([round(vx, 6), round(vy, 6), round(vz, 6)])

    return {"posECI": pos_eci, "velECI": vel_eci, "count": n}


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Artemis 2 trajectory data")
    parser.add_argument(
        "--source", choices=["horizons", "simulated", "auto"], default="auto",
        help="Data source: horizons, simulated, or auto (try Horizons, fallback to simulated)"
    )
    parser.add_argument("--launch-jd", type=float, default=LAUNCH_JD,
                        help=f"Launch epoch as Julian Date (default: {LAUNCH_JD})")
    parser.add_argument("--duration-days", type=float, default=MISSION_DURATION_DAYS,
                        help=f"Mission duration in days (default: {MISSION_DURATION_DAYS})")
    parser.add_argument("--step-minutes", type=int, default=5,
                        help="Trajectory step size in minutes (default: 5)")
    args = parser.parse_args()

    ensure_dirs()

    launch_jd = args.launch_jd
    end_jd = launch_jd + args.duration_days

    print(f"\nFetching trajectory: {args.duration_days}d from JD {launch_jd:.2f}, step={args.step_minutes}min")

    traj_data = None

    if args.source in ("horizons", "auto"):
        print("  Querying JPL Horizons ...")
        traj_data = query_horizons(launch_jd, end_jd, args.step_minutes)
        if traj_data:
            print(f"  ✓ Horizons returned {traj_data['count']} points")

    if traj_data is None:
        if args.source == "horizons":
            print("  Horizons query returned no data — abort (use --source simulated for fallback)")
            sys.exit(1)
        traj_data = simulate_trajectory(launch_jd, args.duration_days, args.step_minutes)

    # Build phase list with JD times
    phases = []
    for ph in PHASES:
        phases.append({
            "name": ph["name"],
            "startJD": round(launch_jd + ph["startDayOffset"], 8),
            "endJD":   round(launch_jd + ph["endDayOffset"],   8),
            "color":   ph["color"],
        })

    output = {
        "startJD": round(launch_jd, 8),
        "endJD":   round(end_jd, 8),
        "intervalMinutes": args.step_minutes,
        "count": traj_data["count"],
        "phases": phases,
        "posECI": traj_data["posECI"],
        "velECI": traj_data["velECI"],
    }

    out_path = DATA_DIR / "trajectory.json"
    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / 1e6
    print(f"\n✓ Trajectory written to {out_path} ({size_mb:.2f} MB, {traj_data['count']} points)\n")


if __name__ == "__main__":
    main()
