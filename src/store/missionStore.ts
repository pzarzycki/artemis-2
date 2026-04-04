import { create } from 'zustand';
import { toJulianDate } from '../lib/time';
import type { Vec3 } from '../lib/coordinates/types';

export type CameraTarget = 'overview' | 'earth' | 'moon' | 'spacecraft';
export type MissionMode = 'live' | 'scrub';
export type ReferenceFrame = 'GCRS' | 'BCRS';
export type LearnSection = 'world' | 'frames' | 'data' | 'camera' | 'planning';
export type ActiveDialog = 'learn' | 'settings' | null;

interface MissionState {
  currentJD: number;
  mode: MissionMode;
  playbackSpeed: number;
  isPlaying: boolean;
  cameraTarget: CameraTarget;
  referenceFrame: ReferenceFrame;
  showStars: boolean;
  showObjectAxes: boolean;
  showTrajectory: boolean;
  skyExposure: number;
  bloomIntensity: number;
  ambientLightIntensity: number;
  cameraPosition: Vec3;
  cameraForward: Vec3;
  cameraUp: Vec3;
  cameraAimDirection: Vec3 | null;
  cameraAimRequestId: number;
  activeDialog: ActiveDialog;
  learnSection: LearnSection;

  setCurrentJD: (jd: number) => void;
  setMode: (mode: MissionMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCameraTarget: (target: CameraTarget) => void;
  setReferenceFrame: (frame: ReferenceFrame) => void;
  setShowStars: (show: boolean) => void;
  setShowObjectAxes: (show: boolean) => void;
  setShowTrajectory: (show: boolean) => void;
  setSkyExposure: (value: number) => void;
  setBloomIntensity: (value: number) => void;
  setAmbientLightIntensity: (value: number) => void;
  setCameraTelemetry: (position: Vec3, forward: Vec3, up: Vec3) => void;
  requestCameraAim: (direction: Vec3) => void;
  openDialog: (dialog: Exclude<ActiveDialog, null>, section?: LearnSection) => void;
  closeDialog: () => void;
  setLearnSection: (section: LearnSection) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  currentJD: toJulianDate(new Date()),
  mode: 'live',
  playbackSpeed: 60,
  isPlaying: false,
  cameraTarget: 'overview',
  referenceFrame: 'GCRS',
  showStars: true,
  showObjectAxes: true,
  showTrajectory: true,
  skyExposure: 0.5,
  bloomIntensity: 0.6,
  ambientLightIntensity: 0.03,
  cameraPosition: [0, 0, 0],
  cameraForward: [0, 1, 0],
  cameraUp: [0, 0, 1],
  cameraAimDirection: null,
  cameraAimRequestId: 0,
  activeDialog: null,
  learnSection: 'world',

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
  setShowStars: (showStars) => set({ showStars }),
  setShowObjectAxes: (showObjectAxes) => set({ showObjectAxes }),
  setShowTrajectory: (showTrajectory) => set({ showTrajectory }),
  setSkyExposure: (skyExposure) => set({ skyExposure }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setAmbientLightIntensity: (ambientLightIntensity) => set({ ambientLightIntensity }),
  setCameraTelemetry: (cameraPosition, cameraForward, cameraUp) =>
    set({ cameraPosition, cameraForward, cameraUp }),
  requestCameraAim: (cameraAimDirection) =>
    set((state) => ({
      cameraAimDirection,
      cameraAimRequestId: state.cameraAimRequestId + 1,
    })),
  openDialog: (activeDialog, learnSection) =>
    set((state) => ({
      activeDialog,
      learnSection: learnSection ?? state.learnSection,
    })),
  closeDialog: () => set({ activeDialog: null }),
  setLearnSection: (learnSection) => set({ learnSection }),
}));
