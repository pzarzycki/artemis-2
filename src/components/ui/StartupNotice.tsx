import styles from './StartupNotice.module.css';

interface StartupNoticeProps {
  onDismiss: () => void;
}

export default function StartupNotice({ onDismiss }: StartupNoticeProps) {
  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div
        className={`${styles.dialog} hud-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Display recommendation"
      >
        <div className={styles.header}>
          <div className={styles.title}>Best Viewing Experience</div>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>
            This experience works best in a desktop browser, or at least in a horizontal screen orientation.
          </p>
          <button type="button" className={styles.button} onClick={onDismiss}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
