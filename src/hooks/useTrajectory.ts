import { useState, useEffect } from 'react';
import type { TrajectoryData, SpacecraftState } from '../lib/ephemeris/interpolate';
import { interpolateTrajectory } from '../lib/ephemeris/interpolate';

let cachedData: TrajectoryData | null = null;
let fetchPromise: Promise<TrajectoryData> | null = null;

async function loadTrajectory(): Promise<TrajectoryData> {
  if (cachedData) return cachedData;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch('/data/trajectory.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => { cachedData = d; return d; })
    .catch((e) => { throw e; });
  return fetchPromise;
}

export interface TrajectoryResult {
  state: SpacecraftState | null;
  /** Full trajectory data (for rendering the line) */
  trajectory: TrajectoryData | null;
  /** True while data is loading */
  loading: boolean;
  /** True if trajectory data is unavailable (pre-launch or error) */
  unavailable: boolean;
}

export function useTrajectory(julianDate: number): TrajectoryResult {
  const [data, setData] = useState<TrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    loadTrajectory()
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setUnavailable(true); setLoading(false); });
  }, []);

  const state = data ? interpolateTrajectory(data, julianDate) : null;

  return { state, trajectory: data, loading, unavailable };
}
