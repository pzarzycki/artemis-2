import { useMemo } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { ReferenceFrame } from '../store/missionStore';
import { useMissionTime } from './useMissionTime';
import { useEphemeris } from './useEphemeris';
import { useTrajectory } from './useTrajectory';
import type { Vec3 } from '../lib/coordinates/types';
import { add } from '../lib/coordinates/transforms';

export interface SceneModel {
  julianDate: number;
  referenceFrame: ReferenceFrame;
  earthWorld: Vec3;
  moonWorld: Vec3;
  sunWorld: Vec3;
  spacecraftWorld: Vec3 | null;
  moonPosECI: Vec3;
  sunPosECI: Vec3;
  earthPosBCRS: Vec3 | null;
  spacecraftPosECI: Vec3 | null;
  spacecraftVelECI: Vec3 | null;
  gmstRad: number;
  moonOrientation: [number, number, number];
  trajectory: ReturnType<typeof useTrajectory>['trajectory'];
}

function getEarthWorld(referenceFrame: ReferenceFrame, earthPosBCRS: Vec3 | null): Vec3 {
  if (referenceFrame === 'BCRS' && earthPosBCRS) return earthPosBCRS;
  return [0, 0, 0];
}

export function useSceneModel(): SceneModel {
  const referenceFrame = useMissionStore((s) => s.referenceFrame);
  const { julianDate } = useMissionTime();
  const ephemeris = useEphemeris(julianDate);
  const { state: spacecraftState, trajectory } = useTrajectory(julianDate);

  return useMemo(() => {
    const earthWorld = getEarthWorld(referenceFrame, ephemeris.earthPosBCRS);
    const moonWorld = referenceFrame === 'BCRS' && ephemeris.earthPosBCRS
      ? add(ephemeris.earthPosBCRS, ephemeris.moonPosECI)
      : ephemeris.moonPosECI;
    const sunWorld = referenceFrame === 'BCRS' && ephemeris.earthPosBCRS
      ? add(ephemeris.earthPosBCRS, ephemeris.sunPosECI)
      : ephemeris.sunPosECI;
    const spacecraftWorld = spacecraftState
      ? (referenceFrame === 'BCRS' && ephemeris.earthPosBCRS
        ? add(ephemeris.earthPosBCRS, spacecraftState.posECI)
        : spacecraftState.posECI)
      : null;

    return {
      julianDate,
      referenceFrame,
      earthWorld,
      moonWorld,
      sunWorld,
      spacecraftWorld,
      moonPosECI: ephemeris.moonPosECI,
      sunPosECI: ephemeris.sunPosECI,
      earthPosBCRS: ephemeris.earthPosBCRS,
      spacecraftPosECI: spacecraftState?.posECI ?? null,
      spacecraftVelECI: spacecraftState?.velECI ?? null,
      gmstRad: ephemeris.gmstRad,
      moonOrientation: ephemeris.moonOrientation,
      trajectory,
    };
  }, [referenceFrame, julianDate, ephemeris, spacecraftState, trajectory]);
}
