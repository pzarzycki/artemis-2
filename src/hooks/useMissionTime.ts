import { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/missionStore';
import { toJulianDate, fromJulianDate, formatUTC, formatMET, getMET } from '../lib/time';

export interface MissionTimeResult {
  julianDate: number;
  utcString: string;
  metString: string;
  date: Date;
}

/** Drives the current mission time — either from real clock or scrub playback */
export function useMissionTime(): MissionTimeResult {
  const { currentJD, mode, playbackSpeed, isPlaying, setCurrentJD } = useMissionStore();
  const lastFrameTime = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'live') {
      // Update every second from the real clock
      const id = setInterval(() => {
        setCurrentJD(toJulianDate(new Date()));
      }, 1000);
      return () => clearInterval(id);
    }

    if (mode === 'scrub' && isPlaying) {
      // Advance currentJD at playbackSpeed × realtime using rAF
      let rafId: number;
      const tick = (now: number) => {
        if (lastFrameTime.current !== null) {
          const dtMs = now - lastFrameTime.current;
          const dtDays = (dtMs / 1000) * playbackSpeed / 86_400;
          setCurrentJD(toJulianDate(new Date()) > 0
            ? useMissionStore.getState().currentJD + dtDays
            : toJulianDate(new Date()));
        }
        lastFrameTime.current = now;
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(rafId);
        lastFrameTime.current = null;
      };
    }

    lastFrameTime.current = null;
  }, [mode, isPlaying, playbackSpeed, setCurrentJD]);

  const date = fromJulianDate(currentJD);
  return {
    julianDate: currentJD,
    utcString: formatUTC(date),
    metString: formatMET(getMET(currentJD)),
    date,
  };
}
