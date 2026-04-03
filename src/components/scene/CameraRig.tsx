import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraTarget } from '../../store/missionStore';
import type { Vec3 } from '../../lib/coordinates/types';
import { EARTH_RADIUS_KM, MOON_RADIUS_KM } from '../../lib/ephemeris/constants';

interface CameraRigProps {
  target: CameraTarget;
  moonPosECI: Vec3;
  spacecraftPosECI: Vec3 | null;
}

const CAMERA_PRESETS: Record<
  CameraTarget,
  (moon: Vec3, sc: Vec3 | null) => { position: THREE.Vector3; lookAt: THREE.Vector3 }
> = {
  overview: () => ({
    position: new THREE.Vector3(500_000, 200_000, 300_000),
    lookAt: new THREE.Vector3(0, 0, 0),
  }),
  earth: () => ({
    position: new THREE.Vector3(0, 0, EARTH_RADIUS_KM * 4.5),
    lookAt: new THREE.Vector3(0, 0, 0),
  }),
  moon: (moon) => ({
    position: new THREE.Vector3(
      moon[0] + MOON_RADIUS_KM * 5,
      moon[1] + MOON_RADIUS_KM * 3,
      moon[2] + MOON_RADIUS_KM * 5,
    ),
    lookAt: new THREE.Vector3(...moon),
  }),
  spacecraft: (_, sc) => {
    const pos = sc ?? [0, 0, 0];
    return {
      position: new THREE.Vector3(pos[0] + 5000, pos[1] + 2000, pos[2] + 5000),
      lookAt: new THREE.Vector3(...pos),
    };
  },
};

export default function CameraRig({ target, moonPosECI, spacecraftPosECI }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetVec = useRef(new THREE.Vector3());
  const prevTarget = useRef<CameraTarget | null>(null);

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    const preset = CAMERA_PRESETS[target](moonPosECI, spacecraftPosECI);
    camera.position.copy(preset.position);
    targetVec.current.copy(preset.lookAt);
    if (controlsRef.current) {
      controlsRef.current.target.copy(preset.lookAt);
      controlsRef.current.update();
    }
  }, [target, moonPosECI, spacecraftPosECI, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={EARTH_RADIUS_KM * 1.02} // don't go inside Earth
      maxDistance={6_000_000}
      zoomSpeed={1.2}
      rotateSpeed={0.5}
      panSpeed={0.8}
    />
  );
}
