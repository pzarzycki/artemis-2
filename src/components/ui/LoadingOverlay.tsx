import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  message?: string;
  nonBlocking?: boolean;
}

export default function LoadingOverlay({ message = 'Loading scene…', nonBlocking = false }: LoadingOverlayProps) {
  return (
    <div className={nonBlocking ? `${styles.overlay} ${styles.nonBlocking}` : styles.overlay}>
      <div className={styles.spinner} />
      <span className={styles.msg}>{message}</span>
    </div>
  );
}
