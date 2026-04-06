import { useState } from 'react';
import styles from './ControlsNotice.module.css';

interface ControlsNoticeProps {
  onDismiss: (dontShowAgain: boolean) => void;
}

function MouseIcon({
  left,
  right,
  wheel,
}: {
  left?: boolean;
  right?: boolean;
  wheel?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
      <rect x="6.5" y="2.8" width="11" height="18.4" rx="5.5" className={styles.iconStroke} />
      <path d="M12 2.8v7" className={styles.iconStroke} />
      <path d="M7 8.2h5" className={left ? styles.iconAccent : styles.iconMuted} />
      <path d="M12 8.2h5" className={right ? styles.iconAccent : styles.iconMuted} />
      <rect
        x="10.8"
        y="5.6"
        width="2.4"
        height="4.4"
        rx="1.2"
        className={wheel ? styles.iconAccentFill : styles.iconMutedFill}
      />
    </svg>
  );
}

function AnchorIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
      <circle cx="12" cy="7" r="2.4" className={styles.iconAccentFill} />
      <path d="M12 9.8v7.7" className={styles.iconStroke} />
      <path d="M7 14.5a5.1 5.1 0 0 0 10 0" className={styles.iconStroke} />
      <path d="M9 18l-2.3 1.8" className={styles.iconAccent} />
      <path d="M15 18l2.3 1.8" className={styles.iconAccent} />
    </svg>
  );
}

const CONTROL_ITEMS = [
  {
    icon: <MouseIcon left />,
    title: 'Left drag',
    description: 'rotate view',
  },
  {
    icon: <MouseIcon right />,
    title: 'Right drag',
    description: 'pan view',
  },
  {
    icon: <MouseIcon wheel />,
    title: 'Wheel',
    description: 'zoom in or out',
  },
];

export default function ControlsNotice({ onDismiss }: ControlsNoticeProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className={styles.overlay} onClick={() => onDismiss(dontShowAgain)}>
      <div
        className={`${styles.dialog} hud-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and anchor tips"
      >
        <div className={styles.header}>
          <div className={styles.eyebrow}>Getting Started</div>
          <div className={styles.title}>Navigation Tips</div>
        </div>

        <div className={styles.body}>
          <div className={styles.columns}>
            <div className={styles.column}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>Mouse</div>
                <div className={styles.mouseRow}>
                  {CONTROL_ITEMS.map((item) => (
                    <div key={item.title} className={styles.mouseItem}>
                      <div className={styles.iconWrap}>{item.icon}</div>
                      <div className={styles.mouseContent}>
                        <div className={styles.mouseLabel}>{item.title}</div>
                        <div className={styles.mouseText}>{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.anchorCallout}>
                <div className={styles.anchorIconWrap}>
                  <AnchorIcon />
                </div>
                <div>
                  <div className={styles.anchorTitle}>Anchor</div>
                  <p className={styles.anchorText}>
                    Select <strong>Earth</strong>, <strong>Moon</strong>, or <strong>Spacecraft</strong> to point the
                    camera there and anchor it. Hold <strong>Shift</strong> while selecting to change the anchor without
                    moving the camera.
                  </p>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>Map Objects</div>
                <div className={styles.infoGridDouble}>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Stars</div>
                    <p className={styles.infoText}>Show or hide the star background.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Axes</div>
                    <p className={styles.infoText}>Show local axes for scene objects.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Trajectory</div>
                    <p className={styles.infoText}>Show the mission path through space.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Gravity Field</div>
                    <p className={styles.infoText}>Show the Earth-Moon gravity field overlay.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.column}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>Timeline</div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Live</div>
                    <p className={styles.infoText}>Jump to the current mission time.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Scrub</div>
                    <p className={styles.infoText}>Drag the timeline to inspect any point in the mission.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Play</div>
                    <p className={styles.infoText}>Run the mission forward at the selected speed.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Track</div>
                    <p className={styles.infoText}>Colored bands mark the major mission phases.</p>
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>Modes</div>
                <div className={styles.infoGridSingle}>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Map Panel</div>
                    <p className={styles.infoText}>Use the Map controls to toggle Stars, Axes, Trajectory, and Gravity Field.</p>
                  </div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoLabel}>Camera Targets</div>
                    <p className={styles.infoText}>Use Overview, Earth, Moon, and Spacecraft buttons to quickly reframe the scene.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>Don&apos;t show again</span>
          </label>

          <button type="button" className={styles.button} onClick={() => onDismiss(dontShowAgain)}>
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
