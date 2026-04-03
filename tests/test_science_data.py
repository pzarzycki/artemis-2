import json
import math
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
MOON_RADIUS_KM = 1737.4


def load_json(name: str) -> dict:
    with (DATA_DIR / name).open() as fh:
        return json.load(fh)


class ScienceDataTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
