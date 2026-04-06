import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GM_EARTH, GM_MOON, EARTH_RADIUS_KM, computeGravityFieldMaxProj } from '../../lib/gravity';

// Disk extends slightly beyond the Moon's average orbital radius
const DISK_RADIUS = 430_000; // km

// Number of triangular segments around the disk edge (higher = smoother circle)
const SEGMENTS = 256;

// Vertex shader: pass world-space position to the fragment shader
const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader: compute per-pixel gravity projection and map to colour
const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;

  uniform vec3  uEarthPos;      // Earth world position (km)
  uniform vec3  uMoonPos;       // Moon world position (km)
  uniform vec3  uEarthMoonDir;  // Unit vector Earth → Moon
  uniform float uMaxProj;       // Colour-scale normalisation (km/s²)

  // Physical constants (km³/s²)
  const float GM_EARTH = ${GM_EARTH.toFixed(4)};
  const float GM_MOON  = ${GM_MOON.toFixed(4)};

  // Minimum clamped distance to avoid 1/r² singularities (km)
  const float MIN_DIST = 500.0;

  // Fade-in edge just above Earth's surface
  const float EARTH_RADIUS = ${EARTH_RADIUS_KM.toFixed(1)};
  const float FADE_DIST    = 5000.0; // km above Earth radius

  void main() {
    // Position relative to Earth centre
    vec3 relPos  = vWorldPos - uEarthPos;
    float r_earth = max(length(relPos), MIN_DIST);

    // Vector from this point to Moon (Earth-centred coords)
    vec3 toMoon  = (uMoonPos - uEarthPos) - relPos;
    float r_moon = max(length(toMoon), MIN_DIST);

    // Gravitational acceleration magnitudes (km/s²)
    float a_earth = GM_EARTH / (r_earth * r_earth);
    float a_moon  = GM_MOON  / (r_moon  * r_moon );

    // Acceleration vectors directed towards respective bodies
    vec3 acc_earth = (-relPos / r_earth) * a_earth;
    vec3 acc_moon  = ( toMoon / r_moon ) * a_moon;

    // Project net acceleration onto the Earth-Moon axis
    // Positive  → net force towards Moon  (blue)
    // Negative  → net force towards Earth (orange)
    float proj = dot(acc_earth + acc_moon, uEarthMoonDir);

    // Normalise to [-1, 1]; values outside the range saturate to full colour
    float t    = clamp(proj / uMaxProj, -1.0, 1.0);
    float abst = abs(t);

    // Colour map: blue / black / orange
    vec3 blueColor   = vec3(0.0, 0.4, 1.0);
    vec3 orangeColor = vec3(1.0, 0.5, 0.0);
    vec3 black       = vec3(0.0, 0.0, 0.0);

    vec3 color = (t > 0.0)
      ? mix(black, blueColor,   abst)
      : mix(black, orangeColor, abst);

    // Alpha: semi-transparent throughout, stronger field → slightly more opaque
    float alpha = 0.55 * (0.15 + 0.85 * abst);

    // Smooth fade so the disk doesn't clip visibly into the Earth sphere
    float earthFade = smoothstep(EARTH_RADIUS, EARTH_RADIUS + FADE_DIST, r_earth);

    gl_FragColor = vec4(color, alpha * earthFade);
  }
`;

interface GravityFieldProps {
  earthPos: [number, number, number];
  moonPos: [number, number, number];
}

export default function GravityField({ earthPos, moonPos }: GravityFieldProps) {
  const groupRef = useRef<THREE.Group>(null!);

  // Flat disk in the XY plane; orientation is set each frame via the group
  const geometry = useMemo(
    () => new THREE.CircleGeometry(DISK_RADIUS, SEGMENTS),
    [],
  );

  // Shader material created once; uniforms are updated imperatively in useFrame
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uEarthPos:    { value: new THREE.Vector3(...earthPos) },
          uMoonPos:     { value: new THREE.Vector3(...moonPos)  },
          uEarthMoonDir:{ value: new THREE.Vector3(1, 0, 0)     },
          uMaxProj:     { value: 2e-6                           },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(() => {
    const ep = new THREE.Vector3(...earthPos);
    const mp = new THREE.Vector3(...moonPos);
    const moonRel = mp.clone().sub(ep);
    const moonDist = moonRel.length();
    if (moonDist < 1) return;

    const earthMoonDir = moonRel.clone().normalize();

    // Disk normal is perpendicular to the Earth-Moon axis and ECI-Z.
    // This orients the disk so it contains:
    //   (a) Earth centre   (b) the Moon   (c) the ECI-Z direction component
    const zAxis = new THREE.Vector3(0, 0, 1);
    const cross = new THREE.Vector3().crossVectors(earthMoonDir, zAxis);
    const diskNormal =
      cross.length() < 0.01
        ? new THREE.Vector3().crossVectors(earthMoonDir, new THREE.Vector3(0, 1, 0)).normalize()
        : cross.normalize();

    // Rotate group so local +Z maps to the computed disk normal
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    groupRef.current.quaternion.setFromUnitVectors(defaultNormal, diskNormal);
    groupRef.current.position.copy(ep);

    // Update shader uniforms
    material.uniforms.uEarthPos.value.copy(ep);
    material.uniforms.uMoonPos.value.copy(mp);
    material.uniforms.uEarthMoonDir.value.copy(earthMoonDir);

    // Dynamic normalisation: scales with Moon's distance so the transition
    // zone is always clearly visible regardless of orbital position
    material.uniforms.uMaxProj.value = computeGravityFieldMaxProj(moonDist);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
