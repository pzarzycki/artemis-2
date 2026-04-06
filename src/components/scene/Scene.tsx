import { Suspense, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import Earth from './Earth';
import Moon from './Moon';
import Sun from './Sun';
import Spacecraft from './Spacecraft';
import Trajectory from './Trajectory';
import CameraRig from './CameraRig';
import WorldHud from './WorldHud';
import CelestialBackground from './CelestialBackground';
import GravityField from './GravityField';
import { useMissionStore } from '../../store/missionStore';
import { useSceneModel } from '../../hooks/useSceneModel';

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

  useFrame(() => {
    const forward = new THREE.Vector3();
    const up = camera.up.clone().applyQuaternion(camera.quaternion).normalize();
    camera.getWorldDirection(forward);
    useMissionStore.getState().setCameraTelemetry(
      [camera.position.x, camera.position.y, camera.position.z],
      [forward.x, forward.y, forward.z],
      [up.x, up.y, up.z],
    );
  });

  return null;
}

export default function Scene() {
  const cameraTarget = useMissionStore((s) => s.cameraTarget);
  const cameraTargetSwitchMode = useMissionStore((s) => s.cameraTargetSwitchMode);
  const consumeCameraTargetSwitchMode = useMissionStore((s) => s.consumeCameraTargetSwitchMode);
  const showStars = useMissionStore((s) => s.showStars);
  const showObjectAxes = useMissionStore((s) => s.showObjectAxes);
  const showTrajectory = useMissionStore((s) => s.showTrajectory);
  const showGravityField = useMissionStore((s) => s.showGravityField);
  const ambientLightIntensity = useMissionStore((s) => s.ambientLightIntensity);
  const bloomIntensity = useMissionStore((s) => s.bloomIntensity);
  const scene = useSceneModel();

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
        <Sun position={scene.sunWorld} />
        <Earth position={scene.earthWorld} gmstRad={scene.gmstRad} showAxes={showObjectAxes} />
        <Moon
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
          target={cameraTarget}
          targetSwitchMode={cameraTargetSwitchMode}
          referenceFrame={scene.referenceFrame}
          earthWorld={scene.earthWorld}
          moonWorld={scene.moonWorld}
          spacecraftWorld={scene.spacecraftWorld}
          consumeTargetSwitchMode={consumeCameraTargetSwitchMode}
        />
        <WorldHud />
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
