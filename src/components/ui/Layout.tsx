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

const STARTUP_NOTICE_KEY = 'startup-notice-dismissed-v1';
const MIN_DESKTOP_WIDTH = 900;

export default function Layout() {
  const [showStartupNotice, setShowStartupNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STARTUP_NOTICE_KEY) === '1') return;

    const isSmallViewport = window.innerWidth < MIN_DESKTOP_WIDTH;
    const isPortrait = window.innerWidth < window.innerHeight;

    if (isSmallViewport || isPortrait) {
      setShowStartupNotice(true);
    }
  }, []);

  const dismissStartupNotice = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STARTUP_NOTICE_KEY, '1');
    }
    setShowStartupNotice(false);
  };

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
