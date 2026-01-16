// TakoMusic IR types (v4) - subset needed for MIDI rendering

export interface Rat {
  n: number;
  d: number;
}

export interface Pitch {
  midi: number;
  cents?: number;
}

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
  | MarkerEvent
  | GraceNoteEvent
  | GlissandoEvent;

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

export interface GraceNoteEvent {
  type: 'graceNote';
  start: Rat;
  mainPitch: Pitch;
  mainDur: Rat;
  graces: GraceNotePitch[];
  style: 'acciaccatura' | 'appoggiatura';
  stealFrom: 'main' | 'previous';
  velocity?: number;
  ext?: Record<string, unknown>;
}

export interface GraceNotePitch {
  pitch: Pitch;
  dur: Rat;
}

export interface GlissandoEvent {
  type: 'glissando';
  start: Rat;
  end: Rat;
  fromPitch: Pitch;
  toPitch: Pitch;
  style: 'continuous' | 'discrete';
  velocity?: number;
  ext?: Record<string, unknown>;
}

export interface LyricSpan {
  kind: 'syllable' | 'extend';
  text?: string;
  wordPos?: 'single' | 'begin' | 'middle' | 'end';
}

// Render Profile types

export interface RenderProfile {
  tako: {
    profileVersion: 1;
  };
  profileName: string;
  renderer: string;
  output: OutputConfig;
  degradePolicy?: 'Error' | 'Drop' | 'Approx';
  bindings: Binding[];
}

export interface OutputConfig {
  path?: string;
  format?: string;
  [key: string]: unknown;
}

export interface Binding {
  selector: Selector;
  config: BindingConfig;
}

export interface Selector {
  trackName?: string;
  sound?: string;
  role?: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
}

export interface BindingConfig {
  channel?: number;
  program?: number;
  bank?: number;
  drumMap?: Record<string, number>;
  [key: string]: unknown;
}

// Plugin protocol types

export interface Capabilities {
  protocolVersion: 1;
  id: string;
  name?: string;
  version?: string;
  supportedRoles?: ('Instrument' | 'Drums' | 'Vocal' | 'Automation')[];
  supportedEvents?: string[];
  lyricSupport?: {
    modes?: ('text' | 'syllables' | 'phonemes')[];
    languages?: string[];
  };
  paramSupport?: string[];
  techniqueSupport?: string[];
  degradeDefaults?: {
    unknownParam?: 'Error' | 'Drop' | 'Approx';
    unknownTechnique?: 'Error' | 'Drop' | 'Approx';
    unboundTrack?: 'Error' | 'Drop' | 'Approx';
  };
}

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code?: string;
  message: string;
  location?: {
    trackName?: string;
    placementIndex?: number;
    eventIndex?: number;
    pos?: Rat;
  };
  context?: Record<string, unknown>;
}

export interface Artifact {
  kind: 'file' | 'dir' | 'bundle' | 'stream';
  path?: string;
  mediaType?: string;
  description?: string;
}
