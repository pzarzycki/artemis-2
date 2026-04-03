import { Suspense } from 'react';
import Scene from '../scene/Scene';
import StatusBar from './StatusBar';
import Timeline from './Timeline';
import InfoPanel from './InfoPanel';
import CameraPresets from './CameraPresets';
import ModeToggle from './ModeToggle';
import ErrorBoundary from './ErrorBoundary';
import LoadingOverlay from './LoadingOverlay';
import FrameSelector from './FrameSelector';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.root}>
      <ErrorBoundary>
        <div className={styles.canvas}>
          <Suspense fallback={<LoadingOverlay message="Loading 3D scene…" />}>
            <Scene />
          </Suspense>
        </div>
      </ErrorBoundary>
      <div className={styles.hud}>
        <StatusBar />
        <div className={styles.sides}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <CameraPresets />
            <FrameSelector />
          </div>
          <InfoPanel />
        </div>
        <div className={styles.bottom}>
          <ModeToggle />
          <Timeline />
        </div>
      </div>
    </div>
  );
}
