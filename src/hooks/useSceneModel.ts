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
  mercuryWorld: Vec3;
  venusWorld: Vec3;
  marsWorld: Vec3;
  jupiterWorld: Vec3;
  saturnWorld: Vec3;
  spacecraftWorld: Vec3 | null;
  moonPosECI: Vec3;
  sunPosECI: Vec3;
  mercuryPosECI: Vec3;
  venusPosECI: Vec3;
  marsPosECI: Vec3;
  jupiterPosECI: Vec3;
  saturnPosECI: Vec3;
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

export function getBodyWorldPosition(
  referenceFrame: ReferenceFrame,
  earthPosBCRS: Vec3 | null,
  bodyPosECI: Vec3,
): Vec3 {
  if (referenceFrame === 'BCRS' && earthPosBCRS) return add(earthPosBCRS, bodyPosECI);
  return bodyPosECI;
}

export function useSceneModel(): SceneModel {
  const referenceFrame = useMissionStore((s) => s.referenceFrame);
  const { julianDate } = useMissionTime();
  const ephemeris = useEphemeris(julianDate);
  const { state: spacecraftState, trajectory } = useTrajectory(julianDate);

  return useMemo(() => {
    const earthWorld = getEarthWorld(referenceFrame, ephemeris.earthPosBCRS);
    const moonWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.moonPosECI);
    const sunWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.sunPosECI);
    const mercuryWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.mercuryPosECI);
    const venusWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.venusPosECI);
    const marsWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.marsPosECI);
    const jupiterWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.jupiterPosECI);
    const saturnWorld = getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, ephemeris.saturnPosECI);
    const spacecraftWorld = spacecraftState
      ? getBodyWorldPosition(referenceFrame, ephemeris.earthPosBCRS, spacecraftState.posECI)
      : null;

    return {
      julianDate,
      referenceFrame,
      earthWorld,
      moonWorld,
      sunWorld,
      mercuryWorld,
      venusWorld,
      marsWorld,
      jupiterWorld,
      saturnWorld,
      spacecraftWorld,
      moonPosECI: ephemeris.moonPosECI,
      sunPosECI: ephemeris.sunPosECI,
      mercuryPosECI: ephemeris.mercuryPosECI,
      venusPosECI: ephemeris.venusPosECI,
      marsPosECI: ephemeris.marsPosECI,
      jupiterPosECI: ephemeris.jupiterPosECI,
      saturnPosECI: ephemeris.saturnPosECI,
      earthPosBCRS: ephemeris.earthPosBCRS,
      spacecraftPosECI: spacecraftState?.posECI ?? null,
      spacecraftVelECI: spacecraftState?.velECI ?? null,
      gmstRad: ephemeris.gmstRad,
      moonOrientation: ephemeris.moonOrientation,
      trajectory,
    };
  }, [referenceFrame, julianDate, ephemeris, spacecraftState, trajectory]);
}
