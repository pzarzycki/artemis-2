import { useEffect, useMemo, useState } from 'react';
import { useMissionStore } from '../../store/missionStore';
import { assetUrl } from '../../config/assets';
import { STAR_MAP_OPTIONS, type StarMapResolution } from '../../config/starmaps';
import styles from './SettingsDialog.module.css';

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, description, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <label className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={`${styles.rowValue} mono`}>{value.toFixed(2)}</span>
      </div>
      <div className={styles.rowDescription}>{description}</div>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

interface SettingsDialogProps {
  onClose: () => void;
}

interface ResolutionRowProps {
  label: string;
  description: string;
  value: StarMapResolution;
  onChange: (value: StarMapResolution) => void;
  isLoading: boolean;
  options: readonly StarMapResolution[];
}

function ResolutionRow({ label, description, value, onChange, isLoading, options }: ResolutionRowProps) {
  return (
    <label className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={`${styles.rowValue} mono`}>
          {value}
          {isLoading && <span className={styles.loadingBadge}>loading</span>}
        </span>
      </div>
      <div className={styles.rowDescription}>{description}</div>
      <div className={styles.segmentedControl} role="radiogroup" aria-label="Star map resolution">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </label>
  );
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const skyExposure = useMissionStore((s) => s.skyExposure);
  const starMapResolution = useMissionStore((s) => s.starMapResolution);
  const isStarMapLoading = useMissionStore((s) => s.isStarMapLoading);
  const bloomIntensity = useMissionStore((s) => s.bloomIntensity);
  const ambientLightIntensity = useMissionStore((s) => s.ambientLightIntensity);
  const setSkyExposure = useMissionStore((s) => s.setSkyExposure);
  const setStarMapResolution = useMissionStore((s) => s.setStarMapResolution);
  const setBloomIntensity = useMissionStore((s) => s.setBloomIntensity);
  const setAmbientLightIntensity = useMissionStore((s) => s.setAmbientLightIntensity);
  const [availableResolutions, setAvailableResolutions] = useState<StarMapResolution[]>([starMapResolution]);

  useEffect(() => {
    let cancelled = false;

    fetch(assetUrl('starmaps/manifest.json'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((payload: { available?: string[] }) => {
        if (cancelled) return;
        const available = STAR_MAP_OPTIONS.filter((option) => payload.available?.includes(option));
        setAvailableResolutions(available.length > 0 ? available : [starMapResolution]);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableResolutions([starMapResolution]);
      });

    return () => {
      cancelled = true;
    };
  }, [starMapResolution]);

  const visibleResolutions = useMemo(() => {
    const deduped = new Set<StarMapResolution>(availableResolutions);
    deduped.add(starMapResolution);
    return STAR_MAP_OPTIONS.filter((option) => deduped.has(option));
  }, [availableResolutions, starMapResolution]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.dialog} hud-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.title}>Settings</div>
            <div className={styles.text}>Live rendering controls for the current scene.</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close Settings dialog">
            <svg viewBox="0 0 24 24" className={styles.closeIcon} aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <SliderRow
              label="Skymap Exposure"
              description="Scales the brightness of the background star map only."
              value={skyExposure}
              min={0}
              max={4}
              step={0.05}
              onChange={setSkyExposure}
            />
            <SliderRow
              label="Bloom Intensity"
              description="Controls the strength of the glow/halo around very bright rendered highlights."
              value={bloomIntensity}
              min={0}
              max={2}
              step={0.05}
              onChange={setBloomIntensity}
            />
            <SliderRow
              label="Ambient Light"
              description="Sets the uniform base fill light added everywhere in the scene, including shadowed sides."
              value={ambientLightIntensity}
              min={0}
              max={0.2}
              step={0.005}
              onChange={setAmbientLightIntensity}
            />
            <ResolutionRow
              label="Star Map Resolution"
              description="Chooses which locally cached NASA Deep Star Map EXR to load for the background sky."
              value={starMapResolution}
              isLoading={isStarMapLoading}
              onChange={setStarMapResolution}
              options={visibleResolutions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
