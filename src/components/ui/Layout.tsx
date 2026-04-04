import { Suspense } from 'react';
import Scene from '../scene/Scene';
import StatusBar from './StatusBar';
import Timeline from './Timeline';
import InfoPanel from './InfoPanel';
import CameraPresets from './CameraPresets';
import ErrorBoundary from './ErrorBoundary';
import LoadingOverlay from './LoadingOverlay';
import AssetLoadingOverlay from './AssetLoadingOverlay';
import FrameSelector from './FrameSelector';
import SceneControls from './SceneControls';
import CameraPanel from './CameraPanel';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.root}>
      <ErrorBoundary>
        <div className={styles.canvas}>
          <Suspense fallback={<LoadingOverlay message="Loading 3D scene…" />}>
            <Scene />
          </Suspense>
          <AssetLoadingOverlay />
        </div>
      </ErrorBoundary>
      <div className={styles.hud}>
        <StatusBar />
        <CameraPanel />
        <div className={styles.sides}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <CameraPresets />
            <FrameSelector />
            <SceneControls />
          </div>
          <InfoPanel />
        </div>
        <div className={styles.bottom}>
          <Timeline />
        </div>
      </div>
    </div>
  );
}
