// Sequencing and Live Performance types

import type { TrackEvent } from './core.js';

// Live Performance
export interface Scene {
  id: string;
  name: string;
  clips: SceneClip[];
  tempo?: number;
  timeSig?: [number, number];
}

export interface SceneClip {
  trackId: string;
  patternId: string;
  startTick: number;
  length: number;
  loopEnabled?: boolean;
}

export interface LiveLoopEvent {
  type: 'liveLoop';
  tick: number;
  loopId: string;
  length: number;           // Loop length in ticks
  overdub?: boolean;
}

// Step Sequencer
export interface StepSequencer {
  type: 'stepSequencer';
  id: string;
  steps: number;                // Number of steps (8, 16, 32, 64)
  rate: string;                 // Step rate ('16n', '8n', etc.)
  pattern: StepSequencerStep[];
  swing?: number;               // 0-100
  direction: 'forward' | 'backward' | 'pingpong' | 'random';
}

export interface StepSequencerStep {
  active: boolean;
  note?: number;                // MIDI note
  velocity?: number;            // 0-127
  gate?: number;                // 0-100 (note length percentage)
  probability?: number;         // 0-100
  offset?: number;              // Timing offset in ticks
  slide?: boolean;              // Glide to next note
  accent?: boolean;
}

export interface FollowAction {
  type: 'followAction';
  clipId: string;
  action: 'next' | 'previous' | 'first' | 'last' | 'any' | 'other' | 'jump';
  targetClipId?: string;        // For 'jump' action
  probability: number;          // 0-100
  time: number;                 // Ticks after clip end
  quantize?: string;            // Quantization grid
}

// Scale and Chord Lock
export interface ScaleLock {
  type: 'scaleLock';
  tick: number;
  root: number;                 // Root note (0-11, C=0)
  scale: ScaleType;
  mode: 'nearest' | 'up' | 'down' | 'block';
}

export type ScaleType =
  | 'major' | 'minor' | 'harmonic-minor' | 'melodic-minor'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  | 'pentatonic-major' | 'pentatonic-minor' | 'blues'
  | 'whole-tone' | 'diminished' | 'chromatic';

export interface ChordLock {
  type: 'chordLock';
  tick: number;
  root: number;
  chordType: string;
  voicing: 'close' | 'open' | 'drop2' | 'drop3';
}

// Divisi
export interface Divisi {
  type: 'divisi';
  tick: number;
  endTick: number;
  trackId: string;
  parts: number;                // Number of divisi parts (2-8)
  method: 'top-down' | 'bottom-up' | 'alternating' | 'spread';
}

// Expression Map
export interface ExpressionMap {
  type: 'expressionMap';
  id: string;
  name: string;
  entries: ExpressionMapEntry[];
}

export interface ExpressionMapEntry {
  articulation: string;
  keyswitch?: number;           // MIDI note
  programChange?: number;
  ccSwitch?: { cc: number; value: number };
  attributes?: {
    length?: number;            // Percentage
    velocity?: number;          // Offset
    transpose?: number;         // Semitones
  };
}

// Groove & Humanize
export interface GrooveTemplate {
  type: 'groove';
  id: string;
  name: string;
  timingOffsets: number[];         // Offset per beat subdivision (ticks)
  velocityOffsets: number[];       // Offset per beat subdivision (-127 to 127)
  quantizeAmount: number;          // 0-100
}

export interface HumanizeSettings {
  type: 'humanize';
  tick: number;
  endTick: number;
  timingRange: number;             // Max offset in ticks
  velocityRange: number;           // Max offset
  durationRange: number;           // Max offset in ticks
  seed?: number;
}

export interface Randomization {
  type: 'randomize';
  parameter: 'pitch' | 'velocity' | 'timing' | 'duration' | 'pan';
  min: number;
  max: number;
  distribution: 'uniform' | 'gaussian' | 'weighted';
  probability: number;             // 0-100
}
