import { create } from 'zustand';
import { toJulianDate } from '../lib/time';

export type CameraTarget = 'overview' | 'earth' | 'moon' | 'spacecraft';
export type MissionMode = 'live' | 'scrub';
export type ReferenceFrame = 'GCRS' | 'BCRS';

interface MissionState {
  currentJD: number;
  mode: MissionMode;
  playbackSpeed: number;
  isPlaying: boolean;
  cameraTarget: CameraTarget;
  referenceFrame: ReferenceFrame;

  setCurrentJD: (jd: number) => void;
  setMode: (mode: MissionMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCameraTarget: (target: CameraTarget) => void;
  setReferenceFrame: (frame: ReferenceFrame) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  currentJD: toJulianDate(new Date()),
  mode: 'live',
  playbackSpeed: 60,
  isPlaying: false,
  cameraTarget: 'overview',
  referenceFrame: 'GCRS',

  setCurrentJD: (jd) => set({ currentJD: jd }),
  setMode: (mode) =>
    set((state) => ({
      mode,
      currentJD: mode === 'live' ? toJulianDate(new Date()) : state.currentJD,
      isPlaying: mode === 'scrub' ? state.isPlaying : false,
    })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  setReferenceFrame: (referenceFrame) => set({ referenceFrame }),
}));
