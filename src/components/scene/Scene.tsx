import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Html } from '@react-three/drei';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import Earth from './Earth';
import Moon from './Moon';
import Sun from './Sun';
import Planet from './Planet';
import Spacecraft from './Spacecraft';
import Trajectory from './Trajectory';
import CameraRig from './CameraRig';
import WorldHud from './WorldHud';
import CelestialBackground from './CelestialBackground';
import GravityField from './GravityField';
import { useMissionStore } from '../../store/missionStore';
import { useSceneModel } from '../../hooks/useSceneModel';
import {
  JUPITER_RADIUS_KM,
  MARS_RADIUS_KM,
  MERCURY_RADIUS_KM,
  SATURN_RADIUS_KM,
  VENUS_RADIUS_KM,
} from '../../lib/ephemeris/constants';

interface HoverTipState {
  name: string;
  x: number;
  y: number;
}

function HoverTip({ tip }: { tip: HoverTipState | null }) {
  if (!tip) return null;

  return (
    <Html fullscreen zIndexRange={[20, 0]}>
      <div
        style={{
          position: 'absolute',
          left: `${tip.x + 14}px`,
          top: `${tip.y + 14}px`,
          transform: 'translate3d(0, 0, 0)',
          pointerEvents: 'none',
          padding: '6px 10px',
          borderRadius: '999px',
          border: '1px solid rgba(190, 208, 255, 0.35)',
          background: 'rgba(6, 10, 22, 0.86)',
          color: '#eef4ff',
          fontSize: '12px',
          fontFamily: '"SF Mono", "Roboto Mono", monospace',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
        }}
      >
        {tip.name}
      </div>
    </Html>
  );
}

function DebugOverlay() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => console.error('[WebGL] CONTEXT LOST', e);
    const onRestored = () => console.warn('[WebGL] context restored');
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return null;
}

function CameraTelemetry() {
  const camera = useThree((state) => state.camera);
  const forwardRef = useRef(new THREE.Vector3());
  const upRef = useRef(new THREE.Vector3());
  const lastPositionRef = useRef(new THREE.Vector3());
  const lastForwardRef = useRef(new THREE.Vector3());
  const lastUpRef = useRef(new THREE.Vector3());
  const hasPublishedRef = useRef(false);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    const forward = forwardRef.current;
    const up = upRef.current;
    const lastPosition = lastPositionRef.current;
    const lastForward = lastForwardRef.current;
    const lastUp = lastUpRef.current;
    const hasPublished = hasPublishedRef.current;

    camera.getWorldDirection(forward);
    up.copy(camera.up).applyQuaternion(camera.quaternion).normalize();

    const positionChanged = !hasPublished || lastPosition.distanceToSquared(camera.position) > 1e-6;
    const forwardChanged = !hasPublished || lastForward.distanceToSquared(forward) > 1e-8;
    const upChanged = !hasPublished || lastUp.distanceToSquared(up) > 1e-8;

    elapsedRef.current += delta;
    if (!positionChanged && !forwardChanged && !upChanged) return;
    if (hasPublished && elapsedRef.current < 0.2) return;

    elapsedRef.current = 0;
    hasPublishedRef.current = true;
    lastPosition.copy(camera.position);
    lastForward.copy(forward);
    lastUp.copy(up);

    useMissionStore.getState().setCameraTelemetry(
      [camera.position.x, camera.position.y, camera.position.z],
      [forward.x, forward.y, forward.z],
      [up.x, up.y, up.z],
    );
  });

  return null;
}

export default function Scene() {
  const anchorTarget = useMissionStore((s) => s.anchorTarget);
  const anchorTargetSwitchMode = useMissionStore((s) => s.anchorTargetSwitchMode);
  const lookTarget = useMissionStore((s) => s.lookTarget);
  const consumeAnchorTargetSwitchMode = useMissionStore((s) => s.consumeAnchorTargetSwitchMode);
  const showStars = useMissionStore((s) => s.showStars);
  const showObjectAxes = useMissionStore((s) => s.showObjectAxes);
  const showTrajectory = useMissionStore((s) => s.showTrajectory);
  const showGravityField = useMissionStore((s) => s.showGravityField);
  const ambientLightIntensity = useMissionStore((s) => s.ambientLightIntensity);
  const bloomIntensity = useMissionStore((s) => s.bloomIntensity);
  const scene = useSceneModel();
  const [hoverTip, setHoverTip] = useState<HoverTipState | null>(null);

  const makeHoverHandlers = useCallback((name: string) => ({
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoverTip({ name, x: event.clientX, y: event.clientY });
    },
    onPointerMove: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoverTip({ name, x: event.clientX, y: event.clientY });
    },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoverTip((current) => (current?.name === name ? null : current));
    },
  }), []);

  return (
    <Canvas
      camera={{ near: 0.1, far: 1e9, fov: 45 }}
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      style={{ background: '#000008' }}
      frameloop="always"
      onCreated={({ camera }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
      }}
    >
      <DebugOverlay />
      <CameraTelemetry />
      <Suspense fallback={null}>
        {showStars && <CelestialBackground />}
        <ambientLight intensity={ambientLightIntensity} />
        <Sun position={scene.sunWorld} {...makeHoverHandlers('Sun')} />
        <Planet
          {...makeHoverHandlers('Mercury')}
          position={scene.mercuryWorld}
          radiusKm={MERCURY_RADIUS_KM}
          visualRadiusKm={95_000}
          color={0xa8a7a3}
          emissive={0x8b7860}
          emissiveIntensity={0.28}
          roughness={0.88}
          glowColor={0x9f8d72}
          glowOpacity={0.14}
        />
        <Planet
          {...makeHoverHandlers('Venus')}
          position={scene.venusWorld}
          radiusKm={VENUS_RADIUS_KM}
          visualRadiusKm={150_000}
          color={0xd7b072}
          emissive={0xb27d2f}
          emissiveIntensity={0.34}
          roughness={0.84}
          glowColor={0xe0b66f}
          glowOpacity={0.18}
        />
        <Planet
          {...makeHoverHandlers('Mars')}
          position={scene.marsWorld}
          radiusKm={MARS_RADIUS_KM}
          visualRadiusKm={110_000}
          color={0xb85f3a}
          emissive={0xa63d20}
          emissiveIntensity={0.24}
          roughness={0.88}
          glowColor={0xca5c34}
          glowOpacity={0.16}
        />
        <Planet
          {...makeHoverHandlers('Jupiter')}
          position={scene.jupiterWorld}
          radiusKm={JUPITER_RADIUS_KM}
          visualRadiusKm={240_000}
          color={0xcfa682}
          emissive={0xa06b41}
          emissiveIntensity={0.16}
          roughness={0.8}
          glowColor={0xd5a47a}
          glowOpacity={0.12}
          glowScale={1.1}
        />
        <Planet
          {...makeHoverHandlers('Saturn')}
          position={scene.saturnWorld}
          radiusKm={SATURN_RADIUS_KM}
          visualRadiusKm={210_000}
          color={0xd9c28f}
          emissive={0xb69146}
          emissiveIntensity={0.18}
          roughness={0.82}
          glowColor={0xe0c887}
          glowOpacity={0.14}
          glowScale={1.12}
          ring={{
            innerRadiusKm: SATURN_RADIUS_KM * 1.35,
            outerRadiusKm: SATURN_RADIUS_KM * 2.2,
            color: 0xd4c09c,
            opacity: 0.62,
            tiltRad: 0.45,
          }}
        />
        <Earth
          {...makeHoverHandlers('Earth')}
          position={scene.earthWorld}
          gmstRad={scene.gmstRad}
          showAxes={showObjectAxes}
        />
        <Moon
          {...makeHoverHandlers('Moon')}
          position={scene.moonWorld}
          orientation={scene.moonOrientation}
          showAxes={showObjectAxes}
        />
        {scene.spacecraftWorld && scene.spacecraftPosECI && scene.spacecraftVelECI && (
          <Spacecraft
            position={scene.spacecraftWorld}
            posECI={scene.spacecraftPosECI}
            velECI={scene.spacecraftVelECI}
            showAxes={showObjectAxes}
          />
        )}
        {showTrajectory && scene.trajectory && (
          <Trajectory
            trajectory={scene.trajectory}
            currentJD={scene.julianDate}
            worldOffset={scene.earthWorld}
          />
        )}
        {showGravityField && (
          <GravityField
            earthPos={scene.earthWorld}
            moonPos={scene.moonWorld}
            spacecraftPos={scene.spacecraftWorld}
          />
        )}

        <CameraRig
          anchorTarget={anchorTarget}
          anchorTargetSwitchMode={anchorTargetSwitchMode}
          lookTarget={lookTarget}
          referenceFrame={scene.referenceFrame}
          sunWorld={scene.sunWorld}
          earthWorld={scene.earthWorld}
          moonWorld={scene.moonWorld}
          spacecraftWorld={scene.spacecraftWorld}
          consumeAnchorTargetSwitchMode={consumeAnchorTargetSwitchMode}
        />
        <WorldHud />
        <HoverTip tip={hoverTip} />
      </Suspense>

      {/* EffectComposer outside Suspense — must never unmount or it causes black frames */}
      <EffectComposer>
        <Bloom
          kernelSize={KernelSize.LARGE}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.7}
          intensity={bloomIntensity}
        />
      </EffectComposer>
    </Canvas>
  );
}
