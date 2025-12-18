// Algorithmic Composition and Microtonality types

import type { NoteEvent } from './core.js';

// Microtonality & Tuning System
export type TuningSystem =
  | 'equal'           // 12-TET (default)
  | 'just'            // Just intonation
  | 'pythagorean'     // Pythagorean tuning
  | 'meantone'        // Quarter-comma meantone
  | 'werckmeister'    // Werckmeister III
  | 'custom';         // Custom tuning table

export interface TuningEvent {
  type: 'tuning';
  tick: number;
  system: TuningSystem;
  baseFreq?: number;        // A4 frequency (default 440)
  customCents?: number[];   // 12 values for custom tuning (cents from equal)
}

export interface MicrotonalNoteEvent extends NoteEvent {
  cents?: number;           // Cents deviation from equal temperament (-100 to +100)
  quarterTone?: 'sharp' | 'flat';  // Quarter tone accidental
}

export interface PitchCorrectionEvent {
  type: 'pitchCorrection';
  tick: number;
  endTick: number;
  amount: number;           // 0-100 (0 = natural, 100 = full correction)
  speed: number;            // Correction speed (ms)
}

// Algorithmic Composition
export interface EuclideanRhythm {
  type: 'euclidean';
  steps: number;            // Total steps
  pulses: number;           // Number of hits
  rotation?: number;        // Rotation offset
}

export interface ProbabilityNote {
  pitch: number;
  probability: number;      // 0.0 - 1.0
  velocityRange?: [number, number];
}

export interface MarkovChain {
  type: 'markov';
  order: number;            // Order of the chain (1, 2, 3...)
  transitions: Record<string, Record<string, number>>;  // State -> Next state -> probability
}

export interface GenerativePattern {
  type: 'generative';
  algorithm: 'euclidean' | 'markov' | 'random' | 'cellular' | 'lsystem';
  seed?: number;
  params: Record<string, number | string>;
}

export interface ConstraintRule {
  type: 'constraint';
  rule: 'no_parallel_fifths' | 'voice_leading' | 'range_limit' | 'interval_limit' | 'custom';
  params?: Record<string, number | string>;
}
