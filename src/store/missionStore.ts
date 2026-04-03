import { create } from 'zustand';
import { toJulianDate } from '../lib/time';

export type CameraTarget = 'overview' | 'earth' | 'moon' | 'spacecraft';
export type MissionMode = 'live' | 'scrub';

interface MissionState {
  /** Current Julian Date being displayed */
  currentJD: number;
  /** Live: follows real clock. Scrub: controlled by timeline */
  mode: MissionMode;
  /** Playback speed multiplier (1 = realtime, 60 = 1 min/s, etc.) */
  playbackSpeed: number;
  /** Whether playback is running (only relevant in scrub mode) */
  isPlaying: boolean;
  /** Which object the camera focuses on */
  cameraTarget: CameraTarget;

  setCurrentJD: (jd: number) => void;
  setMode: (mode: MissionMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCameraTarget: (target: CameraTarget) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  currentJD: toJulianDate(new Date()),
  mode: 'live',
  playbackSpeed: 60,
  isPlaying: false,
  cameraTarget: 'overview',

  setCurrentJD: (jd) => set({ currentJD: jd }),
  setMode: (mode) =>
    set((state) => ({
      mode,
      // when switching to live, reset to current time
      currentJD: mode === 'live' ? toJulianDate(new Date()) : state.currentJD,
      isPlaying: mode === 'scrub' ? state.isPlaying : false,
    })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
}));
