import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { CameraTarget, ReferenceFrame } from '../../store/missionStore';
import { useMissionStore } from '../../store/missionStore';
import type { Vec3 } from '../../lib/coordinates/types';
import { EARTH_RADIUS_KM, MOON_RADIUS_KM } from '../../lib/ephemeris/constants';

interface CameraRigProps {
  target: CameraTarget;
  referenceFrame: ReferenceFrame;
  earthWorld: Vec3;
  moonWorld: Vec3;
  spacecraftWorld: Vec3 | null;
}

const LERP_SPEED = 0.08;

function toVector3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2]);
}

function getLockCenter(
  target: CameraTarget,
  earthWorld: Vec3,
  moonWorld: Vec3,
  spacecraftWorld: Vec3 | null,
): THREE.Vector3 | null {
  switch (target) {
    case 'earth':
      return toVector3(earthWorld);
    case 'moon':
      return toVector3(moonWorld);
    case 'spacecraft':
      return spacecraftWorld ? toVector3(spacecraftWorld) : null;
    case 'overview':
    default:
      return null;
  }
}

function getOverviewPreset(referenceFrame: ReferenceFrame): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  if (referenceFrame === 'BCRS') {
    return {
      position: new THREE.Vector3(210_000_000, 60_000_000, 120_000_000),
      lookAt: new THREE.Vector3(0, 0, 0),
    };
  }

  return {
    position: new THREE.Vector3(500_000, 200_000, 300_000),
    lookAt: new THREE.Vector3(0, 0, 0),
  };
}

function getLockPreset(target: CameraTarget, center: THREE.Vector3): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  switch (target) {
    case 'earth':
      return {
        position: center.clone().add(new THREE.Vector3(0, 0, EARTH_RADIUS_KM * 4.5)),
        lookAt: center,
      };
    case 'moon':
      return {
        position: center.clone().add(new THREE.Vector3(MOON_RADIUS_KM * 5, MOON_RADIUS_KM * 3, MOON_RADIUS_KM * 5)),
        lookAt: center,
      };
    case 'spacecraft':
      return {
        position: center.clone().add(new THREE.Vector3(5000, 2000, 5000)),
        lookAt: center,
      };
    case 'overview':
    default:
      return {
        position: center.clone().add(new THREE.Vector3(200_000, 60_000, 120_000)),
        lookAt: center,
      };
  }
}

export default function CameraRig({
  target,
  referenceFrame,
  earthWorld,
  moonWorld,
  spacecraftWorld,
}: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const animTargetPos = useRef<THREE.Vector3 | null>(null);
  const animLookAt = useRef<THREE.Vector3 | null>(null);
  const prevTarget = useRef<CameraTarget | null>(null);
  const prevFrame = useRef<ReferenceFrame | null>(null);
  const lastLockCenter = useRef<THREE.Vector3 | null>(null);
  const lastAimRequestId = useRef<number>(0);

  useEffect(() => {
    camera.up.set(0, 0, 1);
    controlsRef.current?.update();
  }, [camera]);

  useEffect(() => {
    const targetChanged = prevTarget.current !== target;
    const frameChanged = prevFrame.current !== referenceFrame;
    prevTarget.current = target;
    prevFrame.current = referenceFrame;

    if (!targetChanged && !frameChanged) return;

    const lockCenter = getLockCenter(target, earthWorld, moonWorld, spacecraftWorld);
    const preset = lockCenter
      ? getLockPreset(target, lockCenter)
      : getOverviewPreset(referenceFrame);

    animTargetPos.current = preset.position.clone();
    animLookAt.current = preset.lookAt.clone();
    lastLockCenter.current = lockCenter ? lockCenter.clone() : null;
  }, [target, referenceFrame, earthWorld, moonWorld, spacecraftWorld]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const store = useMissionStore.getState();
    if (store.cameraAimDirection && store.cameraAimRequestId !== lastAimRequestId.current) {
      const dir = new THREE.Vector3(...store.cameraAimDirection);
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const distance = Math.max(1, camera.position.distanceTo(controls.target));
        controls.target.copy(camera.position.clone().add(dir.multiplyScalar(distance)));
        controls.update();
        animTargetPos.current = null;
        animLookAt.current = null;
      }
      lastAimRequestId.current = store.cameraAimRequestId;
    }

    if (animTargetPos.current && animLookAt.current) {
      camera.position.lerp(animTargetPos.current, LERP_SPEED);
      controls.target.lerp(animLookAt.current, LERP_SPEED);

      if (
        camera.position.distanceTo(animTargetPos.current) < 1 &&
        controls.target.distanceTo(animLookAt.current) < 1
      ) {
        camera.position.copy(animTargetPos.current);
        controls.target.copy(animLookAt.current);
        animTargetPos.current = null;
        animLookAt.current = null;
      }
      return;
    }

    const currentCenter = getLockCenter(
      target,
      earthWorld,
      moonWorld,
      spacecraftWorld,
    );

    if (!currentCenter) {
      lastLockCenter.current = null;
      return;
    }

    if (!lastLockCenter.current) {
      lastLockCenter.current = currentCenter.clone();
      return;
    }

    const delta = currentCenter.clone().sub(lastLockCenter.current);
    if (delta.lengthSq() > 0) {
      camera.position.add(delta);
      controls.target.add(delta);
      lastLockCenter.current.copy(currentCenter);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={100}
      maxDistance={6_000_000_000}
      zoomSpeed={1.1}
      rotateSpeed={0.5}
      panSpeed={0.8}
    />
  );
}
