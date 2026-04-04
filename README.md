# Artemis II Tracker

![GitHub Pages](https://github.com/pzarzycki/artemis-2/actions/workflows/deploy-pages.yml/badge.svg)
![React](https://img.shields.io/badge/React-19-1d2330?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-1d2330?logo=three.js)
![Scientific Frame Spec](https://img.shields.io/badge/Frames-GCRS%20%7C%20BCRS%20%7C%20ICRS-1d2330)

Scientific WebGL mission viewer for Artemis II, with explicit handling of inertial frames, body-fixed orientations, sky-map registration, and mission timeline playback.

`react` `three.js` `webgl` `nasa horizons` `spice` `de440` `gcrs` `bcrs` `icrs` `mission visualization`

This README is the project specification and project-facing repository guide. It defines:

- the scientific coordinate and time contracts used by the app
- the meaning of each major dataset and texture
- the WebGL/rendering convention used in the viewer
- the deployment contract for the GitHub Pages build

It also states, separately and briefly, where the current implementation still deviates from that target model.

## Project Links

- Live mission viewer: https://pzarzycki.github.io/artemis-2/
- GitHub repository: https://github.com/pzarzycki/artemis-2
- GitHub Pages deployment workflow: [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
- Container build: [`Dockerfile`](./Dockerfile)

## Project Overview

The application currently renders:

- Earth
- Moon
- Sun
- Artemis II spacecraft
- mission trajectory
- celestial background sky map
- world-axis and ecliptic orientation helpers

The design goal is not a generic "solar system viewer". It is a mission-oriented scientific visualization with clear contracts for:

- frame origin
- frame orientation
- handedness
- time scale
- translational ephemerides
- body-fixed rotations
- texture registration
- camera reporting and targeting

## Deployment

The default public deployment target is GitHub Pages at:

- `https://pzarzycki.github.io/artemis-2/`

The production build therefore uses:

- `VITE_BASE_PATH=/artemis-2/`
- `VITE_APP_URL=https://pzarzycki.github.io/artemis-2/`
- `VITE_SOURCE_URL=https://github.com/pzarzycki/artemis-2`

The repository includes:

- a multi-stage [`Dockerfile`](./Dockerfile) for reproducible static builds
- a Docker-based GitHub Actions Pages workflow in [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)

For local development the app still runs at:

- `http://localhost:5173/`
- server bind: `0.0.0.0:5173`

## Large Asset Policy

Large star-map EXR files are **not** kept in git.

- local cache directory: [`public/starmaps/`](./public/starmaps/)
- supported resolutions: `4k`, `8k`, `16k`
- default runtime selection: `4k`

For local development, download the required sky maps with:

```bash
uv run python scripts/download_starmaps.py
```

To download only one resolution:

```bash
uv run python scripts/download_starmaps.py 4k
```

The Docker build performs the same download step during image build, so the runtime image remains self-contained even though the EXRs are not tracked in the repository.

## Scale and Design Goals

The scene scale is:

- `1 Three.js unit = 1 km`

The scientific problem is not just "draw some planets". It is:

- define one inertial world frame,
- define one time convention,
- define one body-fixed orientation convention for Earth,
- define one body-fixed orientation convention for Moon,
- ensure textures are registered to those body-fixed frames,
- ensure every state vector is labeled by origin, axes, units, and time scale.

## Rendering Convention

The renderer uses WebGL through Three.js / React Three Fiber.

The project-wide render convention is:

- right-handed
- `+X` = red
- `+Y` = green
- `+Z` = blue
- `+Z` is the app-wide up direction

Three.js camera convention still matters:

- an unrotated camera looks along `-Z`
- screen up is a camera/view convention, not a scientific axis
- this project explicitly sets the camera up vector to `(0, 0, 1)`
- the camera local coordinate system is right-handed
- local `-Z` is the viewing / optical axis
- local `+X` is camera-right
- local `+Y` is camera-up

Therefore the rule for this app is:

- the selected scientific Cartesian frame is mapped directly into the render world without handedness flips or hidden axis swaps
- any helper indicator shown in the app must respect that same right-handed `Z-up` convention
- camera position and world-space camera orientation vectors are reported in the currently selected scene frame
- the camera panel reports orientation primarily as `RA/Dec` angles of the corresponding world-space direction vectors
- those `RA/Dec` values are expressed in decimal degrees in the selected inertial frame, with Cartesian vectors available as secondary detail
- camera direction input accepts either decimal degrees or `deg min` sexagesimal-like pairs and is converted to a unit vector before being applied

## Learn Surface

The in-app `Learn` dialog is intended to summarize the same contracts defined here:

- render-world handedness and axis colors
- camera local axes and world-space orientation readout
- geocentric and barycentric inertial frames
- Earth-fixed and Moon-fixed rotational frames
- ephemeris/data products from SPICE, Horizons, and the celestial background map

## Primary External References

These are the authoritative external references used for the scientific model in this README:

- IERS Conventions / reference-system material:
  https://iers-conventions.obspm.fr/conventions_material.php
- IERS TN36 Chapter 2, for ICRS / BCRS / GCRS definitions:
  https://iers-conventions.obspm.fr/content/chapter2/tn36_c2.pdf
- NAIF SPICE documentation for `J2000` practical use and its alignment with `ICRF`:
  https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/ug/msopck.html
- JPL Horizons manual:
  https://ssd.jpl.nasa.gov/horizons/manual.html
- NAIF generic kernels / DE440:
  https://naif.jpl.nasa.gov/naif/data_generic.html
- NASA SVS CGI Moon Kit:
  https://svs.gsfc.nasa.gov/4720
- NASA Science, Artemis II lunar science operations:
  https://science.nasa.gov/solar-system/nasas-artemis-ii-lunar-science-operations-to-inform-future-missions/
- NASA SVS Deep Star Maps 2020:
  https://svs.gsfc.nasa.gov/4851

## 1. Main World Coordinate System

### 1.1 Default world frame

The intended default world frame is:

- Earth-centered
- inertial for rendering
- aligned to the `ICRS` axes
- represented in practical SPICE/Horizons `J2000` coordinates
- right-handed
- Cartesian
- kilometers

For this project, that means:

- origin: Earth center of mass
- `+X`: ICRS / practical `J2000` x-axis
- `+Y`: ICRS / practical `J2000` y-axis
- `+Z`: ICRS / practical `J2000` north axis

Frame properties:

- handedness: right-handed
- render orientation: identical axis directions in the app world

Important point from NAIF:

- SPICE `J2000` is treated as practically aligned with the `ICRF` for ordinary ephemeris work
- the offset is very small, below the level that matters for this visualization unless we explicitly pursue sub-arcsecond frame rigor

So the operational scene frame is:

- `Earth-centered, J2000/ICRF-aligned inertial Cartesian frame`

If the UI says `GCRS`, that should be understood in this practical sense unless and until the full relativistic/time-scale treatment is implemented.

### 1.2 Earth location in the world frame

In the default world frame:

- Earth is always at `(0, 0, 0)`

That is not an approximation. It is the definition of the geocentric scene.

### 1.3 Earth orientation in the world frame

Earth orientation is a separate question from the inertial world frame.

The world frame tells us where Earth is.
Earth rotation tells us how the Greenwich meridian and terrestrial longitudes are oriented inside that world frame.

For Earth, the intended meaning is:

- Earth spin axis is the inertial `+Z` axis
- Greenwich rotates about that axis according to Earth rotation
- the body-fixed Earth frame is mapped into the inertial frame using Earth rotation angle / Greenwich sidereal angle

Earth body-fixed convention used by this project:

- right-handed
- `+Z`: terrestrial north pole
- `+X`: equator / Greenwich meridian intersection
- `+Y`: equator / `90°E`

In the current code path, Earth rotation is represented by a single z-rotation using `gmstRad`.

### 1.4 Day zero

The current generated ephemeris file in this repo starts at:

- `JD = 2461131.5`

The app currently interprets that as:

- `2026-04-01 00:00:00 UTC`

At that epoch, the stored Earth rotation angle is:

- `gmstRad = 2.99047432 rad`
- `gmstDeg = 171.341557278°`

With the current Earth rotation convention in the code:

- the Greenwich meridian points in inertial right ascension `171.341557°`
- inertial `+X` corresponds to Earth-fixed longitude `-171.341557°`
- equivalently, inertial `+X` corresponds to longitude `188.658443°E`
- equivalently, inertial `+X` corresponds to longitude `171.341557°W`

That is the exact orientation of Earth in the current generated dataset at the current day zero.

### 1.5 Latitude / longitude convention

The current geographic convention used by the app is:

- latitude from equator toward north/south
- longitude computed by `atan2(y, x)` in Earth-fixed coordinates
- spherical Earth, not ellipsoidal WGS84

So the current geographic outputs are:

- spherical latitude
- east-positive longitude
- spherical altitude above a fixed Earth radius

That is adequate for visualization, but it is not a geodetic Earth model.

## 2. Sun Position

The Sun vector in the default scene is defined as:

- Sun center relative to Earth center
- expressed in practical `J2000` / `ICRF`-aligned coordinates
- units in kilometers

Primary source:

- SPICE `DE440`
- obtained in the pipeline with target `Sun`, observer `Earth center`, frame `"J2000"`

Meaning:

- this is a geocentric inertial Sun state
- it is not heliocentric
- it is not barycentric
- when rotated into mean ecliptic-of-J2000 coordinates, it should remain close to the ecliptic plane

What the app uses this vector for:

- main directional light
- visible Sun marker
- day/night illumination direction on Earth and Moon

Those three uses must always come from the same Sun vector.

### 2.1 Celestial Background

The night-sky background must use a celestial map whose coordinates are aligned with the same inertial axes as the rest of the scene.

Authoritative source used here:

- NASA SVS Deep Star Maps 2020 celestial map

NASA states that this map uses:

- plate carrée projection
- celestial `ICRF/J2000` geocentric right ascension and declination
- map center at `0h` right ascension
- right ascension increasing to the left

App mapping rule:

- world `+X` = `RA 0h`, `Dec 0°`
- world `+Y` = `RA 6h`, `Dec 0°`
- world `+Z` = north celestial pole

Because the NASA map has right ascension increasing to the left, the texture must be mirrored horizontally when applied to the inside of the sky sphere so that increasing right ascension matches the app's right-handed `+X/+Y/+Z` world convention.

## 3. Moon Position and Orientation

### 3.1 Moon position

The Moon vector in the default scene is defined as:

- Moon center relative to Earth center
- expressed in practical `J2000` / `ICRF`-aligned coordinates
- units in kilometers

Primary source:

- SPICE `DE440`
- obtained in the pipeline with target `Moon`, observer `Earth center`, frame `"J2000"`

Meaning:

- this is a geocentric inertial Moon state
- it is not Earth-Moon barycenter relative
- it is not Solar System barycenter relative

### 3.2 Moon orientation

Moon orientation is not determined by the translational Moon position.
It is determined by a lunar body-fixed rotational model.

The intended lunar orientation model is:

- IAU lunar pole and prime meridian convention

Authoritative practical source:

- SPICE `IAU_MOON` body-fixed frame, if available from the loaded kernel set

Fallback analytical source:

- IAU 2009 lunar orientation expressions for:
  - pole right ascension
  - pole declination
  - prime meridian angle `W`

The orientation pipeline therefore means:

- first define the Moon-fixed frame from pole and prime meridian
- then rotate that Moon-fixed frame into the inertial world frame
- then apply the lunar albedo/normal textures in that Moon-fixed frame

Moon body-fixed convention used by this project:

- right-handed
- `+Z`: lunar north pole
- `+X`: lunar prime meridian on the equator
- `+Y`: equator / `90°E`

### 3.3 Moon texture registration

The Moon texture is not arbitrary decoration.
It is part of the Moon-fixed frame definition.

The intended texture convention is:

- equirectangular longitude-latitude map
- north at top
- south at bottom
- longitude `0°` aligned with the lunar prime meridian

Source-backed fact:

- the NASA SVS CGI Moon Kit page states that the published Moon map is centered on `0° longitude`

That is exactly the cartographic condition needed for a correct Moon-fixed texture.

## 4. Spacecraft Trajectory

The spacecraft trajectory in the default scene is defined as:

- spacecraft relative to Earth geocenter
- expressed in practical `J2000` / `ICRF`-aligned coordinates
- position in km
- velocity in km/s

Primary source:

- JPL Horizons vector tables

The Horizons configuration used for this project is geocentric:

- `EPHEM_TYPE = VECTORS`
- `CENTER = 500@399`
- `REF_SYSTEM = J2000`
- `REF_PLANE = FRAME`
- `OUT_UNITS = KM-S`

That means:

- origin = Earth center
- axes = `J2000`
- state = geocentric inertial
- units = km and km/s

This is the correct source class for the spacecraft trajectory in the geocentric world view.

Mission-validity condition for this dataset:

- NASA currently describes Artemis II closest approach as about `4,000 to 6,000 miles` above the Moon’s surface
- that is about `6,437 to 9,656 km` above the lunar surface
- a trajectory file that never reaches that band is not acceptable as an Artemis II trajectory for this app

### 4.1 Spacecraft orientation

The spacecraft's rendered orientation is a different problem from its translational state.

At present, unless a true attitude product is available, the spacecraft orientation is a visualization rule:

- point the model approximately along the velocity vector

That is acceptable as a debug visualization, but it must not be described as true spacecraft attitude unless a real attitude source is added.

## 5. BCRS: What It Means and What It Requires

This is the most important place where translation, orientation, and time must not be hand-waved.

### 5.1 What BCRS means

`BCRS` is the barycentric celestial reference system:

- origin at the Solar System barycenter
- axes aligned with the `ICRS`

So in a practical app:

- the axes remain essentially `ICRS` / practical `J2000`
- the origin changes from Earth center to Solar System barycenter
- the state vectors for Earth, Moon, Sun, and spacecraft must all be recomputed or transformed into that same barycentric frame
- time handling must remain consistent

### 5.2 What is needed for a true barycentric mode

To render a true barycentric scene, the project needs:

- `Earth_BCRS(t)` = Earth center relative to Solar System barycenter
- `Moon_BCRS(t)` = Moon center relative to Solar System barycenter
- `Sun_BCRS(t)` = Sun center relative to Solar System barycenter, or a barycentric Sun state directly from the ephemeris
- `SC_BCRS(t)` = spacecraft relative to Solar System barycenter

All of these must be evaluated at the same epoch in the same time convention.

### 5.3 How the geocentric states relate to barycentric states

Ignoring the deeper relativistic distinctions for a moment, the spatial relation is:

- `Moon_BCRS(t) = Earth_BCRS(t) + Moon_geocentric(t)`
- `SC_BCRS(t) = Earth_BCRS(t) + SC_geocentric(t)`

This is only valid if:

- all vectors are expressed in the same aligned axes
- all vectors are evaluated at the same epoch
- all time tags have already been converted consistently

If one dataset is tagged in UTC-like JD and another in TDB JD but the app treats both as the same scalar, the resulting barycentric scene is wrong even if the vector addition looks algebraically correct.

### 5.4 What changes in BCRS mode

In a true barycentric mode:

- Earth is no longer at the origin
- Moon is no longer geocentric by construction
- spacecraft is no longer geocentric by construction
- the Sun is no longer just a geocentric direction vector

Therefore:

- every trajectory in the scene changes
- the Earth, Moon, and spacecraft translational states all need barycentric forms
- only body rotation models remain attached to the bodies themselves

The Earth texture still represents Earth-fixed longitude.
The Moon texture still represents Moon-fixed longitude.
Barycentric mode changes body positions, not the meaning of the body-fixed texture grids.

## Frame Inventory and Handedness

The frames used or planned in this project are:

- app render world: right-handed, `+Z` up
- practical geocentric inertial frame (`GCRS` in the UI): right-handed, Earth-centered, `J2000/ICRF`-aligned
- practical barycentric inertial frame (`BCRS` in the UI): right-handed, Solar System barycenter origin, `J2000/ICRF`-aligned
- Earth body-fixed frame: right-handed, rotating with Earth
- Moon body-fixed frame: right-handed, rotating with Moon
- mean ecliptic-of-J2000 helper frame: right-handed, obtained from the equatorial frame by rotation about `+X` by the obliquity

This means the ecliptic helper in the app must obey:

- it contains the `+X` axis
- it is not defined by rotation about `+Y`
- its normal is the equatorial `+Z` axis rotated toward `-Y` by the obliquity in this convention

## Time System

This project cannot be scientifically correct without a declared time convention.

### User-facing time

The UI uses:

- UTC

That is correct for:

- mission event labels
- readable timestamps
- mission elapsed time display

### Ephemeris time

The underlying ephemeris sources are not plain UTC clocks.

For SPICE and Horizons state vectors, the practical dynamical time convention is:

- TDB-like ephemeris time

Source-backed fact:

- Horizons vector epochs are reported in `JDTDB`

That means:

- trajectory epochs are not plain UTC Julian dates

Source-backed runtime check in this repo:

- trajectory start `JD 2461132.584028`, interpreted correctly as `JDTDB`, corresponds to about `2026-04-02T01:59:50.834 UTC`

Source-backed runtime check in this repo for the current SPICE generation path:

- taking a UTC-derived JD and feeding it to SPICE as `JDTDB` creates about a `69.186 s` offset around `2026-04-01`

That is a real issue in the current pipeline.

The scientific rule is therefore:

- UI time may be UTC
- ephemeris lookup time must be explicitly converted to the ephemeris time scale before state-vector evaluation

### Earth rotation time

Earth rotation is not driven by TDB.
Earth longitude orientation belongs to Earth rotation, which is conventionally tied to:

- UT1 / Earth rotation angle / sidereal angle

For a physically rigorous Earth texture orientation, the app must distinguish:

- inertial ephemeris lookup time
- Earth rotation time

## Texture and Cartography Requirements

## Earth

The Earth texture stack must be treated as a single registered cartographic product:

- day map
- night map
- clouds
- normal map
- specular map

All of them must share:

- the same projection
- the same zero meridian
- the same north-up orientation

In this project, the current code assumes:

- equirectangular Earth maps
- prime meridian at the horizontal center of the map
- map center aligned to body `+X`

That assumption must be verified against the actual Earth texture source metadata if we want to claim the Earth texture is scientifically registered.

At the moment, the Moon texture registration is better documented than the Earth texture registration.

## Moon

The Moon texture stack is intended to be:

- equirectangular
- north-up
- `0°` longitude correctly centered
- normal map aligned to the exact same grid as the color map

This requirement is strict because Moon orientation debugging depends on it.

## Debugging Aids

For scientific debugging, the scene should always expose:

- a small world-axis indicator in the top-right
- Earth local axes
- Moon local axes
- spacecraft local axes

These are not cosmetic.
They are the easiest way to verify:

- inertial frame orientation
- body-fixed orientation
- synthetic spacecraft local orientation

## Data Products

## `ephemeris.json`

Intended meaning:

- `moonPos...`: Moon relative to Earth center, inertial geocentric frame
- `sunPos...`: Sun relative to Earth center, inertial geocentric frame
- `earthPosBCRS`: Earth relative to Solar System barycenter, barycentric inertial frame
- `gmstRad` or equivalent Earth orientation quantity: Earth rotation for Earth-fixed longitude mapping
- `moonOrientation`: Moon pole and prime meridian orientation

## `trajectory.json`

Intended meaning:

- spacecraft position relative to Earth center
- spacecraft velocity relative to Earth center
- epoch tags associated with the declared ephemeris time convention
- mission phase metadata for UI annotation

## Current Implementation Status

This section is intentionally brief. The scientific model above is the target meaning of the project.

Current known deviations in this repo:

- the app currently mixes UTC-derived Julian dates with TDB-tagged ephemeris/trajectory sources
- the current `BCRS` selector is translation-only, not a true barycentric recomputation of all bodies
- Earth geographic outputs are spherical, not geodetic
- Earth texture zero-meridian registration is still assumed by the current pipeline rather than fully proven from source metadata

## Scientific Model Summary

### 1. Main coordinate system

The app's intended main scene is:

- Earth-centered
- inertial
- `ICRS` / practical `J2000` aligned
- kilometers

Earth is at the origin.
Earth orientation is applied separately through Earth rotation.
At the current generated day zero `JD 2461131.5`, the stored Earth rotation angle is `171.341557278°`, which means the Greenwich meridian points at that inertial angle.

### 2. Sun position

The Sun vector should be:

- Sun relative to Earth center
- from SPICE `DE440` or equivalent Horizons geocentric vector data
- in practical `J2000` / `ICRF`-aligned coordinates

### 3. Moon position

The Moon vector should be:

- Moon relative to Earth center
- from SPICE `DE440`
- in practical `J2000` / `ICRF`-aligned coordinates

Moon rotation is separate and should come from the IAU lunar body-fixed model or SPICE `IAU_MOON`.

### 4. Spacecraft trajectory

The spacecraft trajectory should be:

- spacecraft relative to Earth center
- from Horizons geocentric vector tables
- in practical `J2000` coordinates
- with epochs treated as `JDTDB`, not as naive UTC JD

### 5. BCRS

A true `BCRS` mode requires:

- Earth barycentric state
- Moon barycentric state
- spacecraft barycentric state
- consistent time conversion

It is not just a translation.
Every body trajectory changes.
Body textures do not change meaning, but all translational states must be recomputed in the barycentric frame.
