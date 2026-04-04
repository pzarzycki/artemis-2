import { useMemo } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { useMissionStore, type LearnSection } from '../../store/missionStore';
import styles from './LearnDialog.module.css';

interface LearnDialogProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    id: 'world',
    label: '3D World',
    summary: 'Render axes, handedness, and camera conventions.',
    content: `
The app render world is **right-handed** and is used as a direct spatial realization of the selected scientific frame.

Core render rules:

- $+X$ is red
- $+Y$ is green
- $+Z$ is blue
- $+Z$ is the app-wide up axis

This means the app does **not** apply hidden handedness flips, mirror transforms, or secret axis swaps between the scientific state vectors and the rendered scene. If the selected frame says an object is at positive $Z$, it must appear on the positive blue axis in the world indicator and in all object-local debug axes.

Three.js and WebGL do not force a scientific convention for “screen up”. That is a **view** concern, not a celestial-frame concern. In this app, camera views are initialized with:

$$
\\mathbf{up}_{camera} = (0,0,1)
$$

so that the blue axis is visually “up” when a view is first established.

The camera coordinate system is also right-handed:

- local $-Z$ is the optical axis
- local $+X$ is camera-right
- local $+Y$ is camera-up

Practical consequence:

- camera **position** is a Cartesian vector in kilometers
- camera **forward** and **up** are direction vectors
- the camera panel converts those direction vectors into RA/Dec for user-facing readout

When the world indicator rotates with the view, it is showing how the camera is oriented **relative to the inertial frame**, not redefining the inertial frame itself.
`,
  },
  {
    id: 'frames',
    label: 'Frames',
    summary: 'GCRS-like motion, SPICE rotation, and body-fixed orientation.',
    content: `
Space missions use **families of coordinate systems**, not one universal frame. The correct frame depends on mission phase: launch and tracking near Earth, proximity operations in orbit, translunar cruise, planetary approach, surface operations, or deep-space navigation.

This section separates those families and states explicitly which ones are used in this app.

## 1. International celestial systems: ICRS, BCRS, GCRS

At the highest standards level, the IAU defines the modern relativistic celestial systems:

- **ICRS**: the orientation standard for celestial axes
- **BCRS**: barycentric celestial reference system, centered at the Solar-System barycenter
- **GCRS**: geocentric celestial reference system, centered at the Earth's center of mass

The important point is that **BCRS and GCRS are not just labels for translated Cartesian grids**. In the IAU framework they are coordinate systems defined within relativistic reference-system theory, with associated coordinate times and specified transformations.

Operationally, however, many NASA/ESA/JPL data products are delivered in practical inertial axes that are treated as **ICRF / J2000 / EME2000-aligned** for mission geometry work.

For this app:

- **GCRS mode** means Earth-centered inertial Cartesian coordinates
- **BCRS mode** means Solar-System-barycentric inertial Cartesian coordinates
- both modes use the same practical inertial axis orientation

So the major difference between those two modes is **origin**, not a large display rotation.

## 2. Practical inertial frames used in mission software

In SPICE and many mission tools, the dominant inertial working frame is called **J2000**. NAIF explicitly notes that modern products such as DE4xx ephemerides are effectively tied to the **ICRF**, while the frame label often remains \`J2000\` for historical compatibility.

That means the following names are often operationally treated as nearly the same orientation for spacecraft visualization and navigation software:

- ICRF
- ICRS realization
- J2000
- EME2000

They are not conceptually identical standards, but for most mission-state visualization work they are treated as the same inertial axis set to within very small rotational differences.

This app follows that practical convention for imported ephemerides and for the night-sky background registration.

## 3. Earth-fixed systems used from LEO through ground operations

For launch, tracking, ground stations, nadir geometry, maps, and surface-referenced products, the inertial frame is not enough. Earth operations use an Earth-fixed terrestrial system.

The standards chain is:

- **ITRS**: the ideal International Terrestrial Reference System
- **ITRF**: a realization of ITRS using actual station coordinates and Earth orientation products

In common engineering language this is the modern high-precision form of **ECEF**.

These systems rotate with the Earth, so they answer questions such as:

- what longitude and latitude is below the spacecraft?
- where is a ground station?
- where is Greenwich at this epoch?

This app does not use ITRF as its main render frame, but Earth texture orientation and longitude registration conceptually connect the inertial scene to terrestrial longitude/latitude.

## 4. Body-fixed planetary and lunar frames

For planets and moons, texture registration belongs to a **body-fixed** frame, not to BCRS or GCRS.

Examples:

- Earth-fixed longitude/latitude tied to terrestrial rotation
- **IAU_MOON**-style lunar body-fixed orientation
- body-fixed Mars, Europa, Titan, and other planetary cartography frames in SPICE

A body-fixed frame answers:

- where is the north pole?
- where is longitude $0^\\circ$?
- how does the prime meridian rotate with time?

So a mission display generally combines:

- **translation** from an inertial ephemeris
- **rotation** from a body-fixed orientation model

If those two are mixed carelessly, textures and axes can both look plausible while being wrong.

## 5. Local orbital frames used for rendezvous and operations

During LEO rendezvous, proximity operations, pointing analysis, and some guidance products, teams often use **local orbital frames** attached to the spacecraft state rather than a global inertial frame.

Common examples across NASA and ESA tooling include:

- **LVLH**: local vertical, local horizontal
- **RTN / RSW / RIC**: radial, transverse/in-track, normal/cross-track
- **TNW / VNC**: velocity-tangent based frames

These are not universal-name frames: the axis naming and sign conventions vary across organizations and software packages, so every mission must define them explicitly.

That is why local-frame documentation must always state the axis construction rule, for example:

- radial from central body to spacecraft
- normal along orbital angular momentum
- transverse chosen to complete the right-handed triad

This app currently exposes camera lock/orbit behavior in global inertial space, not in LVLH or RTN. But those local frames are central to real rendezvous and operations analysis.

## 6. Intermediate Earth-orientation frames

Between inertial celestial systems and Earth-fixed terrestrial systems, standards workflows use intermediate frames such as:

- celestial intermediate systems
- Earth rotation frames
- true-of-date / mean-of-date style systems
- operational legacy frames such as **TEME**

These matter in orbit determination, SGP4/TLE workflows, and precise Earth-orientation transformations. They are important to the standards story, but they are not the primary scene frames of this app.

## 7. Frames used directly by this app

The app currently uses these frame classes directly:

- **GCRS-like geocentric inertial render frame**
- **BCRS-like barycentric inertial render frame**
- **Earth body-fixed orientation**
- **Moon body-fixed orientation**
- **mean ecliptic-of-J2000 helper plane**

For the default geocentric scene:

$$
\\mathbf{r}_{Earth} = (0,0,0)
$$

by definition.

For the barycentric scene, every major state shown on screen must be expressed barycentrically:

- Earth barycentric state
- Moon barycentric state
- spacecraft barycentric state
- Sun barycentric state

That is why fake BCRS is not acceptable.

## 8. Render-space convention: WebGL / Three.js

Only after all of the scientific frame work above do we map those vectors into the app's 3D scene.

The render world is defined as:

- right-handed
- $+X$ red
- $+Y$ green
- $+Z$ blue
- $+Z$ is app-world up

The camera local frame is also right-handed:

- local $-Z$ is the viewing direction
- local $+X$ is camera-right
- local $+Y$ is camera-up

This last layer is **not** a NASA or IAU scientific standard. It is the application's rendering convention. Its job is to preserve the scientific vectors without hidden axis flips.

## Primary references

- [IAU resolutions overview for reference systems](https://iau-a3.gitlab.io/res.html)
- [NAIF SPICE Frames Required Reading](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/FORTRAN/req/frames.html)
- [NAIF notes on inertial and body-fixed frames](https://naif.jpl.nasa.gov/naif/WGC_about_the_data_r2.html)
- [IERS Conventions](https://www.iers.org/IERS/EN/DataProducts/Conventions/conventions)
- [IERS overview of ITRF / ITRS realizations](https://www.iers.org/IERS/EN/DataProducts/ITRF/itrf)
- [IAU SOFA overview](https://www.iausofa.org/about-us)
- [ESA Earth Observation CFI coordinate transformations](https://opensf.esa.int/Repo/PUBLIC/DOCUMENTATION/CFI/EOCFI/BRANCH_4X/latest/CPP-Docs/SUM/Usage_Guide/page_sub09.html)
`,
  },
  {
    id: 'data',
    label: 'Data',
    summary: 'Horizons trajectory, SPICE Moon state, and the sky map.',
    content: `
This app combines **three different data classes**, and each class has to keep its own coordinate and time contract clear.

## 1. Translational ephemerides

The Sun and Earth scene positions come from high-precision ephemeris data derived from **DE440 / SPICE-style state vectors**. The Moon translational state is computed locally from SPICE with the same inertial conventions. These are inertial **position vectors**, not texture orientations and not screen-space hints.

For each translational dataset, the minimum scientific definition is:

- **origin**
- **axis orientation**
- **units**
- **time tag**

If any one of those is wrong, the scene may still look plausible while being physically wrong.

## 2. Spacecraft trajectory

The Artemis trajectory is loaded from **JPL Horizons vector tables**. The authoritative target is \`-1024\`, and Horizons also resolves \`Artemis II\` to the same spacecraft identity. In the geocentric scene, the required contract is:

- origin: Earth center
- axes: practical \`GCRS\`-like / Earth-centered \`J2000\` / \`ICRF\`-aligned inertial axes
- distance units: kilometers
- velocity units: kilometers per second
- \`COMMAND = -1024\`
- \`CENTER = 500@399\`
- \`REF_SYSTEM = J2000\`
- vector reference plane: \`REF_PLANE=FRAME\`
- \`OUT_UNITS = KM-S\`

That query contract matters. It keeps the trajectory in the same Earth-centered inertial frame family used by the rest of the app and avoids frame-plane mistakes that can make a trajectory look "roughly right" while still producing wrong flyby geometry.

## 3. Rotational/cartographic data

Earth and Moon textures are not inertial data. They live in **body-fixed rotating frames**.

That means the app must separately answer:

- where the north pole is
- where longitude $0^\\circ$ is
- how the prime meridian rotates with time
- how the texture image is registered to that longitude/latitude grid

For the Moon, the body-fixed orientation is obtained from SPICE \`pxform("J2000", "IAU_MOON", et)\`.

So a correct scene requires **both**:

- inertial translation
- body-fixed rotation

Using only one of them is not sufficient.

## 4. Celestial background

The night-sky map is sourced from **NASA SVS Deep Star Maps 2020** in equirectangular form. Its scientific role is to encode directions on the celestial sphere using:

- right ascension
- declination
- practical ICRF / J2000 orientation

This is why the sky map must be registered to the same inertial axes as the scene frame. The background is therefore part of the coordinate system, not a decorative layer.

## 5. Time systems

The app exposes user-facing time mainly as **UTC**, but the underlying astronomical products are not all native UTC products.

The important distinction is:

- **UTC**: civil display time
- **UT1-like Earth rotation usage**: needed for Earth orientation concepts
- **TDB-like ephemeris time**: common for inertial vector products from mission/ephemeris systems

The app therefore treats "what time is displayed to the user" and "what epoch the vector product is defined at" as related but not interchangeable questions.

## 6. Practical source contract used by the app

For debugging or review, every imported dataset should be describable in a compact sentence:

- **Sun/Earth states**: inertial Cartesian vectors in an ICRF/J2000-aligned frame, evaluated at declared epochs
- **Moon translational state**: local SPICE \`spkez(MOON, et, "J2000", "NONE", EARTH)\` result in Earth-centered inertial coordinates
- **Spacecraft trajectory**: Horizons vectors for target \`-1024\` in Earth-centered inertial coordinates with declared frame-plane settings
- **Earth/Moon orientation**: rotating body-fixed orientation applied on top of translational states
- **Star map**: celestial sphere texture registered to right ascension/declination in the same inertial orientation

That is the standard we should hold the app to. If a dataset cannot be described that precisely, it is not yet documented well enough for a scientific visualization.
`,
  },
  {
    id: 'camera',
    label: 'Camera',
    summary: 'Locking, pointing, and telemetry readout.',
    content: `
The camera can lock to **Earth**, **Moon**, **spacecraft**, or **overview**.

Locking means:

- the orbit center follows the selected object
- the user can still orbit, pan, and change distance

The Camera panel reports:

- Cartesian position in kilometers
- forward direction as RA/Dec plus a tooltip vector
- up direction as RA/Dec plus a tooltip vector

Pointing input accepts decimal degrees or degree-minute forms such as 120 30 or 120:30.

Accepted examples:

- 120.5
- 120 30
- 120:30
- 120d30m

The internal conversion is:

$$
\\hat{u} =
\\begin{bmatrix}
\\cos \\delta \\cos \\alpha \\\\
\\cos \\delta \\sin \\alpha \\\\
\\sin \\delta
\\end{bmatrix}
$$

where $\\alpha$ is right ascension and $\\delta$ is declination.

Operationally:

- RA wraps through $360^\\circ$
- Dec is constrained to $[-90^\\circ, +90^\\circ]$
- the entered direction is normalized before it is used

Useful reference cases:

- $RA = 90^\\circ$, $Dec = 0^\\circ$ points along $+Y$
- $RA = 0^\\circ$, $Dec = 90^\\circ$ points along $+Z$

So the camera control is asking for a **direction on the celestial sphere**, not a target distance and not a target position. The current lock center or orbit target then determines what the camera is looking at along that direction.
`,
  },
  {
    id: 'planning',
    label: 'Planning',
    summary: 'How this relates to mission analysis products.',
    content: `
Mission navigation and planning products are **inertial state products**, not texture-space products.

JPL Horizons and SPICE provide translational states with declared:

- origin
- axes
- units
- time scale

For this project, the verified source split is:

- spacecraft trajectory: JPL Horizons target \`-1024\`
- Moon translational state: local SPICE \`spkez(MOON, et, "J2000", "NONE", EARTH)\`
- Moon orientation: local SPICE \`pxform("J2000", "IAU_MOON", et)\`

There are no analytical ephemeris fallback paths and no simulated trajectory fallback paths in the authoritative pipeline.

Body orientation, cartography, and lighting must then be attached consistently on top of those translational states.

For a mission display, scientific trust comes from preserving those contracts all the way to the screen:

1. the state vector must come from the declared source
2. the source frame must be identified correctly
3. time tags must be interpreted correctly
4. body-fixed texture registration must match the rotational model
5. debugging aids must show the same truth as the actual scene

That is why the app exposes:

- world axes
- ecliptic orientation
- object-local axes
- camera telemetry

These are not just developer decorations. They are part of validating that the display is honoring the mission geometry rather than only looking plausible.
`,
  },
] as const;

export default function LearnDialog({ onClose }: LearnDialogProps) {
  const activeTab = useMissionStore((s) => s.learnSection);
  const setLearnSection = useMissionStore((s) => s.setLearnSection);
  const activeSection = useMemo(
    () => SECTIONS.find((section) => section.id === activeTab) ?? SECTIONS[0],
    [activeTab],
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.dialog} hud-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Learn"
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.title}>Learn</div>
            <div className={styles.text}>Frames, handedness, camera axes, and where the astronomy data comes from.</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close Learn dialog">
            <svg viewBox="0 0 24 24" className={styles.closeIcon} aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.tabs} role="tablist" aria-label="Learn sections">
            {SECTIONS.map((section) => {
              const selected = section.id === activeSection.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                  onClick={() => setLearnSection(section.id as LearnSection)}
                >
                  <span className={styles.tabLabel}>{section.label}</span>
                  <span className={styles.tabSummary}>{section.summary}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>{activeSection.label}</div>
              <div className={styles.panelSummary}>{activeSection.summary}</div>
            </div>
            <div className={styles.scrollArea}>
              <MarkdownRenderer content={activeSection.content} className={styles.markdown} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
