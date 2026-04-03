import { useCallback } from 'react';
import { useMissionStore } from '../../store/missionStore';
import { useTrajectory } from '../../hooks/useTrajectory';
import { ARTEMIS2_LAUNCH_JD } from '../../lib/time';
import styles from './Timeline.module.css';

const MISSION_DURATION_DAYS = 10; // Artemis 2 ~10 day mission

export default function Timeline() {
  const { currentJD, isPlaying, playbackSpeed, setCurrentJD, setIsPlaying, setPlaybackSpeed } =
    useMissionStore();
  const { trajectory } = useTrajectory(currentJD);

  const startJD = trajectory?.startJD ?? ARTEMIS2_LAUNCH_JD;
  const endJD = trajectory?.endJD ?? ARTEMIS2_LAUNCH_JD + MISSION_DURATION_DAYS;
  const phases = trajectory?.phases ?? [];

  const progress = Math.max(0, Math.min(1, (currentJD - startJD) / (endJD - startJD)));

  const handleScrub = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const t = parseFloat(e.currentTarget.value);
      const newJD = startJD + t * (endJD - startJD);
      setCurrentJD(newJD);
    },
    [startJD, endJD, setCurrentJD],
  );

  const SPEEDS = [1, 60, 600, 3600, 86400];

  return (
    <div className={`${styles.timeline} hud-panel`}>
      <div className={styles.controls}>
        <button
          className={styles.playBtn}
          onClick={() => setIsPlaying(!isPlaying)}
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
        {/* Phase bands */}
        <div className={styles.phaseBands}>
          {phases.map((phase) => {
            const left = ((phase.startJD - startJD) / (endJD - startJD)) * 100;
            const width = ((phase.endJD - phase.startJD) / (endJD - startJD)) * 100;
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
        {/* Phase labels */}
        <div className={styles.phaseLabels}>
          {phases.map((phase) => {
            const left = ((phase.startJD - startJD) / (endJD - startJD)) * 100;
            return (
              <span key={phase.name} className={styles.phaseLabel} style={{ left: `${left}%` }}>
                {phase.name}
              </span>
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.00001}
          value={progress}
          onInput={handleScrub}
          className={styles.slider}
        />
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
