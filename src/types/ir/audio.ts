// Audio Manipulation and Processing types

import type { AudioClipEvent } from './notation.js';
import type { AudioEffect } from './effects.js';

// Audio Track
export interface AudioTrack {
  id: string;
  name: string;
  clips: AudioClipEvent[];
  effects?: AudioEffect[];
  volume: number;
  pan: number;
  mute?: boolean;
  solo?: boolean;
}

// Audio Manipulation
export interface TimeStretchEvent {
  type: 'timeStretch';
  tick: number;
  clipId: string;
  ratio: number;              // 0.5 = half speed, 2.0 = double speed
  preservePitch: boolean;
  algorithm: 'elastique' | 'paulstretch' | 'rubberband' | 'basic';
}

export interface PitchShiftEvent {
  type: 'pitchShift';
  tick: number;
  clipId: string;
  semitones: number;          // Shift amount
  cents?: number;             // Fine-tune
  preserveFormants: boolean;
}

export interface SampleSlice {
  startTick: number;
  endTick: number;
  pitch?: number;             // Optional pitch for each slice
  stretch?: number;           // Time stretch ratio
}

export interface SampleSlicerEvent {
  type: 'sampleSlicer';
  tick: number;
  clipId: string;
  slices: SampleSlice[];
  mode: 'transient' | 'grid' | 'manual';
  sensitivity?: number;       // For transient detection
}

export interface GranularSynthEvent {
  type: 'granular';
  tick: number;
  clipId: string;
  grainSize: number;          // ms
  grainDensity: number;       // Grains per second
  position: number;           // 0-1 position in sample
  positionRandom: number;     // 0-1 randomization
  pitchRandom: number;        // Semitones
  pan: number;                // -1 to 1
  panRandom: number;          // 0-1 randomization
}

// Mixing / Mastering
export interface BusTrack {
  id: string;
  name: string;
  type: 'bus' | 'aux' | 'vca' | 'master';
  inputTracks: string[];      // Track IDs routed to this bus
  effects: AudioEffect[];
  volume: number;
  pan: number;
  mute?: boolean;
  solo?: boolean;
}

export interface SendEffect {
  type: 'send';
  tick: number;
  fromTrack: string;
  toBus: string;
  amount: number;             // 0-100 (send level)
  preFader: boolean;
}

export interface StereoWidthEvent {
  type: 'stereoWidth';
  tick: number;
  width: number;              // 0-200 (100 = normal, 0 = mono, 200 = extra wide)
  midSideMode?: boolean;
  midGain?: number;
  sideGain?: number;
}

// Spatial Audio
export type SpatialFormat = 'stereo' | '5.1' | '7.1' | 'atmos' | 'binaural' | 'ambisonic-1' | 'ambisonic-2' | 'ambisonic-3';

export interface SpatialAudioEvent {
  type: 'spatial';
  tick: number;
  format: SpatialFormat;
  position?: {
    x: number;                // -1 to 1 (left-right)
    y: number;                // -1 to 1 (front-back)
    z: number;                // -1 to 1 (bottom-top)
  };
  size?: number;              // Source size (0-100)
  spread?: number;            // 0-100
  lfe?: number;               // LFE send level
}

export interface SurroundPanEvent {
  type: 'surroundPan';
  tick: number;
  trackId: string;
  channels: {
    L: number;
    R: number;
    C: number;
    LFE: number;
    Ls: number;
    Rs: number;
    Lb?: number;              // For 7.1
    Rb?: number;              // For 7.1
  };
}

// Audio Editing & Restoration
export interface FreezeTrack {
  type: 'freeze';
  trackId: string;
  startTick: number;
  endTick: number;
  audioFile?: string;
}

export interface AudioWarp {
  type: 'audioWarp';
  audioClipId: string;
  mode: 'beats' | 'tonal' | 'texture' | 'repitch' | 'complex';
  quantizeStrength: number;        // 0-100
  preserveTransients: boolean;
}

export interface WarpMarker {
  type: 'warpMarker';
  audioClipId: string;
  originalPosition: number;        // Sample position
  warpedPosition: number;          // Target sample position
}

export interface BeatSlice {
  type: 'beatSlice';
  audioClipId: string;
  slicePoints: number[];           // Sample positions of transients
  sensitivity: number;             // 0-100
  minSliceLength: number;          // ms
}

export interface SpectralRepair {
  type: 'spectralRepair';
  tick: number;
  endTick: number;
  lowFreq: number;
  highFreq: number;
  repairType: 'attenuate' | 'replace' | 'pattern' | 'interpolate';
  strength: number;                // 0-100
}

export interface AudioRestoration {
  type: 'audioRestoration';
  mode: 'declip' | 'decrackle' | 'dehum' | 'denoise' | 'declick';
  threshold: number;
  strength: number;
  frequency?: number;              // For dehum (50/60 Hz)
}

export interface VocalAlignment {
  type: 'vocalAlignment';
  referenceTrackId: string;
  alignTrackId: string;
  tightness: number;               // 0-100
  alignPitch: boolean;
  alignTiming: boolean;
}

// Dynamics Processing
export interface MidSideProcessing {
  type: 'midSide';
  tick: number;
  mode: 'encode' | 'decode' | 'process';
  midGain: number;                 // dB
  sideGain: number;                // dB
  midWidth: number;                // 0-200 (100 = normal)
}

export interface DynamicEQ {
  type: 'dynamicEQ';
  tick: number;
  bands: DynamicEQBand[];
}

export interface DynamicEQBand {
  frequency: number;               // Hz
  gain: number;                    // dB (static)
  q: number;
  threshold: number;               // dB
  ratio: number;
  attack: number;                  // ms
  release: number;                 // ms
  dynamicGain: number;            // dB (dynamic range)
  mode: 'expand' | 'compress';
}

export interface LinearPhaseEQ {
  type: 'linearPhaseEQ';
  tick: number;
  latency: 'low' | 'medium' | 'high' | 'maximum';
  bands: EQBand[];
}

export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: 'lowshelf' | 'highshelf' | 'peak' | 'lowpass' | 'highpass' | 'notch';
}

export interface ParallelProcessing {
  type: 'parallel';
  tick: number;
  effectChain: string[];           // Effect IDs
  dryLevel: number;                // 0-100
  wetLevel: number;                // 0-100
  phase: 'normal' | 'inverted';
}

// Atmos/Spatial Extensions
export interface AtmosObject {
  type: 'atmosObject';
  id: string;
  name: string;
  trackId: string;
  isStatic: boolean;
  position: {
    x: number;                     // -1 to 1
    y: number;                     // -1 to 1 (front-back)
    z: number;                     // 0 to 1 (height)
  };
  size: number;                    // 0-100
  automation: AtmosAutomationPoint[];
}

export interface AtmosAutomationPoint {
  tick: number;
  x: number;
  y: number;
  z: number;
  size?: number;
}

export interface HeadphoneVirtualization {
  type: 'headphoneVirtualization';
  enabled: boolean;
  hrtfProfile: 'generic' | 'small' | 'medium' | 'large' | 'custom';
  roomSize: number;                // 0-100
  distance: number;                // 0-100
  angle: number;                   // Degrees
}

export interface SurroundAutomation {
  type: 'surroundAutomation';
  tick: number;
  pattern: 'circle' | 'figure8' | 'random' | 'custom';
  speed: number;                   // Rotations per bar
  width: number;                   // 0-100
  centerBias: number;              // 0-100
  points?: { tick: number; x: number; y: number; z: number }[];
}
