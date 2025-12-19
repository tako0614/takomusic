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

// Clef change event
export type ClefType = 'treble' | 'bass' | 'alto' | 'tenor' | 'percussion' | 'tab' | 'treble8va' | 'treble8vb' | 'bass8va' | 'bass8vb';

export interface ClefChangeEvent {
  type: 'clefChange';
  tick: number;
  clef: ClefType;
}

// Key signature
export type KeyMode = 'major' | 'minor';

export interface KeySignatureEvent {
  type: 'keySignature';
  tick: number;
  fifths: number;             // -7 to 7 (negative = flats, positive = sharps)
  mode: KeyMode;
  root?: string;              // Optional: C, D, E, F, G, A, B
}

// Fingering
export interface FingeringEvent {
  type: 'fingering';
  tick: number;
  noteKey: number;            // MIDI note this fingering applies to
  finger: number | string;    // 1-5 for standard, or string for custom (e.g., "T" for thumb)
  hand?: 'left' | 'right';
  position?: 'above' | 'below';
}

// Multi-measure rest
export interface MultiRestEvent {
  type: 'multiRest';
  tick: number;
  measures: number;           // Number of measures to rest
}

// Slash notation (rhythm slashes)
export interface SlashNotationEvent {
  type: 'slashNotation';
  tick: number;
  endTick: number;
  slashType: 'rhythmic' | 'beat';  // rhythmic = show rhythm, beat = just slashes
}

// Barline types
export type BarlineType = 'single' | 'double' | 'final' | 'repeat-start' | 'repeat-end' | 'repeat-both' | 'dashed' | 'tick' | 'short' | 'none';

export interface BarlineEvent {
  type: 'barline';
  tick: number;
  style: BarlineType;
}

// Tempo text (expressive tempo markings)
export type TempoMarkingType =
  | 'grave' | 'largo' | 'lento' | 'adagio' | 'andante' | 'andantino'
  | 'moderato' | 'allegretto' | 'allegro' | 'vivace' | 'presto' | 'prestissimo'
  | 'accelerando' | 'ritardando' | 'rallentando' | 'a-tempo' | 'rubato'
  | 'custom';

export interface TempoTextEvent {
  type: 'tempoText';
  tick: number;
  marking: TempoMarkingType;
  customText?: string;        // For custom tempo text
  bpm?: number;               // Optional associated BPM
}

// Hide empty staves setting
export interface HideEmptyStavesEvent {
  type: 'hideEmptyStaves';
  tick: number;
  enabled: boolean;
  firstSystemExempt?: boolean;  // Show all staves on first system
}

// Vocal style for synthesis
export type VocalStyleType = 'soft' | 'normal' | 'power' | 'falsetto' | 'whisper' | 'breathy' | 'belt' | 'head' | 'chest';

export interface VocalStyleEvent {
  type: 'vocalStyle';
  tick: number;
  style: VocalStyleType;
  intensity?: number;         // 0-127
}

// Note envelope (attack/release)
export interface NoteEnvelopeEvent {
  type: 'noteEnvelope';
  tick: number;
  noteKey?: number;           // Optional: specific note, or applies to all
  attack?: number;            // Attack time in ms (0-500)
  decay?: number;             // Decay time in ms
  sustain?: number;           // Sustain level (0-127)
  release?: number;           // Release time in ms (0-500)
}

// Tension/power for vocals
export interface VocalTensionEvent {
  type: 'vocalTension';
  tick: number;
  tension: number;            // 0-127 (0 = relaxed, 127 = tense)
}

// Melisma (syllable extension across multiple notes)
export interface MelismaEvent {
  type: 'melisma';
  tick: number;
  endTick: number;
  lyric: string;              // The syllable being extended
}

// Stacked articulations
export type ArticulationType = 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato' | 'staccatissimo' | 'fermata' | 'breath' | 'caesura';

export interface StackedArticulationEvent {
  type: 'stackedArticulation';
  tick: number;
  noteKey: number;
  articulations: ArticulationType[];
}

// Ornaments
export interface TrillEvent {
  type: 'trill';
  tick: number;
  dur: number;
  mainNote: number;           // Main note MIDI number
  auxNote?: number;           // Auxiliary note (default: whole step above)
  speed?: number;             // Trill speed (notes per beat)
}

export type MordentType = 'upper' | 'lower' | 'inverted';

export interface MordentEvent {
  type: 'mordent';
  tick: number;
  noteKey: number;
  mordentType: MordentType;
}

export interface TurnEvent {
  type: 'turn';
  tick: number;
  noteKey: number;
  inverted?: boolean;         // Inverted turn
  delayed?: boolean;          // Turn after the note
}

export type ArpeggioDirection = 'up' | 'down' | 'upDown' | 'downUp';

export interface ArpeggioEvent {
  type: 'arpeggio';
  tick: number;
  notes: number[];            // MIDI note numbers
  direction: ArpeggioDirection;
  dur: number;                // Total duration in ticks
}

export interface GlissandoEvent {
  type: 'glissando';
  tick: number;
  startNote: number;
  endNote: number;
  dur: number;
  style?: 'line' | 'wavy';    // Visual style
  chromatic?: boolean;        // Play all chromatic notes
}

export type TremoloType = 'measured' | 'unmeasured';

export interface TremoloEvent {
  type: 'tremolo';
  tick: number;
  noteKey: number;
  dur: number;
  strokes: number;            // Number of tremolo strokes (1, 2, 3 = 8th, 16th, 32nd)
  tremoloType: TremoloType;
  secondNote?: number;        // For two-note tremolo
}

export type HarmonicType = 'natural' | 'artificial' | 'pinch' | 'tap';

export interface HarmonicEvent {
  type: 'harmonic';
  tick: number;
  noteKey: number;            // Sounding pitch
  touchedNote?: number;       // For artificial: the touched note
  harmonicType: HarmonicType;
}

// Piano pedals
export type PedalType = 'sustain' | 'sostenuto' | 'unaCorda';
export type PedalAction = 'start' | 'end' | 'change' | 'half';

export interface PedalEvent {
  type: 'pedal';
  tick: number;
  pedalType: PedalType;
  action: PedalAction;
  level?: number;             // For half-pedaling (0-127)
}

// Rhythm/Timing
export interface SwingEvent {
  type: 'swing';
  tick: number;
  ratio: number;              // 0.5 = straight, 0.67 = triplet feel
}

export interface ProbabilityEvent {
  type: 'probability';
  tick: number;
  noteKey?: number;           // Optional: specific note
  probability: number;        // 0.0 to 1.0
}

export type FeatheredBeamDirection = 'accel' | 'rit';

export interface FeatheredBeamEvent {
  type: 'featheredBeam';
  tick: number;
  endTick: number;
  direction: FeatheredBeamDirection;
}

// Microtonal/Modern notation
export type QuarterToneAccidental = 'quarterSharp' | 'quarterFlat' | 'threeQuarterSharp' | 'threeQuarterFlat';

export interface QuarterToneEvent {
  type: 'quarterTone';
  tick: number;
  noteKey: number;
  cents: number;              // Deviation in cents (-50, +50, etc.)
  accidental?: QuarterToneAccidental;
}

export interface ClusterEvent {
  type: 'cluster';
  tick: number;
  lowNote: number;
  highNote: number;
  dur: number;
  style?: 'chromatic' | 'diatonic' | 'black' | 'white';
}

export interface SprechstimmeEvent {
  type: 'sprechstimme';
  tick: number;
  dur: number;
  noteKey: number;            // Approximate pitch
  text: string;
}

export type NoteheadType = 'normal' | 'x' | 'diamond' | 'triangle' | 'slash' | 'square' | 'circle' | 'circleX' | 'do' | 're' | 'mi' | 'fa' | 'sol' | 'la' | 'ti';

export interface CustomNoteheadEvent {
  type: 'customNotehead';
  tick: number;
  noteKey: number;
  notehead: NoteheadType;
}

// Score display
export type BracketType = 'bracket' | 'brace' | 'line' | 'square';

export interface BracketGroupEvent {
  type: 'bracketGroup';
  trackIds: string[];
  bracketType: BracketType;
  name?: string;              // Group name (e.g., "Strings")
}

export interface CueStaffEvent {
  type: 'cueStaff';
  tick: number;
  endTick: number;
  sourceTrackId: string;      // Track to cue from
  size?: number;              // Size ratio (default 0.6)
}

export interface NoteColorEvent {
  type: 'noteColor';
  tick: number;
  noteKey?: number;           // Optional: specific note, or all notes at tick
  color: string;              // Hex color (#RRGGBB)
}

// Volta brackets (1st/2nd endings)
export interface VoltaEvent {
  type: 'volta';
  tick: number;
  endTick: number;
  endings: number[];          // e.g., [1] for 1st ending, [1, 2] for both
}

// Cadenza (free tempo section)
export interface CadenzaEvent {
  type: 'cadenza';
  tick: number;
  endTick?: number;
  enabled: boolean;
}

// Unison/Divisi markings
export type DivisiType = 'div.' | 'unis.' | 'a 2' | 'a 3' | 'solo' | 'tutti';

export interface DivisiMarkEvent {
  type: 'divisiMark';
  tick: number;
  marking: DivisiType | string;
}

// Metric modulation
export interface MetricModulationEvent {
  type: 'metricModulation';
  tick: number;
  fromNote: { numerator: number; denominator: number };
  toNote: { numerator: number; denominator: number };
}

// Conductor cue
export interface ConductorCueEvent {
  type: 'conductorCue';
  tick: number;
  text: string;
  instrument?: string;
}

// Editorial markings
export type EditorialType = 'bracket' | 'parenthesis' | 'dashed' | 'small';

export interface EditorialEvent {
  type: 'editorial';
  tick: number;
  noteKey: number;
  editorialType: EditorialType;
}

// Brass mutes
export type BrassMuteType = 'straight' | 'cup' | 'harmon' | 'plunger' | 'bucket' | 'wah' | 'open';

export interface BrassMuteEvent {
  type: 'brassMute';
  tick: number;
  muteType: BrassMuteType;
}

// String position notation
export interface StringPositionEvent {
  type: 'stringPosition';
  tick: number;
  noteKey: number;
  position: number;           // Position number (1-12)
  string?: string;            // String name (I, II, III, IV, etc.)
}

// Woodwind multiphonics
export interface MultiphonicEvent {
  type: 'multiphonic';
  tick: number;
  dur: number;
  notes: number[];            // Resulting pitches
  fingering?: string;         // Fingering chart reference
}

// Electronics cue
export interface ElectronicsCueEvent {
  type: 'electronicsCue';
  tick: number;
  cue: string;                // e.g., "tape: start", "playback: 2:35"
  action?: 'start' | 'stop' | 'fade';
}

// Bend curve (guitar)
export type BendCurveShape = 'immediate' | 'gradual' | 'prebend' | 'release';

export interface BendCurveEvent {
  type: 'bendCurve';
  tick: number;
  noteKey: number;
  bendAmount: number;         // In semitones
  shape: BendCurveShape;
  dur?: number;
}

// Slide types
export type SlideType = 'legato' | 'shift' | 'gliss' | 'scoop' | 'fall';

export interface SlideEvent {
  type: 'slide';
  tick: number;
  startNote: number;
  endNote: number;
  slideType: SlideType;
  dur: number;
}

// Tapping (guitar)
export type TapHand = 'left' | 'right' | 'both';

export interface TapEvent {
  type: 'tap';
  tick: number;
  noteKey: number;
  hand: TapHand;
  dur: number;
}

// Arranger section
export interface ArrangerSection {
  type: 'arrangerSection';
  tick: number;
  name: string;
  measures: number;
  color?: string;
}

// Chord track entry
export interface ChordTrackEntry {
  tick: number;
  chord: string;              // e.g., "Cmaj7", "Am", "G7"
  duration?: number;
}

export interface ChordTrackEvent {
  type: 'chordTrack';
  entries: ChordTrackEntry[];
}

// Scale lock
export type ScaleMode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian' | 'pentatonic' | 'blues' | 'chromatic';

export interface ScaleLockEvent {
  type: 'scaleLockEvent';
  tick: number;
  root: string;               // C, D, E, etc.
  mode: ScaleMode;
  enabled: boolean;
}

// Step input mode
export interface StepInputEvent {
  type: 'stepInput';
  tick: number;
  enabled: boolean;
  stepSize: { numerator: number; denominator: number };
}

// Measure comment
export interface MeasureCommentEvent {
  type: 'measureComment';
  tick: number;
  measure: number;
  comment: string;
  author?: string;
}

// Version checkpoint
export interface VersionCheckpointEvent {
  type: 'versionCheckpoint';
  tick: number;
  name: string;
  timestamp?: number;
}

// ============================================
// Fifth batch: Additional features
// ============================================

// Chord diagram (guitar/ukulele)
export interface ChordDiagramEvent {
  type: 'chordDiagram';
  tick: number;
  name: string;                    // e.g., "Am7", "G"
  strings: number;                 // Number of strings (4-8)
  frets: (number | 'x' | 'o')[];  // Fret positions per string (-1=muted, 0=open, 1+=fret)
  barres?: { fret: number; fromString: number; toString: number }[];
  fingering?: (number | null)[];  // Finger numbers (1-4, null for open/muted)
  baseFret?: number;              // Starting fret for diagram
}

// Scale diagram (fretboard)
export interface ScaleDiagramEvent {
  type: 'scaleDiagram';
  tick: number;
  root: string;                   // Root note (C, D, E, etc.)
  scaleType: string;              // major, minor, pentatonic, etc.
  strings: number;
  startFret: number;
  endFret: number;
  notes: { string: number; fret: number; degree: number }[];
}

// Harp pedal diagram display
export interface HarpPedalDiagramEvent {
  type: 'harpPedalDiagram';
  tick: number;
  pedals: [number, number, number, number, number, number, number]; // D C B | E F G A
  displayStyle: 'standard' | 'compact' | 'full';
}

// Part extraction settings
export interface PartExtractionConfig {
  type: 'partExtraction';
  trackId: string;
  partName: string;
  showMeasureNumbers: boolean;
  showRehearsalMarks: boolean;
  showTempoMarkings: boolean;
  showDynamics: boolean;
  multiRestThreshold: number;     // Minimum measures for multi-rest
  cueNotes: boolean;              // Include cue notes from other parts
  transposition?: number;         // Semitones to transpose
}

// Transposition display options
export interface TranspositionDisplayEvent {
  type: 'transpositionDisplay';
  tick: number;
  trackId: string;
  displayMode: 'concert' | 'transposed';
  writtenKey?: string;
  soundingKey?: string;
}

// Measure number options
export interface MeasureNumberConfig {
  type: 'measureNumberConfig';
  showNumbers: boolean;
  frequency: 'every' | 'system' | 'custom';
  customInterval?: number;
  startNumber?: number;
  enclosure?: 'none' | 'box' | 'circle';
  position?: 'above' | 'below';
  excludeRanges?: { start: number; end: number }[];
}

// ============================================
// Synthesis types
// ============================================

// Wavetable synthesizer
export interface WavetableSynthEvent {
  type: 'wavetableSynth';
  tick: number;
  wavetable: string;              // Wavetable name or path
  position: number;               // 0-1 position in wavetable
  morphSpeed?: number;            // Morph speed for animation
  unison?: number;                // Number of voices
  detune?: number;                // Detune amount in cents
}

// FM synthesis
export interface FMSynthEvent {
  type: 'fmSynth';
  tick: number;
  algorithm: number;              // FM algorithm (1-32)
  operators: FMOperator[];
  feedback?: number;
}

export interface FMOperator {
  ratio: number;                  // Frequency ratio
  level: number;                  // Output level (0-127)
  envelope: { attack: number; decay: number; sustain: number; release: number };
  waveform?: 'sine' | 'triangle' | 'square' | 'saw';
}

// Additive synthesis
export interface AdditiveSynthEvent {
  type: 'additiveSynth';
  tick: number;
  partials: AdditivePartial[];
  resynthesis?: boolean;          // Based on audio analysis
}

export interface AdditivePartial {
  harmonic: number;               // Harmonic number (1 = fundamental)
  amplitude: number;              // 0-1
  phase?: number;                 // 0-360 degrees
  envelope?: { attack: number; decay: number; sustain: number; release: number };
}

// Subtractive synthesis
export interface SubtractiveSynthEvent {
  type: 'subtractiveSynth';
  tick: number;
  oscillators: SubtractiveOsc[];
  filter: FilterConfig;
  envelope: { attack: number; decay: number; sustain: number; release: number };
}

export interface SubtractiveOsc {
  waveform: 'sine' | 'triangle' | 'square' | 'saw' | 'noise';
  octave: number;
  detune: number;                 // Cents
  pulseWidth?: number;            // For square wave
  level: number;
}

export interface FilterConfig {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  cutoff: number;                 // Hz
  resonance: number;              // Q factor
  envelopeAmount?: number;
  keyTracking?: number;           // 0-1
}

// Physical modeling
export interface PhysicalModelEvent {
  type: 'physicalModel';
  tick: number;
  modelType: 'string' | 'wind' | 'percussion' | 'modal';
  exciter: ExciterConfig;
  resonator: ResonatorConfig;
  damping?: number;
  brightness?: number;
}

export interface ExciterConfig {
  type: 'pluck' | 'bow' | 'strike' | 'blow';
  position: number;               // 0-1 position on string/tube
  force: number;                  // Excitation strength
  noise?: number;                 // Noise component
}

export interface ResonatorConfig {
  type: 'string' | 'tube' | 'membrane' | 'plate';
  size: number;                   // Relative size
  material: 'steel' | 'nylon' | 'gut' | 'brass' | 'wood';
  modes?: number;                 // Number of resonant modes
}

// ============================================
// Audio processing types
// ============================================

// Vocoder
export interface VocoderEvent {
  type: 'vocoder';
  tick: number;
  carrierSource: string;          // Track ID or 'internal'
  modulatorSource: string;        // Track ID (usually vocal)
  bands: number;                  // Number of filter bands
  bandWidth?: number;
  attack?: number;
  release?: number;
  formantShift?: number;          // Semitones
}

// Note: PitchCorrectionEvent is defined in algorithmic.ts

// Formant shifting
export interface FormantShiftEvent {
  type: 'formantShift';
  tick: number;
  shift: number;                  // Semitones (-12 to +12)
  preservePitch: boolean;
}

// Convolution reverb
export interface ConvolutionReverbEvent {
  type: 'convolutionReverb';
  tick: number;
  impulseResponse: string;        // IR file path or preset name
  wetDry: number;                 // 0-1 mix
  predelay?: number;              // ms
  decay?: number;                 // Multiplier for IR length
  lowCut?: number;                // Hz
  highCut?: number;               // Hz
}

// Amp simulation
export interface AmpSimEvent {
  type: 'ampSim';
  tick: number;
  ampModel: string;               // Amp model name
  gain: number;                   // 0-10
  bass: number;                   // 0-10
  mid: number;                    // 0-10
  treble: number;                 // 0-10
  presence?: number;              // 0-10
  master?: number;                // 0-10
}

// Cabinet simulation
export interface CabinetSimEvent {
  type: 'cabinetSim';
  tick: number;
  cabinetModel: string;           // Cabinet model name
  micType: 'dynamic' | 'condenser' | 'ribbon';
  micPosition: 'center' | 'edge' | 'off-axis' | 'room';
  distance?: number;              // Distance from speaker
}

// ============================================
// Video sync types
// ============================================

// Video synchronization
export interface VideoSyncEvent {
  type: 'videoSync';
  tick: number;
  videoPath: string;
  startFrame: number;
  frameRate: number;              // fps
  offset?: number;                // ms offset from tick
}

// Hit point (for film scoring)
export interface HitPointEvent {
  type: 'hitPoint';
  tick: number;
  timecode: string;               // SMPTE timecode
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetBeat?: number;            // Beat to align to
}

// Timecode display settings
export interface TimecodeDisplayConfig {
  type: 'timecodeDisplay';
  format: 'smpte' | 'frames' | 'seconds' | 'samples';
  frameRate: 24 | 25 | 29.97 | 30 | 48 | 60;
  dropFrame: boolean;
  offset?: string;                // Starting timecode
}

// ============================================
// Workflow types
// ============================================

// Project template
export interface ProjectTemplate {
  type: 'projectTemplate';
  name: string;
  description?: string;
  tracks: TrackTemplateConfig[];
  globalSettings: {
    ppq: number;
    tempo: number;
    timeSig: { numerator: number; denominator: number };
  };
  markers?: { tick: number; name: string }[];
}

export interface TrackTemplateConfig {
  name: string;
  kind: 'vocal' | 'midi';
  channel?: number;
  program?: number;
  effects?: string[];             // Effect preset names
}

// Track folder (grouping)
export interface TrackFolderEvent {
  type: 'trackFolder';
  id: string;
  name: string;
  trackIds: string[];
  collapsed?: boolean;
  color?: string;
  soloExclusive?: boolean;        // Solo mutes other folders
}

// Real-time collaboration
export interface CollaboratorSession {
  type: 'collaboratorSession';
  sessionId: string;
  collaborators: CollaboratorInfo[];
  syncMode: 'realtime' | 'async';
  conflictResolution: 'last-write' | 'merge' | 'manual';
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  color: string;                  // Cursor/selection color
  currentPosition?: number;       // Current tick position
  editingTrack?: string;          // Currently editing track
}

// Version diff/comparison
export interface VersionDiffEvent {
  type: 'versionDiff';
  baseVersion: string;
  compareVersion: string;
  changes: DiffChange[];
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  trackId?: string;
  tick?: number;
  description: string;
  data?: any;
}
