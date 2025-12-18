// Notation types for MusicXML and score rendering

import type { NoteEvent, TrackEvent, MidiTrack } from './core.js';

export type DynamicMark = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz' | 'fp';

export interface DynamicEvent {
  type: 'dynamic';
  tick: number;
  mark: DynamicMark;
}

export interface SlurEvent {
  type: 'slur';
  tick: number;
  endTick: number;
  number?: number; // for nested slurs
}

export interface CrescendoEvent {
  type: 'crescendo' | 'decrescendo';
  tick: number;
  endTick: number;
}

// Extended note event with notation
export interface NoteEventExtended extends NoteEvent {
  slurStart?: boolean;
  slurEnd?: boolean;
  tieStart?: boolean;
  tieEnd?: boolean;
  dynamic?: DynamicMark;
}

// Notation events container
export interface NotationEvents {
  dynamics: DynamicEvent[];
  slurs: SlurEvent[];
  crescendos: CrescendoEvent[];
}

// Extended notation types
export interface TupletInfo {
  actual: number;    // Actual number of notes (e.g., 3 for triplet)
  normal: number;    // Normal number of notes (e.g., 2 for triplet)
  type?: string;     // Note type (quarter, eighth, etc.)
}

export interface GraceNoteEvent {
  type: 'graceNote';
  tick: number;
  key: number;
  slash?: boolean;   // Acciaccatura (slashed) vs appoggiatura
  lyric?: string;
}

export interface FermataEvent {
  type: 'fermata';
  tick: number;
  shape?: 'normal' | 'angled' | 'square';
}

export interface RepeatEvent {
  type: 'repeat';
  tick: number;
  kind: 'start' | 'end' | 'dc' | 'ds' | 'fine' | 'coda' | 'segno' | 'toCoda';
}

export interface OttavaEvent {
  type: 'ottava';
  tick: number;
  endTick: number;
  shift: 8 | -8 | 15 | -15;  // 8va, 8vb, 15ma, 15mb
}

export interface VoiceInfo {
  voice: number;     // Voice number (1-4 typically)
}

// Extended note event with all notation
export interface NoteEventFull extends NoteEvent {
  slurStart?: boolean;
  slurEnd?: boolean;
  tieStart?: boolean;
  tieEnd?: boolean;
  dynamic?: DynamicMark;
  tuplet?: TupletInfo;
  graceNotes?: GraceNoteEvent[];
  fermata?: boolean;
  voice?: number;
  ottavaShift?: number;
}

// Vocaloid extended parameters
export interface VocaloidPortamentoEvent {
  type: 'portamento';
  tick: number;
  duration: number;  // Portamento duration in ticks
  mode?: 'linear' | 'curve';
}

export interface VocaloidGrowlEvent {
  type: 'growl';
  tick: number;
  dur: number;
  intensity: number; // 0-127
}

export interface VocaloidXSynthEvent {
  type: 'xsynth';
  tick: number;
  voice1: string;    // Primary voice
  voice2: string;    // Secondary voice
  balance: number;   // 0-127 (0 = voice1, 127 = voice2)
}

// Extended notation: Grand Staff
export interface GrandStaffInfo {
  upperClef: 'treble' | 'alto' | 'tenor' | 'bass';
  lowerClef: 'treble' | 'alto' | 'tenor' | 'bass';
  splitPoint?: number; // MIDI note number for auto-split
}

// Extended notation: Tablature
export interface TablatureInfo {
  strings: number;           // Number of strings (4-8)
  tuning: number[];         // MIDI note numbers for each string (low to high)
  instrument: 'guitar' | 'bass' | 'ukulele' | 'custom';
}

export interface TabNoteEvent extends NoteEvent {
  string: number;           // String number (1-based)
  fret: number;            // Fret number
  technique?: TabTechnique;
}

export type TabTechnique =
  | 'hammer-on' | 'pull-off' | 'slide-up' | 'slide-down'
  | 'bend' | 'release' | 'vibrato' | 'tap' | 'harmonic' | 'palm-mute';

// Extended notation: Chord Symbols
export interface ChordSymbolEvent {
  type: 'chordSymbol';
  tick: number;
  root: string;           // C, D, E, F, G, A, B
  quality: ChordQuality;
  bass?: string;          // For slash chords (e.g., C/E)
  extensions?: string[];  // 7, 9, 11, 13, etc.
}

export type ChordQuality =
  | 'major' | 'minor' | 'dim' | 'aug'
  | 'maj7' | 'min7' | '7' | 'dim7' | 'min7b5' | 'aug7'
  | 'sus2' | 'sus4' | 'add9' | '6' | 'min6';

// Extended notation: Figured Bass
export interface FiguredBassEvent {
  type: 'figuredBass';
  tick: number;
  figures: string[];      // e.g., ['6', '4', '3']
}

// Markers and Cue Points
export interface MarkerEvent {
  type: 'marker';
  tick: number;
  name: string;
  color?: string;
}

export interface CuePointEvent {
  type: 'cuePoint';
  tick: number;
  name: string;
  action?: 'start' | 'stop' | 'loop';
}

// Pattern Sequencer
export interface Pattern {
  id: string;
  name: string;
  length: number;         // Length in ticks
  events: TrackEvent[];
}

export interface PatternInstance {
  patternId: string;
  tick: number;
  repetitions?: number;
}

// Audio Import
export interface AudioClipEvent {
  type: 'audioClip';
  tick: number;
  filePath: string;
  duration: number;       // Duration in ticks
  gain?: number;          // 0.0 - 1.0
  pan?: number;           // -1.0 to 1.0
  fadeIn?: number;        // Fade in duration in ticks
  fadeOut?: number;       // Fade out duration in ticks
}

// Extended Track with new features
export interface ExtendedMidiTrack extends MidiTrack {
  grandStaff?: GrandStaffInfo;
  tablature?: TablatureInfo;
  chordSymbols?: ChordSymbolEvent[];
  figuredBass?: FiguredBassEvent[];
  markers?: MarkerEvent[];
  patterns?: PatternInstance[];
  audioClips?: AudioClipEvent[];
  effects?: import('./effects.js').AudioEffect[];
}

// Advanced Notation types
export interface LyricVerse {
  verse: number;
  text: string;
}

export interface MultiVerseLyricEvent {
  type: 'multiVerseLyric';
  tick: number;
  verses: LyricVerse[];
}

export interface OssiaEvent {
  type: 'ossia';
  tick: number;
  endTick: number;
  notes: NoteEvent[];
}

export interface CueNoteEvent {
  type: 'cueNote';
  tick: number;
  dur: number;
  key: number;
  instrument?: string;      // Source instrument name
}

export interface InstrumentChangeEvent {
  type: 'instrumentChange';
  tick: number;
  instrument: string;
  program?: number;
}

export type PercussionNotehead =
  | 'normal' | 'x' | 'circle-x' | 'diamond' | 'triangle'
  | 'slash' | 'square' | 'cross';

export interface PercussionNoteEvent extends NoteEvent {
  notehead?: PercussionNotehead;
  stem?: 'up' | 'down' | 'none';
}

export type BowingMark = 'up' | 'down' | 'detache' | 'martele' | 'spiccato' | 'col-legno' | 'sul-pont' | 'sul-tasto';

export interface StringTechniqueEvent {
  type: 'stringTechnique';
  tick: number;
  technique: BowingMark | 'harmonics' | 'pizz' | 'arco' | 'snap-pizz' | 'tremolo' | 'vibrato';
  string?: number;
}

export type WindTechnique = 'breath' | 'mute' | 'open' | 'stopped' | 'flutter' | 'double-tongue' | 'triple-tongue';

export interface WindTechniqueEvent {
  type: 'windTechnique';
  tick: number;
  technique: WindTechnique;
}

export type GuitarTechnique =
  | 'bend' | 'release' | 'hammer-on' | 'pull-off'
  | 'slide' | 'vibrato' | 'tap' | 'natural-harmonic'
  | 'artificial-harmonic' | 'palm-mute' | 'let-ring';

export interface GuitarBendEvent {
  type: 'guitarBend';
  tick: number;
  bendAmount: number;       // In semitones (0.5 = half step, 1 = whole step, 2 = double)
  release?: boolean;
}

export interface HarpPedalEvent {
  type: 'harpPedal';
  tick: number;
  // D C B | E F G A (flat = -1, natural = 0, sharp = 1)
  pedals: [number, number, number, number, number, number, number];
}

// Score Layout
export interface PageBreakEvent {
  type: 'pageBreak';
  tick: number;
}

export interface SystemBreakEvent {
  type: 'systemBreak';
  tick: number;
}

export interface StaffSpacingEvent {
  type: 'staffSpacing';
  tick: number;
  above?: number;           // Space above in staff spaces
  below?: number;           // Space below in staff spaces
}

export interface TextAnnotation {
  type: 'textAnnotation';
  tick: number;
  text: string;
  placement: 'above' | 'below';
  style?: 'normal' | 'italic' | 'bold' | 'expression';
  fontSize?: number;
}

export interface RehearsalMark {
  type: 'rehearsalMark';
  tick: number;
  label: string;            // A, B, C... or numbers
  enclosure?: 'rectangle' | 'circle' | 'none';
}

export interface DirectionText {
  type: 'directionText';
  tick: number;
  text: string;
  // Common directions: "rit.", "accel.", "a tempo", "poco", "molto", etc.
}

// Advanced Notation extensions
export interface AdditiveTimeSig {
  type: 'additiveTimeSig';
  tick: number;
  groups: number[];           // e.g., [3, 2, 2] for 3+2+2/8
  denominator: number;
}

export interface PolymetricSection {
  type: 'polymetric';
  tick: number;
  endTick: number;
  trackTimeSigs: Record<string, { numerator: number; denominator: number }>;
}

export interface ProportionalNotation {
  type: 'proportionalNotation';
  tick: number;
  endTick: number;
  spacePerBeat: number;       // Horizontal space per beat (mm or units)
}

export interface GraphicNotationEvent {
  type: 'graphicNotation';
  tick: number;
  endTick: number;
  shape: 'line' | 'curve' | 'cluster' | 'box' | 'arrow' | 'custom';
  points?: { x: number; y: number }[];
  svgPath?: string;           // Custom SVG path
  description?: string;
}

export interface AleatoricBox {
  type: 'aleatoricBox';
  tick: number;
  endTick: number;
  contents: TrackEvent[];     // Events inside the box
  instructions?: string;      // Performance instructions
  duration: 'approximate' | 'measured' | 'free';
  repeat?: number;            // Number of repetitions (0 = ad lib)
}

export interface CutawayScore {
  type: 'cutaway';
  tick: number;
  endTick: number;
  trackId: string;
  showWhenPlaying: boolean;
}

export interface TransposingInstrument {
  type: 'transposingInstrument';
  trackId: string;
  writtenPitch: 'concert' | 'transposed';
  transposition: number;      // Semitones from concert pitch (e.g., -2 for Bb clarinet)
  clefOctave?: number;        // For instruments like piccolo (+8) or bass (-8)
}
