import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/coordinates/types';
import { normalize } from '../../lib/coordinates/transforms';
import { useMissionStore } from '../../store/missionStore';
import { LocalAxes } from './DebugAxes';

interface PlanetRingConfig {
  innerRadiusKm: number;
  outerRadiusKm: number;
  color: THREE.ColorRepresentation;
  opacity?: number;
  tiltRad?: number;
}

interface PlanetProps {
  position: Vec3;
  radiusKm: number;
  visualRadiusKm?: number;
  visualDistanceKm?: number;
  color: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  glowColor?: THREE.ColorRepresentation;
  glowOpacity?: number;
  glowScale?: number;
  showAxes?: boolean;
  axesSizeKm?: number;
  ring?: PlanetRingConfig;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}

export default function Planet({
  position,
  radiusKm,
  visualRadiusKm,
  visualDistanceKm = 45_000_000,
  color,
  emissive = 0x000000,
  emissiveIntensity = 0,
  roughness = 0.9,
  metalness = 0.0,
  glowColor,
  glowOpacity = 0.18,
  glowScale = 1.14,
  showAxes = false,
  axesSizeKm,
  ring,
  onPointerOver,
  onPointerMove,
  onPointerOut,
}: PlanetProps) {
  const skyExposure = useMissionStore((state) => state.skyExposure);
  const ringRotation = useMemo<[number, number, number]>(() => [0, ring?.tiltRad ?? 0, 0], [ring?.tiltRad]);
  const dir = useMemo(() => normalize(position), [position]);
  const proxyPosition = useMemo<Vec3>(() => [
    dir[0] * visualDistanceKm,
    dir[1] * visualDistanceKm,
    dir[2] * visualDistanceKm,
  ], [dir, visualDistanceKm]);
  const proxyRadiusKm = useMemo(() => visualRadiusKm ?? Math.max(radiusKm * 0.5, 90_000), [radiusKm, visualRadiusKm]);
  const exposureScale = useMemo(() => 0.5 + skyExposure * 0.7, [skyExposure]);

  return (
    <group position={proxyPosition}>
      <mesh>
        <sphereGeometry args={[proxyRadiusKm, 64, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * exposureScale}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      <mesh onPointerOver={onPointerOver} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
        <sphereGeometry args={[proxyRadiusKm * 1.35, 32, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {glowColor && (
        <mesh>
          <sphereGeometry args={[proxyRadiusKm * glowScale, 32, 16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={Math.min(glowOpacity * exposureScale, 0.9)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {ring && (
        <mesh rotation={ringRotation}>
          <ringGeometry
            args={[
              (ring.innerRadiusKm / radiusKm) * proxyRadiusKm,
              (ring.outerRadiusKm / radiusKm) * proxyRadiusKm,
              96,
            ]}
          />
          <meshStandardMaterial
            color={ring.color}
            transparent
            opacity={Math.min((ring.opacity ?? 0.5) * (0.65 + skyExposure * 0.4), 0.95)}
            roughness={1}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <LocalAxes size={axesSizeKm ?? proxyRadiusKm * 1.6} visible={showAxes} />
    </group>
  );
}
