import type { Rat } from './rat.js';
import type { Pitch } from './pitch.js';

export interface ScoreIR {
  tako: {
    irVersion: 4;
    sourceHash?: string;
    generator?: string;
    [key: string]: unknown;
  };
  meta: Meta;
  tempoMap: TempoEvent[];
  meterMap: MeterEvent[];
  sounds: SoundDecl[];
  tracks: Track[];
  markers?: MarkerEvent[];
}

export interface Meta {
  title?: string;
  artist?: string;
  album?: string;
  copyright?: string;
  anacrusis?: Rat;
  ext?: Record<string, unknown>;
}

export interface TempoEvent {
  at: Rat;
  bpm: number;
  unit: Rat;
}

export interface MeterEvent {
  at: Rat;
  numerator: number;
  denominator: number;
}

export interface SoundDecl {
  id: string;
  kind: 'instrument' | 'drumKit' | 'vocal' | 'fx';
  label?: string;
  family?: string;
  tags?: string[];
  range?: PitchRange;
  transposition?: number;
  drumKeys?: DrumKeyDecl[];
  vocal?: VocalDecl;
  hints?: Record<string, unknown>;
  ext?: Record<string, unknown>;
}

export interface PitchRange {
  low: Pitch;
  high: Pitch;
}

export interface DrumKeyDecl {
  key: string;
  label?: string;
  group?: string;
  tags?: string[];
}

export interface VocalDecl {
  lang?: string;
  defaultLyricMode?: 'text' | 'syllables' | 'phonemes';
  preferredAlphabet?: string;
  range?: PitchRange;
  tags?: string[];
}

export interface Track {
  name: string;
  role: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
  sound: string;
  mix?: Mix;
  placements: Placement[];
}

export interface Mix {
  gain?: number;
  pan?: number;
}

export interface Placement {
  at: Rat;
  clip: Clip;
}

export interface Clip {
  length?: Rat;
  events: Event[];
}

export type Event =
  | NoteEvent
  | ChordEvent
  | DrumHitEvent
  | BreathEvent
  | ControlEvent
  | AutomationEvent
  | MarkerEvent;

export interface NoteEvent {
  type: 'note';
  start: Rat;
  dur: Rat;
  pitch: Pitch;
  velocity?: number;
  voice?: number;
  techniques?: string[];
  lyric?: LyricSpan;
  ext?: Record<string, unknown>;
}

export interface ChordEvent {
  type: 'chord';
  start: Rat;
  dur: Rat;
  pitches: Pitch[];
  velocity?: number;
  voice?: number;
  techniques?: string[];
  ext?: Record<string, unknown>;
}

export interface DrumHitEvent {
  type: 'drumHit';
  start: Rat;
  dur: Rat;
  key: string;
  velocity?: number;
  techniques?: string[];
  ext?: Record<string, unknown>;
}

export interface BreathEvent {
  type: 'breath';
  start: Rat;
  dur: Rat;
  intensity?: number;
  ext?: Record<string, unknown>;
}

export interface ControlEvent {
  type: 'control';
  start: Rat;
  kind: string;
  data: Record<string, unknown>;
  ext?: Record<string, unknown>;
}

export interface AutomationEvent {
  type: 'automation';
  param: string;
  start: Rat;
  end: Rat;
  curve: Curve;
  ext?: Record<string, unknown>;
}

export interface Curve {
  kind: 'piecewiseLinear';
  points: CurvePoint[];
}

export interface CurvePoint {
  t: number;
  v: number;
}

export interface MarkerEvent {
  type: 'marker';
  pos: Rat;
  kind: string;
  label: string;
}

export interface LyricSpan {
  kind: 'syllable' | 'extend';
  text?: string;
  wordPos?: 'single' | 'begin' | 'middle' | 'end';
}
