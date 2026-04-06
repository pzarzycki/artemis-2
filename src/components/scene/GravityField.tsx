import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GM_EARTH,
  GM_MOON,
  EARTH_RADIUS_KM,
  computeGravityFieldMagnitudeScale,
} from '../../lib/gravity';

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

// Fragment shader: compute per-pixel gravity direction and total field strength
const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;

  uniform vec3  uEarthPos;      // Earth world position (km)
  uniform vec3  uMoonPos;       // Moon world position (km)
  uniform float uMagnitudeScale; // Half-intensity reference magnitude (km/s²)

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

    vec3 net_acc = acc_earth + acc_moon;

    // Intensity uses the magnitude of the total combined field, compressed into
    // [0, 1] with a monotonic saturating response to preserve contrast.
    float total_mag = length(net_acc);
    float strength = total_mag / (total_mag + uMagnitudeScale);

    // Colour map: blue / black / orange
    vec3 blueColor   = vec3(0.0, 0.4, 1.0);
    vec3 orangeColor = vec3(1.0, 0.5, 0.0);
    vec3 black       = vec3(0.0, 0.0, 0.0);

    vec3 color = (a_moon > a_earth)
      ? mix(black, blueColor,   strength)
      : mix(black, orangeColor, strength);

    // Alpha: semi-transparent throughout, stronger field → slightly more opaque
    float alpha = 0.55 * (0.15 + 0.85 * strength);

    // Smooth fade so the disk doesn't clip visibly into the Earth sphere
    float earthFade = smoothstep(EARTH_RADIUS, EARTH_RADIUS + FADE_DIST, r_earth);

    gl_FragColor = vec4(color, alpha * earthFade);
  }
`;

interface GravityFieldProps {
  earthPos: [number, number, number];
  moonPos: [number, number, number];
  spacecraftPos: [number, number, number] | null;
}

export default function GravityField({ earthPos, moonPos, spacecraftPos }: GravityFieldProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const frameState = useMemo(() => ({
    earth: new THREE.Vector3(),
    moon: new THREE.Vector3(),
    spacecraft: new THREE.Vector3(),
    moonRel: new THREE.Vector3(),
    spacecraftRel: new THREE.Vector3(),
    planeXAxis: new THREE.Vector3(),
    planeYAxis: new THREE.Vector3(),
    planeYFallback: new THREE.Vector3(),
    planeNormal: new THREE.Vector3(),
    referenceAxis: new THREE.Vector3(),
    rotationMatrix: new THREE.Matrix4(),
    meshScale: new THREE.Vector3(1, 1, 1),
  }), []);

  // Flat disk in the XY plane; orientation is set each frame via the group
  const geometry = useMemo(
    () => new THREE.CircleGeometry(DISK_RADIUS, SEGMENTS),
    [],
  );

  // Shader material created once; uniforms are updated imperatively in useFrame.
  // earthPos/moonPos are intentionally omitted from deps: they change every frame
  // and are synced via useFrame, so recreating the material on each change would
  // be wasteful and cause GPU resource churn.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uEarthPos:        { value: new THREE.Vector3(...earthPos) },
          uMoonPos:         { value: new THREE.Vector3(...moonPos)  },
          uMagnitudeScale:  { value: 2e-6                           },
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
    const {
      earth,
      moon,
      spacecraft,
      moonRel,
      spacecraftRel,
      planeXAxis,
      planeYAxis,
      planeYFallback,
      planeNormal,
      referenceAxis,
      rotationMatrix,
      meshScale,
    } = frameState;

    earth.set(...earthPos);
    moon.set(...moonPos);
    moonRel.subVectors(moon, earth);
    const moonDist = moonRel.length();
    if (moonDist < 1) return;

    const earthMoonDir = planeXAxis.copy(moonRel).normalize();
    const spacecraftDist = spacecraftPos
      ? spacecraftRel.subVectors(spacecraft.set(...spacecraftPos), earth).length()
      : 0;

    // Rotate the disk into a stable plane that contains Earth, Moon, and the
    // spacecraft whenever the spacecraft is not collinear with the Earth-Moon axis.
    if (spacecraftDist > 1) {
      planeYFallback
        .copy(spacecraftRel)
        .addScaledVector(earthMoonDir, -spacecraftRel.dot(earthMoonDir));
    } else {
      planeYFallback.set(0, 0, 0);
    }

    if (planeYFallback.lengthSq() < 1) {
      referenceAxis.set(0, 0, 1);
      if (Math.abs(earthMoonDir.dot(referenceAxis)) > 0.98) {
        referenceAxis.set(0, 1, 0);
      }
      planeYFallback
        .copy(referenceAxis)
        .addScaledVector(earthMoonDir, -referenceAxis.dot(earthMoonDir));
    }

    planeYAxis.copy(planeYFallback).normalize();
    planeNormal.crossVectors(earthMoonDir, planeYAxis).normalize();

    rotationMatrix.makeBasis(earthMoonDir, planeYAxis, planeNormal);
    groupRef.current.position.copy(earth);
    groupRef.current.setRotationFromMatrix(rotationMatrix);
    meshScale.setScalar(Math.max(moonDist, spacecraftDist, DISK_RADIUS) / DISK_RADIUS);
    groupRef.current.scale.copy(meshScale);

    // Update shader uniforms every frame so the field reacts to body motion
    material.uniforms.uEarthPos.value.copy(earth);
    material.uniforms.uMoonPos.value.copy(moon);

    // Dynamic strength scale keeps the Earth-Moon transition legible while the
    // hue follows which body's individual gravity is stronger at each point.
    material.uniforms.uMagnitudeScale.value = computeGravityFieldMagnitudeScale(moonDist);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
