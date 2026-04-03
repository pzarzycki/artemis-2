import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import Earth from './Earth';
import Moon from './Moon';
import Sun from './Sun';
import Spacecraft from './Spacecraft';
import Trajectory from './Trajectory';
import Starfield from './Starfield';
import CameraRig from './CameraRig';
import Atmosphere from './Atmosphere';
import { useMissionStore } from '../../store/missionStore';
import { useMissionTime } from '../../hooks/useMissionTime';
import { useEphemeris } from '../../hooks/useEphemeris';
import { useTrajectory } from '../../hooks/useTrajectory';

export default function Scene() {
  const { julianDate } = useMissionTime();
  const ephemeris = useEphemeris(julianDate);
  const { state: spacecraftState, trajectory } = useTrajectory(julianDate);
  const cameraTarget = useMissionStore((s) => s.cameraTarget);

  return (
    <Canvas
      camera={{ near: 0.1, far: 1e8, fov: 45 }}
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      style={{ background: '#000008' }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        {/* Ambient fill — nearly zero for realistic space */}
        <ambientLight intensity={0.03} />

        <Starfield />

        <Sun sunPosECI={ephemeris.sunPosECI} />

        <Earth gmstRad={ephemeris.gmstRad} />
        <Atmosphere />

        <Moon
          posECI={ephemeris.moonPosECI}
          orientation={ephemeris.moonOrientation}
        />

        {spacecraftState && (
          <>
            <Spacecraft posECI={spacecraftState.posECI} velECI={spacecraftState.velECI} />
            <Trajectory
              trajectory={trajectory}
              currentJD={julianDate}
              spacecraftPosECI={spacecraftState.posECI}
            />
          </>
        )}

        <CameraRig
          target={cameraTarget}
          moonPosECI={ephemeris.moonPosECI}
          spacecraftPosECI={spacecraftState?.posECI ?? null}
        />

        <EffectComposer>
          <Bloom
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.3}
            intensity={0.6}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
