import { create } from 'zustand';
import { getDefaultMissionJD } from '../lib/time';
import type { Vec3 } from '../lib/coordinates/types';
import type { StarMapLayer, StarMapResolution } from '../config/starmaps';

export type AnchorTarget = 'overview' | 'earth' | 'moon' | 'spacecraft';
export type AnchorTargetSwitchMode = 'preset' | 'preserve-view';
export type LookTarget = 'none' | 'sun' | 'earth' | 'moon' | 'spacecraft';
export type MissionMode = 'live' | 'scrub';
export type ReferenceFrame = 'GCRS' | 'BCRS';
export type LearnSection = 'sources' | 'world' | 'frames' | 'data' | 'gravity' | 'camera' | 'planning';
export type ActiveDialog = 'learn' | 'settings' | null;

interface MissionState {
  currentJD: number;
  mode: MissionMode;
  playbackSpeed: number;
  isPlaying: boolean;
  anchorTarget: AnchorTarget;
  anchorTargetSwitchMode: AnchorTargetSwitchMode;
  lookTarget: LookTarget;
  referenceFrame: ReferenceFrame;
  showStars: boolean;
  showObjectAxes: boolean;
  showTrajectory: boolean;
  showGravityField: boolean;
  skyExposure: number;
  starMapLayer: StarMapLayer;
  starMapResolution: StarMapResolution;
  isStarMapLoading: boolean;
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
  setAnchorTarget: (target: AnchorTarget, options?: { preserveView?: boolean }) => void;
  setLookTarget: (target: LookTarget) => void;
  clearLookTarget: () => void;
  consumeAnchorTargetSwitchMode: () => void;
  setReferenceFrame: (frame: ReferenceFrame) => void;
  setShowStars: (show: boolean) => void;
  setShowObjectAxes: (show: boolean) => void;
  setShowTrajectory: (show: boolean) => void;
  setShowGravityField: (show: boolean) => void;
  setSkyExposure: (value: number) => void;
  setStarMapLayer: (value: StarMapLayer) => void;
  setStarMapResolution: (value: StarMapResolution) => void;
  setStarMapLoading: (value: boolean) => void;
  setBloomIntensity: (value: number) => void;
  setAmbientLightIntensity: (value: number) => void;
  setCameraTelemetry: (position: Vec3, forward: Vec3, up: Vec3) => void;
  requestCameraAim: (direction: Vec3) => void;
  openDialog: (dialog: Exclude<ActiveDialog, null>, section?: LearnSection) => void;
  closeDialog: () => void;
  setLearnSection: (section: LearnSection) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  currentJD: getDefaultMissionJD(),
  mode: 'live',
  playbackSpeed: 60,
  isPlaying: false,
  anchorTarget: 'overview',
  anchorTargetSwitchMode: 'preset',
  lookTarget: 'none',
  referenceFrame: 'GCRS',
  showStars: true,
  showObjectAxes: true,
  showTrajectory: true,
  showGravityField: false,
  skyExposure: 0.5,
  starMapLayer: 'starmap',
  starMapResolution: '4k',
  isStarMapLoading: false,
  bloomIntensity: 2,
  ambientLightIntensity: 0.03,
  cameraPosition: [0, 0, 0],
  cameraForward: [0, 1, 0],
  cameraUp: [0, 0, 1],
  cameraAimDirection: null,
  cameraAimRequestId: 0,
  activeDialog: null,
  learnSection: 'sources',

  setCurrentJD: (jd) => set({ currentJD: jd }),
  setMode: (mode) =>
    set((state) => ({
      mode,
      currentJD: mode === 'live' ? getDefaultMissionJD() : state.currentJD,
      isPlaying: mode === 'scrub' ? state.isPlaying : false,
    })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setAnchorTarget: (anchorTarget, options) =>
    set({
      anchorTarget,
      anchorTargetSwitchMode: options?.preserveView ? 'preserve-view' : 'preset',
    }),
  setLookTarget: (lookTarget) => set({ lookTarget }),
  clearLookTarget: () => set({ lookTarget: 'none' }),
  consumeAnchorTargetSwitchMode: () => set({ anchorTargetSwitchMode: 'preset' }),
  setReferenceFrame: (referenceFrame) => set({ referenceFrame }),
  setShowStars: (showStars) => set({ showStars }),
  setShowObjectAxes: (showObjectAxes) => set({ showObjectAxes }),
  setShowTrajectory: (showTrajectory) => set({ showTrajectory }),
  setShowGravityField: (showGravityField) => set({ showGravityField }),
  setSkyExposure: (skyExposure) => set({ skyExposure }),
  setStarMapLayer: (starMapLayer) => set({ starMapLayer }),
  setStarMapResolution: (starMapResolution) => set({ starMapResolution }),
  setStarMapLoading: (isStarMapLoading) => set({ isStarMapLoading }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setAmbientLightIntensity: (ambientLightIntensity) => set({ ambientLightIntensity }),
  setCameraTelemetry: (cameraPosition, cameraForward, cameraUp) =>
    set({ cameraPosition, cameraForward, cameraUp }),
  requestCameraAim: (cameraAimDirection) =>
    set((state) => ({
      lookTarget: 'none',
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
