import { useCallback, useRef } from 'react';
import { useMissionStore } from '../../store/missionStore';
import { useTrajectory } from '../../hooks/useTrajectory';
import { ARTEMIS2_LAUNCH_JD } from '../../lib/time';
import styles from './Timeline.module.css';

const MISSION_DURATION_DAYS = 10; // Artemis 2 ~10 day mission

export default function Timeline() {
  const { currentJD, isPlaying, playbackSpeed, mode, setCurrentJD, setIsPlaying, setPlaybackSpeed, setMode } =
    useMissionStore();
  const { trajectory } = useTrajectory(currentJD);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const startJD = trajectory?.startJD ?? ARTEMIS2_LAUNCH_JD;
  const endJD = trajectory?.endJD ?? ARTEMIS2_LAUNCH_JD + MISSION_DURATION_DAYS;
  const phases = trajectory?.phases ?? [];

  const progress = Math.max(0, Math.min(1, (currentJD - startJD) / (endJD - startJD)));

  const scrubToClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setMode('scrub');
      const newJD = startJD + t * (endJD - startJD);
      setCurrentJD(newJD);
    },
    [startJD, endJD, setCurrentJD, setMode],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      scrubToClientX(e.clientX);
    },
    [scrubToClientX],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      scrubToClientX(e.clientX);
    },
    [scrubToClientX],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handlePlayToggle = useCallback(() => {
    if (!isPlaying) {
      setMode('scrub');
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying, setMode]);

  const SPEEDS = [1, 60, 600, 3600, 86400];

  return (
    <div className={`${styles.timeline} hud-panel`}>
      <div className={styles.controls}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeToggleBtn} ${mode === 'live' ? styles.activeMode : ''}`}
            onClick={() => setMode('live')}
          >
            {mode === 'live' && <span className={styles.modeDot} />}
            Live
          </button>
          <button
            className={`${styles.modeToggleBtn} ${mode === 'scrub' ? styles.activeMode : ''}`}
            onClick={() => setMode('scrub')}
          >
            Scrub
          </button>
        </div>
        <button
          className={styles.playBtn}
          onClick={handlePlayToggle}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className={styles.speeds}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`${styles.speedBtn} ${playbackSpeed === s ? styles.active : ''}`}
              onClick={() => setPlaybackSpeed(s)}
            >
              {s >= 86400 ? `${s / 86400}d/s` : s >= 3600 ? `${s / 3600}h/s` : s >= 60 ? `${s / 60}m/s` : '1:1'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scrubArea}>
        <div className={styles.phaseLabels}>
          {phases.map((phase) => {
            const phaseStart = (phase.startJD - startJD) / (endJD - startJD);
            const phaseEnd = (phase.endJD - startJD) / (endJD - startJD);
            const center = (phaseStart + phaseEnd) / 2;
            const clamped = Math.max(0.04, Math.min(0.96, center));
            return (
              <span key={phase.name} className={styles.phaseLabel} style={{ left: `${clamped * 100}%` }}>
                {phase.name}
              </span>
            );
          })}
        </div>
        <div
          ref={trackRef}
          className={styles.track}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label="Mission timeline"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
        >
          <div className={styles.trackBase} />
          <div className={styles.phaseBands}>
            {phases.map((phase) => {
              const rawStart = (phase.startJD - startJD) / (endJD - startJD);
              const rawEnd = (phase.endJD - startJD) / (endJD - startJD);
              const clampedStart = Math.max(0, Math.min(1, rawStart));
              const clampedEnd = Math.max(0, Math.min(1, rawEnd));
              const left = clampedStart * 100;
              const width = Math.max(0, clampedEnd - clampedStart) * 100;
              return (
                <div
                  key={phase.name}
                  className={styles.phaseBand}
                  style={{ left: `${left}%`, width: `${width}%`, background: phase.color + '55' }}
                  title={phase.name}
                />
              );
            })}
          </div>
          <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
          <div className={styles.thumb} style={{ left: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
