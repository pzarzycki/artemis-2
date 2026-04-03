import { useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/coordinates/types';
import { normalize } from '../../lib/coordinates/transforms';

interface SunProps {
  position: Vec3;
}

export default function Sun({ position }: SunProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);

  // Very distant visual sphere for the Sun glow (never get close to it)
  const SUN_VISUAL_DIST = 40_000_000; // 40M km in scene
  const dir = normalize(position);
  const sunVisualPos: [number, number, number] = [
    dir[0] * SUN_VISUAL_DIST,
    dir[1] * SUN_VISUAL_DIST,
    dir[2] * SUN_VISUAL_DIST,
  ];

  return (
    <>
      {/* Primary directional light */}
      <directionalLight
        ref={lightRef}
        position={position}
        intensity={1.6}
        color={0xfff5e0}
        castShadow={false}
      />
      {/* Visual Sun sphere — marked as emissive for bloom */}
      <mesh ref={sphereRef} position={sunVisualPos}>
        <sphereGeometry args={[300_000, 16, 8]} />
        <meshStandardMaterial
          color={0xfffbe0}
          emissive={0xffee88}
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
