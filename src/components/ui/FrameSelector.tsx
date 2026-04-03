import { useMissionStore } from '../../store/missionStore';
import type { ReferenceFrame } from '../../store/missionStore';
import { useEphemeris } from '../../hooks/useEphemeris';
import { useMissionTime } from '../../hooks/useMissionTime';
import styles from './FrameSelector.module.css';

/**
 * Reference frame selector.
 *
 * The runtime state vectors are Earth-centred and J2000/ICRF-aligned.
 * Switching frames applies a scene-level origin offset at render time:
 *
 *   GCRS       — Earth-centred inertial view
 *   BCRS       — Solar-system-barycentric overview/debug view
 */

const FRAMES: {
  id: ReferenceFrame;
  icon: string;
  name: string;
  sub: string;
  requiresBCRS?: boolean;
}[] = [
  { id: 'GCRS',       icon: '⊕', name: 'GCRS',       sub: 'Earth-centred'  },
  { id: 'BCRS',       icon: '☉', name: 'BCRS',       sub: 'Solar bary.',   requiresBCRS: true },
];

export default function FrameSelector() {
  const { referenceFrame, setReferenceFrame } = useMissionStore();
  const { julianDate } = useMissionTime();
  const ephemeris = useEphemeris(julianDate);
  const hasBCRS = ephemeris.earthPosBCRS !== null;

  return (
    <div className={`${styles.group} hud-panel`}>
      <div className={styles.label}>Frame</div>
      {FRAMES.map(({ id, icon, name, sub, requiresBCRS }) => {
        const unavailable = requiresBCRS && !hasBCRS;
        return (
          <button
            key={id}
            className={[
              styles.btn,
              referenceFrame === id ? styles.active : '',
              unavailable ? styles.disabled : '',
            ].join(' ')}
            onClick={() => !unavailable && setReferenceFrame(id)}
            title={unavailable ? 'Requires SPICE ephemeris (run fetch_ephemeris.py)' : name}
          >
            <span className={styles.icon}>{icon}</span>
            <span className={styles.name}>{name}</span>
            <span className={styles.sub}>{unavailable ? 'N/A' : sub}</span>
          </button>
        );
      })}
    </div>
  );
}
