import { Suspense, useEffect, useState } from 'react';
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
import StartupNotice from './StartupNotice';
import styles from './Layout.module.css';

const MIN_DESKTOP_WIDTH = 1100;
const MIN_DESKTOP_HEIGHT = 700;

function shouldShowStartupNotice() {
  if (typeof window === 'undefined') return false;

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  const isBelowMinimumDesktop =
    viewportWidth < MIN_DESKTOP_WIDTH || viewportHeight < MIN_DESKTOP_HEIGHT;

  return isPortrait || isBelowMinimumDesktop;
}

export default function Layout() {
  const [showStartupNotice, setShowStartupNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (shouldShowStartupNotice()) {
      setShowStartupNotice(true);
    }
  }, []);

  const dismissStartupNotice = () => setShowStartupNotice(false);

  return (
    <Suspense fallback={<LoadingOverlay message="Loading mission data…" />}>
      <div className={styles.root}>
        <ErrorBoundary>
          <div className={styles.canvas}>
            <Suspense fallback={<LoadingOverlay message="Loading 3D scene…" sceneOnly />}>
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
        {showStartupNotice && <StartupNotice onDismiss={dismissStartupNotice} />}
      </div>
    </Suspense>
  );
}
