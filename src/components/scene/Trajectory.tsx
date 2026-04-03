import { useMemo } from 'react';
import * as THREE from 'three';
import type { TrajectoryData } from '../../lib/ephemeris/interpolate';
import type { Vec3 } from '../../lib/coordinates/types';

interface TrajectoryProps {
  trajectory: TrajectoryData | null;
  currentJD: number;
  spacecraftPosECI: Vec3;
}

export default function Trajectory({ trajectory, currentJD }: TrajectoryProps) {
  const { pastGeom, futureGeom } = useMemo(() => {
    if (!trajectory) return { pastGeom: null, futureGeom: null };

    const past: number[] = [];
    const future: number[] = [];

    const step = trajectory.intervalMinutes / (24 * 60);
    for (let i = 0; i < trajectory.count; i++) {
      const jd = trajectory.startJD + i * step;
      const p = trajectory.posECI[i];
      if (!p) continue;
      if (jd <= currentJD) {
        past.push(p[0], p[1], p[2]);
      } else {
        future.push(p[0], p[1], p[2]);
      }
    }

    const pastGeom = new THREE.BufferGeometry();
    pastGeom.setAttribute('position', new THREE.Float32BufferAttribute(past, 3));

    const futureGeom = new THREE.BufferGeometry();
    futureGeom.setAttribute('position', new THREE.Float32BufferAttribute(future, 3));

    return { pastGeom, futureGeom };
  }, [trajectory, currentJD]);

  if (!pastGeom && !futureGeom) return null;

  return (
    <group>
      {pastGeom && (
        // @ts-expect-error — R3F extends JSX with Three.js primitives
        <line geometry={pastGeom}>
          <lineBasicMaterial color={0xffd166} transparent opacity={0.85} linewidth={1} />
        </line>
      )}
      {futureGeom && (
        // @ts-expect-error — R3F extends JSX with Three.js primitives
        <line geometry={futureGeom}>
          <lineBasicMaterial color={0x4488cc} transparent opacity={0.45} linewidth={1} />
        </line>
      )}
    </group>
  );
}
