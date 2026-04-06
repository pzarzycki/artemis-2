import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GM_EARTH,
  GM_MOON,
  EARTH_RADIUS_KM,
  MOON_RADIUS_KM,
  classifyGravityInfluence,
  computeGravityFieldMagnitudeScale,
  computeNetGravityVector,
} from '../../lib/gravity';

// Disk extends comfortably beyond the Moon's average orbital radius
const DISK_RADIUS = 550_000; // km

// Number of triangular segments around the disk edge (higher = smoother circle)
const SEGMENTS = 256;

// Sparse quiver overlay for net gravity direction on the current slice
const MAX_VECTOR_GRID_SIZE = 101;
const VECTOR_MARGIN = 0.995;
const VECTOR_WORLD_LIFT = 400;
const VECTOR_VERTICES_PER_SAMPLE = 6;
const MAX_VECTOR_SAMPLES = MAX_VECTOR_GRID_SIZE * MAX_VECTOR_GRID_SIZE;
const VECTOR_OPACITY = 0.82;
const GRID_HYSTERESIS_PX = 70;

const ORANGE = new THREE.Color('#ffb14a');
const BLUE = new THREE.Color('#73c7ff');
const NEUTRAL = new THREE.Color('#dfe6eb');

const GRID_LEVELS = [
  { grid: 7, enterPx: 0 },
  { grid: 13, enterPx: 160 },
  { grid: 21, enterPx: 260 },
  { grid: 31, enterPx: 400 },
  { grid: 43, enterPx: 620 },
  { grid: 53, enterPx: 900 },
  { grid: 61, enterPx: 1240 },
  { grid: 73, enterPx: 1640 },
  { grid: 87, enterPx: 2120 },
  { grid: 101, enterPx: 2720 },
] as const;

function selectAdaptiveGridSize(projectedDiameterPx: number, currentGridSize: number): number {
  let currentIndex = GRID_LEVELS.findIndex((level) => level.grid === currentGridSize);
  if (currentIndex === -1) {
    currentIndex = GRID_LEVELS.findLastIndex((level) => projectedDiameterPx >= level.enterPx);
    return GRID_LEVELS[Math.max(0, currentIndex)].grid;
  }

  while (
    currentIndex < GRID_LEVELS.length - 1
    && projectedDiameterPx >= GRID_LEVELS[currentIndex + 1].enterPx + GRID_HYSTERESIS_PX
  ) {
    currentIndex += 1;
  }

  while (
    currentIndex > 0
    && projectedDiameterPx < GRID_LEVELS[currentIndex].enterPx - GRID_HYSTERESIS_PX
  ) {
    currentIndex -= 1;
  }

  return GRID_LEVELS[currentIndex].grid;
}

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
  const adaptiveGridSizeRef = useRef(21);
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
    sampleRel: new THREE.Vector3(),
    netGravity: new THREE.Vector3(),
    diskEdgeWorldX: new THREE.Vector3(),
    diskEdgeWorldY: new THREE.Vector3(),
    projectedCenter: new THREE.Vector3(),
    projectedEdgeX: new THREE.Vector3(),
    projectedEdgeY: new THREE.Vector3(),
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

  const vectorOverlay = useMemo(() => {
    const positions = new Float32Array(MAX_VECTOR_SAMPLES * VECTOR_VERTICES_PER_SAMPLE * 3);
    const colors = new Float32Array(MAX_VECTOR_SAMPLES * VECTOR_VERTICES_PER_SAMPLE * 3);
    const geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(positions, 3);
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    const colorAttr = new THREE.BufferAttribute(colors, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttr);
    geometry.setAttribute('color', colorAttr);
    geometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: VECTOR_OPACITY,
      depthWrite: false,
      toneMapped: false,
    });

    return { geometry, lineMaterial, positions, colors, positionAttr, colorAttr };
  }, []);

  useFrame((state) => {
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
      sampleRel,
      netGravity,
      diskEdgeWorldX,
      diskEdgeWorldY,
      projectedCenter,
      projectedEdgeX,
      projectedEdgeY,
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
    const currentScale = Math.max(moonDist, spacecraftDist, DISK_RADIUS) / DISK_RADIUS;
    meshScale.setScalar(currentScale);
    groupRef.current.scale.copy(meshScale);

    // Update shader uniforms every frame so the field reacts to body motion
    material.uniforms.uEarthPos.value.copy(earth);
    material.uniforms.uMoonPos.value.copy(moon);

    // Dynamic strength scale keeps the Earth-Moon transition legible while the
    // hue follows which body's individual gravity is stronger at each point.
    const magnitudeScale = computeGravityFieldMagnitudeScale(moonDist);
    material.uniforms.uMagnitudeScale.value = magnitudeScale;

    const sampleRadius = DISK_RADIUS * VECTOR_MARGIN;
    projectedCenter.copy(earth).project(state.camera);
    diskEdgeWorldX
      .copy(earth)
      .addScaledVector(earthMoonDir, sampleRadius * currentScale);
    diskEdgeWorldY
      .copy(earth)
      .addScaledVector(planeYAxis, sampleRadius * currentScale);
    projectedEdgeX.copy(diskEdgeWorldX).project(state.camera);
    projectedEdgeY.copy(diskEdgeWorldY).project(state.camera);

    const projectedRadiusXPx = Math.hypot(
      (projectedEdgeX.x - projectedCenter.x) * state.size.width * 0.5,
      (projectedEdgeX.y - projectedCenter.y) * state.size.height * 0.5,
    );
    const projectedRadiusYPx = Math.hypot(
      (projectedEdgeY.x - projectedCenter.x) * state.size.width * 0.5,
      (projectedEdgeY.y - projectedCenter.y) * state.size.height * 0.5,
    );
    const projectedDiameterPx = 2 * Math.max(projectedRadiusXPx, projectedRadiusYPx);
    const activeGridSize = selectAdaptiveGridSize(
      projectedDiameterPx,
      adaptiveGridSizeRef.current,
    );
    adaptiveGridSizeRef.current = activeGridSize;

    const sampleStep = (sampleRadius * 2) / (activeGridSize - 1);
    const lineLift = VECTOR_WORLD_LIFT / currentScale;
    let vertexIndex = 0;

    for (let yi = 0; yi < activeGridSize; yi += 1) {
      const localY = -sampleRadius + yi * sampleStep;

      for (let xi = 0; xi < activeGridSize; xi += 1) {
        const localX = -sampleRadius + xi * sampleStep;
        const worldX = localX * currentScale;
        const worldY = localY * currentScale;
        const localRadius = Math.hypot(localX, localY);

        if (localRadius > sampleRadius) continue;

        sampleRel
          .copy(earthMoonDir)
          .multiplyScalar(worldX)
          .addScaledVector(planeYAxis, worldY);

        const earthDistance = sampleRel.length();
        const moonDistance = sampleRel.distanceTo(moonRel);

        if (earthDistance < EARTH_RADIUS_KM + 8_000) continue;
        if (moonDistance < MOON_RADIUS_KM + 3_000) continue;

        const net = computeNetGravityVector(
          [sampleRel.x, sampleRel.y, sampleRel.z],
          [moonRel.x, moonRel.y, moonRel.z],
        );
        netGravity.set(net[0], net[1], net[2]);

        const dirX = netGravity.dot(earthMoonDir);
        const dirY = netGravity.dot(planeYAxis);
        const dirLength = Math.hypot(dirX, dirY);
        if (dirLength < 1e-12) continue;

        const strength = netGravity.length() / (netGravity.length() + magnitudeScale);
        if (strength < 0.08) continue;

        const unitX = dirX / dirLength;
        const unitY = dirY / dirLength;
        const arrowLength = sampleStep * (0.18 + 0.5 * strength);
        const halfTail = arrowLength * 0.42;
        const tipReach = arrowLength * 0.58;
        const headLength = arrowLength * 0.28;
        const headWidth = arrowLength * 0.16;

        const baseX = localX - unitX * halfTail;
        const baseY = localY - unitY * halfTail;
        const tipX = localX + unitX * tipReach;
        const tipY = localY + unitY * tipReach;
        const headBaseX = tipX - unitX * headLength;
        const headBaseY = tipY - unitY * headLength;
        const perpX = -unitY;
        const perpY = unitX;
        const leftX = headBaseX + perpX * headWidth;
        const leftY = headBaseY + perpY * headWidth;
        const rightX = headBaseX - perpX * headWidth;
        const rightY = headBaseY - perpY * headWidth;

        const influence = classifyGravityInfluence(
          [sampleRel.x, sampleRel.y, sampleRel.z],
          [moonRel.x, moonRel.y, moonRel.z],
        );
        const color = influence === 'moon' ? BLUE : influence === 'earth' ? ORANGE : NEUTRAL;

        const segments = [
          [baseX, baseY, tipX, tipY],
          [tipX, tipY, leftX, leftY],
          [tipX, tipY, rightX, rightY],
        ];

        for (const [startX, startY, endX, endY] of segments) {
          vectorOverlay.positions[vertexIndex * 3] = startX;
          vectorOverlay.positions[vertexIndex * 3 + 1] = startY;
          vectorOverlay.positions[vertexIndex * 3 + 2] = lineLift;
          vectorOverlay.colors[vertexIndex * 3] = color.r;
          vectorOverlay.colors[vertexIndex * 3 + 1] = color.g;
          vectorOverlay.colors[vertexIndex * 3 + 2] = color.b;
          vertexIndex += 1;

          vectorOverlay.positions[vertexIndex * 3] = endX;
          vectorOverlay.positions[vertexIndex * 3 + 1] = endY;
          vectorOverlay.positions[vertexIndex * 3 + 2] = lineLift;
          vectorOverlay.colors[vertexIndex * 3] = color.r;
          vectorOverlay.colors[vertexIndex * 3 + 1] = color.g;
          vectorOverlay.colors[vertexIndex * 3 + 2] = color.b;
          vertexIndex += 1;
        }
      }
    }

    vectorOverlay.geometry.setDrawRange(0, vertexIndex);
    vectorOverlay.positionAttr.needsUpdate = true;
    vectorOverlay.colorAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
      <lineSegments geometry={vectorOverlay.geometry} material={vectorOverlay.lineMaterial} frustumCulled={false} />
    </group>
  );
}
