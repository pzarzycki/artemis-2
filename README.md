# Artemis II Tracker

A real-time 3D spacecraft tracker for the NASA Artemis II mission — the first crewed lunar flyby since Apollo 17.

Built with React + React Three Fiber (WebGL), true-scale Earth/Moon/spacecraft at 1 unit = 1 km.

## Features

- **3D scene** — Earth (day/night textures + normal map), Moon (LROC textures + IAU orientation), Sun (directional light + bloom), Orion spacecraft, trajectory lines
- **True scale** — Earth radius 6,371 km, Moon at ~384,400 km, logarithmic depth buffer handles the scale
- **Accurate ephemeris** — Moon and Sun positions from SPICE DE440 kernels (analytical fallback available)
- **Earth/Moon orientation** — GMST-driven Earth rotation, IAU 2009 Moon orientation model
- **Live + scrub modes** — follow real time or scrub the mission timeline
- **Coordinate library** — ECI J2000 ↔ ECEF ↔ Ecliptic transforms, GMST, geographic lat/lon/alt
- **HUD** — status bar, timeline with mission phase bands, info panel, camera presets

## Quick Start

### 1. Install Node.js dependencies

```bash
npm install
```

### 2. Set up Python (requires [uv](https://github.com/astral-sh/uv))

```bash
uv sync
```

### 3. Generate data

```bash
# Download Earth + Moon textures (default 4K; use --quality 8K for high res)
uv run python scripts/download_textures.py --quality 4K

# Compute ephemeris (Moon, Sun, Earth rotation) for the mission window
uv run python scripts/fetch_ephemeris.py --start 2026-09-10 --days 18

# Fetch or simulate the Artemis 2 trajectory
# Tries JPL Horizons first; falls back to simulated free-return trajectory
uv run python scripts/fetch_trajectory.py

# For higher-accuracy ephemeris using SPICE kernels:
uv run python scripts/fetch_ephemeris.py --start 2026-09-10 --days 18
# (spiceypy will automatically download the required SPICE kernels)
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
```

## Project Structure

```
artemis-2/
├── src/
│   ├── components/
│   │   ├── scene/          # 3D scene (R3F components)
│   │   │   ├── Scene.tsx   # Main Canvas setup
│   │   │   ├── Earth.tsx   # Earth with day/night/normal textures + GMST rotation
│   │   │   ├── Moon.tsx    # Moon with textures + IAU 2009 orientation
│   │   │   ├── Sun.tsx     # Directional light + distant glow sphere
│   │   │   ├── Spacecraft.tsx  # Orion capsule mesh
│   │   │   ├── Trajectory.tsx  # Past/future trajectory lines
│   │   │   ├── Starfield.tsx   # Background star field
│   │   │   └── CameraRig.tsx   # OrbitControls + camera presets
│   │   └── ui/             # HUD overlays
│   │       ├── Layout.tsx  # Full-screen layout container
│   │       ├── StatusBar.tsx   # UTC time + MET + live indicator
│   │       ├── Timeline.tsx    # Scrubber with mission phase bands
│   │       ├── InfoPanel.tsx   # Altitude, speed, distances
│   │       ├── CameraPresets.tsx  # Overview/Earth/Moon/Track buttons
│   │       └── ModeToggle.tsx  # Live / Scrub mode switch
│   ├── hooks/              # Data hooks
│   │   ├── useMissionTime.ts   # Live clock or scrub time
│   │   ├── useEphemeris.ts     # Moon/Sun/Earth state at given JD
│   │   └── useTrajectory.ts    # Spacecraft state at given JD
│   ├── lib/
│   │   ├── coordinates/    # Coordinate system transforms
│   │   │   ├── gmst.ts     # Greenwich Mean Sidereal Time
│   │   │   ├── transforms.ts   # ECI ↔ ECEF ↔ Ecliptic
│   │   │   └── moonOrientation.ts  # IAU 2009 Moon orientation
│   │   ├── ephemeris/
│   │   │   ├── constants.ts    # Physical constants (km)
│   │   │   └── interpolate.ts  # Catmull-Rom interpolation
│   │   └── time.ts         # UTC ↔ Julian Date, MET formatting
│   └── store/
│       └── missionStore.ts # Zustand state (mode, time, camera)
├── scripts/                # Python build-time data pipeline
│   ├── download_textures.py    # NASA texture downloads
│   ├── fetch_ephemeris.py      # SPICE/analytical ephemeris
│   ├── fetch_trajectory.py     # JPL Horizons / simulated trajectory
│   └── utils.py            # Shared utilities
├── public/
│   ├── textures/           # Downloaded by Python (not committed)
│   └── data/               # Generated JSON (not committed)
└── pyproject.toml          # Python dependencies (uv)
```

## Coordinate System

All internal coordinates use **Earth-Centered Inertial J2000 (ECI)** frame:
- Origin: Earth center of mass
- Z axis: Earth north celestial pole (J2000 epoch)
- X axis: Vernal equinox (J2000)
- Units: **kilometers**

Three.js scene scale: **1 unit = 1 km**

| Transform | Function |
|---|---|
| ECI → ECEF | `eciToEcef(pos, gmst)` |
| ECEF → ECI | `ecefToEci(pos, gmst)` |
| ECI → Ecliptic | `eciToEcliptic(pos)` |
| ECI → Lat/Lon/Alt | `eciToGeographic(pos, gmst)` |

## Data Sources

| Data | Source | License |
|---|---|---|
| Moon/Sun ephemeris | [NASA NAIF SPICE DE440](https://naif.jpl.nasa.gov/naif/data_generic.html) | Public domain |
| Spacecraft trajectory | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Public domain |
| Earth day texture | [NASA Blue Marble](https://visibleearth.nasa.gov/images/74117) | Public domain |
| Earth night texture | [NASA Black Marble](https://visibleearth.nasa.gov/images/144897) | Public domain |
| Moon texture | [LROC CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | Public domain |

## Notes

- The Artemis 2 spacecraft will be assigned a JPL Horizons target ID when trajectory data is published by NASA. Update `ARTEMIS2_HORIZONS_ID` in `scripts/fetch_trajectory.py`.
- The simulated trajectory (`--source simulated`) is a rough free-return trajectory for development only.
- SPICE kernel downloads (~100 MB for DE440s) happen automatically on first run of `fetch_ephemeris.py` and are cached in `scripts/kernels/` (not committed to git).
