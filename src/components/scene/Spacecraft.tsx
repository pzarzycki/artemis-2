import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/coordinates/types';
import { LocalAxes } from './DebugAxes';

interface SpacecraftProps {
  position: Vec3;
  velECI: Vec3;
}

export default function Spacecraft({ position, velECI }: SpacecraftProps) {
  const groupRef = useRef<THREE.Group>(null!);

  const SCALE = 300; // 300 km visual size (exaggerated; Orion is ~5m real)

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(...position);
    // Always face prograde
    const vel = new THREE.Vector3(...velECI);
    if (vel.length() > 0) {
      const up = new THREE.Vector3(0, 0, 1);
      if (Math.abs(vel.normalize().dot(up)) > 0.99) up.set(1, 0, 0);
      groupRef.current.lookAt(
        position[0] + velECI[0],
        position[1] + velECI[1],
        position[2] + velECI[2],
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Command Module (cone) */}
      <mesh position={[0, 0, SCALE * 0.4]}>
        <coneGeometry args={[SCALE * 0.3, SCALE * 0.5, 16]} />
        <meshStandardMaterial color={0xc8c8c8} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Service Module (cylinder) */}
      <mesh position={[0, 0, -SCALE * 0.1]}>
        <cylinderGeometry args={[SCALE * 0.25, SCALE * 0.25, SCALE * 0.6, 16]} />
        <meshStandardMaterial color={0x888899} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Solar panel left */}
      <mesh position={[-SCALE * 0.9, 0, -SCALE * 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[SCALE * 0.05, SCALE * 1.2, SCALE * 0.4]} />
        <meshStandardMaterial color={0x1a3a6a} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Solar panel right */}
      <mesh position={[SCALE * 0.9, 0, -SCALE * 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[SCALE * 0.05, SCALE * 1.2, SCALE * 0.4]} />
        <meshStandardMaterial color={0x1a3a6a} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Bright point marker for long-distance visibility */}
      <mesh>
        <sphereGeometry args={[SCALE * 0.15, 8, 4]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0x00d4aa}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <LocalAxes size={SCALE * 2.2} />
    </group>
  );
}
