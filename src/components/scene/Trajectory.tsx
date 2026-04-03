import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrajectoryData } from '../../lib/ephemeris/interpolate';
import type { Vec3 } from '../../lib/coordinates/types';

interface TrajectoryProps {
  trajectory: TrajectoryData | null;
  currentJD: number;
  worldOffset: Vec3;
}

export default function Trajectory({ trajectory, currentJD, worldOffset }: TrajectoryProps) {
  const pastLineRef = useRef<THREE.Line | null>(null);
  const futureLineRef = useRef<THREE.Line | null>(null);

  const splitIdx = useMemo(() => {
    if (!trajectory) return 0;
    const step = trajectory.intervalMinutes / (24 * 60);
    const raw = (currentJD - trajectory.startJD) / step;
    return Math.max(0, Math.min(trajectory.count, Math.floor(raw) + 1));
  }, [trajectory, currentJD]);

  const { pastGeometry, futureGeometry } = useMemo(() => {
    if (!trajectory) return { pastGeometry: null, futureGeometry: null };

    const positions: number[] = [];

    for (let i = 0; i < trajectory.count; i++) {
      const p = trajectory.posECI[i];
      if (!p) continue;
      positions.push(p[0] + worldOffset[0], p[1] + worldOffset[1], p[2] + worldOffset[2]);
    }

    const attribute = new THREE.Float32BufferAttribute(positions, 3);
    const pastGeometry = new THREE.BufferGeometry();
    const futureGeometry = new THREE.BufferGeometry();
    pastGeometry.setAttribute('position', attribute);
    futureGeometry.setAttribute('position', attribute.clone());
    return { pastGeometry, futureGeometry };
  }, [trajectory, worldOffset]);

  // Dispose GPU resources when geometries are replaced
  useEffect(() => {
    return () => {
      pastGeometry?.dispose();
      futureGeometry?.dispose();
    };
  }, [pastGeometry, futureGeometry]);

  useFrame(() => {
    if (!pastGeometry || !futureGeometry) return;
    const pointCount = pastGeometry.attributes.position.count;
    const clampedSplit = Math.max(0, Math.min(pointCount, splitIdx));

    if (pastLineRef.current) {
      pastLineRef.current.geometry.setDrawRange(0, clampedSplit);
    }
    if (futureLineRef.current) {
      futureLineRef.current.geometry.setDrawRange(
        Math.max(0, clampedSplit - 1),
        Math.max(0, pointCount - clampedSplit + 1),
      );
    }
  });

  if (!pastGeometry || !futureGeometry || pastGeometry.attributes.position.count < 2) return null;

  return (
    <group>
      {/* @ts-expect-error — R3F extends JSX with Three.js primitives */}
      <line ref={pastLineRef} geometry={pastGeometry}>
        <lineBasicMaterial color={0xffd166} transparent opacity={0.85} linewidth={1} />
      </line>
      {/* @ts-expect-error — R3F extends JSX with Three.js primitives */}
      <line ref={futureLineRef} geometry={futureGeometry}>
        <lineBasicMaterial color={0x4488cc} transparent opacity={0.45} linewidth={1} />
      </line>
    </group>
  );
}
