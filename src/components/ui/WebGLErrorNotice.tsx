import styles from './WebGLErrorNotice.module.css';

export default function WebGLErrorNotice() {
  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.dialog} hud-panel`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="webgl-error-title"
        aria-describedby="webgl-error-message"
      >
        <div className={styles.header}>
          <div className={styles.eyebrow}>Display Error</div>
          <div id="webgl-error-title" className={styles.title}>
            WebGL is not available
          </div>
        </div>

        <div className={styles.body}>
          <p id="webgl-error-message" className={styles.message}>
            This viewer requires WebGL to render the 3D scene. Your browser or device is not
            exposing a working WebGL context, so the application cannot start.
          </p>
          <p className={styles.message}>
            Try enabling hardware acceleration, updating the browser, or opening the viewer on a
            different device.
          </p>
        </div>
      </div>
    </div>
  );
}
