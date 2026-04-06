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
import ControlsNotice from './ControlsNotice';
import StartupNotice from './StartupNotice';
import WebGLErrorNotice from './WebGLErrorNotice';
import styles from './Layout.module.css';

const MIN_DESKTOP_WIDTH = 1100;
const MIN_DESKTOP_HEIGHT = 650;
const CONTROLS_NOTICE_STORAGE_KEY = 'artemis2:hide-controls-notice';

function hasWebGLSupport() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;

  const canvas = document.createElement('canvas');

  try {
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

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
  const [hasWebGL, setHasWebGL] = useState(true);
  const [showStartupNotice, setShowStartupNotice] = useState(false);
  const [showControlsNotice, setShowControlsNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!hasWebGLSupport()) {
      setHasWebGL(false);
      return;
    }

    if (shouldShowStartupNotice()) {
      setShowStartupNotice(true);
      return;
    }

    if (!window.localStorage.getItem(CONTROLS_NOTICE_STORAGE_KEY)) {
      setShowControlsNotice(true);
    }
  }, []);

  const dismissStartupNotice = () => {
    setShowStartupNotice(false);
    if (typeof window !== 'undefined' && !window.localStorage.getItem(CONTROLS_NOTICE_STORAGE_KEY)) {
      setShowControlsNotice(true);
    }
  };

  const dismissControlsNotice = (dontShowAgain: boolean) => {
    if (typeof window !== 'undefined') {
      if (dontShowAgain) {
        window.localStorage.setItem(CONTROLS_NOTICE_STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(CONTROLS_NOTICE_STORAGE_KEY);
      }
    }
    setShowControlsNotice(false);
  };

  return (
    <Suspense fallback={<LoadingOverlay message="Loading mission data…" />}>
      <div className={styles.root}>
        {hasWebGL && (
          <ErrorBoundary>
            <div className={styles.canvas}>
              <Suspense fallback={<LoadingOverlay message="Loading 3D scene…" sceneOnly />}>
                <Scene />
              </Suspense>
              <AssetLoadingOverlay />
            </div>
          </ErrorBoundary>
        )}
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
        {!hasWebGL && <WebGLErrorNotice />}
        {hasWebGL && showStartupNotice && <StartupNotice onDismiss={dismissStartupNotice} />}
        {hasWebGL && !showStartupNotice && showControlsNotice && (
          <ControlsNotice onDismiss={dismissControlsNotice} />
        )}
      </div>
    </Suspense>
  );
}
