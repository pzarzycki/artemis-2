import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  message?: string;
}

export default function LoadingOverlay({ message = 'Loading scene…' }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner} />
      <span className={styles.msg}>{message}</span>
    </div>
  );
}
