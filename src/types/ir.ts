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
  | 'eq' | 'compressor' | 'limiter' | 'distortion' | 'filter'
  | 'maximizer' | 'multibandCompressor'
  | 'vocoder' | 'convolutionReverb' | 'ampSimulator' | 'cabinetSimulator'
  | 'tapeSaturation' | 'transientShaper' | 'deEsser' | 'exciter' | 'noiseReduction';

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

// ============================================
// Microtonality & Tuning System
// ============================================

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

// ============================================
// Algorithmic Composition
// ============================================

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

// ============================================
// Advanced Notation
// ============================================

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

// ============================================
// Additional Effects
// ============================================

export interface PhaserEffect extends AudioEffect {
  effectType: 'phaser';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  feedback: number;         // 0-100
  stages: number;           // Number of stages (2, 4, 6, 8...)
}

export interface FlangerEffect extends AudioEffect {
  effectType: 'flanger';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  feedback: number;         // -100 to 100
  mix: number;              // 0-100
}

export interface ChorusEffect extends AudioEffect {
  effectType: 'chorus';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  voices: number;           // Number of chorus voices
  mix: number;              // 0-100
}

export interface DistortionEffect extends AudioEffect {
  effectType: 'distortion';
  drive: number;            // 0-100
  tone: number;             // 0-100 (dark to bright)
  mix: number;              // 0-100
  distortionType: 'overdrive' | 'distortion' | 'fuzz' | 'bitcrusher';
}

export interface FilterEffect extends AudioEffect {
  effectType: 'filter';
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  cutoff: number;           // Frequency in Hz
  resonance: number;        // 0-100 (Q factor)
  envelope?: {
    attack: number;
    decay: number;
    amount: number;
  };
}

export interface SidechainEvent {
  type: 'sidechain';
  tick: number;
  sourceTrack: string;      // Track ID to duck to
  threshold: number;        // -60 to 0 dB
  ratio: number;            // 1:1 to 20:1
  attack: number;           // ms
  release: number;          // ms
}

// ============================================
// Live Performance
// ============================================

export interface MIDIMapping {
  type: 'midiMapping';
  ccNumber: number;
  target: string;           // Parameter to control
  min: number;
  max: number;
  curve?: 'linear' | 'exponential' | 'logarithmic';
}

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

// ============================================
// Score Layout
// ============================================

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

// ============================================
// Audio Manipulation
// ============================================

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

// ============================================
// Advanced Automation
// ============================================

export type AutomationCurveType = 'linear' | 'exponential' | 'logarithmic' | 'bezier' | 'step' | 's-curve';

export interface AutomationPoint {
  tick: number;
  value: number;
  curve?: AutomationCurveType;
  bezierControlPoints?: [number, number, number, number];  // x1, y1, x2, y2 (normalized 0-1)
}

export interface AutomationLane {
  type: 'automationLane';
  parameter: string;
  points: AutomationPoint[];
}

export interface LFOModulation {
  type: 'lfoModulation';
  tick: number;
  target: string;             // Parameter to modulate
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square' | 'random' | 'sample-and-hold';
  rate: number;               // Hz or sync value
  rateSync?: boolean;         // Sync to tempo
  depth: number;              // 0-100
  phase: number;              // 0-360 degrees
  offset: number;             // DC offset
  retrigger?: boolean;
}

export interface EnvelopeFollower {
  type: 'envelopeFollower';
  tick: number;
  sourceTrack: string;        // Track ID to follow
  target: string;             // Parameter to modulate
  attack: number;             // ms
  release: number;            // ms
  gain: number;               // Input gain
  min: number;                // Minimum output value
  max: number;                // Maximum output value
}

export interface ModulationMatrixEntry {
  source: string;
  destination: string;
  amount: number;             // -100 to 100
  curve?: AutomationCurveType;
}

export interface ModulationMatrix {
  type: 'modulationMatrix';
  entries: ModulationMatrixEntry[];
}

// ============================================
// Mixing / Mastering
// ============================================

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

export interface LimiterEffect extends AudioEffect {
  effectType: 'limiter';
  threshold: number;          // dB
  release: number;            // ms
  ceiling: number;            // dB (max output)
  lookahead?: number;         // ms
}

export interface MaximizerEffect extends AudioEffect {
  effectType: 'maximizer';
  threshold: number;          // dB
  ceiling: number;            // dB
  release: number;            // ms
  character?: 'transparent' | 'warm' | 'aggressive';
}

export interface MultibandCompressor extends AudioEffect {
  effectType: 'multibandCompressor';
  bands: MultibandBand[];
}

export interface MultibandBand {
  lowFreq: number;            // Low cutoff
  highFreq: number;           // High cutoff
  threshold: number;          // dB
  ratio: number;
  attack: number;             // ms
  release: number;            // ms
  gain: number;               // dB (makeup gain)
}

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

// ============================================
// MIDI Extensions
// ============================================

export interface MPEZone {
  masterChannel: number;      // 1 or 16
  memberChannels: number;     // 2-15
  pitchBendRange: number;     // Semitones
}

export interface MPENoteEvent extends NoteEvent {
  channel: number;            // Per-note channel
  slide?: number;             // CC74 (Y-axis) 0-127
  pressure?: number;          // Aftertouch
  pitchBend?: number;         // Per-note pitch bend
}

export interface MPEConfig {
  type: 'mpeConfig';
  zones: MPEZone[];
  enabled: boolean;
}

export interface ArpeggiatorPattern {
  type: 'arpeggiator';
  tick: number;
  mode: 'up' | 'down' | 'up-down' | 'down-up' | 'random' | 'order' | 'chord';
  rate: string;               // Duration like '16n'
  octaves: number;            // 1-4
  gate: number;               // 0-100 (note length percentage)
  swing?: number;             // 0-100
  pattern?: number[];         // Custom step pattern
  hold?: boolean;
  ratchet?: number[];         // Ratchet per step
}

export interface ChordMemory {
  type: 'chordMemory';
  tick: number;
  triggerNote: number;        // MIDI note that triggers
  chord: number[];            // Notes to play
  velocity?: 'fixed' | 'scaled' | 'layer';
  velocityValue?: number;
}

export interface ChordTrigger {
  type: 'chordTrigger';
  tick: number;
  root: number;               // Root note
  chordType: string;          // 'major', 'minor', 'dim', etc.
  voicing?: 'close' | 'open' | 'drop2' | 'drop3' | 'spread';
  inversion?: number;
}

// ============================================
// Advanced Notation
// ============================================

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

// ============================================
// Sampling
// ============================================

export interface MultiSampleInstrument {
  type: 'multiSample';
  id: string;
  name: string;
  samples: SampleZone[];
  globalParams?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    filterCutoff?: number;
    filterResonance?: number;
  };
}

export interface SampleZone {
  filePath: string;
  rootNote: number;           // MIDI note
  lowNote: number;            // Range start
  highNote: number;           // Range end
  lowVelocity: number;        // Velocity range start (1-127)
  highVelocity: number;       // Velocity range end (1-127)
  loopStart?: number;         // Sample frames
  loopEnd?: number;
  loopMode?: 'none' | 'forward' | 'pingpong' | 'reverse';
  tune?: number;              // Cents
  volume?: number;            // dB
  pan?: number;               // -100 to 100
}

export interface RoundRobinGroup {
  type: 'roundRobin';
  zones: SampleZone[];
  mode: 'cycle' | 'random' | 'random-no-repeat';
}

export interface VelocityLayer {
  type: 'velocityLayer';
  lowVelocity: number;
  highVelocity: number;
  zones: SampleZone[];
  crossfade?: number;         // Velocity crossfade range
}

export interface KeySwitch {
  type: 'keySwitch';
  triggerNote: number;        // Note that triggers articulation
  articulation: string;       // Articulation name
  samples: SampleZone[];
  latching?: boolean;         // Stays active until another keyswitch
}

export interface SamplerInstrument {
  type: 'sampler';
  id: string;
  name: string;
  zones: SampleZone[];
  roundRobins?: RoundRobinGroup[];
  velocityLayers?: VelocityLayer[];
  keySwitches?: KeySwitch[];
  releaseMode?: 'normal' | 'release-trigger';
  releaseSamples?: SampleZone[];
}

// ============================================
// Analysis
// ============================================

export interface SpectrumAnalyzerConfig {
  type: 'spectrumAnalyzer';
  fftSize: 512 | 1024 | 2048 | 4096 | 8192 | 16384;
  windowType: 'hanning' | 'hamming' | 'blackman' | 'rectangular';
  overlap: number;            // 0-0.99
  minFreq: number;            // Hz
  maxFreq: number;            // Hz
  minDb: number;              // Minimum dB to display
  maxDb: number;              // Maximum dB to display
  scale: 'linear' | 'logarithmic' | 'mel';
  smoothing: number;          // 0-1
}

export interface LoudnessMeter {
  type: 'loudnessMeter';
  standard: 'EBU-R128' | 'ATSC-A85' | 'BS.1770';
  targetLUFS: number;
  truePeak: boolean;
  shortTermWindow?: number;   // Seconds (default 3)
  momentaryWindow?: number;   // ms (default 400)
}

export interface PhaseCorrelationMeter {
  type: 'phaseCorrelation';
  windowSize: number;         // ms
  displayMode: 'numeric' | 'goniometer' | 'vectorscope';
}

export interface AnalyzerSnapshot {
  type: 'analyzerSnapshot';
  tick: number;
  lufs?: number;
  truePeak?: number;
  phaseCorrelation?: number;  // -1 to 1
  spectrum?: number[];        // Frequency bins
}

// ============================================
// Advanced Audio Processing
// ============================================

export interface VocoderEffect extends AudioEffect {
  effectType: 'vocoder';
  carrierType: 'synth' | 'noise' | 'external';
  bands: number;                // Number of frequency bands (8-64)
  formantShift: number;         // -12 to +12 semitones
  attack: number;               // ms
  release: number;              // ms
  highFreqEmphasis: number;     // 0-100
}

export interface ConvolutionReverbEffect extends AudioEffect {
  effectType: 'convolutionReverb';
  irFile: string;               // Impulse response file path
  predelay: number;             // ms
  decay: number;                // 0-100 (IR length percentage)
  lowCut: number;               // Hz
  highCut: number;              // Hz
  mix: number;                  // 0-100
}

export interface AmpSimulator extends AudioEffect {
  effectType: 'ampSimulator';
  ampType: 'clean' | 'crunch' | 'high-gain' | 'bass' | 'acoustic';
  gain: number;                 // 0-100
  tone: {
    bass: number;               // -12 to +12 dB
    mid: number;
    treble: number;
    presence: number;
  };
  master: number;               // 0-100
}

export interface CabinetSimulator extends AudioEffect {
  effectType: 'cabinetSimulator';
  cabType: '1x12' | '2x12' | '4x12' | '1x15' | '8x10';
  micType: 'dynamic' | 'condenser' | 'ribbon';
  micPosition: 'on-axis' | 'off-axis' | 'edge';
  distance: number;             // 0-100 (close to far)
  roomMix: number;              // 0-100
}

export interface TapeSaturation extends AudioEffect {
  effectType: 'tapeSaturation';
  tapeType: '15ips' | '30ips' | 'cassette';
  inputGain: number;            // dB
  saturation: number;           // 0-100
  bias: number;                 // 0-100
  flutter: number;              // 0-100
  wowRate: number;              // Hz
  hiss: number;                 // 0-100
}

export interface TransientShaper extends AudioEffect {
  effectType: 'transientShaper';
  attack: number;               // -100 to +100
  sustain: number;              // -100 to +100
  outputGain: number;           // dB
}

export interface DeEsser extends AudioEffect {
  effectType: 'deEsser';
  frequency: number;            // Hz (typically 4000-10000)
  threshold: number;            // dB
  ratio: number;                // 1:1 to 10:1
  range: number;                // dB (max reduction)
  mode: 'wideband' | 'split';
}

export interface Exciter extends AudioEffect {
  effectType: 'exciter';
  frequency: number;            // Hz (harmonics start frequency)
  harmonics: number;            // 0-100
  mix: number;                  // 0-100
  mode: 'tape' | 'tube' | 'transistor';
}

export interface NoiseReduction extends AudioEffect {
  effectType: 'noiseReduction';
  threshold: number;            // dB
  reduction: number;            // dB
  attack: number;               // ms
  release: number;              // ms
  mode: 'broadband' | 'spectral' | 'adaptive';
}

export interface SpectralEdit {
  type: 'spectralEdit';
  tick: number;
  endTick: number;
  lowFreq: number;              // Hz
  highFreq: number;             // Hz
  operation: 'cut' | 'boost' | 'replace' | 'fill';
  gain?: number;                // dB for cut/boost
}

// ============================================
// Sequencing Extensions
// ============================================

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

export interface Divisi {
  type: 'divisi';
  tick: number;
  endTick: number;
  trackId: string;
  parts: number;                // Number of divisi parts (2-8)
  method: 'top-down' | 'bottom-up' | 'alternating' | 'spread';
}

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

// ============================================
// Sync & Communication
// ============================================

export interface OSCConfig {
  type: 'oscConfig';
  enabled: boolean;
  sendPort: number;
  receivePort: number;
  sendHost: string;
}

export interface OSCMapping {
  type: 'oscMapping';
  address: string;              // OSC address pattern
  target: string;               // Parameter to control
  min: number;
  max: number;
}

export interface NetworkMIDIConfig {
  type: 'networkMidi';
  enabled: boolean;
  sessionName: string;
  port: number;
  protocol: 'rtp-midi' | 'ipMIDI';
}

export interface MIDIClockConfig {
  type: 'midiClock';
  mode: 'master' | 'slave';
  sendStart: boolean;
  sendContinue: boolean;
  sendStop: boolean;
  outputPort?: string;
  inputPort?: string;
}

export interface TimecodeConfig {
  type: 'timecode';
  format: 'mtc' | 'smpte';
  frameRate: 24 | 25 | 29.97 | 30;
  dropFrame: boolean;
  offset: string;               // HH:MM:SS:FF
  mode: 'generate' | 'chase';
}

// ============================================
// Mastering
// ============================================

export interface DitheringConfig {
  type: 'dithering';
  targetBitDepth: 16 | 24;
  noiseShaping: 'none' | 'hpf' | 'f-weighted' | 'modified-e-weighted' | 'pow-r';
  ditherType: 'rectangular' | 'triangular' | 'gaussian';
  autoblack: boolean;           // Auto-mute in silence
}

export interface LoudnessMatching {
  type: 'loudnessMatching';
  targetLUFS: number;
  maxTruePeak: number;          // dBTP
  tolerance: number;            // LUFS tolerance
  algorithm: 'peak' | 'rms' | 'lufs';
}

export interface ReferenceTrack {
  type: 'referenceTrack';
  filePath: string;
  gain: number;                 // dB offset
  active: boolean;
  loopStart?: number;           // Sample position
  loopEnd?: number;
}

// ============================================
// Metadata
// ============================================

export interface ID3Metadata {
  type: 'id3';
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  track?: number;
  genre?: string;
  comment?: string;
  composer?: string;
  albumArtist?: string;
  discNumber?: number;
  bpm?: number;
  key?: string;
  copyright?: string;
  encodedBy?: string;
  artwork?: string;             // File path to cover art
}

export interface ISRCCode {
  type: 'isrc';
  code: string;                 // Format: CC-XXX-YY-NNNNN
  trackId?: string;
}

export interface SongStructureMarker {
  type: 'songStructure';
  tick: number;
  section: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'post-chorus' |
           'bridge' | 'breakdown' | 'buildup' | 'drop' | 'outro' | 'solo' | 'custom';
  label?: string;
  color?: string;
}

// ============================================
// Extended song with ALL features
// ============================================

export interface SongIRFull extends SongIRExtended {
  tuning?: TuningEvent;
  generativePatterns?: GenerativePattern[];
  constraints?: ConstraintRule[];
  scenes?: Scene[];
  midiMappings?: MIDIMapping[];
  layoutEvents?: (PageBreakEvent | SystemBreakEvent | StaffSpacingEvent)[];
  // Audio manipulation
  timeStretchEvents?: TimeStretchEvent[];
  pitchShiftEvents?: PitchShiftEvent[];
  sampleSlicers?: SampleSlicerEvent[];
  granularSynths?: GranularSynthEvent[];
  // Advanced automation
  automationLanes?: AutomationLane[];
  lfoModulations?: LFOModulation[];
  envelopeFollowers?: EnvelopeFollower[];
  modulationMatrix?: ModulationMatrix;
  // Mixing/Mastering
  buses?: BusTrack[];
  sends?: SendEffect[];
  spatialConfig?: SpatialFormat;
  spatialEvents?: SpatialAudioEvent[];
  // MIDI extensions
  mpeConfig?: MPEConfig;
  arpeggiators?: ArpeggiatorPattern[];
  chordMemories?: ChordMemory[];
  // Advanced notation
  additiveTimeSigs?: AdditiveTimeSig[];
  polymetricSections?: PolymetricSection[];
  proportionalNotation?: ProportionalNotation[];
  graphicNotation?: GraphicNotationEvent[];
  aleatoricBoxes?: AleatoricBox[];
  cutawayScores?: CutawayScore[];
  transposingInstruments?: TransposingInstrument[];
  // Sampling
  samplerInstruments?: SamplerInstrument[];
  multiSampleInstruments?: MultiSampleInstrument[];
  // Analysis
  spectrumAnalyzer?: SpectrumAnalyzerConfig;
  loudnessMeter?: LoudnessMeter;
  phaseCorrelationMeter?: PhaseCorrelationMeter;
  analyzerSnapshots?: AnalyzerSnapshot[];
  // Advanced audio processing
  spectralEdits?: SpectralEdit[];
  // Sequencing extensions
  stepSequencers?: StepSequencer[];
  followActions?: FollowAction[];
  scaleLocks?: ScaleLock[];
  chordLocks?: ChordLock[];
  divisiSections?: Divisi[];
  expressionMaps?: ExpressionMap[];
  // Sync & communication
  oscConfig?: OSCConfig;
  oscMappings?: OSCMapping[];
  networkMidiConfig?: NetworkMIDIConfig;
  midiClockConfig?: MIDIClockConfig;
  timecodeConfig?: TimecodeConfig;
  // Mastering
  ditheringConfig?: DitheringConfig;
  loudnessMatching?: LoudnessMatching;
  referenceTracks?: ReferenceTrack[];
  // Metadata
  id3Metadata?: ID3Metadata;
  isrcCodes?: ISRCCode[];
  songStructureMarkers?: SongStructureMarker[];
  // Audio editing & restoration
  freezeTracks?: FreezeTrack[];
  audioWarps?: AudioWarp[];
  warpMarkers?: WarpMarker[];
  beatSlices?: BeatSlice[];
  spectralRepairs?: SpectralRepair[];
  audioRestorations?: AudioRestoration[];
  vocalAlignments?: VocalAlignment[];
  // Dynamics processing
  midSideProcessing?: MidSideProcessing[];
  dynamicEQs?: DynamicEQ[];
  linearPhaseEQs?: LinearPhaseEQ[];
  parallelProcessing?: ParallelProcessing[];
  // Recording
  takeLanes?: TakeLane[];
  compRegions?: CompRegion[];
  punchPoints?: PunchPoint[];
  loopRecordings?: LoopRecording[];
  automationRecordings?: AutomationRecording[];
  // Groove & humanize
  grooveTemplates?: GrooveTemplate[];
  humanizeSettings?: HumanizeSettings[];
  randomizations?: Randomization[];
  // Controller & macro
  midiLearnMappings?: MIDILearnMapping[];
  macroControls?: MacroControl[];
  // Export & batch
  stemExports?: StemExport[];
  batchProcessings?: BatchProcessing[];
  exportPresets?: ExportPreset[];
  // Atmos/spatial extension
  atmosObjects?: AtmosObject[];
  headphoneVirtualization?: HeadphoneVirtualization;
  surroundAutomation?: SurroundAutomation[];
  // Collaboration
  projectNotes?: ProjectNote[];
  collaborators?: Collaborator[];
}

// ============================================
// Audio Editing & Restoration
// ============================================

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

// ============================================
// Dynamics Processing
// ============================================

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

// ============================================
// Recording
// ============================================

export interface TakeLane {
  type: 'takeLane';
  trackId: string;
  takes: Take[];
  activeTakeIndex: number;
}

export interface Take {
  id: string;
  name: string;
  startTick: number;
  endTick: number;
  events: TrackEvent[];
  muted: boolean;
  rating?: number;                 // 1-5 stars
}

export interface CompRegion {
  type: 'comp';
  trackId: string;
  startTick: number;
  endTick: number;
  sourceTakeId: string;
  crossfadeIn: number;             // Ticks
  crossfadeOut: number;
}

export interface PunchPoint {
  type: 'punch';
  mode: 'in' | 'out' | 'in-out';
  tick: number;
  endTick?: number;                // For in-out mode
  preroll: number;                 // Bars
  postroll: number;
}

export interface LoopRecording {
  type: 'loopRecording';
  startTick: number;
  endTick: number;
  mode: 'replace' | 'overdub' | 'takes';
  countIn: number;                 // Bars
  maxTakes?: number;
}

export interface AutomationRecording {
  type: 'automationRecording';
  parameter: string;
  mode: 'touch' | 'latch' | 'write' | 'trim';
  reduction: number;               // Point reduction percentage
}

// ============================================
// Groove & Humanize
// ============================================

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

// ============================================
// Controller & Macro
// ============================================

export interface MIDILearnMapping {
  type: 'midiLearn';
  id: string;
  channel: number;
  controlType: 'cc' | 'note' | 'pitchbend' | 'aftertouch';
  controlNumber?: number;          // For CC/note
  targetParameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'logarithmic' | 'exponential';
}

export interface MacroControl {
  type: 'macro';
  id: string;
  name: string;
  value: number;                   // 0-127
  mappings: MacroMapping[];
}

export interface MacroMapping {
  targetParameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'logarithmic' | 'exponential' | 'step';
  steps?: number[];                // For step curve
}

// ============================================
// Export & Batch Processing
// ============================================

export interface StemExport {
  type: 'stemExport';
  name: string;
  trackIds: string[];
  format: 'wav' | 'aiff' | 'flac' | 'mp3';
  bitDepth: 16 | 24 | 32;
  sampleRate: 44100 | 48000 | 88200 | 96000;
  normalize: boolean;
  tailLength: number;              // ms
}

export interface BatchProcessing {
  type: 'batch';
  inputPattern: string;            // Glob pattern
  outputPattern: string;
  operations: BatchOperation[];
}

export interface BatchOperation {
  type: 'normalize' | 'convert' | 'trim' | 'fade' | 'loudness';
  params: Record<string, number | string | boolean>;
}

export interface ExportPreset {
  type: 'exportPreset';
  id: string;
  name: string;
  format: 'wav' | 'aiff' | 'flac' | 'mp3' | 'ogg' | 'aac';
  bitDepth?: 16 | 24 | 32;
  sampleRate: number;
  bitrate?: number;                // For lossy formats
  channels: 'mono' | 'stereo' | 'surround';
  dithering?: boolean;
  normalize?: boolean;
  targetLUFS?: number;
}

// ============================================
// Atmos/Spatial Extensions
// ============================================

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

// ============================================
// Collaboration
// ============================================

export interface ProjectNote {
  type: 'projectNote';
  id: string;
  author: string;
  timestamp: number;
  tick?: number;                   // Optional position reference
  trackId?: string;
  text: string;
  resolved: boolean;
  replies?: ProjectNote[];
}

export interface Collaborator {
  type: 'collaborator';
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;                   // For cursor/selection color
}
