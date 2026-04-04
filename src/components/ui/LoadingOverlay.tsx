import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  message?: string;
  nonBlocking?: boolean;
  sceneOnly?: boolean;
}

export default function LoadingOverlay({
  message = 'Loading scene…',
  nonBlocking = false,
  sceneOnly = false,
}: LoadingOverlayProps) {
  const className = [
    styles.overlay,
    nonBlocking ? styles.nonBlocking : '',
    sceneOnly ? styles.sceneOnly : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className={styles.spinner} />
      <span className={styles.msg}>{message}</span>
    </div>
  );
}
