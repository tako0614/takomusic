// Intermediate Representation (IR) types for Song IR

export interface SongIR {
  schemaVersion: '0.1';
  title: string | null;
  ppq: number;
  tempos: TempoEvent[];
  timeSigs: TimeSigEvent[];
  tracks: Track[];
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
  events: TrackEvent[];
}

export interface VocalTrack extends BaseTrack {
  kind: 'vocal';
  meta: {
    engine?: string;
    voice?: string;
  };
  // Vocaloid expression parameters
  vocaloidParams?: VocaloidParamEvent[];
}

export interface MidiTrack extends BaseTrack {
  kind: 'midi';
  channel: number;
  program: number;
  defaultVel: number;
}

export type TrackEvent = NoteEvent | RestEvent | CCEvent | PitchBendEvent | AftertouchEvent | PolyAftertouchEvent | NRPNEvent | SysExEvent;

export interface NoteEvent {
  type: 'note';
  tick: number;
  dur: number;
  key: number;
  vel?: number;
  lyric?: string;
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

// Notation types for MusicXML
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

// Audio Effects
export interface AudioEffect {
  type: 'effect';
  effectType: EffectType;
  params: Record<string, number>;
  bypass?: boolean;
}

export type EffectType =
  | 'reverb' | 'delay' | 'chorus' | 'flanger' | 'phaser'
  | 'eq' | 'compressor' | 'limiter' | 'distortion' | 'filter';

// Extended Track with new features
export interface ExtendedMidiTrack extends MidiTrack {
  grandStaff?: GrandStaffInfo;
  tablature?: TablatureInfo;
  chordSymbols?: ChordSymbolEvent[];
  figuredBass?: FiguredBassEvent[];
  markers?: MarkerEvent[];
  patterns?: PatternInstance[];
  audioClips?: AudioClipEvent[];
  effects?: AudioEffect[];
}

// Song-level additions
export interface SongIRExtended extends SongIR {
  markers?: MarkerEvent[];
  cuePoints?: CuePointEvent[];
  patterns?: Pattern[];
  audioTracks?: AudioTrack[];
}

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
