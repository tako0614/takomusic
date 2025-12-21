// Core IR types for TakoScore v2.0 - Phrase-first model

export interface SongIR {
  schemaVersion: '2.0';
  title: string | null;
  ppq: number;
  tempos: TempoEvent[];
  timeSigs: TimeSigEvent[];
  keySignature?: KeySignature;
  backend?: BackendSettings;
  tracks: Track[];
}

export interface BackendSettings {
  name: string;  // 'neutrino', etc.
  singer?: string;
  lang?: string;
  phonemeBudgetPerOnset?: number;
  maxPhraseSeconds?: number;
}

export interface KeySignature {
  root: string;  // 'C', 'D', etc.
  mode: 'major' | 'minor';
}

export interface TempoEvent {
  tick: number;
  bpm: number;
}

export interface TimeSigEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

export type Track = VocalTrack | MidiTrack;

export interface BaseTrack {
  id: string;
  kind: 'vocal' | 'midi';
  name: string;
}

// ============ Vocal Track (Phrase-first) ============

export interface VocalTrack extends BaseTrack {
  kind: 'vocal';
  meta: {
    engine?: string;
    voice?: string;
  };
  phrases: Phrase[];
  // Legacy: flat events for backward compatibility
  events: TrackEvent[];
  // Vocaloid expression parameters
  vocaloidParams?: VocaloidParamEvent[];
}

/**
 * Phrase - NEUTRINO's generation unit
 * A phrase is bounded by rests or breath marks
 */
export interface Phrase {
  startTick: number;
  endTick: number;
  notes: PhraseNote[];
  breaths: BreathMark[];
}

/**
 * PhraseNote - A note with underlay information
 */
export interface PhraseNote {
  tick: number;
  dur: number;
  key: number;
  // Underlay
  lyric?: string;           // Mora or phoneme text
  syllabic?: Syllabic;      // MusicXML syllabic type
  extend?: boolean;         // Melisma (extend from previous)
  // Ties
  tieStart?: boolean;
  tieEnd?: boolean;
  // For non-onset tied notes, this marks them as continuations
  isContinuation?: boolean;
}

export type Syllabic = 'single' | 'begin' | 'middle' | 'end';

export interface BreathMark {
  tick: number;
  dur?: number;
  intensity?: number;
}

// ============ MIDI Track ============

export interface MidiTrack extends BaseTrack {
  kind: 'midi';
  channel: number;
  program: number;
  defaultVel: number;
  events: TrackEvent[];
}

// ============ Track Events ============

export type TrackEvent = NoteEvent | RestEvent | CCEvent | PitchBendEvent | AftertouchEvent | PolyAftertouchEvent | NRPNEvent | SysExEvent | PhonemeEvent | BreathEvent | ConsonantOffsetEvent | CrossStaffEvent | PortamentoShapeEvent;

export interface NoteEvent {
  type: 'note';
  tick: number;
  dur: number;
  key: number;
  vel?: number;
  lyric?: string;
  // Extended underlay for MusicXML
  syllabic?: Syllabic;
  extend?: boolean;
  // Articulation
  articulation?: Articulation;
}

export interface RestEvent {
  type: 'rest';
  tick: number;
  dur: number;
}

export interface CCEvent {
  type: 'cc';
  tick: number;
  controller: number;
  value: number;
}

export interface PitchBendEvent {
  type: 'pitchBend';
  tick: number;
  value: number; // -8192 to 8191
}

// Advanced MIDI event types
export interface AftertouchEvent {
  type: 'aftertouch';
  tick: number;
  value: number; // 0-127 (channel pressure)
}

export interface PolyAftertouchEvent {
  type: 'polyAftertouch';
  tick: number;
  key: number;   // 0-127 (note number)
  value: number; // 0-127 (pressure)
}

export interface NRPNEvent {
  type: 'nrpn';
  tick: number;
  paramMSB: number; // 0-127
  paramLSB: number; // 0-127
  valueMSB: number; // 0-127
  valueLSB?: number; // 0-127 (optional for 7-bit values)
}

export interface SysExEvent {
  type: 'sysex';
  tick: number;
  data: number[]; // Raw SysEx bytes (excluding F0 and F7)
}

// Articulation types
export type Articulation = 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato';

// Vocaloid parameter types
export type VocaloidParamType = 'PIT' | 'DYN' | 'BRE' | 'BRI' | 'CLE' | 'GEN' | 'POR' | 'OPE';

export interface VocaloidParamEvent {
  type: 'vocaloidParam';
  param: VocaloidParamType;
  tick: number;
  value: number;
}

export interface VocaloidVibratoEvent {
  type: 'vibrato';
  tick: number;
  dur: number;
  depth: number;    // 0-127
  rate: number;     // 0-127
  delay: number;    // 0-100 (% of note duration before vibrato starts)
}

// Phoneme-level control for vocal tracks
export interface PhonemeEvent {
  type: 'phoneme';
  tick: number;
  dur: number;
  key: number;
  phonemes: PhonemeUnit[];
}

export interface PhonemeUnit {
  symbol: string;           // IPA or engine-specific phoneme symbol
  duration: number;         // Relative duration (percentage of total note duration)
  velocity?: number;        // Phoneme velocity/intensity
}

// Consonant timing adjustment
export interface ConsonantOffsetEvent {
  type: 'consonantOffset';
  tick: number;
  offset: number;           // Ticks to shift consonant (negative = earlier, positive = later)
}

// Breath event for vocal tracks
export interface BreathEvent {
  type: 'breath';
  tick: number;
  dur: number;              // Breath duration in ticks
  intensity?: number;       // 0-127 breath intensity
}

// Auto-breath settings
export interface AutoBreathSettings {
  enabled: boolean;
  minRestDuration: number;  // Minimum rest duration to insert breath (ticks)
  breathDuration: number;   // Default breath duration (ticks)
  intensity: number;        // Default breath intensity
}

// Nested tuplet support
export interface NestedTupletInfo {
  actual: number;           // Actual number of notes
  normal: number;           // Normal number of notes
  type?: string;            // Note type
  nested?: NestedTupletInfo; // Nested tuplet inside this tuplet
}

// Cross-staff notation
export interface CrossStaffEvent {
  type: 'crossStaff';
  tick: number;
  noteKey: number;          // Note to move
  targetStaff: 'upper' | 'lower';  // Target staff
}

// Portamento shape control
export type PortamentoShape = 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'early' | 'late';

export interface PortamentoShapeEvent {
  type: 'portamentoShape';
  tick: number;
  shape: PortamentoShape;
  intensity?: number;       // 0-127, how pronounced the shape is
}
