import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import Earth from './Earth';
import Moon from './Moon';
import Sun from './Sun';
import Spacecraft from './Spacecraft';
import Trajectory from './Trajectory';
import CameraRig from './CameraRig';
import WorldHud from './WorldHud';
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

export default function Scene() {
  const cameraTarget = useMissionStore((s) => s.cameraTarget);
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
      <Suspense fallback={null}>
        <ambientLight intensity={0.03} />
        <Sun position={scene.sunWorld} />
        <Earth position={scene.earthWorld} gmstRad={scene.gmstRad} />
        <Moon
          position={scene.moonWorld}
          orientation={scene.moonOrientation}
        />
        {scene.spacecraftWorld && scene.spacecraftVelECI && (
          <Spacecraft position={scene.spacecraftWorld} velECI={scene.spacecraftVelECI} />
        )}
        {scene.trajectory && (
          <Trajectory
            trajectory={scene.trajectory}
            currentJD={scene.julianDate}
            worldOffset={scene.earthWorld}
          />
        )}

        <CameraRig
          target={cameraTarget}
          referenceFrame={scene.referenceFrame}
          earthWorld={scene.earthWorld}
          moonWorld={scene.moonWorld}
          spacecraftWorld={scene.spacecraftWorld}
        />
        <WorldHud />
      </Suspense>

      {/* EffectComposer outside Suspense — must never unmount or it causes black frames */}
      <EffectComposer>
        <Bloom
          kernelSize={KernelSize.LARGE}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.7}
          intensity={0.6}
        />
      </EffectComposer>
    </Canvas>
  );
}
