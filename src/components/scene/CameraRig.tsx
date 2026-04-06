import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { AnchorTarget, AnchorTargetSwitchMode, LookTarget, ReferenceFrame } from '../../store/missionStore';
import { useMissionStore } from '../../store/missionStore';
import type { Vec3 } from '../../lib/coordinates/types';
import { MOON_RADIUS_KM } from '../../lib/ephemeris/constants';

interface CameraRigProps {
  anchorTarget: AnchorTarget;
  anchorTargetSwitchMode: AnchorTargetSwitchMode;
  lookTarget: LookTarget;
  referenceFrame: ReferenceFrame;
  sunWorld: Vec3;
  earthWorld: Vec3;
  moonWorld: Vec3;
  spacecraftWorld: Vec3 | null;
  consumeAnchorTargetSwitchMode: () => void;
}

const DEFAULT_LERP_SPEED = 0.08;
const SPACECRAFT_LERP_SPEED = 0.14;
const DEFAULT_CAMERA_NEAR_KM = 0.1;
const SPACECRAFT_CAMERA_NEAR_KM = 0.0005;
const DEFAULT_MIN_DISTANCE_KM = 100;
const SPACECRAFT_MIN_DISTANCE_KM = 12;
const DEFAULT_WHEEL_STEP_RATIO = 0.08;
const SPACECRAFT_WHEEL_STEP_RATIO = 0.08;
const DEFAULT_WHEEL_STEP_FLOOR_KM = 1;
const SPACECRAFT_WHEEL_STEP_FLOOR_KM = 2;
const DEFAULT_AIM_DISTANCE_FLOOR_KM = 1;
const SPACECRAFT_AIM_DISTANCE_FLOOR_KM = 12;
const DEFAULT_ANIMATION_SNAP_DISTANCE_KM = 1;
const SPACECRAFT_ANIMATION_SNAP_DISTANCE_KM = 1;
const WORLD_UP = new THREE.Vector3(0, 0, 1);
const EARTH_CAMERA_OFFSET = new THREE.Vector3(15_000, 15_000, 17_000);
const SPACECRAFT_CAMERA_OFFSET = new THREE.Vector3(90, 45, 60);

function toVector3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2]);
}

function getAnchorCenter(
  anchorTarget: AnchorTarget,
  earthWorld: Vec3,
  moonWorld: Vec3,
  spacecraftWorld: Vec3 | null,
): THREE.Vector3 | null {
  switch (anchorTarget) {
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

function getAnchorPreset(anchorTarget: AnchorTarget, center: THREE.Vector3): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  switch (anchorTarget) {
    case 'earth':
      return {
        position: center.clone().add(EARTH_CAMERA_OFFSET),
        lookAt: center,
      };
    case 'moon':
      return {
        position: center.clone().add(new THREE.Vector3(MOON_RADIUS_KM * 5, MOON_RADIUS_KM * 3, MOON_RADIUS_KM * 5)),
        lookAt: center,
      };
    case 'spacecraft':
      return {
        position: center.clone().add(SPACECRAFT_CAMERA_OFFSET),
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
  anchorTarget,
  anchorTargetSwitchMode,
  lookTarget: _lookTarget,
  referenceFrame,
  sunWorld: _sunWorld,
  earthWorld,
  moonWorld,
  spacecraftWorld,
  consumeAnchorTargetSwitchMode,
}: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef(camera);
  const animTargetPos = useRef<THREE.Vector3 | null>(null);
  const animLookAt = useRef<THREE.Vector3 | null>(null);
  const animLockOffset = useRef<THREE.Vector3 | null>(null);
  const prevAnchorTarget = useRef<AnchorTarget | null>(null);
  const prevFrame = useRef<ReferenceFrame | null>(null);
  const lastAnchorCenter = useRef<THREE.Vector3 | null>(null);
  const lastAimRequestId = useRef<number>(0);

  const cancelAnimatedMove = () => {
    animTargetPos.current = null;
    animLookAt.current = null;
    animLockOffset.current = null;
  };

  const syncControls = useCallback(() => {
    cameraRef.current.up.copy(WORLD_UP);
    controlsRef.current?.update();
  }, []);

  const translateAlongView = useCallback((deltaY: number) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const forward = new THREE.Vector3();
    cameraRef.current.getWorldDirection(forward);
    if (forward.lengthSq() === 0) return;

    const toTarget = controls.target.clone().sub(cameraRef.current.position);
    const distanceToTarget = toTarget.length();
    const minApproach = anchorTarget === 'spacecraft' ? SPACECRAFT_MIN_DISTANCE_KM : DEFAULT_MIN_DISTANCE_KM;
    const stepFloor = anchorTarget === 'spacecraft' ? SPACECRAFT_WHEEL_STEP_FLOOR_KM : DEFAULT_WHEEL_STEP_FLOOR_KM;
    const stepRatio = anchorTarget === 'spacecraft' ? SPACECRAFT_WHEEL_STEP_RATIO : DEFAULT_WHEEL_STEP_RATIO;
    const requestedStep = Math.max(distanceToTarget * stepRatio, stepFloor);
    const directionSign = deltaY < 0 ? 1 : -1;
    const maxForwardStep = Math.max(0, distanceToTarget - minApproach);
    const appliedStep = directionSign > 0
      ? Math.min(requestedStep, maxForwardStep)
      : requestedStep;

    if (appliedStep === 0) return;

    cameraRef.current.position.addScaledVector(forward, appliedStep * directionSign);
    syncControls();
  }, [syncControls, anchorTarget]);

  useEffect(() => {
    camera.up.copy(WORLD_UP);
    cameraRef.current = camera;
    syncControls();
  }, [camera, syncControls]);

  useEffect(() => {
    const nextNear = anchorTarget === 'spacecraft' ? SPACECRAFT_CAMERA_NEAR_KM : DEFAULT_CAMERA_NEAR_KM;
    if (cameraRef.current.near !== nextNear) {
      cameraRef.current.near = nextNear;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [anchorTarget]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const domElement = controls.domElement;
    if (!domElement) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimatedMove();
      translateAlongView(event.deltaY);
    };

    controls.addEventListener('start', cancelAnimatedMove);
    domElement.addEventListener('pointerdown', cancelAnimatedMove, { passive: true });
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('touchstart', cancelAnimatedMove, { passive: true });

    return () => {
      controls.removeEventListener('start', cancelAnimatedMove);
      domElement.removeEventListener('pointerdown', cancelAnimatedMove);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('touchstart', cancelAnimatedMove);
    };
  }, [translateAlongView]);

  useEffect(() => {
    const anchorChanged = prevAnchorTarget.current !== anchorTarget;
    const frameChanged = prevFrame.current !== referenceFrame;
    prevAnchorTarget.current = anchorTarget;
    prevFrame.current = referenceFrame;

    if (!anchorChanged && !frameChanged) return;

    const anchorCenter = getAnchorCenter(anchorTarget, earthWorld, moonWorld, spacecraftWorld);
    const preset = anchorCenter
      ? getAnchorPreset(anchorTarget, anchorCenter)
      : getOverviewPreset(referenceFrame);

    if (anchorChanged && anchorTargetSwitchMode === 'preserve-view') {
      animTargetPos.current = null;
      animLookAt.current = null;
      animLockOffset.current = null;
      lastAnchorCenter.current = anchorCenter ? anchorCenter.clone() : null;
      consumeAnchorTargetSwitchMode();
      return;
    }

    if (anchorCenter) {
      animLockOffset.current = preset.position.clone().sub(anchorCenter);
      animTargetPos.current = null;
      animLookAt.current = null;
    } else {
      animTargetPos.current = preset.position.clone();
      animLookAt.current = preset.lookAt.clone();
      animLockOffset.current = null;
    }
    lastAnchorCenter.current = anchorCenter ? anchorCenter.clone() : null;
    if (anchorChanged) {
      consumeAnchorTargetSwitchMode();
    }
  }, [anchorTarget, anchorTargetSwitchMode, referenceFrame, earthWorld, moonWorld, spacecraftWorld, consumeAnchorTargetSwitchMode]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const lerpSpeed = anchorTarget === 'spacecraft' ? SPACECRAFT_LERP_SPEED : DEFAULT_LERP_SPEED;

    const store = useMissionStore.getState();
    if (store.cameraAimDirection && store.cameraAimRequestId !== lastAimRequestId.current) {
      const dir = new THREE.Vector3(...store.cameraAimDirection);
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const distance = Math.max(
          anchorTarget === 'spacecraft' ? SPACECRAFT_AIM_DISTANCE_FLOOR_KM : DEFAULT_AIM_DISTANCE_FLOOR_KM,
          camera.position.distanceTo(controls.target),
        );
        controls.target.copy(camera.position.clone().add(dir.multiplyScalar(distance)));
        syncControls();
        animTargetPos.current = null;
        animLookAt.current = null;
        animLockOffset.current = null;
      }
      lastAimRequestId.current = store.cameraAimRequestId;
    }

    const currentAnchorCenter = getAnchorCenter(
      anchorTarget,
      earthWorld,
      moonWorld,
      spacecraftWorld,
    );

    if (animLockOffset.current && currentAnchorCenter) {
      const desiredPosition = currentAnchorCenter.clone().add(animLockOffset.current);
      camera.position.lerp(desiredPosition, lerpSpeed);
      controls.target.lerp(currentAnchorCenter, lerpSpeed);
      syncControls();

      if (
        camera.position.distanceTo(desiredPosition) < SPACECRAFT_ANIMATION_SNAP_DISTANCE_KM &&
        controls.target.distanceTo(currentAnchorCenter) < SPACECRAFT_ANIMATION_SNAP_DISTANCE_KM
      ) {
        camera.position.copy(desiredPosition);
        controls.target.copy(currentAnchorCenter);
        syncControls();
        animLockOffset.current = null;
      }
      lastAnchorCenter.current = currentAnchorCenter.clone();
      return;
    }

    if (animTargetPos.current && animLookAt.current) {
      const snapDistance = anchorTarget === 'spacecraft'
        ? SPACECRAFT_ANIMATION_SNAP_DISTANCE_KM
        : DEFAULT_ANIMATION_SNAP_DISTANCE_KM;
      camera.position.lerp(animTargetPos.current, lerpSpeed);
      controls.target.lerp(animLookAt.current, lerpSpeed);
      syncControls();

      if (
        camera.position.distanceTo(animTargetPos.current) < snapDistance &&
        controls.target.distanceTo(animLookAt.current) < snapDistance
      ) {
        camera.position.copy(animTargetPos.current);
        controls.target.copy(animLookAt.current);
        syncControls();
        animTargetPos.current = null;
        animLookAt.current = null;
      }
      return;
    }

    if (!currentAnchorCenter) {
      lastAnchorCenter.current = null;
      return;
    }

    if (!lastAnchorCenter.current) {
      lastAnchorCenter.current = currentAnchorCenter.clone();
      return;
    }

    const delta = currentAnchorCenter.clone().sub(lastAnchorCenter.current);
    if (delta.lengthSq() > 0) {
      camera.position.add(delta);
      controls.target.add(delta);
      syncControls();
      lastAnchorCenter.current.copy(currentAnchorCenter);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enableZoom={false}
      dampingFactor={0.06}
      minDistance={anchorTarget === 'spacecraft' ? SPACECRAFT_MIN_DISTANCE_KM : DEFAULT_MIN_DISTANCE_KM}
      maxDistance={6_000_000_000}
      rotateSpeed={0.5}
      panSpeed={0.8}
    />
  );
}
