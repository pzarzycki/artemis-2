import { julianCenturies } from '../time';

/**
 * IAU 2009 Moon orientation model.
 * Returns pole right ascension (α₀), pole declination (δ₀), and prime meridian (W)
 * all in degrees, as a function of Julian Date.
 *
 * Source: IAU Working Group on Cartographic Coordinates and Rotational Elements 2009.
 */
export interface MoonOrientation {
  /** Right ascension of the north pole (degrees) */
  poleRA: number;
  /** Declination of the north pole (degrees) */
  poleDec: number;
  /** Prime meridian angle W (degrees) */
  W: number;
}

export function getMoonOrientation(jd: number): MoonOrientation {
  const T = julianCenturies(jd);
  const d = jd - 2_451_545.0; // days since J2000

  // IAU 2009 expressions
  const E1  = (125.045 -  0.0529921 * d) * (Math.PI / 180);
  const E2  = (250.089 -  0.1059842 * d) * (Math.PI / 180);
  const E3  = (260.008 + 13.0120009 * d) * (Math.PI / 180);
  const E4  = (176.625 + 13.3407154 * d) * (Math.PI / 180);
  const E5  = (357.529 +  0.9856003 * d) * (Math.PI / 180);
  const E6  = (311.589 + 26.4057084 * d) * (Math.PI / 180);
  const E7  = (134.963 + 13.0649930 * d) * (Math.PI / 180);
  const E8  = (276.617 +  0.3287146 * d) * (Math.PI / 180);
  const E9  = ( 34.226 +  1.7484877 * d) * (Math.PI / 180);
  const E10 = ( 15.134 -  0.1589763 * d) * (Math.PI / 180);
  const E11 = (119.743 +  0.0036096 * d) * (Math.PI / 180);
  const E12 = (239.961 +  0.1643573 * d) * (Math.PI / 180);
  const E13 = ( 25.053 + 12.9590088 * d) * (Math.PI / 180);

  const poleRA =
    269.9949 +
    0.0031 * T -
    3.8787 * Math.sin(E1) -
    0.1204 * Math.sin(E2) +
    0.0700 * Math.sin(E3) -
    0.0172 * Math.sin(E4) +
    0.0072 * Math.sin(E6) -
    0.0052 * Math.sin(E10) +
    0.0043 * Math.sin(E13);

  const poleDec =
    66.5392 +
    0.0130 * T +
    1.5419 * Math.cos(E1) +
    0.0239 * Math.cos(E2) -
    0.0278 * Math.cos(E3) +
    0.0068 * Math.cos(E4) -
    0.0029 * Math.cos(E6) +
    0.0009 * Math.cos(E7) +
    0.0008 * Math.cos(E10) -
    0.0009 * Math.cos(E13);

  const W =
    38.3213 +
    13.17635815 * d -
    1.4e-12 * d * d +
    3.5610 * Math.sin(E1) +
    0.1208 * Math.sin(E2) -
    0.0642 * Math.sin(E3) +
    0.0158 * Math.sin(E4) +
    0.0252 * Math.sin(E5) -
    0.0066 * Math.sin(E6) -
    0.0047 * Math.sin(E7) -
    0.0046 * Math.sin(E8) +
    0.0028 * Math.sin(E9) +
    0.0052 * Math.sin(E10) +
    0.0040 * Math.sin(E11) +
    0.0019 * Math.sin(E12) -
    0.0044 * Math.sin(E13);

  return { poleRA, poleDec, W };
}
