import json
import math
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "assets" / "data"
KERNELS_DIR = ROOT / "scripts" / "kernels"
MOON_RADIUS_KM = 1737.4


def load_json(name: str) -> dict:
    with (DATA_DIR / name).open() as fh:
        return json.load(fh)


def jd_to_utc_iso(jd: float) -> str:
    dt = datetime.fromtimestamp((jd - 2440587.5) * 86400.0, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]


def angular_error_deg(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    mag = math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2) * math.sqrt(b[0] ** 2 + b[1] ** 2 + b[2] ** 2)
    cosang = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cosang))


class ScienceDataTests(unittest.TestCase):
    def test_planet_ephemeris_arrays_exist_and_match_sample_count(self) -> None:
        ephemeris = load_json("ephemeris.json")
        planet_keys = [
            "mercuryPosECI",
            "venusPosECI",
            "marsPosECI",
            "jupiterPosECI",
            "saturnPosECI",
        ]

        for key in planet_keys:
            self.assertIn(key, ephemeris, f"Missing {key} in ephemeris.json")
            self.assertEqual(len(ephemeris[key]), ephemeris["count"], f"{key} length does not match count")
            for vec in ephemeris[key]:
                self.assertEqual(len(vec), 3, f"{key} entry is not a 3-vector")
                self.assertTrue(all(math.isfinite(component) for component in vec), f"{key} contains a non-finite value")

    def test_sun_stays_near_ecliptic_plane(self) -> None:
        ephemeris = load_json("ephemeris.json")
        obliquity = math.radians(23.4392911)
        cos_eps = math.cos(obliquity)
        sin_eps = math.sin(obliquity)

        max_abs_ecliptic_z = 0.0
        for x, y, z in ephemeris["sunPosECI"]:
            # Equatorial -> ecliptic via rotation about +X by obliquity.
            z_ecl = -sin_eps * y + cos_eps * z
            max_abs_ecliptic_z = max(max_abs_ecliptic_z, abs(z_ecl))

        # The geocentric Sun should remain extremely close to the ecliptic plane.
        self.assertLess(max_abs_ecliptic_z, 20_000.0)

    def test_artemis_ii_closest_approach_is_lunar_flyby_scale(self) -> None:
        ephemeris = load_json("ephemeris.json")
        trajectory = load_json("trajectory.json")

        ephem_start = ephemeris["startJD"]
        ephem_step = ephemeris["intervalHours"] / 24.0
        traj_start = trajectory["startJD"]
        traj_step = trajectory["intervalMinutes"] / (24.0 * 60.0)

        min_surface_altitude_km = float("inf")
        min_sample = None

        for i, spacecraft_pos in enumerate(trajectory["posECI"]):
            jd = traj_start + i * traj_step
            moon_idx = round((jd - ephem_start) / ephem_step)
            if not (0 <= moon_idx < ephemeris["count"]):
                continue

            moon_pos = ephemeris["moonPosECI"][moon_idx]
            center_distance_km = math.dist(spacecraft_pos, moon_pos)
            surface_altitude_km = center_distance_km - MOON_RADIUS_KM

            if surface_altitude_km < min_surface_altitude_km:
                min_surface_altitude_km = surface_altitude_km
                min_sample = (i, jd, moon_idx, center_distance_km)

        self.assertIsNotNone(min_sample, "Trajectory and ephemeris windows do not overlap")

        # NASA currently describes Artemis II as flying about 4,000-6,000 miles
        # above the lunar surface, i.e. roughly 6,437-9,656 km.
        self.assertGreater(
            min_surface_altitude_km,
            6_000.0,
            f"Closest approach is unexpectedly below mission-scale flyby band: {min_surface_altitude_km:.1f} km",
        )
        self.assertLess(
            min_surface_altitude_km,
            10_000.0,
            (
                "Trajectory does not reach Artemis-II-like lunar flyby scale. "
                f"Closest approach is {min_surface_altitude_km:.1f} km above the surface "
                f"at sample {min_sample[0]} (JD {min_sample[1]:.6f})."
            ),
        )

    def test_earth_rotation_samples_match_direct_spice(self) -> None:
        try:
            import spiceypy as spice
        except ModuleNotFoundError:
            self.skipTest("spiceypy is not installed")
        ephemeris = load_json("ephemeris.json")

        kernel_paths = sorted(KERNELS_DIR.glob("*"))
        if not kernel_paths:
            self.skipTest("SPICE kernels are not available in scripts/kernels")

        for path in kernel_paths:
            spice.furnsh(str(path))

        try:
            sample_indices = [0, 1, 12, 96, 288, 576, ephemeris["count"] - 1]
            step_days = ephemeris["intervalHours"] / 24.0

            for i in sample_indices:
                jd = ephemeris["startJD"] + i * step_days
                et = spice.str2et(jd_to_utc_iso(jd))

                rot = spice.pxform("J2000", "IAU_EARTH", et)
                gmst_spice = math.atan2(-rot[1][0], rot[0][0])
                if gmst_spice < 0:
                    gmst_spice += 2 * math.pi

                gmst_data = ephemeris["gmstRad"][i] % (2 * math.pi)
                delta = ((gmst_data - gmst_spice + math.pi) % (2 * math.pi)) - math.pi

                self.assertLess(
                    abs(math.degrees(delta)),
                    1e-3,
                    f"Earth rotation sample {i} disagrees with direct SPICE by {math.degrees(delta):.6e} deg",
                )
        finally:
            spice.kclear()

    def test_moon_orientation_samples_match_direct_spice(self) -> None:
        try:
            import spiceypy as spice
        except ModuleNotFoundError:
            self.skipTest("spiceypy is not installed")
        ephemeris = load_json("ephemeris.json")

        kernel_paths = sorted(KERNELS_DIR.glob("*"))
        if not kernel_paths:
            self.skipTest("SPICE kernels are not available in scripts/kernels")

        for path in kernel_paths:
            spice.furnsh(str(path))

        try:
            sample_indices = [0, 1, 12, 96, 288, 576, ephemeris["count"] - 1]
            step_days = ephemeris["intervalHours"] / 24.0
            deg = math.pi / 180.0

            for i in sample_indices:
                jd = ephemeris["startJD"] + i * step_days
                et = spice.str2et(jd_to_utc_iso(jd))

                moon_rot = spice.pxform("J2000", "IAU_MOON", et)
                body_x_spice = (moon_rot[0][0], moon_rot[0][1], moon_rot[0][2])
                body_z_spice = (moon_rot[2][0], moon_rot[2][1], moon_rot[2][2])

                pole_ra, pole_dec, w = ephemeris["moonOrientation"][i]
                alpha = (pole_ra + 90.0) * deg
                delta = (90.0 - pole_dec) * deg
                spin = w * deg

                cz1, sz1 = math.cos(alpha), math.sin(alpha)
                cx, sx = math.cos(delta), math.sin(delta)
                cz2, sz2 = math.cos(spin), math.sin(spin)

                rz1 = (
                    (cz1, -sz1, 0.0),
                    (sz1,  cz1, 0.0),
                    (0.0,  0.0, 1.0),
                )
                rx = (
                    (1.0, 0.0, 0.0),
                    (0.0,  cx, -sx),
                    (0.0,  sx,  cx),
                )
                rz2 = (
                    (cz2, -sz2, 0.0),
                    (sz2,  cz2, 0.0),
                    (0.0,  0.0, 1.0),
                )

                def mm(a: tuple[tuple[float, float, float], ...], b: tuple[tuple[float, float, float], ...]):
                    return tuple(
                        tuple(sum(a[r][k] * b[k][c] for k in range(3)) for c in range(3))
                        for r in range(3)
                    )

                m = mm(mm(rz1, rx), rz2)
                body_x = (m[0][0], m[1][0], m[2][0])
                body_z = (m[0][2], m[1][2], m[2][2])

                self.assertLess(
                    angular_error_deg(body_z, body_z_spice),
                    1e-3,
                    f"Moon pole sample {i} disagrees with direct SPICE",
                )
                self.assertLess(
                    angular_error_deg(body_x, body_x_spice),
                    1e-3,
                    f"Moon prime-meridian axis sample {i} disagrees with direct SPICE",
                )
        finally:
            spice.kclear()


if __name__ == "__main__":
    unittest.main()
