import { useMissionStore } from '../../store/missionStore';
import { useMemo, useState, type ReactNode } from 'react';
import type { CameraPointTarget } from '../../store/missionStore';
import styles from './CameraPanel.module.css';

const CAMERA_POINT_TARGETS: { id: CameraPointTarget; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'sun', label: 'Sun' },
  { id: 'earth', label: 'Earth' },
  { id: 'moon', label: 'Moon' },
  { id: 'spacecraft', label: 'Spacecraft' },
];

function formatVec3(v: [number, number, number], digits: number) {
  return `${v[0].toFixed(digits)}  ${v[1].toFixed(digits)}  ${v[2].toFixed(digits)}`;
}

function formatVec3InThousandKm(v: [number, number, number], digits: number) {
  return formatVec3([v[0] / 1000, v[1] / 1000, v[2] / 1000], digits);
}

function wrapDegrees(angleDeg: number) {
  return ((angleDeg % 360) + 360) % 360;
}

function formatAngleDeg(angleDeg: number) {
  return `${angleDeg.toFixed(3)}°`;
}

function formatDirection(v: [number, number, number]) {
  const [x, y, z] = v;
  const xy = Math.hypot(x, y);
  const raDeg = wrapDegrees((Math.atan2(y, x) * 180) / Math.PI);
  const decDeg = (Math.atan2(z, xy) * 180) / Math.PI;
  return `RA ${formatAngleDeg(raDeg)}  Dec ${formatAngleDeg(decDeg)}`;
}

function parseAngleInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  const decimal = Number(value);
  if (Number.isFinite(decimal)) {
    return decimal;
  }

  const normalized = value
    .replace(/[dD°]/g, ' ')
    .replace(/[mM']/g, ' ')
    .replace(/:/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const match = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
    return null;
  }

  const sign = degrees < 0 || Object.is(degrees, -0) || value.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60);
}

function directionFromRaDec(raDeg: number, decDeg: number): [number, number, number] {
  const raRad = (wrapDegrees(raDeg) * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(decRad);
  return [
    cosDec * Math.cos(raRad),
    cosDec * Math.sin(raRad),
    Math.sin(decRad),
  ];
}

function ForwardGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.svgIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" className={styles.svgRing} />
      <path d="M8 12h7.5" className={styles.svgStroke} />
      <path d="M13 9l3 3-3 3" className={styles.svgStroke} />
      <circle cx="12" cy="12" r="1.4" className={styles.svgFill} />
    </svg>
  );
}

function UpGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.svgIcon} aria-hidden="true">
      <path d="M12 18V7.5" className={styles.svgStroke} />
      <path d="M8.5 11L12 7.5 15.5 11" className={styles.svgStroke} />
      <path d="M7 18h10" className={styles.svgDim} />
    </svg>
  );
}

function PositionGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.svgIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="2" className={styles.svgFill} />
      <path d="M12 4.5v4" className={styles.svgDim} />
      <path d="M12 15.5v4" className={styles.svgDim} />
      <path d="M4.5 12h4" className={styles.svgDim} />
      <path d="M15.5 12h4" className={styles.svgDim} />
      <circle cx="12" cy="12" r="7.5" className={styles.svgRing} />
    </svg>
  );
}

interface TooltipProps {
  text: string;
  className?: string;
  children: ReactNode;
}

function Tooltip({ text, className, children }: TooltipProps) {
  return (
    <div className={`${styles.tooltipWrap} ${className ?? ''}`} data-tooltip={text}>
      {children}
    </div>
  );
}

export default function CameraPanel() {
  const referenceFrame = useMissionStore((s) => s.referenceFrame);
  const cameraPosition = useMissionStore((s) => s.cameraPosition);
  const cameraForward = useMissionStore((s) => s.cameraForward);
  const cameraUp = useMissionStore((s) => s.cameraUp);
  const cameraPointTarget = useMissionStore((s) => s.cameraPointTarget);
  const setCameraPointTarget = useMissionStore((s) => s.setCameraPointTarget);
  const requestCameraAim = useMissionStore((s) => s.requestCameraAim);
  const openDialog = useMissionStore((s) => s.openDialog);
  const [raInput, setRaInput] = useState('0');
  const [decInput, setDecInput] = useState('0');

  const parsedAim = useMemo(() => {
    const raDeg = parseAngleInput(raInput);
    const decDeg = parseAngleInput(decInput);
    if (raDeg === null || decDeg === null || decDeg < -90 || decDeg > 90) {
      return null;
    }
    return directionFromRaDec(raDeg, decDeg);
  }, [raInput, decInput]);

  const handleAim = () => {
    if (!parsedAim) return;
    requestCameraAim(parsedAim);
  };

  return (
      <div className={`${styles.panel} hud-panel`}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <Tooltip text={`Camera telemetry and pointing controls.\nFrame-aware readout and input for the active scene.`}>
              <div className={styles.title}>Camera</div>
            </Tooltip>
            <button
              type="button"
              className={styles.infoButton}
              title="Open Learn on camera controls"
              aria-label="Camera input help"
              onClick={() => openDialog('learn', 'camera')}
            >
              i
            </button>
          </div>
          <Tooltip
            className={styles.frameWrap}
            text={`Active frame for displayed camera values.\nCurrent value: ${referenceFrame}`}
          >
            <div className={`${styles.frame} mono`}>{referenceFrame}</div>
          </Tooltip>
        </div>

        <div className={styles.directionRow}>
          <Tooltip
            className={styles.iconLabel}
            text={`Camera position in ${referenceFrame}.\n${formatVec3InThousandKm(cameraPosition, 3)} x1000 km`}
          >
            <span className={styles.icon} aria-label="Camera position">
              <PositionGlyph />
            </span>
          </Tooltip>
          <Tooltip
            className={styles.rowValue}
            text={`Camera position in ${referenceFrame}.\n${formatVec3InThousandKm(cameraPosition, 3)} x1000 km`}
          >
            <div className={`${styles.vector} mono`}>{formatVec3InThousandKm(cameraPosition, 3)}</div>
          </Tooltip>
        </div>

        <div className={styles.directionRow}>
          <Tooltip
            className={styles.iconLabel}
            text={`Camera forward direction in ${referenceFrame}.\n${formatVec3(cameraForward, 3)}`}
          >
            <span className={styles.icon} aria-label="Forward direction">
              <ForwardGlyph />
            </span>
          </Tooltip>
          <Tooltip
            className={styles.rowValue}
            text={`Camera forward direction in ${referenceFrame}.\n${formatVec3(cameraForward, 3)}`}
          >
            {formatDirection(cameraForward)}
          </Tooltip>
        </div>

        <div className={styles.directionRow}>
          <Tooltip
            className={styles.iconLabel}
            text={`Camera up direction in ${referenceFrame}.\n${formatVec3(cameraUp, 3)}`}
          >
            <span className={styles.icon} aria-label="Up direction">
              <UpGlyph />
            </span>
          </Tooltip>
          <Tooltip
            className={styles.rowValue}
            text={`Camera up direction in ${referenceFrame}.\n${formatVec3(cameraUp, 3)}`}
          >
            {formatDirection(cameraUp)}
          </Tooltip>
        </div>

        <div className={styles.section}>
          <div className={styles.headingRow}>
            <Tooltip
              text={`Point camera in ${referenceFrame}.\nEnter RA and Dec, then press Enter.`}
            >
              <div className={styles.label}>
                Point Camera
              </div>
            </Tooltip>
          </div>
          <div className={styles.grid}>
            <Tooltip
              text={`Right ascension in ${referenceFrame}.\nExamples: 120.5 or 120 30.`}
            >
              <input
                className={styles.input}
                value={raInput}
                onChange={(e) => setRaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAim()}
                aria-label="Right ascension"
                placeholder="RA deg"
              />
            </Tooltip>
            <Tooltip
              text={`Declination in ${referenceFrame}.\nRange: -90 to +90.`}
            >
              <input
                className={styles.input}
                value={decInput}
                onChange={(e) => setDecInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAim()}
                aria-label="Declination"
                placeholder="Dec deg"
              />
            </Tooltip>
          </div>
          {!parsedAim && (
            <div className={styles.actions}>
              <span className={styles.hint}>Invalid direction. Use RA in degrees and Dec within [-90°, +90°].</span>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.headingRow}>
            <Tooltip
              text={`Keep the camera pointed at a scene object.\nManual pointing returns this to None.`}
            >
              <div className={styles.label}>Auto Point</div>
            </Tooltip>
          </div>
          <Tooltip
            text={`Continuous look target.\nSelect Sun, Earth, Moon, or Spacecraft to keep the camera pointed there.`}
          >
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={cameraPointTarget}
                onChange={(event) => setCameraPointTarget(event.target.value as CameraPointTarget)}
                aria-label="Automatic camera point target"
              >
                {CAMERA_POINT_TARGETS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <span className={styles.selectChevron} aria-hidden="true">
                ▾
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
  );
}
