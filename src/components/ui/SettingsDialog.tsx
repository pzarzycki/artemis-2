import { useMissionStore } from '../../store/missionStore';
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

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const skyExposure = useMissionStore((s) => s.skyExposure);
  const bloomIntensity = useMissionStore((s) => s.bloomIntensity);
  const ambientLightIntensity = useMissionStore((s) => s.ambientLightIntensity);
  const setSkyExposure = useMissionStore((s) => s.setSkyExposure);
  const setBloomIntensity = useMissionStore((s) => s.setBloomIntensity);
  const setAmbientLightIntensity = useMissionStore((s) => s.setAmbientLightIntensity);

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
        </div>
      </div>
    </div>
  );
}
