#!/usr/bin/env python3
"""
Artemis 2 Tracker — comprehensive headless visual test suite.

Generates PNG charts covering ALL calculations, data sources and assumptions.
Images are saved to scripts/test_plots/ and inspected programmatically.

Run with:
    uv run python scripts/test_visualize.py

Plots generated:
  01_trajectory_3d_projections.png  — 3-D shape + XY/XZ/YZ projections
  02_trajectory_physics.png         — distance, speed, altitude, energy
  03_trajectory_groundtrack.png     — sub-spacecraft lat/lon on Mollweide map
  04_ephemeris_moon.png             — Moon position, distance, velocity
  05_ephemeris_sun_gmst.png         — Sun direction, GMST rate
  06_coordinate_transforms.png      — KSC round-trip ECI↔ECEF, rotation rate
  07_moon_orientation.png           — IAU 2009 pole RA/Dec, W angle
  08_time_system.png                — JD↔UTC roundtrip, MET, sidereal day rate
  09_phase_timeline.png             — mission phases + key event markers
  10_interpolation_quality.png      — Catmull-Rom accuracy vs linear
"""

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # headless — no display needed
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT      = Path(__file__).parent.parent
DATA_DIR  = ROOT / "public" / "data"
OUT_DIR   = Path(__file__).parent / "test_plots"
OUT_DIR.mkdir(exist_ok=True)

TRAJ_FILE     = DATA_DIR / "trajectory.json"
EPHEMERIS_FILE = DATA_DIR / "ephemeris.json"

# ── Physical / mission constants ──────────────────────────────────────────────
EARTH_RADIUS_KM   = 6371.0
MOON_RADIUS_KM    = 1737.4
MOON_MEAN_DIST_KM = 384_400.0
EARTH_GM          = 398_600.4418   # km³/s²
MOON_GM           = 4_902.8001
J2000_JD          = 2_451_545.0
OBLIQUITY_RAD     = 23.4392911 * math.pi / 180

LAUNCH_JD = 2461132.441111111   # 2026-Apr-01 22:35:12 UTC

# Key event JDs (from JPL OBJ_DATA + mission timeline)
EVENTS = {
    "Launch":          2461132.441111,
    "TLI start":       2461133.492361,
    "TLI end":         2461133.495833,
    "Moon closest":    2461137.462500,
    "Max Earth dist":  2461137.464583,
    "Splashdown":      2461141.511806,
}

PHASE_COLORS = {
    "Launch/Ascent/TLI": "#ff6b6b",
    "Outbound Coast":    "#ffd166",
    "Lunar Flyby":       "#00d4aa",
    "Return Coast":      "#4488cc",
    "Reentry/Splashdown":"#888899",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def jd_to_utc(jd: float) -> datetime:
    return datetime.fromtimestamp((jd - 2440587.5) * 86400, tz=timezone.utc)

def jd_to_met_hours(jd: float) -> float:
    return (jd - LAUNCH_JD) * 24.0

def gmst_rad(jd: float) -> float:
    """IAU 1982 GMST in radians."""
    jd0 = math.floor(jd - 0.5) + 0.5
    H   = (jd - jd0) * 24.0
    T0  = (jd0 - J2000_JD) / 36525.0
    gmst0 = (24110.54841 + 8640184.812866 * T0
             + 0.093104 * T0**2 - 6.2e-6 * T0**3)
    gmst_s = gmst0 + 86164.09054 * (H / 24.0)
    rad = ((gmst_s % 86400) / 86400) * 2 * math.pi
    return rad if rad >= 0 else rad + 2 * math.pi

def eci_to_ecef(x, y, z, gmst):
    c, s = math.cos(gmst), math.sin(gmst)
    return (c*x + s*y,  -s*x + c*y,  z)

def ecef_to_latlon(x, y, z):
    lat = math.degrees(math.atan2(z, math.sqrt(x*x + y*y)))
    lon = math.degrees(math.atan2(y, x))
    return lat, lon

def vec_len(v):
    return math.sqrt(sum(c*c for c in v))

def style_fig(fig, title):
    fig.patch.set_facecolor("#0a0a12")
    fig.suptitle(title, color="white", fontsize=13, fontweight="bold", y=0.99)

def style_ax(ax, title="", xlabel="", ylabel=""):
    ax.set_facecolor("#111120")
    ax.tick_params(colors="#aaaacc")
    ax.spines["bottom"].set_color("#334")
    ax.spines["top"].set_color("#334")
    ax.spines["left"].set_color("#334")
    ax.spines["right"].set_color("#334")
    if title:  ax.set_title(title,  color="#ccccff", fontsize=9)
    if xlabel: ax.set_xlabel(xlabel, color="#8888aa", fontsize=8)
    if ylabel: ax.set_ylabel(ylabel, color="#8888aa", fontsize=8)
    ax.grid(True, color="#222233", linewidth=0.5, linestyle="--")

def save(fig, name):
    path = OUT_DIR / name
    fig.savefig(path, dpi=120, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  Saved: {path.name}")
    return path

# ── Load data ─────────────────────────────────────────────────────────────────
def load_trajectory():
    if not TRAJ_FILE.exists():
        print(f"  ⚠ trajectory.json not found at {TRAJ_FILE}")
        return None
    with open(TRAJ_FILE) as f:
        d = json.load(f)
    print(f"  trajectory.json: {d['count']} points, "
          f"JD {d['startJD']:.4f}→{d['endJD']:.4f}, "
          f"step={d['intervalMinutes']} min")
    return d

def load_ephemeris():
    if not EPHEMERIS_FILE.exists():
        print(f"  ⚠ ephemeris.json not found at {EPHEMERIS_FILE}")
        return None
    with open(EPHEMERIS_FILE) as f:
        d = json.load(f)
    print(f"  ephemeris.json: {d['count']} points, "
          f"JD {d['startJD']:.4f}, step={d['intervalHours']} h")
    return d

# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 1 — Trajectory 3-D + projections
# ═══════════════════════════════════════════════════════════════════════════════
def plot_trajectory_3d(traj):
    pos = np.array(traj["posECI"])  # (N, 3) km
    met = np.array([(traj["startJD"] + i * traj["intervalMinutes"] / 1440) for i in range(len(pos))])
    met_h = (met - LAUNCH_JD) * 24.0

    fig = plt.figure(figsize=(18, 12))
    fig.patch.set_facecolor("#0a0a12")
    style_fig(fig, "Plot 01 — Artemis 2 Trajectory: 3-D ECI + Projections")

    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.38, wspace=0.35)

    # ── 3-D plot ──────────────────────────────────────────────────────────────
    ax3d = fig.add_subplot(gs[0, 0], projection="3d")
    ax3d.set_facecolor("#0a0a12")
    sc = ax3d.scatter(pos[:,0], pos[:,1], pos[:,2],
                      c=met_h, cmap="plasma", s=0.8, lw=0)
    # Earth sphere
    u, v = np.mgrid[0:2*np.pi:30j, 0:np.pi:15j]
    ex = EARTH_RADIUS_KM * np.cos(u) * np.sin(v)
    ey = EARTH_RADIUS_KM * np.sin(u) * np.sin(v)
    ez = EARTH_RADIUS_KM * np.cos(v)
    ax3d.plot_surface(ex, ey, ez, color="steelblue", alpha=0.25)
    ax3d.set_xlabel("X (km)", color="#8888aa", fontsize=6)
    ax3d.set_ylabel("Y (km)", color="#8888aa", fontsize=6)
    ax3d.set_zlabel("Z (km)", color="#8888aa", fontsize=6)
    ax3d.tick_params(colors="#aaaacc", labelsize=6)
    ax3d.set_title("3-D ECI trajectory\n(color=MET hours)", color="#ccccff", fontsize=8)
    # Mark start & end
    ax3d.scatter([pos[0,0]],[pos[0,1]],[pos[0,2]], c="lime", s=40, zorder=5, label="Start")
    ax3d.scatter([pos[-1,0]],[pos[-1,1]],[pos[-1,2]], c="red",  s=40, zorder=5, label="End")
    ax3d.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # ── XY projection ─────────────────────────────────────────────────────────
    ax_xy = fig.add_subplot(gs[0, 1])
    style_ax(ax_xy, "XY (Equatorial plane)", "X (km)", "Y (km)")
    ax_xy.scatter(pos[:,0], pos[:,1], c=met_h, cmap="plasma", s=0.5)
    earth_circle = plt.Circle((0,0), EARTH_RADIUS_KM, color="steelblue", alpha=0.3, label="Earth")
    ax_xy.add_patch(earth_circle)
    ax_xy.set_aspect("equal")
    ax_xy.axhline(0, color="#334", lw=0.5)
    ax_xy.axvline(0, color="#334", lw=0.5)
    ax_xy.scatter([pos[0,0]],[pos[0,1]], c="lime", s=30, zorder=5)
    ax_xy.scatter([pos[-1,0]],[pos[-1,1]], c="red",  s=30, zorder=5)

    # ── XZ projection ─────────────────────────────────────────────────────────
    ax_xz = fig.add_subplot(gs[0, 2])
    style_ax(ax_xz, "XZ projection", "X (km)", "Z (km)")
    ax_xz.scatter(pos[:,0], pos[:,2], c=met_h, cmap="plasma", s=0.5)
    ax_xz.set_aspect("equal")
    ax_xz.axhline(0, color="#334", lw=0.5)

    # ── YZ projection ─────────────────────────────────────────────────────────
    ax_yz = fig.add_subplot(gs[1, 0])
    style_ax(ax_yz, "YZ projection", "Y (km)", "Z (km)")
    ax_yz.scatter(pos[:,1], pos[:,2], c=met_h, cmap="plasma", s=0.5)
    ax_yz.set_aspect("equal")

    # ── Distance from Earth ────────────────────────────────────────────────────
    ax_de = fig.add_subplot(gs[1, 1])
    style_ax(ax_de, "Distance from Earth center", "MET (hours)", "km")
    dist_e = np.sqrt((pos**2).sum(axis=1))
    ax_de.plot(met_h, dist_e, color="#ffd166", lw=1)
    ax_de.axhline(MOON_MEAN_DIST_KM, color="#00d4aa", lw=0.8, ls="--", label="Moon mean dist")
    ax_de.axhline(EARTH_RADIUS_KM,   color="steelblue", lw=0.8, ls="--", label="Earth surface")
    for ev_name, ev_jd in EVENTS.items():
        h = (ev_jd - LAUNCH_JD) * 24
        if met_h[0] <= h <= met_h[-1]:
            ax_de.axvline(h, color="#ff6b6b", lw=0.6, ls=":")
    ax_de.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax_de.set_ylim(bottom=0)

    # ── Speed ──────────────────────────────────────────────────────────────────
    ax_v = fig.add_subplot(gs[1, 2])
    style_ax(ax_v, "Speed", "MET (hours)", "km/s")
    vel = np.array(traj["velECI"])
    speed = np.sqrt((vel**2).sum(axis=1))
    ax_v.plot(met_h, speed, color="#00d4aa", lw=1)
    for ev_name, ev_jd in EVENTS.items():
        h = (ev_jd - LAUNCH_JD) * 24
        if met_h[0] <= h <= met_h[-1]:
            ax_v.axvline(h, color="#ff6b6b", lw=0.6, ls=":", label=ev_name if h > met_h[5] else "")
    ax_v.legend(fontsize=5, labelcolor="white", facecolor="#111120")

    # Colorbar
    cbar = fig.colorbar(sc, ax=ax3d, fraction=0.04, pad=0.04)
    cbar.set_label("MET (h)", color="#8888aa", fontsize=7)
    cbar.ax.tick_params(colors="#aaaacc", labelsize=6)

    return save(fig, "01_trajectory_3d_projections.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 2 — Trajectory physics
# ═══════════════════════════════════════════════════════════════════════════════
def plot_trajectory_physics(traj, ephem):
    pos  = np.array(traj["posECI"])
    vel  = np.array(traj["velECI"])
    step = traj["intervalMinutes"] / 1440.0
    jds  = np.array([traj["startJD"] + i*step for i in range(len(pos))])
    met_h = (jds - LAUNCH_JD) * 24.0

    dist_e = np.sqrt((pos**2).sum(axis=1))
    speed  = np.sqrt((vel**2).sum(axis=1))
    alt    = dist_e - EARTH_RADIUS_KM

    # Specific orbital energy (vis-viva): ε = v²/2 - GM/r
    energy = speed**2 / 2.0 - EARTH_GM / dist_e

    # Radial velocity component
    r_hat = pos / dist_e[:,np.newaxis]
    v_rad = (vel * r_hat).sum(axis=1)

    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    style_fig(fig, "Plot 02 — Artemis 2 Trajectory Physics")
    plt.subplots_adjust(hspace=0.38, wspace=0.35)

    def ev_lines(ax):
        for ev_name, ev_jd in EVENTS.items():
            h = (ev_jd - LAUNCH_JD) * 24
            if met_h[0] <= h <= met_h[-1]:
                ax.axvline(h, color="#ff6b6b", lw=0.7, ls=":", alpha=0.8)

    # Altitude above Earth
    ax = axes[0, 0]
    style_ax(ax, "Altitude above Earth surface", "MET (hours)", "Altitude (km)")
    ax.fill_between(met_h, alt, alpha=0.3, color="#ffd166")
    ax.plot(met_h, alt, color="#ffd166", lw=1)
    ax.axhline(MOON_MEAN_DIST_KM - EARTH_RADIUS_KM, color="#00d4aa", lw=0.8, ls="--",
               label=f"Moon orbit alt ~{MOON_MEAN_DIST_KM-EARTH_RADIUS_KM:.0f} km")
    ax.set_yscale("log")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ev_lines(ax)

    # Speed
    ax = axes[0, 1]
    style_ax(ax, "Speed", "MET (hours)", "km/s")
    ax.plot(met_h, speed, color="#00d4aa", lw=1)
    ev_lines(ax)
    # Expected: ~10.8 km/s post-TLI, ~1 km/s near Moon, ~11 km/s reentry
    ax.axhline(10.8, color="#ffd166", lw=0.6, ls="--", label="~TLI speed 10.8 km/s")
    ax.axhline(1.0,  color="#4488cc", lw=0.6, ls="--", label="~Moon approach 1 km/s")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # Specific orbital energy
    ax = axes[0, 2]
    style_ax(ax, "Specific orbital energy (vis-viva)", "MET (hours)", "MJ/kg")
    ax.plot(met_h, energy / 1e3, color="#ff6b6b", lw=1)
    ax.axhline(0, color="white", lw=0.5, ls="--", label="Energy=0 (escape)")
    ev_lines(ax)
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    # Expected: negative before TLI (LEO), slightly positive or near-zero during translunar

    # Radial velocity (positive = moving away from Earth)
    ax = axes[1, 0]
    style_ax(ax, "Radial velocity (+ = outbound)", "MET (hours)", "km/s")
    ax.plot(met_h, v_rad, color="#4488cc", lw=1)
    ax.axhline(0, color="white", lw=0.5)
    ev_lines(ax)

    # Distance from Moon (need Moon position from ephemeris)
    ax = axes[1, 1]
    style_ax(ax, "Distance from Moon center", "MET (hours)", "km")
    if ephem:
        ep_step = ephem["intervalHours"] / 24.0
        moon_pos = np.array(ephem["moonPosECI"])
        dist_m = []
        for i, jd in enumerate(jds):
            raw = (jd - ephem["startJD"]) / ep_step
            idx = int(np.clip(raw, 0, ephem["count"]-1))
            mp  = moon_pos[idx]
            d   = vec_len([pos[i,0]-mp[0], pos[i,1]-mp[1], pos[i,2]-mp[2]])
            dist_m.append(d)
        dist_m = np.array(dist_m)
        ax.plot(met_h, dist_m, color="#00d4aa", lw=1)
        ax.axhline(MOON_RADIUS_KM, color="#ffaa00", lw=0.8, ls="--", label="Moon surface")
        min_dist = dist_m.min()
        min_h    = met_h[dist_m.argmin()]
        ax.annotate(f"Min: {min_dist:.0f} km\n@MET {min_h:.1f}h",
                    xy=(min_h, min_dist), color="#ffaa00", fontsize=7)
        ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    else:
        ax.text(0.5, 0.5, "No ephemeris data", transform=ax.transAxes,
                ha="center", color="#aaaacc")
    ev_lines(ax)
    ax.set_ylim(bottom=0)

    # Angular momentum magnitude (should be nearly constant in each arc)
    ax = axes[1, 2]
    style_ax(ax, "|Angular momentum| (per unit mass)", "MET (hours)", "km²/s")
    L = np.cross(pos, vel)
    L_mag = np.sqrt((L**2).sum(axis=1))
    ax.plot(met_h, L_mag, color="#ffd166", lw=1)
    ev_lines(ax)

    return save(fig, "02_trajectory_physics.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 3 — Ground track
# ═══════════════════════════════════════════════════════════════════════════════
def plot_groundtrack(traj, ephem):
    pos  = np.array(traj["posECI"])
    step = traj["intervalMinutes"] / 1440.0
    jds  = np.array([traj["startJD"] + i*step for i in range(len(pos))])
    met_h = (jds - LAUNCH_JD) * 24.0

    # Compute sub-spacecraft lat/lon in ECEF at each point
    lats, lons = [], []
    for i, jd in enumerate(jds):
        gmst = gmst_rad(jd)
        ex, ey, ez = eci_to_ecef(pos[i,0], pos[i,1], pos[i,2], gmst)
        lat, lon = ecef_to_latlon(ex, ey, ez)
        lats.append(lat)
        lons.append(lon)
    lats = np.array(lats)
    lons = np.array(lons)

    fig, ax = plt.subplots(1, 1, figsize=(16, 8),
                            subplot_kw={"projection": "mollweide"})
    style_fig(fig, "Plot 03 — Artemis 2 Sub-Spacecraft Ground Track (Mollweide)")
    ax.set_facecolor("#0a0a12")
    ax.tick_params(colors="#aaaacc")
    ax.grid(True, color="#222233", linewidth=0.5)

    # Scatter with MET color
    sc = ax.scatter(np.radians(lons), np.radians(lats),
                    c=met_h, cmap="plasma", s=1.0, lw=0)

    # Mark launch and splashdown
    ax.scatter([np.radians(lons[0])], [np.radians(lats[0])],
               c="lime", s=60, zorder=5, label="First data point")
    ax.scatter([np.radians(lons[-1])], [np.radians(lats[-1])],
               c="red",  s=60, zorder=5, label="Last data point")

    # KSC approximate location
    ksc_lat, ksc_lon = 28.573, -80.649
    ax.scatter([np.radians(ksc_lon)], [np.radians(ksc_lat)],
               marker="*", c="yellow", s=100, zorder=6, label="KSC")

    cbar = fig.colorbar(sc, ax=ax, fraction=0.02, pad=0.02, orientation="vertical")
    cbar.set_label("MET (h)", color="#8888aa", fontsize=8)
    cbar.ax.tick_params(colors="#aaaacc")
    ax.legend(fontsize=7, labelcolor="white", facecolor="#111120", loc="lower left")
    ax.set_title("Sub-spacecraft ground track (ECI→ECEF via GMST)",
                 color="#ccccff", fontsize=9)

    return save(fig, "03_trajectory_groundtrack.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 4 — Ephemeris: Moon position & distance
# ═══════════════════════════════════════════════════════════════════════════════
def plot_ephemeris_moon(ephem):
    if not ephem:
        print("  Skip plot 04 — no ephemeris data")
        return

    ep_step = ephem["intervalHours"] / 24.0
    n = ephem["count"]
    jds = np.array([ephem["startJD"] + i*ep_step for i in range(n)])
    met_h = (jds - LAUNCH_JD) * 24.0

    moon = np.array(ephem["moonPosECI"])
    moon_dist = np.sqrt((moon**2).sum(axis=1))
    # Moon velocity via finite differences (km/s)
    dt_s = ephem["intervalHours"] * 3600.0
    moon_vel = np.gradient(moon, axis=0) / dt_s  # km/s
    moon_speed = np.sqrt((moon_vel**2).sum(axis=1))

    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    style_fig(fig, "Plot 04 — Ephemeris: Moon Position & Distance")
    plt.subplots_adjust(hspace=0.38, wspace=0.35)

    # Moon XY ECI
    ax = axes[0, 0]
    style_ax(ax, "Moon ECI position (XY)", "X (km)", "Y (km)")
    sc = ax.scatter(moon[:,0], moon[:,1], c=met_h, cmap="cool", s=1)
    earth_c = plt.Circle((0,0), EARTH_RADIUS_KM, color="steelblue", alpha=0.3)
    ax.add_patch(earth_c)
    ax.set_aspect("equal")
    ax.scatter([moon[0,0]], [moon[0,1]], c="lime", s=30, zorder=5, label="Start")
    ax.scatter([moon[-1,0]], [moon[-1,1]], c="red", s=30, zorder=5, label="End")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # Moon distance from Earth
    ax = axes[0, 1]
    style_ax(ax, "Moon distance from Earth", "MET (hours)", "km")
    ax.plot(met_h, moon_dist, color="#00d4aa", lw=1.5)
    ax.axhline(MOON_MEAN_DIST_KM, color="#ffd166", lw=0.8, ls="--",
               label=f"Mean {MOON_MEAN_DIST_KM:,.0f} km")
    ax.axhline(MOON_MEAN_DIST_KM * 0.95, color="#ffd166", lw=0.4, ls=":")
    ax.axhline(MOON_MEAN_DIST_KM * 1.05, color="#ffd166", lw=0.4, ls=":")
    # Annotate min/max
    ax.annotate(f"Min: {moon_dist.min():,.0f} km", xy=(met_h[moon_dist.argmin()], moon_dist.min()),
                color="#ffaa00", fontsize=7, xytext=(10,10), textcoords="offset points")
    ax.annotate(f"Max: {moon_dist.max():,.0f} km", xy=(met_h[moon_dist.argmax()], moon_dist.max()),
                color="#ffaa00", fontsize=7, xytext=(10,-15), textcoords="offset points")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # Moon XZ ECI
    ax = axes[0, 2]
    style_ax(ax, "Moon ECI position (XZ)", "X (km)", "Z (km)")
    ax.scatter(moon[:,0], moon[:,2], c=met_h, cmap="cool", s=1)
    ax.set_aspect("equal")

    # Moon orbital speed
    ax = axes[1, 0]
    style_ax(ax, "Moon orbital speed (finite diff)", "MET (hours)", "km/s")
    ax.plot(met_h, moon_speed, color="#ffd166", lw=1)
    # Expected: ~1.022 km/s mean
    ax.axhline(1.022, color="#00d4aa", lw=0.8, ls="--", label="Mean 1.022 km/s")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # Moon Z position (inclination effect)
    ax = axes[1, 1]
    style_ax(ax, "Moon Z position (inclination)", "MET (hours)", "km")
    ax.plot(met_h, moon[:,2], color="#4488cc", lw=1)
    ax.axhline(0, color="white", lw=0.4)
    # Moon orbit inclination ~5.14° → Z amplitude = 384400 * sin(5.14°) ≈ ±34,400 km
    ax.axhline(+34400, color="#ffd166", lw=0.5, ls="--", label="±34,400 km (5.14° inc)")
    ax.axhline(-34400, color="#ffd166", lw=0.5, ls="--")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # Moon distance scatter vs time (verify no anomalies)
    ax = axes[1, 2]
    style_ax(ax, "Moon dist deviation from mean", "MET (hours)", "km from mean")
    dev = moon_dist - moon_dist.mean()
    ax.fill_between(met_h, dev, alpha=0.4, color="#00d4aa")
    ax.plot(met_h, dev, color="#00d4aa", lw=0.8)
    ax.axhline(0, color="white", lw=0.5)
    ax.text(0.02, 0.95, f"σ = {dev.std():.1f} km\nmin={dev.min():.0f}, max={dev.max():.0f}",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")

    return save(fig, "04_ephemeris_moon.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 5 — Sun direction + GMST rate
# ═══════════════════════════════════════════════════════════════════════════════
def plot_ephemeris_sun_gmst(ephem):
    if not ephem:
        print("  Skip plot 05 — no ephemeris data")
        return

    ep_step = ephem["intervalHours"] / 24.0
    n = ephem["count"]
    jds = np.array([ephem["startJD"] + i*ep_step for i in range(n)])
    met_h = (jds - LAUNCH_JD) * 24.0

    sun = np.array(ephem["sunPosECI"])
    sun_dist = np.sqrt((sun**2).sum(axis=1))
    sun_az = np.degrees(np.arctan2(sun[:,1], sun[:,0]))  # ECI azimuth in equatorial plane
    sun_elev = np.degrees(np.arcsin(np.clip(sun[:,2] / sun_dist, -1, 1)))

    # GMST from ephemeris vs computed
    gmst_ephem = np.array(ephem["gmstRad"])
    gmst_calc  = np.array([gmst_rad(jd) for jd in jds])

    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    style_fig(fig, "Plot 05 — Ephemeris: Sun Direction & GMST Rate")
    plt.subplots_adjust(hspace=0.38, wspace=0.35)

    # Sun ECI XY
    ax = axes[0, 0]
    style_ax(ax, "Sun ECI position (XY, not to scale)", "X (km)", "Y (km)")
    ax.scatter(sun[:,0], sun[:,1], c=met_h, cmap="hot", s=1)
    ax.set_aspect("equal")

    # Sun azimuth vs time (should change ~1°/day)
    ax = axes[0, 1]
    style_ax(ax, "Sun ecliptic longitude (ECI azimuth)", "MET (hours)", "degrees")
    ax.plot(met_h, sun_az, color="#ffdd44", lw=1.5)
    # Rate should be ~360°/365.25d = ~0.9856°/day = ~0.041°/hr
    dt_hours = (jds[-1] - jds[0]) * 24
    daz = sun_az[-1] - sun_az[0]
    # Note: this measures ECI right-ascension rate (not ecliptic longitude rate).
    # Near vernal equinox (Apr), RA rate ≈ 0.88–0.92°/day vs ecliptic rate 0.986°/day.
    ax.text(0.02, 0.05, f"ΔAz={daz:.2f}° over {dt_hours:.0f}h\n"
            f"Rate={daz/dt_hours*24:.3f}°/day (ECI RA, not ecliptic lon)",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    # Sun elevation
    ax = axes[0, 2]
    style_ax(ax, "Sun elevation above equatorial plane", "MET (hours)", "degrees")
    ax.plot(met_h, sun_elev, color="#ff9944", lw=1.5)
    # Near Apr 1–11, Sun is north of equator (spring). Elevation ≈ +3° to +8°
    ax.axhline(0, color="white", lw=0.5)
    ax.text(0.02, 0.95, f"Range: {sun_elev.min():.2f}° to {sun_elev.max():.2f}°",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")

    # Sun distance (should be ~1 AU ≈ 149,597,871 km)
    ax = axes[1, 0]
    style_ax(ax, "Sun distance (AU)", "MET (hours)", "AU")
    AU = 149_597_870.7
    ax.plot(met_h, sun_dist / AU, color="#ffdd44", lw=1.5)
    ax.axhline(1.0, color="#00d4aa", lw=0.8, ls="--", label="1 AU")
    # In early April, Earth is near perihelion (~Jan), so distance slightly < 1 AU
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.05, f"Mean: {(sun_dist/AU).mean():.5f} AU",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    # GMST: ephemeris vs computed formula — normalize both to [0, 2π) for fair comparison
    TWO_PI = 2 * math.pi
    gmst_ephem_norm = np.mod(gmst_ephem, TWO_PI)  # normalize stored unwrapped values
    ax = axes[1, 1]
    style_ax(ax, "GMST: ephemeris vs IAU 1982 formula (both normalized 0–2π)", "MET (hours)", "radians")
    ax.plot(met_h, gmst_ephem_norm, color="#00d4aa", lw=1, label="ephemeris.json (normalized)")
    ax.plot(met_h, gmst_calc,       color="#ffd166", lw=1, ls="--", label="IAU 1982 formula")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # GMST difference using normalized values (subtract with wrap-aware method)
    ax = axes[1, 2]
    diff_raw = gmst_ephem_norm - gmst_calc
    # Wrap to [-π, π]
    diff = (diff_raw + math.pi) % TWO_PI - math.pi
    style_ax(ax, "GMST discrepancy (ephem − formula)", "MET (hours)", "radians")
    ax.plot(met_h, diff, color="#ff6b6b", lw=1)
    ax.axhline(0, color="white", lw=0.5)
    ax.text(0.02, 0.95,
            f"Max |diff|: {np.abs(diff).max()*1000:.1f} mrad\n"
            f"(< 0.1 mrad expected for IAU 1982)",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")

    return save(fig, "05_ephemeris_sun_gmst.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 6 — Coordinate transform validation
# ═══════════════════════════════════════════════════════════════════════════════
def plot_coordinate_transforms(ephem):
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    style_fig(fig, "Plot 06 — Coordinate Transform Validation (ECI ↔ ECEF)")
    plt.subplots_adjust(hspace=0.4, wspace=0.35)

    # KSC ECEF position (fixed on Earth's surface)
    ksc_lat_deg, ksc_lon_deg = 28.5729, -80.6490
    ksc_lat = math.radians(ksc_lat_deg)
    ksc_lon = math.radians(ksc_lon_deg)
    ksc_ecef = (
        EARTH_RADIUS_KM * math.cos(ksc_lat) * math.cos(ksc_lon),
        EARTH_RADIUS_KM * math.cos(ksc_lat) * math.sin(ksc_lon),
        EARTH_RADIUS_KM * math.sin(ksc_lat),
    )

    # Over 3 days, compute KSC in ECI (should trace a circle)
    # and then back to ECEF (should stay constant)
    jd0 = LAUNCH_JD
    hours = np.linspace(0, 72, 1000)
    jds   = jd0 + hours / 24.0

    ksc_eci_x, ksc_eci_y, ksc_eci_z = [], [], []
    ksc_ecef_x2, ksc_ecef_y2, ksc_ecef_z2 = [], [], []
    gmst_vals = []

    for jd in jds:
        g = gmst_rad(jd)
        gmst_vals.append(g)
        # KSC ECEF → ECI (inverse rotation = transpose of ECI→ECEF)
        c, s = math.cos(g), math.sin(g)
        ex = c*ksc_ecef[0] - s*ksc_ecef[1]
        ey = s*ksc_ecef[0] + c*ksc_ecef[1]
        ez = ksc_ecef[2]
        ksc_eci_x.append(ex); ksc_eci_y.append(ey); ksc_eci_z.append(ez)
        # Round-trip back to ECEF
        ex2, ey2, ez2 = eci_to_ecef(ex, ey, ez, g)
        ksc_ecef_x2.append(ex2); ksc_ecef_y2.append(ey2); ksc_ecef_z2.append(ez2)

    ksc_eci_x  = np.array(ksc_eci_x)
    ksc_eci_y  = np.array(ksc_eci_y)
    ksc_ecef_x2 = np.array(ksc_ecef_x2)
    ksc_ecef_y2 = np.array(ksc_ecef_y2)
    ksc_ecef_z2 = np.array(ksc_ecef_z2)

    # KSC in ECI over 3 days (should trace unit-sphere circle)
    ax = axes[0, 0]
    style_ax(ax, "KSC ECI position over 3 days\n(should trace circle in XY)", "X (km)", "Y (km)")
    sc = ax.scatter(ksc_eci_x, ksc_eci_y, c=hours, cmap="cool", s=1)
    earth_c = plt.Circle((0,0), EARTH_RADIUS_KM, color="steelblue", alpha=0.2)
    ax.add_patch(earth_c)
    ax.set_aspect("equal")
    fig.colorbar(sc, ax=ax, fraction=0.04).ax.tick_params(colors="#aaaacc")

    # ECEF round-trip residual (should be < 1e-9 km — machine precision)
    ax = axes[0, 1]
    style_ax(ax, "ECI→ECEF round-trip residual (KSC)", "Hours from launch", "km (should be ~0)")
    err_x = ksc_ecef_x2 - ksc_ecef[0]
    err_y = ksc_ecef_y2 - ksc_ecef[1]
    err_z = ksc_ecef_z2 - ksc_ecef[2]
    err   = np.sqrt(err_x**2 + err_y**2 + err_z**2)
    ax.plot(hours, err, color="#ff6b6b", lw=1)
    ax.text(0.02, 0.95, f"Max err: {err.max():.2e} km",
            transform=ax.transAxes, color="#aaaacc", fontsize=8, va="top")

    # GMST rate: should be 2π per sidereal day (86164.1 s = 23h56m4.1s)
    ax = axes[1, 0]
    style_ax(ax, "GMST rate over 3 days", "Hours from launch", "rad/hr (expect 0.26252)")
    gmst_arr = np.array(gmst_vals)
    # Unwrap to remove 0→2π jumps, then differentiate
    gmst_unwrapped = np.unwrap(gmst_arr)
    gmst_rate = np.gradient(gmst_unwrapped, hours)  # rad/hr
    ax.plot(hours, gmst_rate, color="#00d4aa", lw=1)
    expected_rate = 2 * math.pi / (86164.1 / 3600)  # rad/hr ≈ 0.26252
    ax.axhline(expected_rate, color="#ffd166", lw=1, ls="--",
               label=f"Expected {expected_rate:.5f} rad/hr")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.05, f"Mean: {gmst_rate.mean():.5f}\nStd: {gmst_rate.std():.2e}",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    # ECI obliquity: convert a point on ecliptic to ECI and check Z
    ax = axes[1, 1]
    style_ax(ax, "ECI ↔ Ecliptic obliquity check", "Ecliptic longitude (°)", "ECI Z of ecliptic point")
    ecliptic_lons = np.linspace(0, 360, 360)
    eci_z_values  = []
    for lon_deg in ecliptic_lons:
        lon = math.radians(lon_deg)
        # Point on ecliptic plane (unit vector)
        ecl_x, ecl_y, ecl_z = math.cos(lon), math.sin(lon), 0.0
        # Ecliptic → ECI: rotate by -obliquity around X
        c, s = math.cos(-OBLIQUITY_RAD), math.sin(-OBLIQUITY_RAD)
        eci_z = -s * ecl_y + c * ecl_z
        eci_z_values.append(eci_z)
    eci_z_values = np.array(eci_z_values)
    ax.plot(ecliptic_lons, eci_z_values, color="#ffd166", lw=1.5)
    expected_amp = math.sin(OBLIQUITY_RAD)
    ax.axhline(+expected_amp, color="#00d4aa", lw=0.6, ls="--",
               label=f"±sin(obliquity)=±{expected_amp:.4f}")
    ax.axhline(-expected_amp, color="#00d4aa", lw=0.6, ls="--")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.95, f"Amplitude: {eci_z_values.max():.4f}\n(expect {expected_amp:.4f})",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")

    return save(fig, "06_coordinate_transforms.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 7 — Moon orientation (IAU 2009)
# ═══════════════════════════════════════════════════════════════════════════════
def plot_moon_orientation(ephem):
    if not ephem:
        print("  Skip plot 07 — no ephemeris data")
        return

    ep_step = ephem["intervalHours"] / 24.0
    n = ephem["count"]
    jds  = np.array([ephem["startJD"] + i*ep_step for i in range(n)])
    met_h = (jds - LAUNCH_JD) * 24.0
    ori  = np.array(ephem["moonOrientation"])  # (N, 3): [poleRA, poleDec, W]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    style_fig(fig, "Plot 07 — IAU 2009 Moon Orientation Model")
    plt.subplots_adjust(hspace=0.4, wspace=0.35)

    # Pole RA
    ax = axes[0, 0]
    style_ax(ax, "Moon north pole RA (IAU 2009)", "MET (hours)", "degrees")
    ax.plot(met_h, ori[:,0], color="#00d4aa", lw=1.5)
    # Expected near 269.9949° with ~4° amplitude from E1 term
    ax.axhline(269.9949, color="#ffd166", lw=0.8, ls="--", label="Base 269.9949°")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.05, f"Range: {ori[:,0].min():.4f}° – {ori[:,0].max():.4f}°",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    # Pole Dec
    ax = axes[0, 1]
    style_ax(ax, "Moon north pole Dec (IAU 2009)", "MET (hours)", "degrees")
    ax.plot(met_h, ori[:,1], color="#ffd166", lw=1.5)
    # Expected near 66.5392° with ~1.5° amplitude
    ax.axhline(66.5392, color="#00d4aa", lw=0.8, ls="--", label="Base 66.5392°")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.05, f"Range: {ori[:,1].min():.4f}° – {ori[:,1].max():.4f}°",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    # W (prime meridian angle)
    ax = axes[1, 0]
    style_ax(ax, "Moon prime meridian W (IAU 2009)", "MET (hours)", "degrees")
    ax.plot(met_h, ori[:,2] % 360, color="#4488cc", lw=1)
    # W advances at 13.17635815°/day
    expected_rate_deg_hr = 13.17635815 / 24.0
    ax.text(0.02, 0.95,
            f"W rate: ~{expected_rate_deg_hr:.4f}°/hr expected\n"
            f"(Moon rotates once per ~27.32 days)",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")

    # W rate (finite diff)
    ax = axes[1, 1]
    style_ax(ax, "Moon W rotation rate (finite diff)", "MET (hours)", "deg/hr")
    w_unwrapped = np.unwrap(np.radians(ori[:,2]))
    w_rate = np.degrees(np.gradient(w_unwrapped, met_h))
    ax.plot(met_h, w_rate, color="#4488cc", lw=1)
    ax.axhline(expected_rate_deg_hr, color="#ffd166", lw=0.8, ls="--",
               label=f"Expected {expected_rate_deg_hr:.4f}°/hr")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")
    ax.text(0.02, 0.05, f"Mean: {w_rate.mean():.4f} °/hr",
            transform=ax.transAxes, color="#aaaacc", fontsize=7)

    return save(fig, "07_moon_orientation.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 8 — Time system checks
# ═══════════════════════════════════════════════════════════════════════════════
def plot_time_system():
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    style_fig(fig, "Plot 08 — Time System: JD↔UTC Roundtrip, GMST, MET")
    plt.subplots_adjust(hspace=0.4, wspace=0.35)

    # JD → UTC → JD roundtrip error (should be < 1 μs)
    ax = axes[0, 0]
    style_ax(ax, "JD↔UTC roundtrip error", "Input JD", "Error (seconds)")
    jd_test = np.linspace(2451545.0, 2470000.0, 2000)
    errors  = []
    for jd in jd_test:
        dt  = jd_to_utc(jd)
        jd2 = dt.timestamp() / 86400.0 + 2440587.5
        errors.append((jd2 - jd) * 86400)
    ax.plot(jd_test, errors, color="#00d4aa", lw=0.8)
    ax.axhline(0, color="white", lw=0.4)
    ax.text(0.02, 0.95,
            f"Max |err|: {np.abs(errors).max()*1e6:.2f} μs\n(expect < 0.01 μs)",
            transform=ax.transAxes, color="#aaaacc", fontsize=8, va="top")

    # GMST: verify it advances at exactly 2π per sidereal day using the raw formula
    ax = axes[0, 1]
    style_ax(ax, "GMST rate: sidereal day check", "MET hours from J2000", "GMST advance (rad)")
    t_hours = np.linspace(0, 24*3, 200)
    gmst_vals = np.array([gmst_rad(J2000_JD + h/24) for h in t_hours])
    gmst_unwrapped = np.unwrap(gmst_vals)
    ax.plot(t_hours, gmst_unwrapped, color="#ffd166", lw=1.5, label="GMST (unwrapped)")
    sidereal_day_h = 86164.1 / 3600  # 23.9345 hours
    ax.axvline(sidereal_day_h, color="#00d4aa", lw=0.8, ls="--", label=f"1 sid day ({sidereal_day_h:.2f}h)")
    ax.axvline(2*sidereal_day_h, color="#00d4aa", lw=0.8, ls="--")
    ax.axvline(3*sidereal_day_h, color="#00d4aa", lw=0.8, ls="--")
    ax.axhline(2*math.pi, color="#ff6b6b", lw=0.5, ls=":")
    ax.axhline(4*math.pi, color="#ff6b6b", lw=0.5, ls=":")
    ax.axhline(6*math.pi, color="#ff6b6b", lw=0.5, ls=":")
    measured_rate = (gmst_unwrapped[-1] - gmst_unwrapped[0]) / (t_hours[-1] - t_hours[0])
    ax.text(0.02, 0.95,
            f"Rate: {measured_rate:.5f} rad/hr\nExpect: {2*math.pi/sidereal_day_h:.5f} rad/hr",
            transform=ax.transAxes, color="#aaaacc", fontsize=7, va="top")
    ax.legend(fontsize=6, labelcolor="white", facecolor="#111120")

    # MET for key mission events
    ax = axes[1, 0]
    style_ax(ax, "Mission Elapsed Time for key events", "Event", "MET (hours)")
    ev_names  = list(EVENTS.keys())
    ev_met    = [(jd - LAUNCH_JD)*24 for jd in EVENTS.values()]
    colors    = ["#ff6b6b", "#ffd166", "#ffd166", "#00d4aa", "#00d4aa", "#888899"]
    bars = ax.barh(ev_names, ev_met, color=colors, alpha=0.8)
    for bar, met in zip(bars, ev_met):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f"T+{met:.1f}h", va="center", color="white", fontsize=7)
    ax.set_xlim(left=0)

    # Launch JD sanity: verify against known reference
    ax = axes[1, 1]
    style_ax(ax, "Launch epoch cross-check", "", "")
    ax.axis("off")
    launch_dt  = jd_to_utc(LAUNCH_JD)
    j2000_dt   = jd_to_utc(J2000_JD)
    days_since = LAUNCH_JD - J2000_JD
    info = (
        f"Launch JD:    {LAUNCH_JD:.9f}\n"
        f"Launch UTC:   {launch_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"J2000 epoch:  {j2000_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"Days since J2000: {days_since:.3f}\n"
        f"Years since J2000: {days_since/365.25:.3f}\n\n"
        f"Expected launch: 2026-04-01 22:35:12 UTC\n"
        f"MATCH: {launch_dt.strftime('%Y-%m-%d %H:%M:%S') == '2026-04-01 22:35:12'}"
    )
    ax.text(0.05, 0.95, info, transform=ax.transAxes, color="#ccccff",
            fontsize=9, va="top", fontfamily="monospace")

    return save(fig, "08_time_system.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 9 — Mission phase timeline
# ═══════════════════════════════════════════════════════════════════════════════
def plot_phase_timeline(traj, ephem):
    pos  = np.array(traj["posECI"])
    vel  = np.array(traj["velECI"])
    step = traj["intervalMinutes"] / 1440.0
    jds  = np.array([traj["startJD"] + i*step for i in range(len(pos))])
    met_h = (jds - LAUNCH_JD) * 24.0

    dist_e = np.sqrt((pos**2).sum(axis=1))
    speed  = np.sqrt((vel**2).sum(axis=1))

    fig, axes = plt.subplots(3, 1, figsize=(18, 14), sharex=True)
    style_fig(fig, "Plot 09 — Mission Phase Timeline")
    plt.subplots_adjust(hspace=0.12)

    # Phase bands
    phases = traj.get("phases", [])
    for ax in axes:
        style_ax(ax)
        for ph in phases:
            h0 = (ph["startJD"] - LAUNCH_JD) * 24
            h1 = (ph["endJD"]   - LAUNCH_JD) * 24
            ax.axvspan(h0, h1, color=ph["color"], alpha=0.12, label=ph["name"])
        # Event markers
        for ev_name, ev_jd in EVENTS.items():
            h = (ev_jd - LAUNCH_JD) * 24
            ax.axvline(h, color="white", lw=0.6, ls=":", alpha=0.5)

    # Altitude
    axes[0].fill_between(met_h, dist_e - EARTH_RADIUS_KM, alpha=0.5, color="#ffd166")
    axes[0].plot(met_h, dist_e - EARTH_RADIUS_KM, color="#ffd166", lw=1.5)
    axes[0].set_ylabel("Altitude above Earth (km)", color="#8888aa", fontsize=9)
    axes[0].set_yscale("log")

    # Speed
    axes[1].plot(met_h, speed, color="#00d4aa", lw=1.5)
    axes[1].set_ylabel("Speed (km/s)", color="#8888aa", fontsize=9)

    # Distance from Moon
    if ephem:
        ep_step = ephem["intervalHours"] / 24.0
        moon_pos = np.array(ephem["moonPosECI"])
        dist_m = []
        for i, jd in enumerate(jds):
            raw = (jd - ephem["startJD"]) / ep_step
            idx = int(np.clip(raw, 0, ephem["count"]-1))
            mp  = moon_pos[idx]
            d   = vec_len([pos[i,0]-mp[0], pos[i,1]-mp[1], pos[i,2]-mp[2]])
            dist_m.append(d)
        axes[2].plot(met_h, dist_m, color="#4488cc", lw=1.5)
        axes[2].set_ylabel("Distance from Moon (km)", color="#8888aa", fontsize=9)
        axes[2].axhline(MOON_RADIUS_KM, color="#ffaa00", lw=0.8, ls="--", label="Moon surface")
        axes[2].set_yscale("log")
        axes[2].legend(fontsize=7, labelcolor="white", facecolor="#111120")

    axes[-1].set_xlabel("Mission Elapsed Time (hours)", color="#8888aa", fontsize=9)

    # Phase legend once
    handles = [mpatches.Patch(color=ph["color"], alpha=0.6, label=ph["name"])
               for ph in phases]
    for ev_name, ev_jd in EVENTS.items():
        h = (ev_jd - LAUNCH_JD) * 24
        axes[0].text(h + 0.3, axes[0].get_ylim()[1] * 0.7,
                     ev_name, color="white", fontsize=6, rotation=70, va="bottom")

    axes[0].legend(handles=handles, fontsize=7, labelcolor="white",
                   facecolor="#111120", loc="upper right")

    return save(fig, "09_phase_timeline.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  PLOT 10 — Catmull-Rom interpolation quality
# ═══════════════════════════════════════════════════════════════════════════════
def plot_interpolation_quality(traj):
    pos  = np.array(traj["posECI"])
    step = traj["intervalMinutes"] / 1440.0

    # Test interpolation around the closest Moon approach (highest curvature)
    jds  = np.array([traj["startJD"] + i*step for i in range(len(pos))])
    met_h = (jds - LAUNCH_JD) * 24.0

    dist_e = np.sqrt((pos**2).sum(axis=1))
    # Find segment with maximum curvature (largest second derivative of distance)
    d2 = np.gradient(np.gradient(dist_e))
    max_curv_idx = np.argmax(np.abs(d2))
    mid_idx = max_curv_idx

    # Extract a window of 20 points around max curvature
    i0 = max(0, mid_idx - 10)
    i1 = min(len(pos)-1, mid_idx + 10)
    seg_pos  = pos[i0:i1+1]
    seg_met  = met_h[i0:i1+1]
    seg_step = step * 24  # hours per step

    def catmull_rom(p0, p1, p2, p3, t):
        t2 = t*t; t3 = t2*t
        return 0.5 * (2*p1 + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3)

    # Interpolate between each pair at 10x resolution
    interp_met, interp_dist = [], []
    linear_met, linear_dist = [], []
    for i in range(1, len(seg_pos)-2):
        for sub in np.linspace(0, 1, 10, endpoint=False):
            # Catmull-Rom
            xi = catmull_rom(seg_pos[i-1,0],seg_pos[i,0],seg_pos[i+1,0],seg_pos[i+2,0], sub)
            yi = catmull_rom(seg_pos[i-1,1],seg_pos[i,1],seg_pos[i+1,1],seg_pos[i+2,1], sub)
            zi = catmull_rom(seg_pos[i-1,2],seg_pos[i,2],seg_pos[i+1,2],seg_pos[i+2,2], sub)
            interp_met.append(seg_met[i] + sub * seg_step)
            interp_dist.append(vec_len([xi,yi,zi]))
            # Linear
            xl = seg_pos[i,0]*(1-sub) + seg_pos[i+1,0]*sub
            yl = seg_pos[i,1]*(1-sub) + seg_pos[i+1,1]*sub
            zl = seg_pos[i,2]*(1-sub) + seg_pos[i+1,2]*sub
            linear_met.append(seg_met[i] + sub * seg_step)
            linear_dist.append(vec_len([xl,yl,zl]))

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    style_fig(fig, "Plot 10 — Catmull-Rom vs Linear Interpolation Quality (Max Curvature Segment)")
    plt.subplots_adjust(wspace=0.35)

    # Full trajectory distance for context
    ax = axes[0]
    style_ax(ax, "Distance from Earth — full trajectory", "MET (hours)", "km")
    ax.plot(met_h, dist_e, color="#00d4aa", lw=1, label="Data points")
    ax.axvspan(seg_met[0], seg_met[-1], color="#ff6b6b", alpha=0.2, label="Zoomed window")
    ax.scatter(seg_met, np.sqrt((seg_pos**2).sum(axis=1)), c="#ffd166", s=20, zorder=5)
    ax.legend(fontsize=7, labelcolor="white", facecolor="#111120")

    # Zoomed: Catmull-Rom vs linear
    ax = axes[1]
    style_ax(ax, f"Zoom: MET {seg_met[1]:.2f}–{seg_met[-2]:.2f}h\n(max curvature region)",
             "MET (hours)", "Distance from Earth (km)")
    seg_dist = np.sqrt((seg_pos**2).sum(axis=1))
    ax.plot(linear_met, linear_dist,  color="#888888", lw=1, ls="--", label="Linear interp")
    ax.plot(interp_met, interp_dist, color="#00d4aa",  lw=1.5, label="Catmull-Rom")
    ax.scatter(seg_met, seg_dist, c="#ffd166", s=30, zorder=5, label="Raw data points")
    # Difference
    lin_arr  = np.array(linear_dist)
    cr_arr   = np.array(interp_dist)
    diff_arr = np.abs(cr_arr - lin_arr)
    ax2 = ax.twinx()
    ax2.plot(interp_met, diff_arr, color="#ff6b6b", lw=0.8, ls=":", alpha=0.7)
    ax2.set_ylabel("|CR − Linear| (km)", color="#ff6b6b", fontsize=7)
    ax2.tick_params(colors="#ff6b6b", labelsize=6)
    ax.legend(fontsize=7, labelcolor="white", facecolor="#111120")

    return save(fig, "10_interpolation_quality.png")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    print(f"\n{'='*60}")
    print("Artemis 2 Visual Test Suite")
    print(f"Output directory: {OUT_DIR}")
    print(f"{'='*60}")

    traj  = load_trajectory()
    ephem = load_ephemeris()

    results = {}

    if traj:
        print("\n[01] 3-D trajectory + projections")
        results["01"] = plot_trajectory_3d(traj)

        print("[02] Trajectory physics")
        results["02"] = plot_trajectory_physics(traj, ephem)

        print("[03] Ground track")
        results["03"] = plot_groundtrack(traj, ephem)
    else:
        print("  ⚠ Skipping trajectory plots — no trajectory.json")

    if ephem:
        print("[04] Moon position & distance")
        results["04"] = plot_ephemeris_moon(ephem)

        print("[05] Sun direction & GMST")
        results["05"] = plot_ephemeris_sun_gmst(ephem)

    print("[06] Coordinate transform validation")
    results["06"] = plot_coordinate_transforms(ephem)

    if ephem:
        print("[07] Moon orientation")
        results["07"] = plot_moon_orientation(ephem)

    print("[08] Time system checks")
    results["08"] = plot_time_system()

    if traj:
        print("[09] Phase timeline")
        results["09"] = plot_phase_timeline(traj, ephem)

        print("[10] Interpolation quality")
        results["10"] = plot_interpolation_quality(traj)

    print(f"\n{'='*60}")
    print(f"Generated {len(results)} plots in {OUT_DIR}")
    print("="*60)

    return results


if __name__ == "__main__":
    main()
