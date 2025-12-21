// Interpreter for TakoScore v2.0 language

import type {
  Score,
  GlobalStatement,
  PartDeclaration,
  PartBodyItem,
  PhraseBlock,
  RestStatement,
  MidiBar,
  Statement,
  Expression,
  ProcDeclaration,
  ObjectLiteral,
} from '../types/ast.js';
import type {
  SongIR,
  Track,
  VocalTrack,
  MidiTrack,
  TrackEvent,
  NoteEvent,
  RestEvent,
  TempoEvent,
  TimeSigEvent,
  Phrase,
  PhraseNote,
  CCEvent,
  PitchBendEvent,
  AftertouchEvent,
  PolyAftertouchEvent,
  NRPNEvent,
  SysExEvent,
  Articulation,
  VocaloidParamEvent,
  VocaloidParamType,
  DynamicMark,
  DynamicEvent,
  SlurEvent,
  CrescendoEvent,
  NotationEvents,
  TupletInfo,
  GraceNoteEvent,
  FermataEvent,
  RepeatEvent,
  OttavaEvent,
  NoteEventFull,
  GrandStaffInfo,
  TablatureInfo,
  TabNoteEvent,
  TabTechnique,
  ChordSymbolEvent,
  ChordQuality,
  FiguredBassEvent,
  MarkerEvent,
  CuePointEvent,
  Pattern,
  PatternInstance,
  AudioClipEvent,
  AudioEffect,
  EffectType,
  TuningSystem,
  TuningEvent,
  EuclideanRhythm,
  GenerativePattern,
  ConstraintRule,
  MultiVerseLyricEvent,
  LyricVerse,
  OssiaEvent,
  CueNoteEvent,
  InstrumentChangeEvent,
  PercussionNotehead,
  StringTechniqueEvent,
  BowingMark,
  WindTechniqueEvent,
  WindTechnique,
  GuitarBendEvent,
  HarpPedalEvent,
  SidechainEvent,
  MIDIMapping,
  Scene,
  SceneClip,
  PageBreakEvent,
  SystemBreakEvent,
  StaffSpacingEvent,
  TextAnnotation,
  RehearsalMark,
  DirectionText,
  // New types
  TimeStretchEvent,
  PitchShiftEvent,
  SampleSlicerEvent,
  SampleSlice,
  GranularSynthEvent,
  AutomationCurveType,
  AutomationPoint,
  AutomationLane,
  LFOModulation,
  EnvelopeFollower,
  ModulationMatrixEntry,
  ModulationMatrix,
  BusTrack,
  SendEffect,
  StereoWidthEvent,
  SpatialFormat,
  SpatialAudioEvent,
  SurroundPanEvent,
  MPEZone,
  MPENoteEvent,
  MPEConfig,
  ArpeggiatorPattern,
  ChordMemory,
  ChordTrigger,
  AdditiveTimeSig,
  PolymetricSection,
  ProportionalNotation,
  GraphicNotationEvent,
  AleatoricBox,
  CutawayScore,
  TransposingInstrument,
  MultiSampleInstrument,
  SampleZone,
  RoundRobinGroup,
  VelocityLayer,
  KeySwitch,
  SamplerInstrument,
  SpectrumAnalyzerConfig,
  LoudnessMeter,
  PhaseCorrelationMeter,
  AnalyzerSnapshot,
  // New types
  SpectralEdit,
  StepSequencer,
  StepSequencerStep,
  FollowAction,
  ScaleLock,
  ScaleType,
  ChordLock,
  Divisi,
  ExpressionMap,
  ExpressionMapEntry,
  OSCConfig,
  OSCMapping,
  NetworkMIDIConfig,
  MIDIClockConfig,
  TimecodeConfig,
  DitheringConfig,
  LoudnessMatching,
  ReferenceTrack,
  ID3Metadata,
  ISRCCode,
  SongStructureMarker,
  // Audio editing & restoration
  FreezeTrack,
  AudioWarp,
  WarpMarker,
  BeatSlice,
  SpectralRepair,
  AudioRestoration,
  VocalAlignment,
  // Dynamics processing
  MidSideProcessing,
  DynamicEQ,
  DynamicEQBand,
  LinearPhaseEQ,
  EQBand,
  ParallelProcessing,
  // Recording
  TakeLane,
  Take,
  CompRegion,
  PunchPoint,
  LoopRecording,
  AutomationRecording,
  // Groove & humanize
  GrooveTemplate,
  HumanizeSettings,
  Randomization,
  // Controller & macro
  MIDILearnMapping,
  MacroControl,
  MacroMapping,
  // Export & batch
  StemExport,
  BatchProcessing,
  BatchOperation,
  ExportPreset,
  // Atmos/spatial
  AtmosObject,
  AtmosAutomationPoint,
  HeadphoneVirtualization,
  SurroundAutomation,
  // Collaboration
  ProjectNote,
  Collaborator,
  // Advanced vocal control
  PhonemeEvent,
  PhonemeUnit,
  BreathEvent,
  ConsonantOffsetEvent,
  CrossStaffEvent,
  PortamentoShape,
  PortamentoShapeEvent,
  // New notation types
  ClefChangeEvent,
  ClefType,
  KeySignatureEvent,
  KeyMode,
  FingeringEvent,
  MultiRestEvent,
  SlashNotationEvent,
  BarlineEvent,
  BarlineType,
  TempoTextEvent,
  TempoMarkingType,
  HideEmptyStavesEvent,
  VocalStyleEvent,
  VocalStyleType,
  NoteEnvelopeEvent,
  VocalTensionEvent,
  MelismaEvent,
  StackedArticulationEvent,
  ArticulationType,
  // Ornaments and extended notation
  TrillEvent,
  MordentEvent,
  MordentType,
  TurnEvent,
  ArpeggioEvent,
  ArpeggioDirection,
  GlissandoEvent,
  TremoloEvent,
  TremoloType,
  HarmonicEvent,
  HarmonicType,
  PedalEvent,
  PedalType,
  PedalAction,
  SwingEvent,
  ProbabilityEvent,
  FeatheredBeamEvent,
  FeatheredBeamDirection,
  QuarterToneEvent,
  QuarterToneAccidental,
  ClusterEvent,
  SprechstimmeEvent,
  CustomNoteheadEvent,
  NoteheadType,
  BracketGroupEvent,
  BracketType,
  CueStaffEvent,
  NoteColorEvent,
  // Fourth batch types
  VoltaEvent,
  CadenzaEvent,
  DivisiMarkEvent,
  DivisiType,
  MetricModulationEvent,
  ConductorCueEvent,
  EditorialEvent,
  EditorialType,
  BrassMuteEvent,
  BrassMuteType,
  StringPositionEvent,
  MultiphonicEvent,
  ElectronicsCueEvent,
  BendCurveEvent,
  BendCurveShape,
  SlideEvent,
  SlideType,
  TapEvent,
  TapHand,
  ArrangerSection,
  ChordTrackEvent,
  ChordTrackEntry,
  ScaleLockEvent,
  StepInputEvent,
  MeasureCommentEvent,
  VersionCheckpointEvent,
  // Fifth batch types
  ChordDiagramEvent,
  ScaleDiagramEvent,
  HarpPedalDiagramEvent,
  PartExtractionConfig,
  TranspositionDisplayEvent,
  MeasureNumberConfig,
  WavetableSynthEvent,
  FMSynthEvent,
  FMOperator,
  AdditiveSynthEvent,
  AdditivePartial,
  SubtractiveSynthEvent,
  SubtractiveOsc,
  FilterConfig,
  PhysicalModelEvent,
  ExciterConfig,
  ResonatorConfig,
  VocoderEvent,
  FormantShiftEvent,
  ConvolutionReverbEvent,
  AmpSimEvent,
  CabinetSimEvent,
  VideoSyncEvent,
  HitPointEvent,
  TimecodeDisplayConfig,
  ProjectTemplate,
  TrackTemplateConfig,
  TrackFolderEvent,
  CollaboratorSession,
  CollaboratorInfo,
  VersionDiffEvent,
} from '../types/ir.js';
import {
  RuntimeValue,
  FunctionValue,
  DurValue,
  makeInt,
  makeFloat,
  makeString,
  makeBool,
  makePitch,
  makeDur,
  makeDurTicks,
  makeTime,
  makeArray,
  makeObject,
  makeFunction,
  makeNull,
  toNumber,
  isTruthy,
  toString,
  deepClone,
} from './runtime.js';
import { Scope } from './scope.js';
import { createError, MFError } from '../errors.js';
import { TrackState, DRUM_MAP } from './trackState.js';
import * as coreBuiltins from './builtins/core.js';
import * as midiBuiltins from './builtins/midi.js';
import * as notationBuiltins from './builtins/notation.js';
import * as dynamicsBuiltins from './builtins/dynamics.js';
import * as ornamentsBuiltins from './builtins/ornaments.js';
import * as vocaloidBuiltins from './builtins/vocaloid.js';
import * as effectsBuiltins from './builtins/effects.js';
import * as techniquesBuiltins from './builtins/techniques.js';
import * as layoutBuiltins from './builtins/layout.js';
import * as tuningBuiltins from './builtins/tuning.js';
import * as algorithmicBuiltins from './builtins/algorithmic.js';
import * as liveBuiltins from './builtins/live.js';
import * as audioBuiltins from './builtins/audio.js';
import * as mixingBuiltins from './builtins/mixing.js';

// Control flow signals
class ReturnSignal {
  constructor(public readonly value: RuntimeValue) {}
}

class BreakSignal {}
class ContinueSignal {}

// Curve interpolation helper functions
type CurveType = 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'step' | 'bezier';

/**
 * Calculate interpolated value based on curve type
 * @param t - Progress (0 to 1)
 * @param curveType - Type of curve
 * @returns Interpolated progress (0 to 1)
 */
function applyCurve(t: number, curveType: CurveType): number {
  switch (curveType) {
    case 'linear':
      return t;
    case 'exponential':
      // Starts slow, ends fast
      return t * t;
    case 'logarithmic':
      // Starts fast, ends slow
      return Math.sqrt(t);
    case 's-curve':
      // Smooth S-curve (ease-in-out)
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'step':
      // Step function (no interpolation)
      return t < 1 ? 0 : 1;
    case 'bezier':
      // Cubic bezier approximation (ease-in-out)
      return t * t * (3 - 2 * t);
    default:
      return t;
  }
}

/**
 * Interpolate between two values using a curve
 * @param startVal - Start value
 * @param endVal - End value
 * @param t - Progress (0 to 1)
 * @param curveType - Type of curve
 * @returns Interpolated value
 */
function interpolateWithCurve(startVal: number, endVal: number, t: number, curveType: CurveType): number {
  const curvedT = applyCurve(t, curveType);
  return startVal + (endVal - startVal) * curvedT;
}

export class Interpreter {
  private ir: SongIR;
  private scope: Scope;
  private tracks: Map<string, TrackState> = new Map();
  private currentTrack: TrackState | null = null;
  private trackStarted: boolean = false;
  private callStack: Map<string, number> = new Map();
  private callDepth: number = 0;
  private static readonly MAX_CALL_DEPTH = 1000;
  private forIterationCount: number = 0;
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.scope = new Scope();
    this.ir = {
      schemaVersion: '2.0',
      title: null,
      ppq: 480, // Default PPQ
      tempos: [],
      timeSigs: [],
      tracks: [],
    };
  }

  // Register external proc (from imported modules)
  registerProc(proc: ProcDeclaration): void {
    this.scope.defineProc(proc);
  }

  // Register external const (from imported modules)
  registerConst(name: string, value: RuntimeValue): void {
    this.scope.defineConst(name, value);
  }

  // Get the global scope (for namespace imports)
  getGlobalScope(): Scope {
    return this.scope;
  }

  // v2.0: Execute a Score AST
  executeScore(score: Score): SongIR {
    // Set title
    this.ir.title = score.title;

    // Process backend settings
    if (score.backend) {
      this.ir.backend = {
        name: score.backend.name,
      };
      for (const opt of score.backend.options) {
        const value = this.evaluate(opt.value);
        if (opt.key === 'singer' && value.type === 'string') {
          this.ir.backend.singer = value.value;
        } else if (opt.key === 'lang' && (value.type === 'string')) {
          this.ir.backend.lang = toString(value);
        } else if (opt.key === 'phonemeBudgetPerOnset' && value.type === 'int') {
          this.ir.backend.phonemeBudgetPerOnset = value.value;
        } else if (opt.key === 'maxPhraseSeconds' && (value.type === 'int' || value.type === 'float')) {
          this.ir.backend.maxPhraseSeconds = toNumber(value);
        }
      }
    }

    // Process global statements
    for (const stmt of score.globals) {
      this.executeGlobalStatement(stmt);
    }

    // Process parts
    for (const part of score.parts) {
      this.executePartDeclaration(part);
    }

    // Validate IR
    this.validateIR();

    return this.ir;
  }

  // Execute global statement (tempo, time sig, etc.)
  private executeGlobalStatement(stmt: GlobalStatement): void {
    switch (stmt.kind) {
      case 'TempoStatement': {
        const bpm = toNumber(this.evaluate(stmt.bpm));
        const tick = stmt.at ? this.timeToTick(this.evaluate(stmt.at) as any) : 0;
        // Set default tempo at tick 0 if this is the first
        if (this.ir.tempos.length === 0 || tick === 0) {
          this.ir.tempos = this.ir.tempos.filter(t => t.tick !== 0);
          this.ir.tempos.push({ tick: 0, bpm });
        } else {
          this.ir.tempos.push({ tick, bpm });
        }
        break;
      }
      case 'TimeSignatureStatement': {
        const numerator = toNumber(this.evaluate(stmt.numerator));
        const denominator = toNumber(this.evaluate(stmt.denominator));
        const tick = stmt.at ? this.timeToTick(this.evaluate(stmt.at) as any) : 0;
        if (this.ir.timeSigs.length === 0 || tick === 0) {
          this.ir.timeSigs = this.ir.timeSigs.filter(t => t.tick !== 0);
          this.ir.timeSigs.push({ tick: 0, numerator, denominator });
        } else {
          this.ir.timeSigs.push({ tick, numerator, denominator });
        }
        break;
      }
      case 'KeySignatureStatement': {
        const rootVal = this.evaluate(stmt.root);
        let root = 'C';
        if (rootVal.type === 'string') {
          root = rootVal.value;
        } else if (rootVal.type === 'pitch') {
          // Extract note name from MIDI
          const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          root = names[rootVal.midi % 12];
        }
        this.ir.keySignature = { root, mode: stmt.mode };
        break;
      }
      case 'PpqStatement': {
        this.ir.ppq = toNumber(this.evaluate(stmt.value));
        break;
      }
      case 'ImportStatement':
      case 'ConstDeclaration':
      case 'ProcDeclaration':
        // Handle as regular statements
        this.executeStatement(stmt as Statement);
        break;
    }
  }

  // Execute part declaration
  private executePartDeclaration(part: PartDeclaration): void {
    const isVocal = part.partKind === 'vocal' ||
                    (part.partKind === null && part.body.some(item => item.kind === 'PhraseBlock'));

    // Create track state
    const trackState: TrackState = {
      id: part.name,
      kind: isVocal ? 'vocal' : 'midi',
      cursor: 0,
      events: [],
      meta: {},
    };

    // Process options
    for (const opt of part.options) {
      const value = this.evaluate(opt.value);
      if (opt.key === 'ch' || opt.key === 'channel') {
        trackState.channel = toNumber(value) - 1; // Convert to 0-based
      } else if (opt.key === 'program') {
        trackState.program = toNumber(value);
      } else if (opt.key === 'vel') {
        trackState.defaultVel = toNumber(value);
      }
    }

    // Set defaults for MIDI
    if (!isVocal) {
      trackState.channel = trackState.channel ?? 0;
      trackState.program = trackState.program ?? 0;
      trackState.defaultVel = trackState.defaultVel ?? 96;
    }

    this.tracks.set(part.name, trackState);
    this.currentTrack = trackState;

    // Initialize phrases array for vocal tracks
    if (isVocal) {
      trackState.phrases = [];
    }

    // Process body
    for (const item of part.body) {
      this.executePartBodyItem(item, trackState);
    }

    this.currentTrack = null;
  }

  // Execute part body item
  private executePartBodyItem(item: PartBodyItem, track: TrackState): void {
    switch (item.kind) {
      case 'PhraseBlock':
        this.executePhraseBlock(item, track);
        break;
      case 'RestStatement':
        this.executeRestStatement(item, track);
        break;
      case 'MidiBar':
        this.executeMidiBar(item, track);
        break;
      default:
        // Regular statement
        this.executeStatement(item as Statement);
        break;
    }
  }

  // Execute phrase block
  private executePhraseBlock(phrase: PhraseBlock, track: TrackState): void {
    const phraseStartTick = track.cursor;
    const phraseNotes: PhraseNote[] = [];

    // Collect notes from notes section
    if (phrase.notesSection) {
      for (const bar of phrase.notesSection.bars) {
        for (const noteItem of bar.notes) {
          const pitch = this.evaluate(noteItem.pitch);
          const dur = this.evaluate(noteItem.duration);

          if (pitch.type !== 'pitch') {
            throw new MFError('TYPE', 'Expected pitch in note', noteItem.position, this.filePath);
          }

          const durTicks = this.durToTicks(dur as DurValue, noteItem.position);

          phraseNotes.push({
            tick: track.cursor,
            dur: durTicks,
            key: pitch.midi,
            tieStart: noteItem.tieStart,
          });

          track.cursor += durTicks;
        }
      }
    }

    // Mark tied notes as continuations
    for (let i = 0; i < phraseNotes.length; i++) {
      if (i > 0 && phraseNotes[i - 1].tieStart &&
          phraseNotes[i - 1].key === phraseNotes[i].key) {
        phraseNotes[i].tieEnd = true;
        phraseNotes[i].isContinuation = true;
      }
    }

    // Apply lyrics (underlay)
    if (phrase.lyricsSection) {
      let lyricIndex = 0;
      for (const note of phraseNotes) {
        if (note.isContinuation) {
          // Tied continuation - don't advance lyrics
          continue;
        }

        if (lyricIndex < phrase.lyricsSection.tokens.length) {
          const token = phrase.lyricsSection.tokens[lyricIndex];
          if (token.isMelisma) {
            // Melisma - extend from previous
            note.extend = true;
          } else {
            note.lyric = token.value;
          }
          lyricIndex++;
        }
      }

      // Validate count
      const onsetCount = phraseNotes.filter(n => !n.isContinuation).length;
      const lyricCount = phrase.lyricsSection.tokens.length;
      if (onsetCount !== lyricCount) {
        console.warn(`Warning: Lyric count mismatch: ${onsetCount} onsets, ${lyricCount} lyrics`);
      }
    }

    // Convert to events and add to track
    for (const pn of phraseNotes) {
      const event: NoteEvent = {
        type: 'note',
        tick: pn.tick,
        dur: pn.dur,
        key: pn.key,
        lyric: pn.lyric,
        syllabic: pn.syllabic,
        extend: pn.extend,
      };
      track.events.push(event);
    }

    // Store phrase for vocal tracks
    if (track.phrases) {
      track.phrases.push({
        startTick: phraseStartTick,
        endTick: track.cursor,
        notes: phraseNotes,
        breaths: phrase.breathMarks.map(bm => ({ tick: 0 })), // TODO: calculate proper tick
      });
    }
  }

  // Execute rest statement
  private executeRestStatement(rest: RestStatement, track: TrackState): void {
    const dur = this.evaluate(rest.duration);
    const durTicks = this.durToTicks(dur as DurValue, rest.position);

    track.events.push({
      type: 'rest',
      tick: track.cursor,
      dur: durTicks,
    });

    track.cursor += durTicks;
  }

  // Execute MIDI bar
  private executeMidiBar(bar: MidiBar, track: TrackState): void {
    for (const item of bar.items) {
      switch (item.kind) {
        case 'MidiNote': {
          const pitch = this.evaluate(item.pitch);
          const dur = this.evaluate(item.duration);
          const vel = item.velocity ? toNumber(this.evaluate(item.velocity)) : (track.defaultVel ?? 96);

          if (pitch.type !== 'pitch') {
            throw new MFError('TYPE', 'Expected pitch', item.position, this.filePath);
          }

          const durTicks = this.durToTicks(dur as DurValue, item.position);

          track.events.push({
            type: 'note',
            tick: track.cursor,
            dur: durTicks,
            key: pitch.midi,
            vel,
          });

          track.cursor += durTicks;
          break;
        }
        case 'MidiChord': {
          const dur = this.evaluate(item.duration);
          const vel = item.velocity ? toNumber(this.evaluate(item.velocity)) : (track.defaultVel ?? 96);
          const durTicks = this.durToTicks(dur as DurValue, item.position);

          for (const pitchExpr of item.pitches) {
            const pitch = this.evaluate(pitchExpr);
            if (pitch.type !== 'pitch') {
              throw new MFError('TYPE', 'Expected pitch in chord', item.position, this.filePath);
            }

            track.events.push({
              type: 'note',
              tick: track.cursor,
              dur: durTicks,
              key: pitch.midi,
              vel,
            });
          }

          track.cursor += durTicks;
          break;
        }
        case 'MidiDrum': {
          const dur = this.evaluate(item.duration);
          const vel = item.velocity ? toNumber(this.evaluate(item.velocity)) : (track.defaultVel ?? 96);
          const durTicks = this.durToTicks(dur as DurValue, item.position);

          const drumMidi = DRUM_MAP[item.name.toLowerCase()] ?? 36;

          track.events.push({
            type: 'note',
            tick: track.cursor,
            dur: durTicks,
            key: drumMidi,
            vel,
          });

          track.cursor += durTicks;
          break;
        }
        case 'MidiRest': {
          const dur = this.evaluate(item.duration);
          const durTicks = this.durToTicks(dur as DurValue, item.position);
          track.cursor += durTicks;
          break;
        }
      }
    }
  }

  // Main entry point
  execute(score: Score): SongIR {
    return this.executeScore(score);
  }

  private executeStatements(statements: Statement[]): void {
    for (const stmt of statements) {
      this.executeStatement(stmt);
    }
  }

  private executeStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'ConstDeclaration': {
        const value = this.evaluate(stmt.value);
        this.scope.defineConst(stmt.name, value);
        break;
      }

      case 'LetDeclaration': {
        const value = this.evaluate(stmt.value);
        this.scope.defineLet(stmt.name, value);
        break;
      }

      case 'AssignmentStatement': {
        const value = this.evaluate(stmt.value);
        this.scope.assign(stmt.name, value);
        break;
      }

      case 'IfStatement': {
        const condition = this.evaluate(stmt.condition);
        if (isTruthy(condition)) {
          const childScope = this.scope.createChild();
          const oldScope = this.scope;
          this.scope = childScope;
          this.executeStatements(stmt.consequent);
          this.scope = oldScope;
        } else if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            // else: alternate is Statement[]
            const childScope = this.scope.createChild();
            const oldScope = this.scope;
            this.scope = childScope;
            this.executeStatements(stmt.alternate);
            this.scope = oldScope;
          } else {
            // else if: alternate is a single IfStatement
            this.executeStatement(stmt.alternate);
          }
        }
        break;
      }

      case 'ForStatement': {
        const startVal = this.evaluate(stmt.range.start);
        const endVal = this.evaluate(stmt.range.end);

        if (startVal.type !== 'int' || endVal.type !== 'int') {
          throw createError('E400', 'For range bounds must be integers', stmt.position, this.filePath);
        }

        const start = startVal.value;
        const end = stmt.range.inclusive ? endVal.value + 1 : endVal.value;

        // Check iteration limit
        const iterations = Math.max(0, end - start);
        if (this.forIterationCount + iterations > 100000) {
          throw createError('E401', 'For loop iteration limit exceeded', stmt.position, this.filePath);
        }

        outerFor: for (let i = start; i < end; i++) {
          this.forIterationCount++;
          const childScope = this.scope.createChild();
          childScope.defineConst(stmt.variable, makeInt(i));
          const oldScope = this.scope;
          this.scope = childScope;

          try {
            this.executeStatements(stmt.body);
          } catch (e) {
            if (e instanceof BreakSignal) {
              this.scope = oldScope;
              break outerFor;
            }
            if (e instanceof ContinueSignal) {
              this.scope = oldScope;
              continue outerFor;
            }
            throw e;
          }

          this.scope = oldScope;
        }
        break;
      }

      case 'WhileStatement': {
        let iterationCount = 0;
        const maxIterations = 100000;

        outerWhile: while (isTruthy(this.evaluate(stmt.condition))) {
          if (iterationCount++ > maxIterations) {
            throw createError('E401', 'While loop iteration limit exceeded', stmt.position, this.filePath);
          }
          const childScope = this.scope.createChild();
          const oldScope = this.scope;
          this.scope = childScope;

          try {
            this.executeStatements(stmt.body);
          } catch (e) {
            if (e instanceof BreakSignal) {
              this.scope = oldScope;
              break outerWhile;
            }
            if (e instanceof ContinueSignal) {
              this.scope = oldScope;
              continue outerWhile;
            }
            throw e;
          }

          this.scope = oldScope;
        }
        break;
      }

      case 'MatchStatement': {
        const matchValue = this.evaluate(stmt.expression);
        let matched = false;
        let defaultCase: { pattern: Expression | null; body: Statement[] } | null = null;

        for (const matchCase of stmt.cases) {
          if (matchCase.pattern === null) {
            // Store default case for later
            defaultCase = matchCase;
            continue;
          }

          const caseValue = this.evaluate(matchCase.pattern);
          if (this.valuesEqual(matchValue, caseValue)) {
            // Execute the matching case
            const childScope = this.scope.createChild();
            const oldScope = this.scope;
            this.scope = childScope;

            try {
              this.executeStatements(matchCase.body);
            } finally {
              this.scope = oldScope;
            }
            matched = true;
            break;
          }
        }

        // If no case matched, execute default case if present
        if (!matched && defaultCase) {
          const childScope = this.scope.createChild();
          const oldScope = this.scope;
          this.scope = childScope;

          try {
            this.executeStatements(defaultCase.body);
          } finally {
            this.scope = oldScope;
          }
        }
        break;
      }

      case 'ReturnStatement': {
        const value = stmt.value ? this.evaluate(stmt.value) : makeNull();
        throw new ReturnSignal(value);
      }

      case 'BreakStatement': {
        throw new BreakSignal();
      }

      case 'ContinueStatement': {
        throw new ContinueSignal();
      }

      case 'IndexAssignmentStatement': {
        const obj = this.evaluate(stmt.object);
        const idx = this.evaluate(stmt.index);
        const value = this.evaluate(stmt.value);

        if (obj.type !== 'array') {
          throw createError('E400', `Cannot index assign to type '${obj.type}'`, stmt.position, this.filePath);
        }
        if (idx.type !== 'int') {
          throw createError('E400', 'Array index must be an integer', stmt.position, this.filePath);
        }

        let index = idx.value;
        // Support negative indexing
        if (index < 0) {
          index = obj.elements.length + index;
        }
        if (index < 0 || index >= obj.elements.length) {
          throw createError('E400', `Array index ${idx.value} out of bounds`, stmt.position, this.filePath);
        }

        obj.elements[index] = value;
        break;
      }

      case 'PropertyAssignmentStatement': {
        const obj = this.evaluate(stmt.object);
        const value = this.evaluate(stmt.value);

        if (obj.type !== 'object') {
          throw createError('E400', `Cannot set property on type '${obj.type}'`, stmt.position, this.filePath);
        }

        obj.properties.set(stmt.property, value);
        break;
      }

      case 'ForEachStatement': {
        const iterable = this.evaluate(stmt.iterable);

        // Build the list of elements to iterate over
        let elements: RuntimeValue[] = [];
        if (iterable.type === 'array') {
          elements = iterable.elements;
        } else if (iterable.type === 'string') {
          // Iterate over characters
          elements = [...iterable.value].map(c => makeString(c));
        } else if (iterable.type === 'object') {
          // Iterate over keys
          elements = [...iterable.properties.keys()].map(k => makeString(k));
        } else {
          throw createError('E400', `Cannot iterate over type '${iterable.type}'`, stmt.position, this.filePath);
        }

        for (const element of elements) {
          const childScope = this.scope.createChild();
          childScope.defineConst(stmt.variable, element);
          const oldScope = this.scope;
          this.scope = childScope;

          try {
            this.executeStatements(stmt.body);
          } catch (e) {
            if (e instanceof BreakSignal) {
              this.scope = oldScope;
              break;
            }
            if (e instanceof ContinueSignal) {
              this.scope = oldScope;
              continue;
            }
            throw e;
          }

          this.scope = oldScope;
        }
        break;
      }

      case 'ExpressionStatement': {
        this.evaluate(stmt.expression);
        break;
      }

      case 'ExportStatement': {
        if (stmt.declaration.kind === 'ConstDeclaration') {
          const value = this.evaluate(stmt.declaration.value);
          this.scope.defineConst(stmt.declaration.name, value);
        }
        break;
      }

      case 'ImportStatement':
      case 'ProcDeclaration':
        // Already handled in first pass
        break;
      default: {
        const unknownStmt = stmt as Statement;
        throw createError('E400', `Unknown statement kind: ${unknownStmt.kind}`, unknownStmt.position, this.filePath);
      }

    }
  }

  private evaluate(expr: Expression): RuntimeValue {
    switch (expr.kind) {
      case 'IntLiteral':
        return makeInt(expr.value);

      case 'FloatLiteral':
        return makeFloat(expr.value);

      case 'StringLiteral':
        return makeString(expr.value);

      case 'BoolLiteral':
        return makeBool(expr.value);

      case 'NullLiteral':
        return makeNull();

      case 'PitchLiteral':
        return makePitch(expr.midi);

      case 'DurLiteral':
        // Handle tick-based duration
        if (expr.ticks !== undefined) {
          if (expr.ticks <= 0) {
            throw new MFError('E101', `Invalid duration: ${expr.ticks}t (must be positive)`, expr.position, this.filePath);
          }
          return makeDurTicks(expr.ticks);
        }
        // Handle fraction/note-based duration
        if (expr.numerator === undefined || expr.denominator === undefined) {
          throw new MFError('E101', 'Invalid duration literal', expr.position, this.filePath);
        }
        if (expr.numerator <= 0 || expr.denominator <= 0) {
          throw new MFError('E101', `Invalid duration: ${expr.numerator}/${expr.denominator} (must be positive)`, expr.position, this.filePath);
        }
        return makeDur(expr.numerator, expr.denominator, expr.dots ?? 0);

      case 'TimeLiteral':
        return makeTime(expr.bar, expr.beat, expr.sub);

      case 'ArrayLiteral': {
        const elements: RuntimeValue[] = [];
        for (const elem of expr.elements) {
          if (elem.kind === 'SpreadElement') {
            const arr = this.evaluate(elem.argument);
            if (arr.type !== 'array') {
              throw createError('E400', 'Spread requires array', elem.position, this.filePath);
            }
            elements.push(...arr.elements);
          } else {
            elements.push(this.evaluate(elem));
          }
        }
        return makeArray(elements);
      }

      case 'Identifier': {
        const value = this.scope.lookup(expr.name);
        if (value === undefined) {
          throw createError('E400', `Undefined variable '${expr.name}'`, expr.position, this.filePath);
        }
        return value;
      }

      case 'BinaryExpression':
        return this.evaluateBinary(expr.operator, expr.left, expr.right);

      case 'UnaryExpression':
        return this.evaluateUnary(expr.operator, expr.operand);

      case 'CallExpression':
        return this.evaluateCall(expr.callee, expr.arguments, expr.position);

      case 'IndexExpression': {
        const obj = this.evaluate(expr.object);
        // Optional chaining: return null if object is null
        if (expr.optional && obj.type === 'null') {
          return makeNull();
        }
        const idx = this.evaluate(expr.index);

        if (obj.type === 'array') {
          if (idx.type !== 'int') {
            throw createError('E400', 'Array index must be an integer', expr.position, this.filePath);
          }
          let index = idx.value;
          // Support negative indexing
          if (index < 0) {
            index = obj.elements.length + index;
          }
          if (index < 0 || index >= obj.elements.length) {
            throw createError('E400', `Array index ${idx.value} out of bounds (length: ${obj.elements.length})`, expr.position, this.filePath);
          }
          return obj.elements[index];
        }

        if (obj.type === 'string') {
          if (idx.type !== 'int') {
            throw createError('E400', 'String index must be an integer', expr.position, this.filePath);
          }
          let index = idx.value;
          // Support negative indexing
          if (index < 0) {
            index = obj.value.length + index;
          }
          if (index < 0 || index >= obj.value.length) {
            throw createError('E400', `String index ${idx.value} out of bounds (length: ${obj.value.length})`, expr.position, this.filePath);
          }
          return makeString(obj.value[index]);
        }

        throw createError('E400', `Cannot index type '${obj.type}'`, expr.position, this.filePath);
      }

      case 'ObjectLiteral': {
        const obj = makeObject();
        for (const prop of expr.properties) {
          if (prop.kind === 'spread') {
            const spreadObj = this.evaluate(prop.argument);
            if (spreadObj.type !== 'object') {
              throw createError('E400', 'Spread requires object', expr.position, this.filePath);
            }
            for (const [k, v] of spreadObj.properties) {
              obj.properties.set(k, v);
            }
          } else {
            const value = this.evaluate(prop.value);
            obj.properties.set(prop.key, value);
          }
        }
        return obj;
      }

      case 'MemberExpression': {
        const obj = this.evaluate(expr.object);
        // Optional chaining: return null if object is null
        if (expr.optional && obj.type === 'null') {
          return makeNull();
        }
        if (obj.type === 'object') {
          const value = obj.properties.get(expr.property);
          return value ?? makeNull();
        }
        if (obj.type === 'array' && expr.property === 'length') {
          return makeInt(obj.elements.length);
        }
        if (obj.type === 'string' && expr.property === 'length') {
          return makeInt(obj.value.length);
        }
        throw createError('E400', `Cannot access property '${expr.property}' of type '${obj.type}'`, expr.position, this.filePath);
      }

      case 'ArrowFunction':
        return makeFunction(expr.params, expr.body, this.scope);

      case 'SpreadElement':
        throw createError('E400', 'Spread element not allowed here', expr.position, this.filePath);

      case 'RangeExpression':
        throw createError('E400', `${expr.kind} cannot be evaluated as expression`, expr.position, this.filePath);

      case 'ConditionalExpression':
        // Ternary operator: condition ? consequent : alternate
        return isTruthy(this.evaluate(expr.condition))
          ? this.evaluate(expr.consequent)
          : this.evaluate(expr.alternate);

      case 'TemplateLiteral': {
        // Template literal: `Hello ${name}!`
        let result = '';
        for (let i = 0; i < expr.quasis.length; i++) {
          result += expr.quasis[i];
          if (i < expr.expressions.length) {
            const val = this.evaluate(expr.expressions[i]);
            result += toString(val);
          }
        }
        return makeString(result);
      }

      case 'TypeofExpression': {
        const val = this.evaluate(expr.operand);
        return makeString(val.type);
      }

      default:
        throw createError('E400', `Unknown expression kind: ${(expr as Expression).kind}`, (expr as Expression).position, this.filePath);
    }
  }

  private evaluateBinary(op: string, leftExpr: Expression, rightExpr: Expression): RuntimeValue {
    // Short-circuit evaluation for logical operators - evaluate right side only if needed
    if (op === '&&') {
      const left = this.evaluate(leftExpr);
      if (!isTruthy(left)) {
        return makeBool(false);
      }
      const right = this.evaluate(rightExpr);
      return makeBool(isTruthy(right));
    }
    if (op === '||') {
      const left = this.evaluate(leftExpr);
      if (isTruthy(left)) {
        return makeBool(true);
      }
      const right = this.evaluate(rightExpr);
      return makeBool(isTruthy(right));
    }
    // Nullish coalescing: return left if not null, else evaluate right
    if (op === '??') {
      const left = this.evaluate(leftExpr);
      if (left.type !== 'null') {
        return left;
      }
      return this.evaluate(rightExpr);
    }

    const left = this.evaluate(leftExpr);
    const right = this.evaluate(rightExpr);

    // Comparison operators
    if (op === '==' || op === '!=') {
      const equal = this.valuesEqual(left, right);
      return makeBool(op === '==' ? equal : !equal);
    }

    // Numeric comparisons
    if (op === '<' || op === '>' || op === '<=' || op === '>=') {
      const l = toNumber(left);
      const r = toNumber(right);
      switch (op) {
        case '<': return makeBool(l < r);
        case '>': return makeBool(l > r);
        case '<=': return makeBool(l <= r);
        case '>=': return makeBool(l >= r);
      }
    }

    // Arithmetic
    if (op === '+') {
      // String concatenation
      if (left.type === 'string' || right.type === 'string') {
        return makeString(toString(left) + toString(right));
      }
      // Pitch + Int
      if (left.type === 'pitch' && right.type === 'int') {
        return makePitch(left.midi + right.value);
      }
      // Dur + Dur
      if (left.type === 'dur' && right.type === 'dur') {
        // Both must be fraction-based for arithmetic
        if (left.ticks !== undefined || right.ticks !== undefined) {
          throw createError('E400', 'Cannot perform arithmetic on tick-based durations', leftExpr.position, this.filePath);
        }
        if (left.numerator === undefined || left.denominator === undefined ||
            right.numerator === undefined || right.denominator === undefined) {
          throw createError('E400', 'Invalid duration for arithmetic', leftExpr.position, this.filePath);
        }
        const num = left.numerator * right.denominator + right.numerator * left.denominator;
        const den = left.denominator * right.denominator;
        const gcd = this.gcd(num, den);
        return makeDur(num / gcd, den / gcd);
      }
      // Numeric
      const l = toNumber(left);
      const r = toNumber(right);
      if (left.type === 'float' || right.type === 'float') {
        return makeFloat(l + r);
      }
      return makeInt(l + r);
    }

    if (op === '-') {
      // Pitch - Int
      if (left.type === 'pitch' && right.type === 'int') {
        return makePitch(left.midi - right.value);
      }
      // Numeric
      const l = toNumber(left);
      const r = toNumber(right);
      if (left.type === 'float' || right.type === 'float') {
        return makeFloat(l - r);
      }
      return makeInt(l - r);
    }

    if (op === '*') {
      // Dur * Int
      if (left.type === 'dur' && right.type === 'int') {
        // Handle tick-based duration
        if (left.ticks !== undefined) {
          return makeDurTicks(left.ticks * right.value);
        }
        if (left.numerator === undefined || left.denominator === undefined) {
          throw createError('E400', 'Invalid duration for arithmetic', leftExpr.position, this.filePath);
        }
        const num = left.numerator * right.value;
        const gcd = this.gcd(num, left.denominator);
        return makeDur(num / gcd, left.denominator / gcd);
      }
      // Numeric
      const l = toNumber(left);
      const r = toNumber(right);
      if (left.type === 'float' || right.type === 'float') {
        return makeFloat(l * r);
      }
      return makeInt(l * r);
    }

    if (op === '/') {
      // Dur / Int
      if (left.type === 'dur' && right.type === 'int') {
        if (right.value === 0) {
          throw createError('E400', 'Division by zero', leftExpr.position, this.filePath);
        }
        // Handle tick-based duration
        if (left.ticks !== undefined) {
          return makeDurTicks(Math.round(left.ticks / right.value));
        }
        if (left.numerator === undefined || left.denominator === undefined) {
          throw createError('E400', 'Invalid duration for arithmetic', leftExpr.position, this.filePath);
        }
        const den = left.denominator * right.value;
        const gcd = this.gcd(left.numerator, den);
        if (gcd === 0) {
          throw createError('E400', 'Division by zero in duration calculation', leftExpr.position, this.filePath);
        }
        return makeDur(left.numerator / gcd, den / gcd);
      }
      // Numeric
      const l = toNumber(left);
      const r = toNumber(right);
      if (r === 0) {
        throw createError('E400', 'Division by zero', rightExpr.position, this.filePath);
      }
      // Division always returns float unless both are int and divide evenly
      if (left.type === 'int' && right.type === 'int' && l % r === 0) {
        return makeInt(l / r);
      }
      return makeFloat(l / r);
    }

    if (op === '%') {
      const l = toNumber(left);
      const r = toNumber(right);
      if (r === 0) {
        throw createError('E400', 'Modulo by zero', rightExpr.position, this.filePath);
      }
      if (left.type === 'int' && right.type === 'int') {
        return makeInt(l % r);
      }
      return makeFloat(l % r);
    }

    // Bitwise operators (only work on integers)
    if (op === '&') {
      const l = Math.trunc(toNumber(left));
      const r = Math.trunc(toNumber(right));
      return makeInt(l & r);
    }

    if (op === '|') {
      const l = Math.trunc(toNumber(left));
      const r = Math.trunc(toNumber(right));
      return makeInt(l | r);
    }

    if (op === '^') {
      const l = Math.trunc(toNumber(left));
      const r = Math.trunc(toNumber(right));
      return makeInt(l ^ r);
    }

    if (op === '<<') {
      const l = Math.trunc(toNumber(left));
      const r = Math.trunc(toNumber(right));
      return makeInt(l << r);
    }

    if (op === '>>') {
      const l = Math.trunc(toNumber(left));
      const r = Math.trunc(toNumber(right));
      return makeInt(l >> r);
    }

    throw createError('E400', `Unknown binary operator: ${op}`, leftExpr.position, this.filePath);
  }

  private evaluateUnary(op: string, operandExpr: Expression): RuntimeValue {
    const operand = this.evaluate(operandExpr);

    if (op === '!') {
      return makeBool(!isTruthy(operand));
    }

    if (op === '-') {
      const n = toNumber(operand);
      return operand.type === 'float' ? makeFloat(-n) : makeInt(-n);
    }

    if (op === '~') {
      const n = Math.trunc(toNumber(operand));
      return makeInt(~n);
    }

    throw createError('E400', `Unknown unary operator: ${op}`, operandExpr.position, this.filePath);
  }

  private evaluateCall(
    calleeExpr: Expression,
    args: (Expression | { kind: 'SpreadElement'; argument: Expression; position: any })[],
    position: { line: number; column: number; offset: number }
  ): RuntimeValue {
    // Helper to expand arguments (handle spread)
    const expandArgs = (): RuntimeValue[] => {
      const result: RuntimeValue[] = [];
      for (const arg of args) {
        if (arg.kind === 'SpreadElement') {
          const arr = this.evaluate(arg.argument);
          if (arr.type !== 'array') {
            throw createError('E400', 'Spread requires array', arg.position, this.filePath);
          }
          result.push(...arr.elements);
        } else {
          result.push(this.evaluate(arg));
        }
      }
      return result;
    };

    // If callee is an identifier, check for builtins and procs
    if (calleeExpr.kind === 'Identifier') {
      const callee = calleeExpr.name;

      // Check if it's a function value in scope
      const fnValue = this.scope.lookup(callee);
      if (fnValue && fnValue.type === 'function') {
        return this.callFunctionValue(fnValue, expandArgs(), position);
      }

      // Built-in functions
      switch (callee) {
      // Utility builtins
      case 'len': {
        if (args.length !== 1) {
          throw createError('E400', 'len() requires exactly 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        if (val.type === 'array') {
          return makeInt(val.elements.length);
        }
        if (val.type === 'string') {
          return makeInt(val.value.length);
        }
        throw createError('E400', `len() expects array or string, got ${val.type}`, position, this.filePath);
      }

      case 'cursor': {
        this.checkTrackPhase(position);
        return makeInt(this.currentTrack!.cursor);
      }

      case 'getPpq': {
        // getPpq() - get the PPQ value
        return makeInt(this.ir.ppq);
      }

      case 'durToTicks': {
        // durToTicks(dur) - convert duration to ticks
        if (args.length !== 1) {
          throw createError('E400', 'durToTicks() requires 1 argument', position, this.filePath);
        }
        const dur = this.evaluate(args[0]);
        if (dur.type !== 'dur') {
          throw createError('E400', 'durToTicks() requires a duration', position, this.filePath);
        }
        const ticks = this.durToTicks(dur, position);
        return makeInt(ticks);
      }

      case 'getVel': {
        // getVel() - get default velocity for current track
        this.checkTrackPhase(position);
        return makeInt(this.currentTrack!.defaultVel ?? 96);
      }

      case 'noteAt': {
        // noteAt(tick, pitch, durTicks, vel?) - add note at specific tick without moving cursor
        this.checkTrackPhase(position);
        const track = this.currentTrack!;

        if (args.length < 3) {
          throw createError('E400', 'noteAt() requires at least 3 arguments (tick, pitch, durTicks)', position, this.filePath);
        }

        const tick = this.evaluate(args[0]);
        const pitch = this.evaluate(args[1]);
        const durTicks = this.evaluate(args[2]);
        const vel = args.length >= 4 ? this.evaluate(args[3]) : makeInt(track.defaultVel ?? 96);

        if (tick.type !== 'int') {
          throw createError('E400', 'noteAt() tick must be int', position, this.filePath);
        }
        if (pitch.type !== 'pitch') {
          throw createError('E400', 'noteAt() pitch must be Pitch', position, this.filePath);
        }
        if (durTicks.type !== 'int') {
          throw createError('E400', 'noteAt() durTicks must be int', position, this.filePath);
        }
        if (vel.type !== 'int') {
          throw createError('E400', 'noteAt() velocity must be int', position, this.filePath);
        }

        if (pitch.midi < 0 || pitch.midi > 127) {
          throw createError('E110', `Pitch ${pitch.midi} out of range 0..127`, position, this.filePath);
        }
        if (vel.value < 0 || vel.value > 127) {
          throw createError('E110', `Velocity ${vel.value} out of range 0..127`, position, this.filePath);
        }

        const event: NoteEvent = {
          type: 'note',
          tick: tick.value,
          dur: durTicks.value,
          key: pitch.midi,
          vel: vel.value,
        };
        track.events.push(event);
        return makeNull();
      }

      case 'transpose': {
        // transpose(pitch, semitones) - return new pitch transposed by semitones
        if (args.length !== 2) {
          throw createError('E400', 'transpose() requires 2 arguments', position, this.filePath);
        }
        const pitch = this.evaluate(args[0]);
        const semitones = this.evaluate(args[1]);
        if (pitch.type !== 'pitch') {
          throw createError('E400', 'transpose() first argument must be Pitch', position, this.filePath);
        }
        if (semitones.type !== 'int') {
          throw createError('E400', 'transpose() second argument must be int', position, this.filePath);
        }
        return makePitch(pitch.midi + semitones.value);
      }

      case 'midiPitch': {
        // midiPitch(midiNumber) - create pitch from MIDI number
        if (args.length !== 1) {
          throw createError('E400', 'midiPitch() requires 1 argument', position, this.filePath);
        }
        const midi = this.evaluate(args[0]);
        if (midi.type !== 'int') {
          throw createError('E400', 'midiPitch() argument must be int', position, this.filePath);
        }
        if (midi.value < 0 || midi.value > 127) {
          throw createError('E110', `MIDI pitch ${midi.value} out of range 0..127`, position, this.filePath);
        }
        return makePitch(midi.value);
      }

      case 'pitchMidi': {
        // pitchMidi(pitch) - get MIDI number from pitch
        if (args.length !== 1) {
          throw createError('E400', 'pitchMidi() requires 1 argument', position, this.filePath);
        }
        const pitch = this.evaluate(args[0]);
        if (pitch.type !== 'pitch') {
          throw createError('E400', 'pitchMidi() argument must be Pitch', position, this.filePath);
        }
        return makeInt(pitch.midi);
      }

      case 'floor': {
        if (args.length !== 1) {
          throw createError('E400', 'floor() requires exactly 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        return makeInt(Math.floor(toNumber(val)));
      }

      case 'ceil': {
        if (args.length !== 1) {
          throw createError('E400', 'ceil() requires exactly 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        return makeInt(Math.ceil(toNumber(val)));
      }

      case 'abs': {
        if (args.length !== 1) {
          throw createError('E400', 'abs() requires exactly 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        const n = toNumber(val);
        return val.type === 'float' ? makeFloat(Math.abs(n)) : makeInt(Math.abs(n));
      }

      case 'min': {
        if (args.length < 2) {
          throw createError('E400', 'min() requires at least 2 arguments', position, this.filePath);
        }
        let minVal = toNumber(this.evaluate(args[0]));
        let isFloat = this.evaluate(args[0]).type === 'float';
        for (let i = 1; i < args.length; i++) {
          const val = this.evaluate(args[i]);
          const n = toNumber(val);
          if (val.type === 'float') isFloat = true;
          if (n < minVal) minVal = n;
        }
        return isFloat ? makeFloat(minVal) : makeInt(minVal);
      }

      case 'max': {
        if (args.length < 2) {
          throw createError('E400', 'max() requires at least 2 arguments', position, this.filePath);
        }
        let maxVal = toNumber(this.evaluate(args[0]));
        let isFloat = this.evaluate(args[0]).type === 'float';
        for (let i = 1; i < args.length; i++) {
          const val = this.evaluate(args[i]);
          const n = toNumber(val);
          if (val.type === 'float') isFloat = true;
          if (n > maxVal) maxVal = n;
        }
        return isFloat ? makeFloat(maxVal) : makeInt(maxVal);
      }

      case 'random': {
        // random() - returns float 0..1
        // random(max) - returns int 0..max-1
        // random(min, max) - returns int min..max-1
        if (args.length === 0) {
          return makeFloat(Math.random());
        }
        if (args.length === 1) {
          const max = Math.floor(toNumber(this.evaluate(args[0])));
          if (max <= 0) {
            throw createError('E400', `random(max) requires max > 0, got ${max}`, position, this.filePath);
          }
          return makeInt(Math.floor(Math.random() * max));
        }
        const min = Math.floor(toNumber(this.evaluate(args[0])));
        const max = Math.floor(toNumber(this.evaluate(args[1])));
        if (max <= min) {
          throw createError('E400', `random(min, max) requires max > min, got min=${min}, max=${max}`, position, this.filePath);
        }
        return makeInt(min + Math.floor(Math.random() * (max - min)));
      }

      // Bitwise operations
      case 'bitAnd': {
        if (args.length !== 2) {
          throw createError('E400', 'bitAnd() requires 2 arguments', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        const b = Math.floor(toNumber(this.evaluate(args[1])));
        return makeInt(a & b);
      }

      case 'bitOr': {
        if (args.length !== 2) {
          throw createError('E400', 'bitOr() requires 2 arguments', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        const b = Math.floor(toNumber(this.evaluate(args[1])));
        return makeInt(a | b);
      }

      case 'bitXor': {
        if (args.length !== 2) {
          throw createError('E400', 'bitXor() requires 2 arguments', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        const b = Math.floor(toNumber(this.evaluate(args[1])));
        return makeInt(a ^ b);
      }

      case 'bitNot': {
        if (args.length !== 1) {
          throw createError('E400', 'bitNot() requires 1 argument', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        return makeInt(~a);
      }

      case 'bitShiftLeft': {
        if (args.length !== 2) {
          throw createError('E400', 'bitShiftLeft() requires 2 arguments', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        const n = Math.floor(toNumber(this.evaluate(args[1])));
        return makeInt(a << n);
      }

      case 'bitShiftRight': {
        if (args.length !== 2) {
          throw createError('E400', 'bitShiftRight() requires 2 arguments', position, this.filePath);
        }
        const a = Math.floor(toNumber(this.evaluate(args[0])));
        const n = Math.floor(toNumber(this.evaluate(args[1])));
        return makeInt(a >> n);
      }

      // Array utilities
      case 'fill': {
        // fill(size, value) - create array of size filled with value
        // Each element is a deep clone to avoid shared references
        if (args.length !== 2) {
          throw createError('E400', 'fill() requires 2 arguments', position, this.filePath);
        }
        const size = Math.floor(toNumber(this.evaluate(args[0])));
        if (size < 0) {
          throw createError('E400', 'fill() size must be non-negative', position, this.filePath);
        }
        if (size > 1000000) {
          throw createError('E401', 'fill() size exceeds maximum (1000000)', position, this.filePath);
        }
        const value = this.evaluate(args[1]);
        const elements: RuntimeValue[] = [];
        for (let i = 0; i < size; i++) {
          // Deep clone to avoid shared references for arrays/objects
          elements.push(deepClone(value));
        }
        return makeArray(elements);
      }

      case 'copy': {
        // copy(arr) - create shallow copy of array
        if (args.length !== 1) {
          throw createError('E400', 'copy() requires 1 argument', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        if (arr.type !== 'array') {
          throw createError('E400', 'copy() argument must be an array', position, this.filePath);
        }
        return makeArray([...arr.elements]);
      }

      case 'print': {
        // Debug print function
        const values = args.map(a => {
          const v = this.evaluate(a);
          if (v.type === 'string') return v.value;
          if (v.type === 'int' || v.type === 'float') return String(v.value);
          if (v.type === 'bool') return String(v.value);
          if (v.type === 'pitch') return `Pitch(${v.midi})`;
          if (v.type === 'dur') return `${v.numerator}/${v.denominator}`;
          if (v.type === 'array') return `[${v.elements.length} elements]`;
          return String(v.type);
        });
        console.log('[MFS]', ...values);
        return makeNull();
      }

      case 'push': {
        // push(arr, value) - mutates array, returns array
        if (args.length !== 2) {
          throw createError('E400', 'push() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const value = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'push() first argument must be an array', position, this.filePath);
        }
        arr.elements.push(value);
        return arr;
      }

      case 'pop': {
        // pop(arr) - mutates array, returns removed element
        if (args.length !== 1) {
          throw createError('E400', 'pop() requires 1 argument', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        if (arr.type !== 'array') {
          throw createError('E400', 'pop() argument must be an array', position, this.filePath);
        }
        if (arr.elements.length === 0) {
          return makeNull();
        }
        const popped = arr.elements.pop();
        return popped ?? makeNull();
      }

      case 'concat': {
        // concat(arr1, arr2) - returns new array
        if (args.length !== 2) {
          throw createError('E400', 'concat() requires 2 arguments', position, this.filePath);
        }
        const arr1 = this.evaluate(args[0]);
        const arr2 = this.evaluate(args[1]);
        if (arr1.type !== 'array' || arr2.type !== 'array') {
          throw createError('E400', 'concat() arguments must be arrays', position, this.filePath);
        }
        return makeArray([...arr1.elements, ...arr2.elements]);
      }

      case 'slice': {
        // slice(arr, start, end?) - returns new array
        if (args.length < 2) {
          throw createError('E400', 'slice() requires at least 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const start = toNumber(this.evaluate(args[1]));
        const end = args.length > 2 ? toNumber(this.evaluate(args[2])) : undefined;
        if (arr.type !== 'array') {
          throw createError('E400', 'slice() first argument must be an array', position, this.filePath);
        }
        return makeArray(arr.elements.slice(start, end));
      }

      case 'reverse': {
        // reverse(arr) - mutates array, returns array
        if (args.length !== 1) {
          throw createError('E400', 'reverse() requires 1 argument', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        if (arr.type !== 'array') {
          throw createError('E400', 'reverse() argument must be an array', position, this.filePath);
        }
        arr.elements.reverse();
        return arr;
      }

      // Higher-order array functions
      case 'map': {
        // map(arr, fn) - returns new array with fn applied to each element
        if (args.length !== 2) {
          throw createError('E400', 'map() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'map() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'map() second argument must be a function', position, this.filePath);
        }
        const result: RuntimeValue[] = [];
        for (let i = 0; i < arr.elements.length; i++) {
          const mapped = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          result.push(mapped);
        }
        return makeArray(result);
      }

      case 'filter': {
        // filter(arr, fn) - returns new array with elements where fn returns true
        if (args.length !== 2) {
          throw createError('E400', 'filter() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'filter() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'filter() second argument must be a function', position, this.filePath);
        }
        const result: RuntimeValue[] = [];
        for (let i = 0; i < arr.elements.length; i++) {
          const keep = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (isTruthy(keep)) {
            result.push(arr.elements[i]);
          }
        }
        return makeArray(result);
      }

      case 'reduce': {
        // reduce(arr, fn, init) - reduces array to single value
        if (args.length < 2 || args.length > 3) {
          throw createError('E400', 'reduce() requires 2-3 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'reduce() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'reduce() second argument must be a function', position, this.filePath);
        }
        let accumulator: RuntimeValue;
        let startIndex = 0;
        if (args.length === 3) {
          accumulator = this.evaluate(args[2]);
        } else {
          if (arr.elements.length === 0) {
            throw createError('E400', 'reduce() on empty array requires initial value', position, this.filePath);
          }
          accumulator = arr.elements[0];
          startIndex = 1;
        }
        for (let i = startIndex; i < arr.elements.length; i++) {
          accumulator = this.callFunctionValue(fn, [accumulator, arr.elements[i], makeInt(i)], position);
        }
        return accumulator;
      }

      case 'find': {
        // find(arr, fn) - returns first element where fn returns true, or null
        if (args.length !== 2) {
          throw createError('E400', 'find() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'find() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'find() second argument must be a function', position, this.filePath);
        }
        for (let i = 0; i < arr.elements.length; i++) {
          const result = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (isTruthy(result)) {
            return arr.elements[i];
          }
        }
        return makeNull();
      }

      case 'findIndex': {
        // findIndex(arr, fn) - returns index of first element where fn returns true, or -1
        if (args.length !== 2) {
          throw createError('E400', 'findIndex() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'findIndex() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'findIndex() second argument must be a function', position, this.filePath);
        }
        for (let i = 0; i < arr.elements.length; i++) {
          const result = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (isTruthy(result)) {
            return makeInt(i);
          }
        }
        return makeInt(-1);
      }

      case 'some': {
        // some(arr, fn) - returns true if fn returns true for any element
        if (args.length !== 2) {
          throw createError('E400', 'some() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'some() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'some() second argument must be a function', position, this.filePath);
        }
        for (let i = 0; i < arr.elements.length; i++) {
          const result = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (isTruthy(result)) {
            return makeBool(true);
          }
        }
        return makeBool(false);
      }

      case 'every': {
        // every(arr, fn) - returns true if fn returns true for all elements
        if (args.length !== 2) {
          throw createError('E400', 'every() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'every() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'every() second argument must be a function', position, this.filePath);
        }
        for (let i = 0; i < arr.elements.length; i++) {
          const result = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (!isTruthy(result)) {
            return makeBool(false);
          }
        }
        return makeBool(true);
      }

      case 'includes': {
        // includes(arr, val) - returns true if array contains value
        if (args.length !== 2) {
          throw createError('E400', 'includes() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const val = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'includes() first argument must be an array', position, this.filePath);
        }
        for (const elem of arr.elements) {
          if (this.valuesEqual(elem, val)) {
            return makeBool(true);
          }
        }
        return makeBool(false);
      }

      case 'flat': {
        // flat(arr, depth?) - flattens array to specified depth (default 1)
        if (args.length < 1 || args.length > 2) {
          throw createError('E400', 'flat() requires 1-2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const depth = args.length === 2 ? toNumber(this.evaluate(args[1])) : 1;
        if (arr.type !== 'array') {
          throw createError('E400', 'flat() first argument must be an array', position, this.filePath);
        }
        const flattenArray = (arr: RuntimeValue[], d: number): RuntimeValue[] => {
          const result: RuntimeValue[] = [];
          for (const elem of arr) {
            if (elem.type === 'array' && d > 0) {
              result.push(...flattenArray(elem.elements, d - 1));
            } else {
              result.push(elem);
            }
          }
          return result;
        };
        return makeArray(flattenArray(arr.elements, depth));
      }

      case 'flatMap': {
        // flatMap(arr, fn) - map then flatten by 1 level
        if (args.length !== 2) {
          throw createError('E400', 'flatMap() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'flatMap() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'flatMap() second argument must be a function', position, this.filePath);
        }
        const result: RuntimeValue[] = [];
        for (let i = 0; i < arr.elements.length; i++) {
          const mapped = this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
          if (mapped.type === 'array') {
            result.push(...mapped.elements);
          } else {
            result.push(mapped);
          }
        }
        return makeArray(result);
      }

      case 'forEach': {
        // forEach(arr, fn) - calls fn for each element, returns null
        if (args.length !== 2) {
          throw createError('E400', 'forEach() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const fn = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'forEach() first argument must be an array', position, this.filePath);
        }
        if (fn.type !== 'function') {
          throw createError('E400', 'forEach() second argument must be a function', position, this.filePath);
        }
        for (let i = 0; i < arr.elements.length; i++) {
          this.callFunctionValue(fn, [arr.elements[i], makeInt(i)], position);
        }
        return makeNull();
      }

      case 'sort': {
        // sort(arr, compareFn?) - sorts array in place, returns array
        if (args.length < 1 || args.length > 2) {
          throw createError('E400', 'sort() requires 1-2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        if (arr.type !== 'array') {
          throw createError('E400', 'sort() first argument must be an array', position, this.filePath);
        }
        if (args.length === 2) {
          const fn = this.evaluate(args[1]);
          if (fn.type !== 'function') {
            throw createError('E400', 'sort() second argument must be a function', position, this.filePath);
          }
          arr.elements.sort((a, b) => {
            const result = this.callFunctionValue(fn, [a, b], position);
            return toNumber(result);
          });
        } else {
          // Default sort by number value
          arr.elements.sort((a, b) => toNumber(a) - toNumber(b));
        }
        return arr;
      }

      // String manipulation functions
      case 'split': {
        // split(str, delimiter) - returns array of strings
        if (args.length !== 2) {
          throw createError('E400', 'split() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const delimiter = this.evaluate(args[1]);
        if (str.type !== 'string' || delimiter.type !== 'string') {
          throw createError('E400', 'split() arguments must be strings', position, this.filePath);
        }
        const parts = str.value.split(delimiter.value);
        return makeArray(parts.map(s => makeString(s)));
      }

      case 'join': {
        // join(arr, delimiter) - returns string
        if (args.length !== 2) {
          throw createError('E400', 'join() requires 2 arguments', position, this.filePath);
        }
        const arr = this.evaluate(args[0]);
        const delimiter = this.evaluate(args[1]);
        if (arr.type !== 'array') {
          throw createError('E400', 'join() first argument must be an array', position, this.filePath);
        }
        if (delimiter.type !== 'string') {
          throw createError('E400', 'join() second argument must be a string', position, this.filePath);
        }
        const strs = arr.elements.map(e => toString(e));
        return makeString(strs.join(delimiter.value));
      }

      case 'substr': {
        // substr(str, start, length?) - returns substring
        if (args.length < 2) {
          throw createError('E400', 'substr() requires at least 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const startIdx = Math.floor(toNumber(this.evaluate(args[1])));
        const length = args.length > 2 ? Math.floor(toNumber(this.evaluate(args[2]))) : undefined;
        if (str.type !== 'string') {
          throw createError('E400', 'substr() first argument must be a string', position, this.filePath);
        }
        // Handle negative start index (from end of string)
        const actualStart = startIdx < 0 ? Math.max(0, str.value.length + startIdx) : startIdx;
        if (length !== undefined) {
          return makeString(str.value.substring(actualStart, actualStart + length));
        }
        return makeString(str.value.substring(actualStart));
      }

      case 'indexOf': {
        // indexOf(str, search) - returns index or -1
        if (args.length !== 2) {
          throw createError('E400', 'indexOf() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const search = this.evaluate(args[1]);
        if (str.type !== 'string' || search.type !== 'string') {
          throw createError('E400', 'indexOf() arguments must be strings', position, this.filePath);
        }
        return makeInt(str.value.indexOf(search.value));
      }

      case 'replace': {
        // replace(str, search, replacement) - returns new string
        if (args.length !== 3) {
          throw createError('E400', 'replace() requires 3 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const search = this.evaluate(args[1]);
        const replacement = this.evaluate(args[2]);
        if (str.type !== 'string' || search.type !== 'string' || replacement.type !== 'string') {
          throw createError('E400', 'replace() arguments must be strings', position, this.filePath);
        }
        return makeString(str.value.replace(search.value, replacement.value));
      }

      case 'trim': {
        // trim(str) - returns trimmed string
        if (args.length !== 1) {
          throw createError('E400', 'trim() requires 1 argument', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        if (str.type !== 'string') {
          throw createError('E400', 'trim() argument must be a string', position, this.filePath);
        }
        return makeString(str.value.trim());
      }

      case 'upper': {
        // upper(str) - returns uppercase string
        if (args.length !== 1) {
          throw createError('E400', 'upper() requires 1 argument', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        if (str.type !== 'string') {
          throw createError('E400', 'upper() argument must be a string', position, this.filePath);
        }
        return makeString(str.value.toUpperCase());
      }

      case 'lower': {
        // lower(str) - returns lowercase string
        if (args.length !== 1) {
          throw createError('E400', 'lower() requires 1 argument', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        if (str.type !== 'string') {
          throw createError('E400', 'lower() argument must be a string', position, this.filePath);
        }
        return makeString(str.value.toLowerCase());
      }

      case 'startsWith': {
        // startsWith(str, prefix) - returns true if str starts with prefix
        if (args.length !== 2) {
          throw createError('E400', 'startsWith() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const prefix = this.evaluate(args[1]);
        if (str.type !== 'string' || prefix.type !== 'string') {
          throw createError('E400', 'startsWith() arguments must be strings', position, this.filePath);
        }
        return makeBool(str.value.startsWith(prefix.value));
      }

      case 'endsWith': {
        // endsWith(str, suffix) - returns true if str ends with suffix
        if (args.length !== 2) {
          throw createError('E400', 'endsWith() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const suffix = this.evaluate(args[1]);
        if (str.type !== 'string' || suffix.type !== 'string') {
          throw createError('E400', 'endsWith() arguments must be strings', position, this.filePath);
        }
        return makeBool(str.value.endsWith(suffix.value));
      }

      case 'contains': {
        // contains(str, substr) - returns true if str contains substr
        if (args.length !== 2) {
          throw createError('E400', 'contains() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const substr = this.evaluate(args[1]);
        if (str.type !== 'string' || substr.type !== 'string') {
          throw createError('E400', 'contains() arguments must be strings', position, this.filePath);
        }
        return makeBool(str.value.includes(substr.value));
      }

      case 'repeat': {
        // repeat(str, count) - returns str repeated count times
        if (args.length !== 2) {
          throw createError('E400', 'repeat() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const count = this.evaluate(args[1]);
        if (str.type !== 'string') {
          throw createError('E400', 'repeat() first argument must be a string', position, this.filePath);
        }
        if (count.type !== 'int' && count.type !== 'float') {
          throw createError('E400', 'repeat() second argument must be a number', position, this.filePath);
        }
        const repeatCount = Math.floor(toNumber(count));
        if (repeatCount < 0) {
          throw createError('E400', 'repeat() count cannot be negative', position, this.filePath);
        }
        // Limit repeat count to prevent memory exhaustion (max 1MB result)
        const maxRepeat = Math.floor(1_000_000 / Math.max(1, str.value.length));
        if (repeatCount > maxRepeat) {
          throw createError('E400', `repeat() count ${repeatCount} would exceed memory limit`, position, this.filePath);
        }
        return makeString(str.value.repeat(repeatCount));
      }

      case 'charAt': {
        // charAt(str, index) - returns character at index
        if (args.length !== 2) {
          throw createError('E400', 'charAt() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const index = this.evaluate(args[1]);
        if (str.type !== 'string') {
          throw createError('E400', 'charAt() first argument must be a string', position, this.filePath);
        }
        const idx = Math.floor(toNumber(index));
        if (idx < 0 || idx >= str.value.length) {
          return makeString('');
        }
        return makeString(str.value.charAt(idx));
      }

      case 'charCodeAt': {
        // charCodeAt(str, index) - returns char code at index
        if (args.length !== 2) {
          throw createError('E400', 'charCodeAt() requires 2 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const index = this.evaluate(args[1]);
        if (str.type !== 'string') {
          throw createError('E400', 'charCodeAt() first argument must be a string', position, this.filePath);
        }
        const idx = Math.floor(toNumber(index));
        const code = str.value.charCodeAt(idx);
        return makeInt(isNaN(code) ? -1 : code);
      }

      case 'fromCharCode': {
        // fromCharCode(code) - returns string from char code
        if (args.length !== 1) {
          throw createError('E400', 'fromCharCode() requires 1 argument', position, this.filePath);
        }
        const code = this.evaluate(args[0]);
        return makeString(String.fromCharCode(Math.floor(toNumber(code))));
      }

      case 'padStart': {
        // padStart(str, length, padStr?) - pads start of string
        if (args.length < 2 || args.length > 3) {
          throw createError('E400', 'padStart() requires 2-3 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const length = this.evaluate(args[1]);
        const padStr = args.length === 3 ? this.evaluate(args[2]) : makeString(' ');
        if (str.type !== 'string') {
          throw createError('E400', 'padStart() first argument must be a string', position, this.filePath);
        }
        if (padStr.type !== 'string') {
          throw createError('E400', 'padStart() third argument must be a string', position, this.filePath);
        }
        return makeString(str.value.padStart(Math.floor(toNumber(length)), padStr.value));
      }

      case 'padEnd': {
        // padEnd(str, length, padStr?) - pads end of string
        if (args.length < 2 || args.length > 3) {
          throw createError('E400', 'padEnd() requires 2-3 arguments', position, this.filePath);
        }
        const str = this.evaluate(args[0]);
        const length = this.evaluate(args[1]);
        const padStr = args.length === 3 ? this.evaluate(args[2]) : makeString(' ');
        if (str.type !== 'string') {
          throw createError('E400', 'padEnd() first argument must be a string', position, this.filePath);
        }
        if (padStr.type !== 'string') {
          throw createError('E400', 'padEnd() third argument must be a string', position, this.filePath);
        }
        return makeString(str.value.padEnd(Math.floor(toNumber(length)), padStr.value));
      }

      // Type conversion functions
      case 'int': {
        // int(value) - convert to integer
        if (args.length !== 1) {
          throw createError('E400', 'int() requires 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        if (val.type === 'int') return val;
        if (val.type === 'float') return makeInt(Math.floor(val.value));
        if (val.type === 'string') {
          const parsed = parseInt(val.value, 10);
          if (isNaN(parsed)) {
            throw createError('E400', `Cannot convert "${val.value}" to int`, position, this.filePath);
          }
          return makeInt(parsed);
        }
        if (val.type === 'bool') return makeInt(val.value ? 1 : 0);
        throw createError('E400', `Cannot convert ${val.type} to int`, position, this.filePath);
      }

      case 'float': {
        // float(value) - convert to float
        if (args.length !== 1) {
          throw createError('E400', 'float() requires 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        if (val.type === 'float') return val;
        if (val.type === 'int') return makeFloat(val.value);
        if (val.type === 'string') {
          const parsed = parseFloat(val.value);
          if (isNaN(parsed)) {
            throw createError('E400', `Cannot convert "${val.value}" to float`, position, this.filePath);
          }
          return makeFloat(parsed);
        }
        if (val.type === 'bool') return makeFloat(val.value ? 1.0 : 0.0);
        throw createError('E400', `Cannot convert ${val.type} to float`, position, this.filePath);
      }

      case 'string': {
        // string(value) - convert to string
        if (args.length !== 1) {
          throw createError('E400', 'string() requires 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        return makeString(toString(val));
      }

      case 'bool': {
        // bool(value) - convert to boolean
        if (args.length !== 1) {
          throw createError('E400', 'bool() requires 1 argument', position, this.filePath);
        }
        const val = this.evaluate(args[0]);
        return makeBool(isTruthy(val));
      }

      case 'range': {
        // range(end) or range(start, end) or range(start, end, step) - returns array
        if (args.length < 1 || args.length > 3) {
          throw createError('E400', 'range() requires 1-3 arguments', position, this.filePath);
        }
        let start = 0;
        let end: number;
        let step = 1;
        if (args.length === 1) {
          end = toNumber(this.evaluate(args[0]));
        } else {
          start = toNumber(this.evaluate(args[0]));
          end = toNumber(this.evaluate(args[1]));
          if (args.length === 3) {
            step = toNumber(this.evaluate(args[2]));
          }
        }
        if (step === 0) {
          throw createError('E400', 'range() step cannot be 0', position, this.filePath);
        }
        // Check iteration limit to prevent memory exhaustion
        const maxRangeSize = 1000000; // 1 million elements max
        const expectedSize = Math.abs(Math.ceil((end - start) / step));
        if (expectedSize > maxRangeSize) {
          throw createError('E401', `range() would create ${expectedSize} elements, exceeding limit of ${maxRangeSize}`, position, this.filePath);
        }
        const result: RuntimeValue[] = [];
        if (step > 0) {
          for (let i = start; i < end; i += step) {
            result.push(makeInt(i));
          }
        } else {
          for (let i = start; i > end; i += step) {
            result.push(makeInt(i));
          }
        }
        return makeArray(result);
      }

      // Core builtins (from builtins/core.ts)
      case 'title':
        return coreBuiltins.builtinTitle.call(this, args, position);
      case 'ppq':
        return coreBuiltins.builtinPpq.call(this, args, position);
      case 'tempo':
        return coreBuiltins.builtinTempo.call(this, args, position);
      case 'timeSig':
        return coreBuiltins.builtinTimeSig.call(this, args, position);
      case 'at':
        return coreBuiltins.builtinAt.call(this, args, position);
      case 'atTick':
        return coreBuiltins.builtinAtTick.call(this, args, position);
      case 'advance':
        return coreBuiltins.builtinAdvance.call(this, args, position);
      case 'advanceTick':
        return coreBuiltins.builtinAdvanceTick.call(this, args, position);
      case 'note':
        return coreBuiltins.builtinNote.call(this, args, position);
      case 'rest':
        return coreBuiltins.builtinRest.call(this, args, position);
      case 'chord':
        return coreBuiltins.builtinChord.call(this, args, position);
      case 'drum':
        return coreBuiltins.builtinDrum.call(this, args, position, args);
      // MIDI builtins (from builtins/midi.ts)
      case 'cc':
        return midiBuiltins.builtinCC.call(this, args, position);
      case 'expression':
        return midiBuiltins.builtinExpression.call(this, args, position);
      case 'modulation':
        return midiBuiltins.builtinModulation.call(this, args, position);
      case 'pan':
        return midiBuiltins.builtinPan.call(this, args, position);
      case 'volume':
        return midiBuiltins.builtinVolume.call(this, args, position);
      case 'sustain':
        return midiBuiltins.builtinSustain.call(this, args, position);
      case 'pitchBend':
        return midiBuiltins.builtinPitchBend.call(this, args, position);
      // Tempo curve
      case 'tempoCurve':
        return midiBuiltins.builtinTempoCurve.call(this, args, position);
      // Articulation note variants
      case 'staccato':
        return this.builtinArticulatedNote(args, position, 'staccato');
      case 'legato':
        return this.builtinArticulatedNote(args, position, 'legato');
      case 'accent':
        return this.builtinArticulatedNote(args, position, 'accent');
      case 'tenuto':
        return this.builtinArticulatedNote(args, position, 'tenuto');
      case 'marcato':
        return this.builtinArticulatedNote(args, position, 'marcato');
      // Automation curves
      case 'ccCurve':
        return this.builtinCCCurve(args, position);
      case 'expressionCurve':
        return this.builtinExpressionCurve(args, position);
      case 'pitchBendCurve':
        return this.builtinPitchBendCurve(args, position);
      // Timing expressions
      case 'swing':
        return this.builtinSwing(args, position);
      case 'humanize':
        return this.builtinHumanize(args, position);
      // Ornaments
      case 'trill':
        return this.builtinTrill(args, position);
      case 'mordent':
        return this.builtinMordent(args, position);
      case 'arpeggio':
        return this.builtinArpeggio(args, position);
      case 'glissando':
        return this.builtinGlissando(args, position);
      case 'tremolo':
        return this.builtinTremolo(args, position);
      // Music theory helpers
      case 'scaleChord':
        return this.builtinScaleChord(args, position);
      case 'chordNotes':
        return this.builtinChordNotes(args, position);
      // Vocaloid parameters
      case 'pit':
        return this.builtinVocaloidParam(args, position, 'PIT');
      case 'dyn':
        return this.builtinVocaloidParam(args, position, 'DYN');
      case 'bre':
        return this.builtinVocaloidParam(args, position, 'BRE');
      case 'bri':
        return this.builtinVocaloidParam(args, position, 'BRI');
      case 'cle':
        return this.builtinVocaloidParam(args, position, 'CLE');
      case 'gen':
        return this.builtinVocaloidParam(args, position, 'GEN');
      case 'ope':
        return this.builtinVocaloidParam(args, position, 'OPE');
      case 'pitCurve':
        return this.builtinVocaloidCurve(args, position, 'PIT');
      case 'dynCurve':
        return this.builtinVocaloidCurve(args, position, 'DYN');
      case 'breCurve':
        return this.builtinVocaloidCurve(args, position, 'BRE');
      case 'vibrato':
        return this.builtinVibrato(args, position);
      // Notation functions
      case 'dynamic':
        return this.builtinDynamic(args, position);
      case 'slurStart':
        return this.builtinSlurStart(args, position);
      case 'slurEnd':
        return this.builtinSlurEnd(args, position);
      case 'crescendo':
        return this.builtinCrescendo(args, position);
      case 'decrescendo':
        return this.builtinDecrescendo(args, position);
      case 'tie':
        return this.builtinTie(args, position);
      // Advanced MIDI functions (from builtins/midi.ts)
      case 'aftertouch':
        return midiBuiltins.builtinAftertouch.call(this, args, position);
      case 'polyAftertouch':
        return midiBuiltins.builtinPolyAftertouch.call(this, args, position);
      case 'nrpn':
        return midiBuiltins.builtinNRPN.call(this, args, position);
      case 'rpn':
        return midiBuiltins.builtinRPN.call(this, args, position);
      case 'sysex':
        return midiBuiltins.builtinSysEx.call(this, args, position);
      // Extended notation functions
      case 'tuplet':
        return this.builtinTuplet(args, position);
      case 'tupletEnd':
        return this.builtinTupletEnd(args, position);
      case 'triplet':
        return this.builtinTriplet(args, position);
      case 'grace':
        return this.builtinGrace(args, position);
      case 'acciaccatura':
        return this.builtinAcciaccatura(args, position);
      case 'appoggiatura':
        return this.builtinAppoggiatura(args, position);
      case 'fermata':
        return this.builtinFermata(args, position);
      case 'repeatStart':
        return this.builtinRepeatStart(args, position);
      case 'repeatEnd':
        return this.builtinRepeatEnd(args, position);
      case 'dc':
        return this.builtinDC(args, position);
      case 'ds':
        return this.builtinDS(args, position);
      case 'fine':
        return this.builtinFine(args, position);
      case 'coda':
        return this.builtinCoda(args, position);
      case 'segno':
        return this.builtinSegno(args, position);
      case 'toCoda':
        return this.builtinToCoda(args, position);
      case 'ottava':
        return this.builtinOttava(args, position);
      case 'ottavaEnd':
        return this.builtinOttavaEnd(args, position);
      case 'voice':
        return this.builtinVoice(args, position);
      // Vocaloid extended functions
      case 'portamento':
        return this.builtinPortamento(args, position);
      case 'growl':
        return this.builtinGrowl(args, position);
      case 'xsynth':
        return this.builtinXSynth(args, position);
      // Extended notation functions
      case 'grandStaff':
        return this.builtinGrandStaff(args, position);
      case 'tablature':
        return this.builtinTablature(args, position);
      case 'tabNote':
        return this.builtinTabNote(args, position);
      case 'chordSymbol':
        return this.builtinChordSymbol(args, position);
      case 'figuredBass':
        return this.builtinFiguredBass(args, position);
      // Markers and patterns
      case 'marker':
        return this.builtinMarker(args, position);
      case 'cuePoint':
        return this.builtinCuePoint(args, position);
      case 'pattern':
        return this.builtinPattern(args, position);
      case 'usePattern':
        return this.builtinUsePattern(args, position);
      // Audio functions
      case 'audioClip':
        return audioBuiltins.builtinAudioClip.call(this, args, position);
      case 'effect':
        return this.builtinEffect(args, position);
      case 'reverb':
        return effectsBuiltins.builtinReverb.call(this, args, position);
      case 'delay':
        return effectsBuiltins.builtinDelay.call(this, args, position);
      case 'eq':
        return effectsBuiltins.builtinEQ.call(this, args, position);
      case 'compressor':
        return effectsBuiltins.builtinCompressor.call(this, args, position);

      // Microtonality & Tuning
      case 'tuning':
        return tuningBuiltins.builtinTuning.call(this, args, position);
      case 'cents':
        return tuningBuiltins.builtinCents.call(this, args, position);
      case 'quarterTone':
        return tuningBuiltins.builtinQuarterTone.call(this, args, position);
      case 'pitchCorrection':
        return tuningBuiltins.builtinPitchCorrection.call(this, args, position);

      // Algorithmic Composition
      case 'euclidean':
        return algorithmicBuiltins.builtinEuclidean.call(this, args, position);
      case 'probability':
        return algorithmicBuiltins.builtinProbability.call(this, args, position);
      case 'markov':
        return algorithmicBuiltins.builtinMarkov.call(this, args, position);
      case 'randomSeed':
        return algorithmicBuiltins.builtinRandomSeed.call(this, args, position);
      case 'randomNote':
        return algorithmicBuiltins.builtinRandomNote.call(this, args, position);
      case 'randomRhythm':
        return algorithmicBuiltins.builtinRandomRhythm.call(this, args, position);
      case 'constraint':
        return algorithmicBuiltins.builtinConstraint.call(this, args, position);
      case 'cellular':
        return algorithmicBuiltins.builtinCellular.call(this, args, position);
      case 'lsystem':
        return algorithmicBuiltins.builtinLSystem.call(this, args, position);

      // Advanced Notation - Lyrics
      case 'verse':
        return this.builtinVerse(args, position);
      case 'ossia':
        return this.builtinOssia(args, position);
      case 'cueNote':
        return this.builtinCueNote(args, position);
      case 'instrumentChange':
        return this.builtinInstrumentChange(args, position);

      // Percussion notation
      case 'notehead':
        return this.builtinNotehead(args, position);

      // String techniques
      case 'bowUp':
      case 'bowDown':
      case 'pizz':
      case 'arco':
      case 'colLegno':
      case 'sulPont':
      case 'sulTasto':
      case 'snapPizz':
      case 'harmonics':
        return this.builtinStringTechnique(callee, args, position);

      // Wind techniques
      case 'breath':
      case 'mute':
      case 'open':
      case 'stopped':
      case 'flutter':
      case 'doubleTongue':
      case 'tripleTongue':
        return this.builtinWindTechnique(callee, args, position);

      // Guitar techniques
      case 'bend':
        return this.builtinGuitarBend(args, position);
      case 'hammerOn':
      case 'pullOff':
      case 'slide':
      case 'tap':
      case 'naturalHarmonic':
      case 'artificialHarmonic':
      case 'palmMute':
      case 'letRing':
        return this.builtinGuitarTechnique(callee, args, position);

      // Harp
      case 'harpPedal':
        return this.builtinHarpPedal(args, position);

      // Additional Effects
      case 'phaser':
        return effectsBuiltins.builtinPhaser.call(this, args, position);
      case 'flanger':
        return effectsBuiltins.builtinFlanger.call(this, args, position);
      case 'chorus':
        return effectsBuiltins.builtinChorus.call(this, args, position);
      case 'distortion':
        return effectsBuiltins.builtinDistortion.call(this, args, position);
      case 'filter':
        return effectsBuiltins.builtinFilter.call(this, args, position);
      case 'sidechain':
        return effectsBuiltins.builtinSidechain.call(this, args, position);

      // Live Performance
      case 'midiMap':
        return liveBuiltins.builtinMidiMap.call(this, args, position);
      case 'scene':
        return liveBuiltins.builtinScene.call(this, args, position);
      case 'launchScene':
        return liveBuiltins.builtinLaunchScene.call(this, args, position);
      case 'liveLoop':
        return liveBuiltins.builtinLiveLoop.call(this, args, position);

      // Score Layout
      case 'pageBreak':
        return layoutBuiltins.builtinPageBreak.call(this, args, position);
      case 'systemBreak':
        return layoutBuiltins.builtinSystemBreak.call(this, args, position);
      case 'staffSpacing':
        return layoutBuiltins.builtinStaffSpacing.call(this, args, position);
      case 'text':
        return layoutBuiltins.builtinText.call(this, args, position);
      case 'rehearsalMark':
        return layoutBuiltins.builtinRehearsalMark.call(this, args, position);
      case 'direction':
        return layoutBuiltins.builtinDirection.call(this, args, position);

      // Audio manipulation
      case 'timeStretch':
        return audioBuiltins.builtinTimeStretch.call(this, args, position);
      case 'pitchShift':
        return audioBuiltins.builtinPitchShift.call(this, args, position);
      case 'sampleSlicer':
        return audioBuiltins.builtinSampleSlicer.call(this, args, position);
      case 'granular':
        return audioBuiltins.builtinGranular.call(this, args, position);

      // Advanced automation
      case 'automationLane':
        return audioBuiltins.builtinAutomationLane.call(this, args, position);
      case 'automationPoint':
        return audioBuiltins.builtinAutomationPoint.call(this, args, position);
      case 'lfo':
        return this.builtinLFO(args, position);
      case 'envelopeFollower':
        return this.builtinEnvelopeFollower(args, position);
      case 'modMatrix':
        return this.builtinModMatrix(args, position);

      // Mixing/Mastering
      case 'bus':
        return mixingBuiltins.builtinBus.call(this, args, position);
      case 'send':
        return mixingBuiltins.builtinSend.call(this, args, position);
      case 'stereoWidth':
        return mixingBuiltins.builtinStereoWidth.call(this, args, position);
      case 'limiter':
        return effectsBuiltins.builtinLimiter.call(this, args, position);
      case 'maximizer':
        return effectsBuiltins.builtinMaximizer.call(this, args, position);
      case 'multibandComp':
        return this.builtinMultibandComp(args, position);
      case 'spatial':
        return this.builtinSpatial(args, position);
      case 'surroundPan':
        return this.builtinSurroundPan(args, position);

      // MIDI extensions
      case 'mpe':
        return this.builtinMPE(args, position);
      case 'mpeNote':
        return this.builtinMPENote(args, position);
      case 'arpeggiator':
        return this.builtinArpeggiator(args, position);
      case 'chordMemory':
        return this.builtinChordMemory(args, position);
      case 'chordTrigger':
        return this.builtinChordTrigger(args, position);

      // Advanced notation
      case 'additiveTimeSig':
        return this.builtinAdditiveTimeSig(args, position);
      case 'polymetric':
        return this.builtinPolymetric(args, position);
      case 'proportional':
        return this.builtinProportional(args, position);
      case 'graphic':
        return this.builtinGraphic(args, position);
      case 'aleatoric':
        return this.builtinAleatoric(args, position);
      case 'cutaway':
        return this.builtinCutaway(args, position);
      case 'transposing':
        return this.builtinTransposing(args, position);

      // Sampling
      case 'sampler':
        return this.builtinSampler(args, position);
      case 'sampleZone':
        return this.builtinSampleZone(args, position);
      case 'roundRobin':
        return this.builtinRoundRobin(args, position);
      case 'velocityLayer':
        return this.builtinVelocityLayer(args, position);
      case 'keySwitch':
        return this.builtinKeySwitch(args, position);

      // Analysis
      case 'spectrumAnalyzer':
        return this.builtinSpectrumAnalyzer(args, position);
      case 'loudnessMeter':
        return this.builtinLoudnessMeter(args, position);
      case 'phaseMeter':
        return this.builtinPhaseMeter(args, position);
      case 'analyzerSnapshot':
        return this.builtinAnalyzerSnapshot(args, position);

      // Advanced audio processing
      case 'vocoder':
        return this.builtinVocoder(args, position);
      case 'convolutionReverb':
        return this.builtinConvolutionReverb(args, position);
      case 'ampSim':
        return this.builtinAmpSim(args, position);
      case 'cabinetSim':
        return this.builtinCabinetSim(args, position);
      case 'tapeSaturation':
        return this.builtinTapeSaturation(args, position);
      case 'transientShaper':
        return this.builtinTransientShaper(args, position);
      case 'deEsser':
        return this.builtinDeEsser(args, position);
      case 'exciter':
        return this.builtinExciter(args, position);
      case 'noiseReduction':
        return this.builtinNoiseReduction(args, position);
      case 'spectralEdit':
        return this.builtinSpectralEdit(args, position);

      // Sequencing extensions
      case 'stepSequencer':
        return this.builtinStepSequencer(args, position);
      case 'step':
        return this.builtinStep(args, position);
      case 'followAction':
        return this.builtinFollowAction(args, position);
      case 'scaleLock':
        return this.builtinScaleLock(args, position);
      case 'chordLock':
        return this.builtinChordLock(args, position);
      case 'divisi':
        return this.builtinDivisi(args, position);
      case 'expressionMap':
        return this.builtinExpressionMap(args, position);
      case 'articulation':
        return this.builtinArticulationMapping(args, position);

      // Sync & communication
      case 'osc':
        return this.builtinOSC(args, position);
      case 'oscMap':
        return this.builtinOSCMap(args, position);
      case 'networkMidi':
        return this.builtinNetworkMIDI(args, position);
      case 'midiClock':
        return this.builtinMIDIClock(args, position);
      case 'timecode':
        return this.builtinTimecode(args, position);

      // Mastering
      case 'dithering':
        return this.builtinDithering(args, position);
      case 'loudnessMatch':
        return this.builtinLoudnessMatch(args, position);
      case 'referenceTrack':
        return this.builtinReferenceTrack(args, position);

      // Metadata
      case 'id3':
        return this.builtinID3(args, position);
      case 'isrc':
        return this.builtinISRC(args, position);
      case 'songStructure':
        return this.builtinSongStructure(args, position);

      // Audio editing & restoration
      case 'freeze':
        return this.builtinFreeze(args, position);
      case 'audioWarp':
        return this.builtinAudioWarp(args, position);
      case 'warpMarker':
        return this.builtinWarpMarker(args, position);
      case 'beatSlice':
        return this.builtinBeatSlice(args, position);
      case 'spectralRepair':
        return this.builtinSpectralRepair(args, position);
      case 'audioRestore':
        return this.builtinAudioRestore(args, position);
      case 'vocalAlign':
        return this.builtinVocalAlign(args, position);

      // Dynamics processing
      case 'midSide':
        return this.builtinMidSide(args, position);
      case 'dynamicEQ':
        return this.builtinDynamicEQ(args, position);
      case 'dynamicEQBand':
        return this.builtinDynamicEQBand(args, position);
      case 'linearPhaseEQ':
        return this.builtinLinearPhaseEQ(args, position);
      case 'eqBand':
        return this.builtinEQBand(args, position);
      case 'parallel':
        return this.builtinParallel(args, position);

      // Recording
      case 'takeLane':
        return this.builtinTakeLane(args, position);
      case 'take':
        return this.builtinTake(args, position);
      case 'comp':
        return this.builtinComp(args, position);
      case 'punchIn':
        return this.builtinPunchIn(args, position);
      case 'punchOut':
        return this.builtinPunchOut(args, position);
      case 'loopRecord':
        return this.builtinLoopRecord(args, position);
      case 'automationRecord':
        return this.builtinAutomationRecord(args, position);

      // Groove & humanize
      case 'groove':
        return this.builtinGroove(args, position);
      case 'applyGroove':
        return this.builtinApplyGroove(args, position);
      case 'humanizeRegion':
        return this.builtinHumanizeRegion(args, position);
      case 'randomize':
        return this.builtinRandomize(args, position);

      // Controller & macro
      case 'midiLearn':
        return this.builtinMIDILearn(args, position);
      case 'macro':
        return this.builtinMacro(args, position);
      case 'macroMap':
        return this.builtinMacroMap(args, position);

      // Export & batch
      case 'stemExport':
        return this.builtinStemExport(args, position);
      case 'batch':
        return this.builtinBatch(args, position);
      case 'batchOp':
        return this.builtinBatchOp(args, position);
      case 'exportPreset':
        return this.builtinExportPreset(args, position);

      // Atmos/spatial
      case 'atmosObject':
        return this.builtinAtmosObject(args, position);
      case 'atmosMove':
        return this.builtinAtmosMove(args, position);
      case 'headphoneVirtual':
        return this.builtinHeadphoneVirtual(args, position);
      case 'surroundAuto':
        return this.builtinSurroundAuto(args, position);

      // Collaboration
      case 'note':
        return this.builtinProjectNote(args, position);
      case 'collaborator':
        return this.builtinCollaborator(args, position);

      // Advanced vocal control
      case 'phoneme':
        return this.builtinPhoneme(args, position);
      case 'consonantOffset':
        return this.builtinConsonantOffset(args, position);
      case 'breath':
        return this.builtinBreath(args, position);
      case 'autoBreath':
        return this.builtinAutoBreath(args, position);
      case 'portamentoShape':
        return this.builtinPortamentoShape(args, position);

      // Cross-staff notation
      case 'crossStaff':
        return this.builtinCrossStaff(args, position);

      // New notation features
      case 'clef':
        return this.builtinClef(args, position);
      case 'key':
        return this.builtinKey(args, position);
      case 'fingering':
        return this.builtinFingering(args, position);
      case 'articulations':
        return this.builtinStackedArticulations(args, position);
      case 'multiRest':
        return this.builtinMultiRest(args, position);
      case 'slashNotation':
        return this.builtinSlashNotation(args, position);
      case 'barline':
        return this.builtinBarline(args, position);
      case 'tempoText':
        return this.builtinTempoText(args, position);
      case 'hideEmptyStaves':
        return this.builtinHideEmptyStaves(args, position);

      // Advanced vocal features
      case 'vocalStyle':
        return this.builtinVocalStyle(args, position);
      case 'noteEnvelope':
        return this.builtinNoteEnvelope(args, position);
      case 'tension':
        return this.builtinVocalTension(args, position);
      case 'melisma':
        return this.builtinMelisma(args, position);

      // Ornaments
      case 'trill':
        return this.builtinTrill(args, position);
      case 'mordent':
        return this.builtinMordent(args, position);
      case 'turn':
        return this.builtinTurn(args, position);
      case 'arpeggio':
        return this.builtinArpeggio(args, position);
      case 'glissando':
        return this.builtinGlissando(args, position);
      case 'tremolo':
        return this.builtinTremolo(args, position);
      case 'harmonic':
        return this.builtinHarmonic(args, position);

      // Piano pedals
      case 'pedal':
        return this.builtinPedal(args, position);

      // Rhythm/timing
      case 'swing':
        return this.builtinSwing(args, position);
      case 'probability':
        return this.builtinProbability(args, position);
      case 'featheredBeam':
        return this.builtinFeatheredBeam(args, position);

      // Modern notation
      case 'quarterTone':
        return this.builtinQuarterTone(args, position);
      case 'cluster':
        return this.builtinCluster(args, position);
      case 'sprechstimme':
        return this.builtinSprechstimme(args, position);
      case 'notehead':
        return this.builtinNotehead(args, position);

      // Score display
      case 'bracketGroup':
        return this.builtinBracketGroup(args, position);
      case 'cueStaff':
        return this.builtinCueStaff(args, position);
      case 'noteColor':
        return this.builtinNoteColor(args, position);
      // Fourth batch: Score structure
      case 'volta':
        return this.builtinVolta(args, position);
      case 'cadenza':
        return this.builtinCadenza(args, position);
      case 'divisiMark':
        return this.builtinDivisiMark(args, position);
      case 'metricMod':
        return this.builtinMetricMod(args, position);
      case 'conductorCue':
        return this.builtinConductorCue(args, position);
      case 'editorial':
        return this.builtinEditorial(args, position);
      // Fourth batch: Instrument techniques
      case 'brassMute':
        return this.builtinBrassMute(args, position);
      case 'stringPosition':
        return this.builtinStringPosition(args, position);
      case 'multiphonic':
        return this.builtinMultiphonic(args, position);
      case 'electronicsCue':
        return this.builtinElectronicsCue(args, position);
      // Fourth batch: Guitar techniques
      case 'bendCurve':
        return this.builtinBendCurve(args, position);
      case 'slide':
        return this.builtinSlide(args, position);
      case 'tap':
        return this.builtinTap(args, position);
      // Fourth batch: DAW features
      case 'section':
        return this.builtinSection(args, position);
      case 'chordTrack':
        return this.builtinChordTrack(args, position);
      case 'stepInput':
        return this.builtinStepInput(args, position);
      // Fourth batch: Collaboration
      case 'measureComment':
        return this.builtinMeasureComment(args, position);
      case 'checkpoint':
        return this.builtinCheckpoint(args, position);
      // Fifth batch: Notation/diagrams
      case 'chordDiagram':
        return this.builtinChordDiagram(args, position);
      case 'scaleDiagram':
        return this.builtinScaleDiagram(args, position);
      case 'harpPedalDiagram':
        return this.builtinHarpPedalDiagram(args, position);
      case 'partExtraction':
        return this.builtinPartExtraction(args, position);
      case 'transpositionDisplay':
        return this.builtinTranspositionDisplay(args, position);
      case 'measureNumbers':
        return this.builtinMeasureNumbers(args, position);
      // Fifth batch: Synthesis
      case 'wavetable':
        return this.builtinWavetable(args, position);
      case 'fmSynth':
        return this.builtinFMSynth(args, position);
      case 'additiveSynth':
        return this.builtinAdditiveSynth(args, position);
      case 'subtractiveSynth':
        return this.builtinSubtractiveSynth(args, position);
      case 'physicalModel':
        return this.builtinPhysicalModel(args, position);
      // Fifth batch: Audio processing
      case 'vocoder':
        return this.builtinVocoder(args, position);
      case 'pitchCorrection':
        return this.builtinPitchCorrection(args, position);
      case 'formantShift':
        return this.builtinFormantShift(args, position);
      case 'convolutionReverb':
        return this.builtinConvolutionReverb(args, position);
      case 'ampSim':
        return this.builtinAmpSim(args, position);
      case 'cabinetSim':
        return this.builtinCabinetSim(args, position);
      // Fifth batch: Video
      case 'videoSync':
        return this.builtinVideoSync(args, position);
      case 'hitPoint':
        return this.builtinHitPoint(args, position);
      case 'timecodeDisplay':
        return this.builtinTimecodeDisplay(args, position);
      // Fifth batch: Workflow
      case 'projectTemplate':
        return this.builtinProjectTemplate(args, position);
      case 'trackFolder':
        return this.builtinTrackFolder(args, position);
      case 'collaboratorSession':
        return this.builtinCollaboratorSession(args, position);
      case 'versionDiff':
        return this.builtinVersionDiff(args, position);
      }

      // User-defined proc
      const proc = this.scope.lookupProc(callee);
      if (proc) {
        // Track recursion depth (relaxed from 100 to 1000)
        const currentDepth = this.callStack.get(callee) || 0;
        if (currentDepth >= 1000) {
          throw new MFError('E310', `Maximum recursion depth (1000) exceeded in '${callee}'`, position, this.filePath);
        }

        this.callStack.set(callee, currentDepth + 1);

        // Create scope with parameters
        const childScope = this.scope.createChild();
        const evalArgs = expandArgs();
        for (let i = 0; i < proc.params.length; i++) {
          const param = proc.params[i];
          if (param.rest) {
            // Rest parameter collects remaining args
            childScope.defineConst(param.name, makeArray(evalArgs.slice(i)));
            break;
          }
          const value = i < evalArgs.length ? evalArgs[i] : makeNull();
          childScope.defineConst(param.name, value);
        }

        const oldScope = this.scope;
        this.scope = childScope;

        let returnValue: RuntimeValue = makeNull();
        try {
          this.executeStatements(proc.body);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            returnValue = e.value;
          } else {
            throw e;
          }
        }

        this.scope = oldScope;
        this.callStack.set(callee, currentDepth);
        if (currentDepth === 0) {
          this.callStack.delete(callee);
        }

        return returnValue;
      }

      throw createError('E400', `Undefined function '${callee}'`, position, this.filePath);
    }

    // callee is not an Identifier - evaluate as expression (first-class function)
    const fnValue = this.evaluate(calleeExpr);
    if (fnValue.type !== 'function') {
      throw createError('E400', `Expression is not callable (got ${fnValue.type})`, position, this.filePath);
    }
    return this.callFunctionValue(fnValue, expandArgs(), position);
  }

  // Call a FunctionValue (arrow function or first-class function)
  private callFunctionValue(
    fn: FunctionValue,
    evalArgs: RuntimeValue[],
    position: { line: number; column: number; offset: number }
  ): RuntimeValue {
    // Check recursion depth to prevent stack overflow
    this.callDepth++;
    if (this.callDepth > Interpreter.MAX_CALL_DEPTH) {
      this.callDepth--;
      throw createError('E401', `Maximum call depth exceeded (${Interpreter.MAX_CALL_DEPTH})`, position, this.filePath);
    }

    // Create new scope chained to closure scope (not current scope!)
    const callScope = fn.closure.createChild();

    // Bind parameters (with default value support)
    // We need to evaluate defaults in the call scope so they can reference earlier params
    const oldScope = this.scope;
    this.scope = callScope;

    for (let i = 0; i < fn.params.length; i++) {
      const param = fn.params[i];
      if (param.rest) {
        // Rest parameter collects remaining args
        callScope.defineConst(param.name, makeArray(evalArgs.slice(i)));
        break;
      }
      let value: RuntimeValue;
      if (i < evalArgs.length) {
        value = evalArgs[i];
      } else if (param.defaultValue) {
        // Evaluate default value in call scope (can reference earlier params)
        value = this.evaluate(param.defaultValue);
      } else {
        value = makeNull();
      }
      callScope.defineConst(param.name, value);
    }

    // Scope is already set to callScope for default value evaluation
    // Keep it that way for body execution

    let result: RuntimeValue = makeNull();
    try {
      if (Array.isArray(fn.body)) {
        // Block body
        this.executeStatements(fn.body);
      } else {
        // Expression body - evaluate and return
        result = this.evaluate(fn.body);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        result = e.value;
      } else {
        this.scope = oldScope;
        this.callDepth--;
        throw e;
      }
    }

    this.scope = oldScope;
    this.callDepth--;
    return result;
  }

  // Articulation functions
  private builtinArticulatedNote(args: Expression[], position: any, articulation: Articulation): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', `${articulation}() pitch must be Pitch`, position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', `${articulation}() duration must be Dur`, position, this.filePath);
    }

    // Validate pitch range
    if (pitch.midi < 0 || pitch.midi > 127) {
      throw createError('E110', `Pitch ${pitch.midi} out of range 0..127`, position, this.filePath);
    }

    const baseDurTicks = this.durToTicks(dur, position);
    const tick = track.cursor;

    // Apply articulation adjustments
    let actualDurTicks = baseDurTicks;
    let velAdjust = 0;

    switch (articulation) {
      case 'staccato':
        actualDurTicks = Math.max(1, Math.floor(baseDurTicks * 0.5)); // 50% of duration
        break;
      case 'legato':
        actualDurTicks = baseDurTicks + Math.floor(baseDurTicks * 0.1); // Slight overlap
        break;
      case 'accent':
        velAdjust = 20; // Louder
        break;
      case 'tenuto':
        actualDurTicks = baseDurTicks; // Full duration (held)
        break;
      case 'marcato':
        actualDurTicks = Math.floor(baseDurTicks * 0.75); // Slightly shorter
        velAdjust = 25; // And louder
        break;
    }

    if (track.kind === 'vocal') {
      // Vocal needs lyric
      if (args.length < 3) {
        throw createError('E210', `Vocal ${articulation}() requires lyric`, position, this.filePath);
      }
      const lyric = this.evaluate(args[2]);
      if (lyric.type !== 'string' || lyric.value === '') {
        throw createError('E210', 'Vocal lyric must be non-empty string', position, this.filePath);
      }

      // Check for overlap
      this.checkVocalOverlap(track, tick, actualDurTicks, position);

      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: actualDurTicks,
        key: pitch.midi,
        lyric: lyric.value,
        articulation,
      };
      track.events.push(event);
    } else {
      // MIDI track
      const baseVel = args.length >= 3
        ? toNumber(this.evaluate(args[2]))
        : track.defaultVel ?? 96;
      const vel = Math.min(127, Math.max(1, baseVel + velAdjust));

      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: actualDurTicks,
        key: pitch.midi,
        vel,
        articulation,
      };
      track.events.push(event);
    }

    track.cursor += baseDurTicks; // Always advance by the original duration
    return makeNull();
  }

  // Automation curve functions
  private builtinCCCurve(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'ccCurve() only valid in MIDI tracks', position, this.filePath);
    }

    const controller = this.evaluate(args[0]);
    const startVal = this.evaluate(args[1]);
    const endVal = this.evaluate(args[2]);
    const dur = this.evaluate(args[3]);
    const steps = args.length >= 5 ? this.evaluate(args[4]) : makeInt(16);
    const curveTypeArg = args.length >= 6 ? this.evaluate(args[5]) : null;

    if (controller.type !== 'int') {
      throw new MFError('TYPE', 'ccCurve() controller must be int', position, this.filePath);
    }
    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', 'ccCurve() values must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'ccCurve() duration must be Dur', position, this.filePath);
    }
    if (steps.type !== 'int') {
      throw new MFError('TYPE', 'ccCurve() steps must be int', position, this.filePath);
    }

    // Parse curve type
    let curveType: CurveType = 'linear';
    if (curveTypeArg && curveTypeArg.type === 'string') {
      const validCurves: CurveType[] = ['linear', 'exponential', 'logarithmic', 's-curve', 'step', 'bezier'];
      if (validCurves.includes(curveTypeArg.value as CurveType)) {
        curveType = curveTypeArg.value as CurveType;
      } else {
        throw new MFError('TYPE', `ccCurve() curve type must be one of: ${validCurves.join(', ')}`, position, this.filePath);
      }
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, steps.value);
    const tickStep = durTicks / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const t = i / (numSteps - 1);
      const value = Math.round(Math.min(127, Math.max(0, interpolateWithCurve(startVal.value, endVal.value, t, curveType))));
      const event: CCEvent = {
        type: 'cc',
        tick,
        controller: controller.value,
        value,
      };
      track.events.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinExpressionCurve(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'expressionCurve() only valid in MIDI tracks', position, this.filePath);
    }

    const startVal = this.evaluate(args[0]);
    const endVal = this.evaluate(args[1]);
    const dur = this.evaluate(args[2]);
    const steps = args.length >= 4 ? this.evaluate(args[3]) : makeInt(16);
    const curveTypeArg = args.length >= 5 ? this.evaluate(args[4]) : null;

    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', 'expressionCurve() values must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'expressionCurve() duration must be Dur', position, this.filePath);
    }

    // Parse curve type
    let curveType: CurveType = 'linear';
    if (curveTypeArg && curveTypeArg.type === 'string') {
      const validCurves: CurveType[] = ['linear', 'exponential', 'logarithmic', 's-curve', 'step', 'bezier'];
      if (validCurves.includes(curveTypeArg.value as CurveType)) {
        curveType = curveTypeArg.value as CurveType;
      }
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, (steps as any).value || 16);
    const tickStep = durTicks / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const t = i / (numSteps - 1);
      const value = Math.round(Math.min(127, Math.max(0, interpolateWithCurve(startVal.value, endVal.value, t, curveType))));
      const event: CCEvent = {
        type: 'cc',
        tick,
        controller: 11, // Expression
        value,
      };
      track.events.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinPitchBendCurve(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'pitchBendCurve() only valid in MIDI tracks', position, this.filePath);
    }

    const startVal = this.evaluate(args[0]);
    const endVal = this.evaluate(args[1]);
    const dur = this.evaluate(args[2]);
    const steps = args.length >= 4 ? this.evaluate(args[3]) : makeInt(16);
    const curveTypeArg = args.length >= 5 ? this.evaluate(args[4]) : null;

    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', 'pitchBendCurve() values must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'pitchBendCurve() duration must be Dur', position, this.filePath);
    }

    // Parse curve type
    let curveType: CurveType = 'linear';
    if (curveTypeArg && curveTypeArg.type === 'string') {
      const validCurves: CurveType[] = ['linear', 'exponential', 'logarithmic', 's-curve', 'step', 'bezier'];
      if (validCurves.includes(curveTypeArg.value as CurveType)) {
        curveType = curveTypeArg.value as CurveType;
      }
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, (steps as any).value || 16);
    const tickStep = durTicks / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const t = i / (numSteps - 1);
      const value = Math.round(Math.min(8191, Math.max(-8192, interpolateWithCurve(startVal.value, endVal.value, t, curveType))));
      const event: PitchBendEvent = {
        type: 'pitchBend',
        tick,
        value,
      };
      track.events.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  // Timing expression functions
  private builtinSwing(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const amount = this.evaluate(args[0]); // 0-100, where 50 = straight, 67 = triplet swing
    if (amount.type !== 'int') {
      throw new MFError('TYPE', 'swing() amount must be int (0-100)', position, this.filePath);
    }

    // Store swing amount in track meta for note processing
    track.meta.swing = Math.min(100, Math.max(0, amount.value));
    return makeNull();
  }

  private builtinHumanize(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const timing = this.evaluate(args[0]); // timing variation in ticks
    const velocity = args.length >= 2 ? this.evaluate(args[1]) : makeInt(0); // velocity variation

    if (timing.type !== 'int') {
      throw new MFError('TYPE', 'humanize() timing must be int', position, this.filePath);
    }
    if (velocity.type !== 'int') {
      throw new MFError('TYPE', 'humanize() velocity must be int', position, this.filePath);
    }

    // Store humanize settings in track meta
    track.meta.humanizeTiming = timing.value;
    track.meta.humanizeVelocity = velocity.value;
    return makeNull();
  }

  // Ornament functions
  private builtinTrill(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const interval = args.length >= 3 ? this.evaluate(args[2]) : makeInt(2); // semitones (default: whole step)

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'trill() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'trill() duration must be Dur', position, this.filePath);
    }
    if (interval.type !== 'int') {
      throw new MFError('TYPE', 'trill() interval must be int', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const trillNoteDur = Math.max(1, Math.floor(this.ir.ppq / 8)); // 32nd note trill
    const upperPitch = pitch.midi + interval.value;
    const vel = track.defaultVel ?? 96;

    let currentTick = startTick;
    let isUpper = false;

    while (currentTick < startTick + durTicks) {
      const noteDur = Math.min(trillNoteDur, startTick + durTicks - currentTick);
      const event: NoteEvent = {
        type: 'note',
        tick: currentTick,
        dur: noteDur,
        key: isUpper ? upperPitch : pitch.midi,
        vel,
      };
      track.events.push(event);
      currentTick += trillNoteDur;
      isUpper = !isUpper;
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinMordent(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const upper = args.length >= 3 ? this.evaluate(args[2]) : makeBool(true); // upper or lower mordent

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'mordent() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'mordent() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const ornamentDur = Math.max(1, Math.floor(this.ir.ppq / 8)); // 32nd note
    const auxPitch = pitch.midi + (isTruthy(upper) ? 2 : -2);
    const vel = track.defaultVel ?? 96;

    // Main note, auxiliary, main note (rest of duration)
    track.events.push({ type: 'note', tick: startTick, dur: ornamentDur, key: pitch.midi, vel });
    track.events.push({ type: 'note', tick: startTick + ornamentDur, dur: ornamentDur, key: auxPitch, vel });
    track.events.push({ type: 'note', tick: startTick + ornamentDur * 2, dur: durTicks - ornamentDur * 2, key: pitch.midi, vel });

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinArpeggio(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'arpeggio() only valid in MIDI tracks', position, this.filePath);
    }

    const pitches = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const spread = args.length >= 3 ? this.evaluate(args[2]) : makeInt(Math.floor(this.ir.ppq / 8)); // spread in ticks

    if (pitches.type !== 'array') {
      throw new MFError('TYPE', 'arpeggio() pitches must be array', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'arpeggio() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const spreadTicks = (spread as any).value || Math.floor(this.ir.ppq / 8);
    const vel = track.defaultVel ?? 96;

    for (let i = 0; i < pitches.elements.length; i++) {
      const p = pitches.elements[i];
      if (p.type !== 'pitch') {
        throw new MFError('TYPE', 'arpeggio() elements must be Pitch', position, this.filePath);
      }
      const noteTick = startTick + i * spreadTicks;
      const noteDur = durTicks - i * spreadTicks;
      if (noteDur > 0) {
        track.events.push({ type: 'note', tick: noteTick, dur: noteDur, key: p.midi, vel });
      }
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinGlissando(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const startPitch = this.evaluate(args[0]);
    const endPitch = this.evaluate(args[1]);
    const dur = this.evaluate(args[2]);

    if (startPitch.type !== 'pitch' || endPitch.type !== 'pitch') {
      throw new MFError('TYPE', 'glissando() pitches must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'glissando() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const vel = track.defaultVel ?? 96;

    const startMidi = startPitch.midi;
    const endMidi = endPitch.midi;
    const direction = endMidi > startMidi ? 1 : -1;
    const numNotes = Math.abs(endMidi - startMidi) + 1;
    const noteDur = Math.max(1, Math.floor(durTicks / numNotes));

    for (let i = 0; i < numNotes; i++) {
      const pitch = startMidi + i * direction;
      const tick = startTick + i * noteDur;
      if (tick < startTick + durTicks) {
        track.events.push({ type: 'note', tick, dur: noteDur, key: pitch, vel });
      }
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinTremolo(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const speed = args.length >= 3 ? this.evaluate(args[2]) : makeInt(32); // note value (32 = 32nd notes)

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'tremolo() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'tremolo() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const speedVal = (speed as any).value || 32;
    const noteDur = Math.max(1, Math.floor((this.ir.ppq * 4) / speedVal));
    const vel = track.defaultVel ?? 96;

    let currentTick = startTick;
    while (currentTick < startTick + durTicks) {
      const actualDur = Math.min(noteDur, startTick + durTicks - currentTick);
      track.events.push({ type: 'note', tick: currentTick, dur: actualDur, key: pitch.midi, vel });
      currentTick += noteDur;
    }

    track.cursor += durTicks;
    return makeNull();
  }

  // Music theory helper functions
  private builtinScaleChord(args: Expression[], position: any): RuntimeValue {
    const root = this.evaluate(args[0]);
    const scaleType = this.evaluate(args[1]);
    const degree = this.evaluate(args[2]);

    if (root.type !== 'pitch') {
      throw new MFError('TYPE', 'scaleChord() root must be Pitch', position, this.filePath);
    }
    if (scaleType.type !== 'string') {
      throw new MFError('TYPE', 'scaleChord() scale must be string', position, this.filePath);
    }
    if (degree.type !== 'int') {
      throw new MFError('TYPE', 'scaleChord() degree must be int', position, this.filePath);
    }

    const scales: Record<string, number[]> = {
      'major': [0, 2, 4, 5, 7, 9, 11],
      'minor': [0, 2, 3, 5, 7, 8, 10],
      'dorian': [0, 2, 3, 5, 7, 9, 10],
      'phrygian': [0, 1, 3, 5, 7, 8, 10],
      'lydian': [0, 2, 4, 6, 7, 9, 11],
      'mixolydian': [0, 2, 4, 5, 7, 9, 10],
      'locrian': [0, 1, 3, 5, 6, 8, 10],
      'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
      'melodic_minor': [0, 2, 3, 5, 7, 9, 11],
      'pentatonic': [0, 2, 4, 7, 9],
      'blues': [0, 3, 5, 6, 7, 10],
    };

    const scale = scales[scaleType.value];
    if (!scale) {
      throw new MFError('TYPE', `Unknown scale: ${scaleType.value}`, position, this.filePath);
    }

    const deg = ((degree.value - 1) % scale.length + scale.length) % scale.length;
    const chordNotes: RuntimeValue[] = [];

    // Build triad from scale degree
    for (let i = 0; i < 3; i++) {
      const scaleIndex = (deg + i * 2) % scale.length;
      const octaveOffset = Math.floor((deg + i * 2) / scale.length) * 12;
      const noteMidi = root.midi + scale[scaleIndex] + octaveOffset;
      chordNotes.push(makePitch(noteMidi));
    }

    return makeArray(chordNotes);
  }

  private builtinChordNotes(args: Expression[], position: any): RuntimeValue {
    const root = this.evaluate(args[0]);
    const chordType = this.evaluate(args[1]);

    if (root.type !== 'pitch') {
      throw new MFError('TYPE', 'chordNotes() root must be Pitch', position, this.filePath);
    }
    if (chordType.type !== 'string') {
      throw new MFError('TYPE', 'chordNotes() type must be string', position, this.filePath);
    }

    const chords: Record<string, number[]> = {
      'maj': [0, 4, 7],
      'min': [0, 3, 7],
      'dim': [0, 3, 6],
      'aug': [0, 4, 8],
      'maj7': [0, 4, 7, 11],
      'min7': [0, 3, 7, 10],
      '7': [0, 4, 7, 10],
      'dim7': [0, 3, 6, 9],
      'm7b5': [0, 3, 6, 10],
      'sus2': [0, 2, 7],
      'sus4': [0, 5, 7],
      'add9': [0, 4, 7, 14],
      '6': [0, 4, 7, 9],
      'm6': [0, 3, 7, 9],
      '9': [0, 4, 7, 10, 14],
      'maj9': [0, 4, 7, 11, 14],
      'min9': [0, 3, 7, 10, 14],
    };

    const intervals = chords[chordType.value];
    if (!intervals) {
      throw new MFError('TYPE', `Unknown chord type: ${chordType.value}`, position, this.filePath);
    }

    const notes: RuntimeValue[] = intervals.map(interval => makePitch(root.midi + interval));
    return makeArray(notes);
  }

  // Vocaloid parameter functions
  private builtinVocaloidParam(args: Expression[], position: any, param: VocaloidParamType): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', `${param.toLowerCase()}() only valid in vocal tracks`, position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', `${param.toLowerCase()}() value must be int`, position, this.filePath);
    }

    // Initialize vocaloidParams if needed
    if (!track.vocaloidParams) {
      track.vocaloidParams = [];
    }

    // Validate range based on parameter type
    let minVal = 0, maxVal = 127;
    if (param === 'PIT') {
      minVal = -8192;
      maxVal = 8191;
    } else if (param === 'GEN') {
      minVal = -64;
      maxVal = 63;
    }

    if (value.value < minVal || value.value > maxVal) {
      throw new MFError('TYPE', `${param.toLowerCase()}() value out of range ${minVal}..${maxVal}`, position, this.filePath);
    }

    const event: VocaloidParamEvent = {
      type: 'vocaloidParam',
      param,
      tick: track.cursor,
      value: value.value,
    };
    track.vocaloidParams.push(event);
    return makeNull();
  }

  private builtinVocaloidCurve(args: Expression[], position: any, param: VocaloidParamType): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', `${param.toLowerCase()}Curve() only valid in vocal tracks`, position, this.filePath);
    }

    const startVal = this.evaluate(args[0]);
    const endVal = this.evaluate(args[1]);
    const dur = this.evaluate(args[2]);
    const steps = args.length >= 4 ? this.evaluate(args[3]) : makeInt(16);

    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', `${param.toLowerCase()}Curve() values must be int`, position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', `${param.toLowerCase()}Curve() duration must be Dur`, position, this.filePath);
    }

    // Initialize vocaloidParams if needed
    if (!track.vocaloidParams) {
      track.vocaloidParams = [];
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, (steps as any).value || 16);
    const tickStep = durTicks / (numSteps - 1);
    const valStep = (endVal.value - startVal.value) / (numSteps - 1);

    // Validate range
    let minVal = 0, maxVal = 127;
    if (param === 'PIT') {
      minVal = -8192;
      maxVal = 8191;
    }

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const value = Math.round(Math.min(maxVal, Math.max(minVal, startVal.value + valStep * i)));
      const event: VocaloidParamEvent = {
        type: 'vocaloidParam',
        param,
        tick,
        value,
      };
      track.vocaloidParams.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinVibrato(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'vibrato() only valid in vocal tracks', position, this.filePath);
    }

    const depth = this.evaluate(args[0]);   // 0-127
    const rate = this.evaluate(args[1]);    // 0-127
    const dur = this.evaluate(args[2]);
    const delay = args.length >= 4 ? this.evaluate(args[3]) : makeInt(0); // 0-100%

    if (depth.type !== 'int' || rate.type !== 'int') {
      throw new MFError('TYPE', 'vibrato() depth and rate must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'vibrato() duration must be Dur', position, this.filePath);
    }

    // Store vibrato settings in track meta for the next note
    track.meta.vibratoDepth = Math.min(127, Math.max(0, depth.value));
    track.meta.vibratoRate = Math.min(127, Math.max(0, rate.value));
    track.meta.vibratoDelay = Math.min(100, Math.max(0, (delay as any).value || 0));

    return makeNull();
  }

  // Notation functions
  private builtinDynamic(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const markExpr = args[0];
    let markStr: string;

    // Handle identifier or string
    if (markExpr.kind === 'Identifier') {
      markStr = markExpr.name;
    } else {
      const mark = this.evaluate(args[0]);
      if (mark.type !== 'string') {
        throw new MFError('TYPE', 'dynamic() mark must be string or identifier', position, this.filePath);
      }
      markStr = mark.value;
    }

    const validMarks = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fp'];
    if (!validMarks.includes(markStr)) {
      throw new MFError('TYPE', `Unknown dynamic mark: ${markStr}. Valid: ${validMarks.join(', ')}`, position, this.filePath);
    }

    // Initialize notation if needed
    if (!track.notation) {
      track.notation = { dynamics: [], slurs: [], crescendos: [] };
    }

    const event: DynamicEvent = {
      type: 'dynamic',
      tick: track.cursor,
      mark: markStr as DynamicMark,
    };
    track.notation.dynamics.push(event);
    return makeNull();
  }

  private builtinSlurStart(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // Mark the current position as slur start
    track.currentSlurStart = track.cursor;
    return makeNull();
  }

  private builtinSlurEnd(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.currentSlurStart === undefined) {
      throw new MFError('TYPE', 'slurEnd() called without matching slurStart()', position, this.filePath);
    }

    // Initialize notation if needed
    if (!track.notation) {
      track.notation = { dynamics: [], slurs: [], crescendos: [] };
    }

    const event: SlurEvent = {
      type: 'slur',
      tick: track.currentSlurStart,
      endTick: track.cursor,
    };
    track.notation.slurs.push(event);
    track.currentSlurStart = undefined;
    return makeNull();
  }

  private builtinCrescendo(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'crescendo() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    // Initialize notation if needed
    if (!track.notation) {
      track.notation = { dynamics: [], slurs: [], crescendos: [] };
    }

    const event: CrescendoEvent = {
      type: 'crescendo',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
    };
    track.notation.crescendos.push(event);
    return makeNull();
  }

  private builtinDecrescendo(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'decrescendo() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    // Initialize notation if needed
    if (!track.notation) {
      track.notation = { dynamics: [], slurs: [], crescendos: [] };
    }

    const event: CrescendoEvent = {
      type: 'decrescendo',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
    };
    track.notation.crescendos.push(event);
    return makeNull();
  }

  private builtinTie(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur1 = this.evaluate(args[1]);
    const dur2 = this.evaluate(args[2]);

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'tie() pitch must be Pitch', position, this.filePath);
    }
    if (dur1.type !== 'dur' || dur2.type !== 'dur') {
      throw new MFError('TYPE', 'tie() durations must be Dur', position, this.filePath);
    }

    const dur1Ticks = this.durToTicks(dur1, position);
    const dur2Ticks = this.durToTicks(dur2, position);
    const tick = track.cursor;
    const vel = track.defaultVel ?? 96;

    if (track.kind === 'vocal') {
      // Vocal: need lyric
      if (args.length < 4) {
        throw createError('E210', 'Vocal tie() requires lyric', position, this.filePath);
      }
      const lyric = this.evaluate(args[3]);
      if (lyric.type !== 'string' || lyric.value === '') {
        throw createError('E210', 'Vocal lyric must be non-empty string', position, this.filePath);
      }

      // First note with tie start
      const event1: NoteEvent = {
        type: 'note',
        tick,
        dur: dur1Ticks,
        key: pitch.midi,
        lyric: lyric.value,
      };
      track.events.push(event1);

      // Second note with tie (continuation, typically "-" lyric)
      const event2: NoteEvent = {
        type: 'note',
        tick: tick + dur1Ticks,
        dur: dur2Ticks,
        key: pitch.midi,
        lyric: '-',
      };
      track.events.push(event2);
    } else {
      // MIDI: just create one long note
      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: dur1Ticks + dur2Ticks,
        key: pitch.midi,
        vel,
      };
      track.events.push(event);
    }

    track.cursor += dur1Ticks + dur2Ticks;
    return makeNull();
  }

  // Extended notation functions
  private builtinTuplet(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const actual = toNumber(this.evaluate(args[0]));
    const normal = toNumber(this.evaluate(args[1]));

    if (actual < 2 || normal < 1) {
      throw new MFError('RANGE', 'tuplet() actual must be >= 2 and normal >= 1', position, this.filePath);
    }

    // Initialize stack if not exists
    if (!track.tupletStack) {
      track.tupletStack = [];
    }

    // Push new tuplet onto stack (supports nesting)
    const newTuplet: TupletInfo = { actual, normal };
    track.tupletStack.push(newTuplet);
    track.currentTuplet = newTuplet;

    return makeNull();
  }

  private builtinTupletEnd(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // Pop from stack (supports nesting)
    if (track.tupletStack && track.tupletStack.length > 0) {
      track.tupletStack.pop();
      // Set currentTuplet to the next one in stack, or undefined if empty
      track.currentTuplet = track.tupletStack.length > 0
        ? track.tupletStack[track.tupletStack.length - 1]
        : undefined;
    } else {
      track.currentTuplet = undefined;
    }

    return makeNull();
  }

  private builtinTriplet(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // Initialize stack if not exists
    if (!track.tupletStack) {
      track.tupletStack = [];
    }

    // triplet creates a 3:2 tuplet context
    const tripletTuplet: TupletInfo = { actual: 3, normal: 2 };
    track.tupletStack.push(tripletTuplet);
    track.currentTuplet = tripletTuplet;

    // If there's a callback argument (proc), execute it
    if (args.length > 0) {
      const callback = args[0];
      if (callback.kind === 'CallExpression') {
        this.evaluateCall(callback.callee, callback.arguments, position);
      }
      // Pop after callback
      track.tupletStack.pop();
      track.currentTuplet = track.tupletStack.length > 0
        ? track.tupletStack[track.tupletStack.length - 1]
        : undefined;
    }

    return makeNull();
  }

  private builtinGrace(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'grace() pitch must be Pitch', position, this.filePath);
    }

    const slash = args.length > 1 ? isTruthy(this.evaluate(args[1])) : true;
    const lyric = args.length > 2 ? this.evaluate(args[2]) : undefined;

    if (!track.graceNotes) {
      track.graceNotes = [];
    }

    const graceNote: GraceNoteEvent = {
      type: 'graceNote',
      tick: track.cursor,
      key: pitch.midi,
      slash,
      lyric: lyric?.type === 'string' ? lyric.value : undefined,
    };
    track.graceNotes.push(graceNote);
    return makeNull();
  }

  private builtinAcciaccatura(args: Expression[], position: any): RuntimeValue {
    // Acciaccatura is grace note with slash
    const pitch = this.evaluate(args[0]);
    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'acciaccatura() pitch must be Pitch', position, this.filePath);
    }
    // Call grace with slash=true
    return this.builtinGrace([args[0], { kind: 'BoolLiteral', value: true } as any], position);
  }

  private builtinAppoggiatura(args: Expression[], position: any): RuntimeValue {
    // Appoggiatura is grace note without slash
    const pitch = this.evaluate(args[0]);
    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'appoggiatura() pitch must be Pitch', position, this.filePath);
    }
    // Call grace with slash=false
    return this.builtinGrace([args[0], { kind: 'BoolLiteral', value: false } as any], position);
  }

  private builtinFermata(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.fermatas) {
      track.fermatas = [];
    }

    const shape = args.length > 0 ? this.evaluate(args[0]) : undefined;
    const shapeStr = shape?.type === 'string' ? shape.value : 'normal';

    const fermata: FermataEvent = {
      type: 'fermata',
      tick: track.cursor,
      shape: shapeStr as 'normal' | 'angled' | 'square',
    };
    track.fermatas.push(fermata);
    return makeNull();
  }

  // Repeat signs
  private builtinRepeatStart(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'start' });
    return makeNull();
  }

  private builtinRepeatEnd(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'end' });
    return makeNull();
  }

  private builtinDC(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'dc' });
    return makeNull();
  }

  private builtinDS(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'ds' });
    return makeNull();
  }

  private builtinFine(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'fine' });
    return makeNull();
  }

  private builtinCoda(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'coda' });
    return makeNull();
  }

  private builtinSegno(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'segno' });
    return makeNull();
  }

  private builtinToCoda(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (!track.repeats) track.repeats = [];
    track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'toCoda' });
    return makeNull();
  }

  // Ottava functions
  private builtinOttava(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const shift = toNumber(this.evaluate(args[0]));
    if (shift !== 8 && shift !== -8 && shift !== 15 && shift !== -15) {
      throw new MFError('RANGE', 'ottava() shift must be 8, -8, 15, or -15', position, this.filePath);
    }

    track.currentOttava = { startTick: track.cursor, shift };
    return makeNull();
  }

  private builtinOttavaEnd(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.currentOttava) {
      if (!track.ottavas) track.ottavas = [];
      track.ottavas.push({
        type: 'ottava',
        tick: track.currentOttava.startTick,
        endTick: track.cursor,
        shift: track.currentOttava.shift as 8 | -8 | 15 | -15,
      });
      track.currentOttava = undefined;
    }
    return makeNull();
  }

  // Voice function
  private builtinVoice(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const voiceNum = toNumber(this.evaluate(args[0]));
    if (voiceNum < 1 || voiceNum > 4) {
      throw new MFError('RANGE', 'voice() must be 1-4', position, this.filePath);
    }

    track.currentVoice = voiceNum;
    return makeNull();
  }

  // Vocaloid extended functions
  private builtinPortamento(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'portamento() only valid in vocal tracks', position, this.filePath);
    }

    const dur = this.evaluate(args[0]);
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'portamento() duration must be Dur', position, this.filePath);
    }
    const durTicks = this.durToTicks(dur, position);

    // Initialize vocaloidParams if needed
    if (!track.vocaloidParams) {
      track.vocaloidParams = [];
    }

    // POR parameter controls portamento
    track.vocaloidParams.push({
      type: 'vocaloidParam',
      param: 'POR',
      tick: track.cursor,
      value: Math.min(127, Math.floor(durTicks / 10)), // Convert to 0-127 range
    });

    return makeNull();
  }

  private builtinGrowl(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'growl() only valid in vocal tracks', position, this.filePath);
    }

    const intensity = toNumber(this.evaluate(args[0]));
    if (intensity < 0 || intensity > 127) {
      throw new MFError('RANGE', 'growl() intensity must be 0-127', position, this.filePath);
    }

    // Initialize vocaloidParams if needed
    if (!track.vocaloidParams) {
      track.vocaloidParams = [];
    }

    // Growl can be approximated with BRE (breathiness) parameter
    track.vocaloidParams.push({
      type: 'vocaloidParam',
      param: 'BRE',
      tick: track.cursor,
      value: intensity,
    });

    return makeNull();
  }

  private builtinXSynth(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'xsynth() only valid in vocal tracks', position, this.filePath);
    }

    const voice1 = this.evaluate(args[0]);
    const voice2 = this.evaluate(args[1]);
    const balance = toNumber(this.evaluate(args[2]));

    if (voice1.type !== 'string' || voice2.type !== 'string') {
      throw new MFError('TYPE', 'xsynth() voices must be strings', position, this.filePath);
    }
    if (balance < 0 || balance > 127) {
      throw new MFError('RANGE', 'xsynth() balance must be 0-127', position, this.filePath);
    }

    // Store cross-synthesis info in meta
    track.meta.xsynth_voice1 = voice1.value;
    track.meta.xsynth_voice2 = voice2.value;
    track.meta.xsynth_balance = balance;

    return makeNull();
  }

  // Extended notation functions
  private builtinGrandStaff(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const upperClef = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'treble' };
    const lowerClef = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'bass' };
    const splitPoint = args.length > 2 ? toNumber(this.evaluate(args[2])) : 60; // Middle C

    track.grandStaff = {
      upperClef: (upperClef.type === 'string' ? upperClef.value : 'treble') as 'treble' | 'alto' | 'tenor' | 'bass',
      lowerClef: (lowerClef.type === 'string' ? lowerClef.value : 'bass') as 'treble' | 'alto' | 'tenor' | 'bass',
      splitPoint,
    };

    return makeNull();
  }

  private builtinTablature(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const instrument = this.evaluate(args[0]);
    if (instrument.type !== 'string') {
      throw new MFError('TYPE', 'tablature() instrument must be string', position, this.filePath);
    }

    // Standard tunings
    const tunings: Record<string, number[]> = {
      'guitar': [40, 45, 50, 55, 59, 64],      // E A D G B E
      'bass': [28, 33, 38, 43],                 // E A D G
      'ukulele': [67, 60, 64, 69],             // G C E A
    };

    const tuning = tunings[instrument.value] || tunings['guitar'];

    track.tablature = {
      strings: tuning.length,
      tuning,
      instrument: instrument.value as 'guitar' | 'bass' | 'ukulele' | 'custom',
    };

    return makeNull();
  }

  private builtinTabNote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.tablature) {
      throw new MFError('STATE', 'tablature() must be called before tabNote()', position, this.filePath);
    }

    const stringNum = toNumber(this.evaluate(args[0]));
    const fret = toNumber(this.evaluate(args[1]));
    const dur = this.evaluate(args[2]);

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'tabNote() duration must be Dur', position, this.filePath);
    }

    if (stringNum < 1 || stringNum > track.tablature.strings) {
      throw new MFError('RANGE', `tabNote() string must be 1-${track.tablature.strings}`, position, this.filePath);
    }

    // Calculate MIDI note from string and fret
    const stringIndex = stringNum - 1;
    const midiNote = track.tablature.tuning[stringIndex] + fret;

    const durTicks = this.durToTicks(dur, position);
    const technique = args.length > 3 ? this.evaluate(args[3]) : undefined;

    const event: TabNoteEvent = {
      type: 'note',
      tick: track.cursor,
      dur: durTicks,
      key: midiNote,
      vel: track.defaultVel ?? 96,
      string: stringNum,
      fret,
      technique: technique?.type === 'string' ? technique.value as TabTechnique : undefined,
    };

    track.events.push(event);
    track.cursor += durTicks;
    return makeNull();
  }

  private builtinChordSymbol(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const root = this.evaluate(args[0]);
    const quality = this.evaluate(args[1]);

    if (root.type !== 'string' || quality.type !== 'string') {
      throw new MFError('TYPE', 'chordSymbol() root and quality must be strings', position, this.filePath);
    }

    const bass = args.length > 2 ? this.evaluate(args[2]) : undefined;

    if (!track.chordSymbols) {
      track.chordSymbols = [];
    }

    const event: ChordSymbolEvent = {
      type: 'chordSymbol',
      tick: track.cursor,
      root: root.value,
      quality: quality.value as ChordQuality,
      bass: bass?.type === 'string' ? bass.value : undefined,
    };

    track.chordSymbols.push(event);
    return makeNull();
  }

  private builtinFiguredBass(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const figuresArg = this.evaluate(args[0]);
    if (figuresArg.type !== 'array') {
      throw new MFError('TYPE', 'figuredBass() expects array of figures', position, this.filePath);
    }

    const figures: string[] = [];
    for (const elem of figuresArg.elements) {
      if (elem.type === 'string') {
        figures.push(elem.value);
      } else if (elem.type === 'int') {
        figures.push(String(elem.value));
      }
    }

    if (!track.figuredBass) {
      track.figuredBass = [];
    }

    const event: FiguredBassEvent = {
      type: 'figuredBass',
      tick: track.cursor,
      figures,
    };

    track.figuredBass.push(event);
    return makeNull();
  }

  // Markers and patterns
  private builtinMarker(args: Expression[], position: any): RuntimeValue {
    const name = this.evaluate(args[0]);
    if (name.type !== 'string') {
      throw new MFError('TYPE', 'marker() name must be string', position, this.filePath);
    }

    const color = args.length > 1 ? this.evaluate(args[1]) : undefined;

    const event: MarkerEvent = {
      type: 'marker',
      tick: this.currentTrack?.cursor ?? 0,
      name: name.value,
      color: color?.type === 'string' ? color.value : undefined,
    };

    if (this.currentTrack) {
      if (!this.currentTrack.markers) {
        this.currentTrack.markers = [];
      }
      this.currentTrack.markers.push(event);
    }

    return makeNull();
  }

  private builtinCuePoint(args: Expression[], position: any): RuntimeValue {
    const name = this.evaluate(args[0]);
    if (name.type !== 'string') {
      throw new MFError('TYPE', 'cuePoint() name must be string', position, this.filePath);
    }

    const action = args.length > 1 ? this.evaluate(args[1]) : undefined;

    // Store cue point - would need song-level storage
    return makeNull();
  }

  private builtinPattern(args: Expression[], position: any): RuntimeValue {
    // Pattern definition - would need to capture block contents
    const name = this.evaluate(args[0]);
    if (name.type !== 'string') {
      throw new MFError('TYPE', 'pattern() name must be string', position, this.filePath);
    }

    // Patterns would be stored at interpreter level
    return makeNull();
  }

  private builtinUsePattern(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const patternId = this.evaluate(args[0]);
    if (patternId.type !== 'string') {
      throw new MFError('TYPE', 'usePattern() id must be string', position, this.filePath);
    }

    const repetitions = args.length > 1 ? toNumber(this.evaluate(args[1])) : 1;

    if (!track.patterns) {
      track.patterns = [];
    }

    track.patterns.push({
      patternId: patternId.value,
      tick: track.cursor,
      repetitions,
    });

    return makeNull();
  }

  // Audio functions
  private builtinAudioClip(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const filePath = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);

    if (filePath.type !== 'string') {
      throw new MFError('TYPE', 'audioClip() path must be string', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'audioClip() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const gain = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 1.0;
    const pan = args.length > 3 ? (toNumber(this.evaluate(args[3])) - 64) / 64 : 0;

    if (!track.audioClips) {
      track.audioClips = [];
    }

    const event: AudioClipEvent = {
      type: 'audioClip',
      tick: track.cursor,
      filePath: filePath.value,
      duration: durTicks,
      gain,
      pan,
    };

    track.audioClips.push(event);
    track.cursor += durTicks;
    return makeNull();
  }

  private builtinEffect(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const effectType = this.evaluate(args[0]);
    if (effectType.type !== 'string') {
      throw new MFError('TYPE', 'effect() type must be string', position, this.filePath);
    }

    const params: Record<string, number> = {};
    // Parse key-value pairs from remaining arguments
    for (let i = 1; i < args.length - 1; i += 2) {
      const key = this.evaluate(args[i]);
      const value = this.evaluate(args[i + 1]);
      if (key.type === 'string') {
        params[key.value] = toNumber(value);
      }
    }

    if (!track.effects) {
      track.effects = [];
    }

    const effect: AudioEffect = {
      type: 'effect',
      effectType: effectType.value as EffectType,
      params,
    };

    track.effects.push(effect);
    return makeNull();
  }

  private builtinReverb(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const roomSize = args.length > 0 ? toNumber(this.evaluate(args[0])) / 127 : 0.5;
    const damping = args.length > 1 ? toNumber(this.evaluate(args[1])) / 127 : 0.5;
    const wetDry = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 0.3;

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'reverb',
      params: { roomSize, damping, wetDry },
    });

    return makeNull();
  }

  private builtinDelay(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const time = args.length > 0 ? toNumber(this.evaluate(args[0])) : 250; // ms
    const feedback = args.length > 1 ? toNumber(this.evaluate(args[1])) / 127 : 0.4;
    const wetDry = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 0.3;

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'delay',
      params: { time, feedback, wetDry },
    });

    return makeNull();
  }

  private builtinEQ(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowGain = args.length > 0 ? toNumber(this.evaluate(args[0])) - 64 : 0;
    const midGain = args.length > 1 ? toNumber(this.evaluate(args[1])) - 64 : 0;
    const highGain = args.length > 2 ? toNumber(this.evaluate(args[2])) - 64 : 0;

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'eq',
      params: { lowGain, midGain, highGain },
    });

    return makeNull();
  }

  private builtinCompressor(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const threshold = args.length > 0 ? toNumber(this.evaluate(args[0])) : -20; // dB
    const ratio = args.length > 1 ? toNumber(this.evaluate(args[1])) : 4;
    const attack = args.length > 2 ? toNumber(this.evaluate(args[2])) : 10; // ms
    const release = args.length > 3 ? toNumber(this.evaluate(args[3])) : 100; // ms

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'compressor',
      params: { threshold, ratio, attack, release },
    });

    return makeNull();
  }

  // ============================================
  // Microtonality & Tuning
  // ============================================

  private builtinTuning(args: Expression[], position: any): RuntimeValue {
    const system = this.evaluate(args[0]);
    if (system.type !== 'string') {
      throw new MFError('TYPE', 'tuning() expects string', position, this.filePath);
    }

    const baseFreq = args.length > 1 ? toNumber(this.evaluate(args[1])) : 440;

    const tuning: TuningEvent = {
      type: 'tuning',
      tick: this.currentTrack?.cursor ?? 0,
      system: system.value as TuningSystem,
      baseFreq,
    };

    if (this.currentTrack) {
      this.currentTrack.tuning = tuning;
    }

    return makeNull();
  }

  private builtinCents(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const cents = toNumber(this.evaluate(args[0]));
    if (cents < -100 || cents > 100) {
      throw new MFError('RANGE', 'cents() value must be between -100 and 100', position, this.filePath);
    }
    this.currentTrack!.centsDeviation = cents;
    return makeNull();
  }

  private builtinQuarterTone(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const direction = this.evaluate(args[0]);
    if (direction.type !== 'string' || (direction.value !== 'sharp' && direction.value !== 'flat')) {
      throw new MFError('TYPE', 'quarterTone() expects "sharp" or "flat"', position, this.filePath);
    }
    // Set cents deviation for quarter tone
    this.currentTrack!.centsDeviation = direction.value === 'sharp' ? 50 : -50;
    return makeNull();
  }

  private builtinPitchCorrection(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const amount = toNumber(this.evaluate(args[0]));
    const dur = this.evaluate(args[1]);
    const speed = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'pitchCorrection() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    // Store as a special event in track events
    return makeNull();
  }

  // ============================================
  // Algorithmic Composition
  // ============================================

  private builtinEuclidean(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const steps = Math.floor(toNumber(this.evaluate(args[0])));
    const pulses = Math.floor(toNumber(this.evaluate(args[1])));
    const dur = this.evaluate(args[2]);
    const pitch = args.length > 3 ? this.evaluate(args[3]) : null;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'euclidean() duration must be Dur', position, this.filePath);
    }

    const stepTicks = this.durToTicks(dur, position);
    const pattern = this.generateEuclidean(steps, pulses);

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i]) {
        if (pitch && pitch.type === 'pitch') {
          const noteEvent: NoteEvent = {
            type: 'note',
            tick: track.cursor,
            dur: stepTicks,
            key: pitch.midi,
            vel: track.defaultVel,
          };
          track.events.push(noteEvent);
        } else if (track.kind === 'midi' && track.channel === 10) {
          // Drum track - use kick
          const noteEvent: NoteEvent = {
            type: 'note',
            tick: track.cursor,
            dur: stepTicks,
            key: 36,
            vel: track.defaultVel ?? 100,
          };
          track.events.push(noteEvent);
        }
      }
      track.cursor += stepTicks;
    }

    return makeNull();
  }

  private generateEuclidean(steps: number, pulses: number): boolean[] {
    if (pulses > steps) pulses = steps;
    if (pulses === 0) return new Array(steps).fill(false);
    if (pulses === steps) return new Array(steps).fill(true);

    const pattern: boolean[] = [];
    let bucket = 0;

    for (let i = 0; i < steps; i++) {
      bucket += pulses;
      if (bucket >= steps) {
        bucket -= steps;
        pattern.push(true);
      } else {
        pattern.push(false);
      }
    }

    return pattern;
  }

  private builtinProbability(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const prob = args.length > 2 ? toNumber(this.evaluate(args[2])) / 100 : 0.5;

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'probability() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'probability() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const random = this.seededRandom(track.randomSeed);

    if (random < prob) {
      const noteEvent: NoteEvent = {
        type: 'note',
        tick: track.cursor,
        dur: durTicks,
        key: pitch.midi,
        vel: track.defaultVel,
      };
      track.events.push(noteEvent);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private seededRandom(seed?: number): number {
    if (seed === undefined) {
      return Math.random();
    }
    // Simple seeded random using a linear congruential generator
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private builtinMarkov(args: Expression[], position: any): RuntimeValue {
    // Markov chain generation - simplified implementation
    this.checkTrackPhase(position);
    return makeNull();
  }

  private builtinRandomSeed(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const seed = Math.floor(toNumber(this.evaluate(args[0])));
    this.currentTrack!.randomSeed = seed;
    return makeNull();
  }

  private builtinRandomNote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const minPitch = toNumber(this.evaluate(args[0]));
    const maxPitch = toNumber(this.evaluate(args[1]));
    const dur = this.evaluate(args[2]);

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'randomNote() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const random = this.seededRandom(track.randomSeed);
    const pitch = Math.floor(minPitch + random * (maxPitch - minPitch + 1));

    const noteEvent: NoteEvent = {
      type: 'note',
      tick: track.cursor,
      dur: durTicks,
      key: pitch,
      vel: track.defaultVel,
    };
    track.events.push(noteEvent);
    track.cursor += durTicks;

    // Update seed for next random
    if (track.randomSeed !== undefined) {
      track.randomSeed = track.randomSeed + 1;
    }

    return makeNull();
  }

  private builtinRandomRhythm(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const durations = this.evaluate(args[1]);
    const count = Math.floor(toNumber(this.evaluate(args[2])));

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'randomRhythm() pitch must be Pitch', position, this.filePath);
    }
    if (durations.type !== 'array') {
      throw new MFError('TYPE', 'randomRhythm() durations must be array', position, this.filePath);
    }

    for (let i = 0; i < count; i++) {
      const random = this.seededRandom(track.randomSeed);
      const durIndex = Math.floor(random * durations.elements.length);
      const dur = durations.elements[durIndex];

      if (dur.type === 'dur') {
        const durTicks = this.durToTicks(dur, position);
        const noteEvent: NoteEvent = {
          type: 'note',
          tick: track.cursor,
          dur: durTicks,
          key: pitch.midi,
          vel: track.defaultVel,
        };
        track.events.push(noteEvent);
        track.cursor += durTicks;
      }

      if (track.randomSeed !== undefined) {
        track.randomSeed = track.randomSeed + 1;
      }
    }

    return makeNull();
  }

  private builtinConstraint(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const rule = this.evaluate(args[0]);
    if (rule.type !== 'string') {
      throw new MFError('TYPE', 'constraint() rule must be string', position, this.filePath);
    }

    if (!track.constraints) {
      track.constraints = [];
    }

    track.constraints.push({
      type: 'constraint',
      rule: rule.value as any,
    });

    return makeNull();
  }

  private builtinCellular(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const ruleNum = Math.floor(toNumber(this.evaluate(args[0])));
    const steps = Math.floor(toNumber(this.evaluate(args[1])));
    const dur = this.evaluate(args[2]);
    const pitch = this.evaluate(args[3]);

    if (dur.type !== 'dur' || pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'cellular() requires dur and pitch', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const pattern = this.generateCellular(ruleNum, steps);

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i]) {
        const noteEvent: NoteEvent = {
          type: 'note',
          tick: track.cursor,
          dur: durTicks,
          key: pitch.midi,
          vel: track.defaultVel,
        };
        track.events.push(noteEvent);
      }
      track.cursor += durTicks;
    }

    return makeNull();
  }

  private generateCellular(rule: number, steps: number): boolean[] {
    // 1D cellular automaton
    let current = new Array(steps).fill(false);
    current[Math.floor(steps / 2)] = true; // Start with single cell in middle

    const result: boolean[] = [];

    for (let i = 0; i < steps; i++) {
      result.push(current[i]);
    }

    for (let gen = 0; gen < steps - 1; gen++) {
      const next = new Array(steps).fill(false);
      for (let i = 1; i < steps - 1; i++) {
        const left = current[i - 1] ? 4 : 0;
        const center = current[i] ? 2 : 0;
        const right = current[i + 1] ? 1 : 0;
        const index = left + center + right;
        next[i] = ((rule >> index) & 1) === 1;
      }
      current = next;
    }

    return result;
  }

  private builtinLSystem(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    // L-System placeholder
    return makeNull();
  }

  // ============================================
  // Advanced Notation
  // ============================================

  private builtinVerse(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const verseNum = Math.floor(toNumber(this.evaluate(args[0])));
    const text = this.evaluate(args[1]);

    if (text.type !== 'string') {
      throw new MFError('TYPE', 'verse() text must be string', position, this.filePath);
    }

    if (!track.multiVerseLyrics) {
      track.multiVerseLyrics = [];
    }

    // Find existing event at this tick or create new one
    let event = track.multiVerseLyrics.find(e => e.tick === track.cursor);
    if (!event) {
      event = {
        type: 'multiVerseLyric',
        tick: track.cursor,
        verses: [],
      };
      track.multiVerseLyrics.push(event);
    }

    event.verses.push({ verse: verseNum, text: text.value });
    return makeNull();
  }

  private builtinOssia(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const startTick = track.cursor;
    // Execute callback to collect notes
    const oldEvents = track.events;
    track.events = [];

    if (args.length > 0) {
      const callback = args[0];
      if (callback.kind === 'CallExpression') {
        this.evaluateCall(callback.callee, callback.arguments, position);
      }
    }

    const ossiaEvents = track.events.filter(e => e.type === 'note') as NoteEvent[];
    track.events = oldEvents;

    const endTick = track.cursor;

    if (!track.ossias) {
      track.ossias = [];
    }

    track.ossias.push({
      type: 'ossia',
      tick: startTick,
      endTick,
      notes: ossiaEvents,
    });

    return makeNull();
  }

  private builtinCueNote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const instrument = args.length > 2 ? this.evaluate(args[2]) : null;

    if (pitch.type !== 'pitch' || dur.type !== 'dur') {
      throw new MFError('TYPE', 'cueNote() requires pitch and dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.cueNotes) {
      track.cueNotes = [];
    }

    track.cueNotes.push({
      type: 'cueNote',
      tick: track.cursor,
      dur: durTicks,
      key: pitch.midi,
      instrument: instrument?.type === 'string' ? instrument.value : undefined,
    });

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinInstrumentChange(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const instrument = this.evaluate(args[0]);
    const program = args.length > 1 ? Math.floor(toNumber(this.evaluate(args[1]))) : undefined;

    if (instrument.type !== 'string') {
      throw new MFError('TYPE', 'instrumentChange() instrument must be string', position, this.filePath);
    }

    // Change program if specified
    if (program !== undefined) {
      track.program = program;
    }

    return makeNull();
  }

  private builtinNotehead(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteheadType = this.evaluate(args[0]);
    const pitch = args.length > 1 ? this.evaluate(args[1]) : null;

    if (noteheadType.type !== 'string') {
      throw new MFError('TYPE', 'notehead() type must be string', position, this.filePath);
    }

    if (!track.percussionNoteheads) {
      track.percussionNoteheads = new Map();
    }

    if (pitch && pitch.type === 'pitch') {
      track.percussionNoteheads.set(pitch.midi, noteheadType.value as PercussionNotehead);
    }

    return makeNull();
  }

  private builtinStringTechnique(callee: string, args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const techniqueMap: Record<string, string> = {
      'bowUp': 'up',
      'bowDown': 'down',
      'pizz': 'pizz',
      'arco': 'arco',
      'colLegno': 'col-legno',
      'sulPont': 'sul-pont',
      'sulTasto': 'sul-tasto',
      'snapPizz': 'snap-pizz',
      'harmonics': 'harmonics',
    };

    if (!track.stringTechniques) {
      track.stringTechniques = [];
    }

    track.stringTechniques.push({
      type: 'stringTechnique',
      tick: track.cursor,
      technique: techniqueMap[callee] as any,
    });

    return makeNull();
  }

  private builtinWindTechnique(callee: string, args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const techniqueMap: Record<string, string> = {
      'breath': 'breath',
      'mute': 'mute',
      'open': 'open',
      'stopped': 'stopped',
      'flutter': 'flutter',
      'doubleTongue': 'double-tongue',
      'tripleTongue': 'triple-tongue',
    };

    if (!track.windTechniques) {
      track.windTechniques = [];
    }

    track.windTechniques.push({
      type: 'windTechnique',
      tick: track.cursor,
      technique: techniqueMap[callee] as WindTechnique,
    });

    return makeNull();
  }

  private builtinGuitarBend(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const amount = toNumber(this.evaluate(args[0])); // Semitones
    const release = args.length > 1 ? isTruthy(this.evaluate(args[1])) : false;

    if (!track.guitarBends) {
      track.guitarBends = [];
    }

    track.guitarBends.push({
      type: 'guitarBend',
      tick: track.cursor,
      bendAmount: amount,
      release,
    });

    return makeNull();
  }

  private builtinGuitarTechnique(callee: string, args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    // Guitar techniques are stored as part of tab events
    return makeNull();
  }

  private builtinHarpPedal(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // 7 pedals: D C B E F G A
    const pedals: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < Math.min(args.length, 7); i++) {
      pedals[i] = Math.floor(toNumber(this.evaluate(args[i])));
      if (pedals[i] < -1) pedals[i] = -1;
      if (pedals[i] > 1) pedals[i] = 1;
    }

    if (!track.harpPedals) {
      track.harpPedals = [];
    }

    track.harpPedals.push({
      type: 'harpPedal',
      tick: track.cursor,
      pedals,
    });

    return makeNull();
  }

  // ============================================
  // Additional Effects
  // ============================================

  private builtinPhaser(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 0.5;
    const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const feedback = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
    const stages = args.length > 3 ? Math.floor(toNumber(this.evaluate(args[3]))) : 4;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'phaser',
      params: { rate, depth, feedback, stages },
    });

    return makeNull();
  }

  private builtinFlanger(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 0.25;
    const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const feedback = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
    const mix = args.length > 3 ? toNumber(this.evaluate(args[3])) : 50;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'flanger',
      params: { rate, depth, feedback, mix },
    });

    return makeNull();
  }

  private builtinChorus(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1.0;
    const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const voices = args.length > 2 ? Math.floor(toNumber(this.evaluate(args[2]))) : 3;
    const mix = args.length > 3 ? toNumber(this.evaluate(args[3])) : 50;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'chorus',
      params: { rate, depth, voices, mix },
    });

    return makeNull();
  }

  private builtinDistortion(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const drive = args.length > 0 ? toNumber(this.evaluate(args[0])) : 50;
    const tone = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const mix = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'distortion',
      params: { drive, tone, mix },
    });

    return makeNull();
  }

  private builtinFilter(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const filterType = this.evaluate(args[0]);
    const cutoff = args.length > 1 ? toNumber(this.evaluate(args[1])) : 1000;
    const resonance = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (filterType.type !== 'string') {
      throw new MFError('TYPE', 'filter() type must be string', position, this.filePath);
    }

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'filter',
      params: { filterType: filterType.value as any, cutoff, resonance },
    });

    return makeNull();
  }

  private builtinSidechain(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sourceTrack = this.evaluate(args[0]);
    const threshold = args.length > 1 ? toNumber(this.evaluate(args[1])) : -20;
    const ratio = args.length > 2 ? toNumber(this.evaluate(args[2])) : 4;
    const attack = args.length > 3 ? toNumber(this.evaluate(args[3])) : 10;
    const release = args.length > 4 ? toNumber(this.evaluate(args[4])) : 100;

    if (sourceTrack.type !== 'string') {
      throw new MFError('TYPE', 'sidechain() source must be string', position, this.filePath);
    }

    // Store as effect with sidechain params
    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      effectType: 'compressor',
      params: { threshold, ratio, attack, release, sidechain: sourceTrack.value as any },
    });

    return makeNull();
  }

  // ============================================
  // Live Performance
  // ============================================

  private builtinMidiMap(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const ccNumber = Math.floor(toNumber(this.evaluate(args[0])));
    const target = this.evaluate(args[1]);
    const min = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const max = args.length > 3 ? toNumber(this.evaluate(args[3])) : 127;

    if (target.type !== 'string') {
      throw new MFError('TYPE', 'midiMap() target must be string', position, this.filePath);
    }

    if (!track.midiMappings) {
      track.midiMappings = [];
    }

    track.midiMappings.push({
      type: 'midiMapping',
      ccNumber,
      target: target.value,
      min,
      max,
    });

    return makeNull();
  }

  private builtinScene(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sceneId = this.evaluate(args[0]);
    const sceneName = args.length > 1 ? this.evaluate(args[1]) : sceneId;

    if (sceneId.type !== 'string') {
      throw new MFError('TYPE', 'scene() id must be string', position, this.filePath);
    }

    if (!track.scenes) {
      track.scenes = [];
    }

    track.scenes.push({
      id: sceneId.value,
      name: sceneName.type === 'string' ? sceneName.value : sceneId.value,
      clips: [],
    });

    return makeNull();
  }

  private builtinLaunchScene(args: Expression[], position: any): RuntimeValue {
    // Scene launching is a runtime/playback feature
    return makeNull();
  }

  private builtinLiveLoop(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const loopId = this.evaluate(args[0]);
    const length = this.evaluate(args[1]);

    if (loopId.type !== 'string' || length.type !== 'dur') {
      throw new MFError('TYPE', 'liveLoop() requires string id and dur length', position, this.filePath);
    }

    const lengthTicks = this.durToTicks(length, position);
    // Live loop is a runtime feature
    return makeNull();
  }

  // ============================================
  // Score Layout
  // ============================================

  private builtinPageBreak(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.layoutEvents) {
      track.layoutEvents = [];
    }

    track.layoutEvents.push({
      type: 'pageBreak',
      tick: track.cursor,
    });

    return makeNull();
  }

  private builtinSystemBreak(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.layoutEvents) {
      track.layoutEvents = [];
    }

    track.layoutEvents.push({
      type: 'systemBreak',
      tick: track.cursor,
    });

    return makeNull();
  }

  private builtinStaffSpacing(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const above = args.length > 0 ? toNumber(this.evaluate(args[0])) : undefined;
    const below = args.length > 1 ? toNumber(this.evaluate(args[1])) : undefined;

    if (!track.layoutEvents) {
      track.layoutEvents = [];
    }

    track.layoutEvents.push({
      type: 'staffSpacing',
      tick: track.cursor,
      above,
      below,
    });

    return makeNull();
  }

  private builtinText(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const text = this.evaluate(args[0]);
    const placement = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'above' };
    const style = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'normal' };

    if (text.type !== 'string') {
      throw new MFError('TYPE', 'text() must be string', position, this.filePath);
    }

    if (!track.textAnnotations) {
      track.textAnnotations = [];
    }

    track.textAnnotations.push({
      type: 'textAnnotation',
      tick: track.cursor,
      text: text.value,
      placement: (placement as any).value || 'above',
      style: (style as any).value || 'normal',
    });

    return makeNull();
  }

  private builtinRehearsalMark(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const label = this.evaluate(args[0]);
    const enclosure = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'rectangle' };

    if (label.type !== 'string') {
      throw new MFError('TYPE', 'rehearsalMark() label must be string', position, this.filePath);
    }

    if (!track.rehearsalMarks) {
      track.rehearsalMarks = [];
    }

    track.rehearsalMarks.push({
      type: 'rehearsalMark',
      tick: track.cursor,
      label: label.value,
      enclosure: (enclosure as any).value || 'rectangle',
    });

    return makeNull();
  }

  private builtinDirection(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const text = this.evaluate(args[0]);

    if (text.type !== 'string') {
      throw new MFError('TYPE', 'direction() text must be string', position, this.filePath);
    }

    if (!track.directionTexts) {
      track.directionTexts = [];
    }

    track.directionTexts.push({
      type: 'directionText',
      tick: track.cursor,
      text: text.value,
    });

    return makeNull();
  }

  private executeCallback(callback: Expression, position: any): void {
    if (callback.kind === 'CallExpression') {
      this.evaluateCall(callback.callee, callback.arguments, position);
    }
  }

  // ============================================
  // Audio Manipulation
  // ============================================

  private builtinTimeStretch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const ratio = this.evaluate(args[1]);
    const preservePitch = args.length > 2 ? isTruthy(this.evaluate(args[2])) : true;
    const algorithm = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'elastique' };

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'timeStretch() clipId must be string', position, this.filePath);
    }

    if (!track.timeStretchEvents) {
      track.timeStretchEvents = [];
    }

    track.timeStretchEvents.push({
      type: 'timeStretch',
      tick: track.cursor,
      clipId: clipId.value,
      ratio: toNumber(ratio),
      preservePitch,
      algorithm: (algorithm as any).value || 'elastique',
    });

    return makeNull();
  }

  private builtinPitchShift(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const semitones = this.evaluate(args[1]);
    const cents = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const preserveFormants = args.length > 3 ? isTruthy(this.evaluate(args[3])) : true;

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'pitchShift() clipId must be string', position, this.filePath);
    }

    if (!track.pitchShiftEvents) {
      track.pitchShiftEvents = [];
    }

    track.pitchShiftEvents.push({
      type: 'pitchShift',
      tick: track.cursor,
      clipId: clipId.value,
      semitones: toNumber(semitones),
      cents,
      preserveFormants,
    });

    return makeNull();
  }

  private builtinSampleSlicer(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const mode = this.evaluate(args[1]);
    const sensitivity = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (clipId.type !== 'string' || mode.type !== 'string') {
      throw new MFError('TYPE', 'sampleSlicer() requires string arguments', position, this.filePath);
    }

    if (!track.sampleSlicers) {
      track.sampleSlicers = [];
    }

    track.sampleSlicers.push({
      type: 'sampleSlicer',
      tick: track.cursor,
      clipId: clipId.value,
      slices: [],
      mode: mode.value as 'transient' | 'grid' | 'manual',
      sensitivity,
    });

    return makeNull();
  }

  private builtinGranular(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const grainSize = toNumber(this.evaluate(args[1]));
    const grainDensity = toNumber(this.evaluate(args[2]));
    const pos = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0.5;

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'granular() clipId must be string', position, this.filePath);
    }

    if (!track.granularSynths) {
      track.granularSynths = [];
    }

    track.granularSynths.push({
      type: 'granular',
      tick: track.cursor,
      clipId: clipId.value,
      grainSize,
      grainDensity,
      position: pos,
      positionRandom: 0,
      pitchRandom: 0,
      pan: 0,
      panRandom: 0,
    });

    return makeNull();
  }

  // ============================================
  // Advanced Automation
  // ============================================

  private builtinAutomationLane(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const parameter = this.evaluate(args[0]);

    if (parameter.type !== 'string') {
      throw new MFError('TYPE', 'automationLane() parameter must be string', position, this.filePath);
    }

    if (!track.automationLanes) {
      track.automationLanes = [];
    }

    track.automationLanes.push({
      type: 'automationLane',
      parameter: parameter.value,
      points: [],
    });

    return makeNull();
  }

  private builtinAutomationPoint(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const parameter = this.evaluate(args[0]);
    const value = toNumber(this.evaluate(args[1]));
    const curve = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'linear' };

    if (parameter.type !== 'string') {
      throw new MFError('TYPE', 'automationPoint() parameter must be string', position, this.filePath);
    }

    if (!track.automationLanes) {
      track.automationLanes = [];
    }

    let lane = track.automationLanes.find(l => l.parameter === parameter.value);
    if (!lane) {
      lane = { type: 'automationLane', parameter: parameter.value, points: [] };
      track.automationLanes.push(lane);
    }

    lane.points.push({
      tick: track.cursor,
      value,
      curve: (curve as any).value as AutomationCurveType || 'linear',
    });

    return makeNull();
  }

  private builtinLFO(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const target = this.evaluate(args[0]);
    const waveform = this.evaluate(args[1]);
    const rate = toNumber(this.evaluate(args[2]));
    const depth = toNumber(this.evaluate(args[3]));

    if (target.type !== 'string' || waveform.type !== 'string') {
      throw new MFError('TYPE', 'lfo() target and waveform must be strings', position, this.filePath);
    }

    if (!track.lfoModulations) {
      track.lfoModulations = [];
    }

    track.lfoModulations.push({
      type: 'lfoModulation',
      tick: track.cursor,
      target: target.value,
      waveform: waveform.value as any,
      rate,
      depth,
      phase: 0,
      offset: 0,
    });

    return makeNull();
  }

  private builtinEnvelopeFollower(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sourceTrack = this.evaluate(args[0]);
    const target = this.evaluate(args[1]);
    const attack = toNumber(this.evaluate(args[2]));
    const release = toNumber(this.evaluate(args[3]));

    if (sourceTrack.type !== 'string' || target.type !== 'string') {
      throw new MFError('TYPE', 'envelopeFollower() requires string arguments', position, this.filePath);
    }

    if (!track.envelopeFollowers) {
      track.envelopeFollowers = [];
    }

    track.envelopeFollowers.push({
      type: 'envelopeFollower',
      tick: track.cursor,
      sourceTrack: sourceTrack.value,
      target: target.value,
      attack,
      release,
      gain: 1,
      min: 0,
      max: 1,
    });

    return makeNull();
  }

  private builtinModMatrix(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const source = this.evaluate(args[0]);
    const destination = this.evaluate(args[1]);
    const amount = toNumber(this.evaluate(args[2]));

    if (source.type !== 'string' || destination.type !== 'string') {
      throw new MFError('TYPE', 'modMatrix() requires string arguments', position, this.filePath);
    }

    if (!track.modulationMatrix) {
      track.modulationMatrix = { type: 'modulationMatrix', entries: [] };
    }

    track.modulationMatrix.entries.push({
      source: source.value,
      destination: destination.value,
      amount,
    });

    return makeNull();
  }

  // ============================================
  // Mixing/Mastering
  // ============================================

  private builtinBus(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const name = this.evaluate(args[0]);
    const busType = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'bus' };

    if (name.type !== 'string') {
      throw new MFError('TYPE', 'bus() name must be string', position, this.filePath);
    }

    if (!track.buses) {
      track.buses = [];
    }

    track.buses.push({
      id: name.value,
      name: name.value,
      type: (busType as any).value || 'bus',
      inputTracks: [],
      effects: [],
      volume: 1,
      pan: 0,
    });

    return makeNull();
  }

  private builtinSend(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const toBus = this.evaluate(args[0]);
    const amount = toNumber(this.evaluate(args[1]));
    const preFader = args.length > 2 ? isTruthy(this.evaluate(args[2])) : false;

    if (toBus.type !== 'string') {
      throw new MFError('TYPE', 'send() toBus must be string', position, this.filePath);
    }

    if (!track.sends) {
      track.sends = [];
    }

    track.sends.push({
      type: 'send',
      tick: track.cursor,
      fromTrack: track.id,
      toBus: toBus.value,
      amount,
      preFader,
    });

    return makeNull();
  }

  private builtinStereoWidth(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const width = toNumber(this.evaluate(args[0]));

    if (!track.stereoWidthEvents) {
      track.stereoWidthEvents = [];
    }

    track.stereoWidthEvents.push({
      type: 'stereoWidth',
      tick: track.cursor,
      width,
    });

    return makeNull();
  }

  private builtinLimiter(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const threshold = toNumber(this.evaluate(args[0]));
    const ceiling = toNumber(this.evaluate(args[1]));
    const release = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'limiter',
      params: { threshold, ceiling, release },
    });

    return makeNull();
  }

  private builtinMaximizer(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const threshold = toNumber(this.evaluate(args[0]));
    const ceiling = toNumber(this.evaluate(args[1]));

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'limiter',
      params: { threshold, ceiling, release: 50, isMaximizer: 1 },
    });

    return makeNull();
  }

  private builtinMultibandComp(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowFreq = toNumber(this.evaluate(args[0]));
    const highFreq = toNumber(this.evaluate(args[1]));
    const threshold = toNumber(this.evaluate(args[2]));
    const ratio = toNumber(this.evaluate(args[3]));

    if (!track.effects) {
      track.effects = [];
    }

    track.effects.push({
      type: 'effect',
      effectType: 'compressor',
      params: { lowFreq, highFreq, threshold, ratio, multiband: 1 },
    });

    return makeNull();
  }

  private builtinSpatial(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const format = this.evaluate(args[0]);
    const x = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0;
    const y = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const z = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0;

    if (format.type !== 'string') {
      throw new MFError('TYPE', 'spatial() format must be string', position, this.filePath);
    }

    if (!track.spatialEvents) {
      track.spatialEvents = [];
    }

    track.spatialEvents.push({
      type: 'spatial',
      tick: track.cursor,
      format: format.value as SpatialFormat,
      position: { x, y, z },
    });

    return makeNull();
  }

  private builtinSurroundPan(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const L = toNumber(this.evaluate(args[0]));
    const R = toNumber(this.evaluate(args[1]));
    const C = toNumber(this.evaluate(args[2]));
    const LFE = toNumber(this.evaluate(args[3]));
    const Ls = toNumber(this.evaluate(args[4]));
    const Rs = toNumber(this.evaluate(args[5]));

    if (!track.surroundPans) {
      track.surroundPans = [];
    }

    track.surroundPans.push({
      type: 'surroundPan',
      tick: track.cursor,
      trackId: track.id,
      channels: { L, R, C, LFE, Ls, Rs },
    });

    return makeNull();
  }

  // ============================================
  // MIDI Extensions
  // ============================================

  private builtinMPE(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const masterChannel = toNumber(this.evaluate(args[0]));
    const memberChannels = toNumber(this.evaluate(args[1]));
    const pitchBendRange = args.length > 2 ? toNumber(this.evaluate(args[2])) : 48;

    track.mpeConfig = {
      type: 'mpeConfig',
      zones: [{ masterChannel, memberChannels, pitchBendRange }],
      enabled: true,
    };

    return makeNull();
  }

  private builtinMPENote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const slide = args.length > 2 ? toNumber(this.evaluate(args[2])) : undefined;
    const pressure = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

    if (pitch.type !== 'pitch' || dur.type !== 'dur') {
      throw new MFError('TYPE', 'mpeNote() requires pitch and duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    track.events.push({
      type: 'note',
      tick: track.cursor,
      dur: durTicks,
      key: pitch.midi,
      vel: track.defaultVel || 100,
    } as NoteEvent);

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinArpeggiator(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const mode = this.evaluate(args[0]);
    const rate = this.evaluate(args[1]);
    const octaves = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
    const gate = args.length > 3 ? toNumber(this.evaluate(args[3])) : 75;

    if (mode.type !== 'string' || rate.type !== 'string') {
      throw new MFError('TYPE', 'arpeggiator() mode and rate must be strings', position, this.filePath);
    }

    if (!track.arpeggiators) {
      track.arpeggiators = [];
    }

    track.arpeggiators.push({
      type: 'arpeggiator',
      tick: track.cursor,
      mode: mode.value as any,
      rate: rate.value,
      octaves,
      gate,
    });

    return makeNull();
  }

  private builtinChordMemory(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const triggerNote = this.evaluate(args[0]);
    const chordArg = this.evaluate(args[1]);

    if (triggerNote.type !== 'pitch') {
      throw new MFError('TYPE', 'chordMemory() trigger must be pitch', position, this.filePath);
    }

    const chord = chordArg.type === 'array'
      ? chordArg.elements.map((e: RuntimeValue) => e.type === 'pitch' ? e.midi : toNumber(e))
      : [];

    if (!track.chordMemories) {
      track.chordMemories = [];
    }

    track.chordMemories.push({
      type: 'chordMemory',
      tick: track.cursor,
      triggerNote: triggerNote.midi,
      chord,
    });

    return makeNull();
  }

  private builtinChordTrigger(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const root = this.evaluate(args[0]);
    const chordType = this.evaluate(args[1]);
    const voicing = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'close' };

    if (root.type !== 'pitch' || chordType.type !== 'string') {
      throw new MFError('TYPE', 'chordTrigger() requires pitch and string', position, this.filePath);
    }

    if (!track.chordTriggers) {
      track.chordTriggers = [];
    }

    track.chordTriggers.push({
      type: 'chordTrigger',
      tick: track.cursor,
      root: root.midi,
      chordType: chordType.value,
      voicing: (voicing as any).value || 'close',
    });

    return makeNull();
  }

  // ============================================
  // Advanced Notation
  // ============================================

  private builtinAdditiveTimeSig(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);

    const groupsArg = this.evaluate(args[0]);
    const denominator = toNumber(this.evaluate(args[1]));

    const groups = groupsArg.type === 'array'
      ? groupsArg.elements.map((e: RuntimeValue) => toNumber(e))
      : [toNumber(groupsArg)];

    // Store as standard time sig with combined numerator
    const numerator = groups.reduce((a, b) => a + b, 0);
    this.ir.timeSigs.push({
      tick: 0,
      numerator,
      denominator,
    });

    return makeNull();
  }

  private builtinPolymetric(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    const timeSigArg = args.length > 1 ? this.evaluate(args[1]) : null;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'polymetric() requires duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.polymetricSections) {
      track.polymetricSections = [];
    }

    track.polymetricSections.push({
      type: 'polymetric',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      trackTimeSigs: {},
    });

    return makeNull();
  }

  private builtinProportional(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    const spacePerBeat = args.length > 1 ? toNumber(this.evaluate(args[1])) : 10;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'proportional() requires duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.proportionalNotation) {
      track.proportionalNotation = [];
    }

    track.proportionalNotation.push({
      type: 'proportionalNotation',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      spacePerBeat,
    });

    return makeNull();
  }

  private builtinGraphic(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const shape = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const description = args.length > 2 ? this.evaluate(args[2]) : null;

    if (shape.type !== 'string' || dur.type !== 'dur') {
      throw new MFError('TYPE', 'graphic() requires shape string and duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.graphicNotation) {
      track.graphicNotation = [];
    }

    track.graphicNotation.push({
      type: 'graphicNotation',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      shape: shape.value as any,
      description: description?.type === 'string' ? description.value : undefined,
    });

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinAleatoric(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    const instructions = args.length > 1 ? this.evaluate(args[1]) : null;
    const durationType = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'free' };

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'aleatoric() requires duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.aleatoricBoxes) {
      track.aleatoricBoxes = [];
    }

    track.aleatoricBoxes.push({
      type: 'aleatoricBox',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      contents: [],
      instructions: instructions?.type === 'string' ? instructions.value : undefined,
      duration: (durationType as any).value || 'free',
    });

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinCutaway(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const targetTrackId = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const showWhenPlaying = args.length > 2 ? isTruthy(this.evaluate(args[2])) : true;

    if (targetTrackId.type !== 'string' || dur.type !== 'dur') {
      throw new MFError('TYPE', 'cutaway() requires track ID and duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.cutawayScores) {
      track.cutawayScores = [];
    }

    track.cutawayScores.push({
      type: 'cutaway',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      trackId: targetTrackId.value,
      showWhenPlaying,
    });

    return makeNull();
  }

  private builtinTransposing(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const transposition = toNumber(this.evaluate(args[0]));
    const writtenPitch = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'transposed' };

    track.transposingInstrument = {
      type: 'transposingInstrument',
      trackId: track.id,
      writtenPitch: (writtenPitch as any).value || 'transposed',
      transposition,
    };

    return makeNull();
  }

  // ============================================
  // Sampling
  // ============================================

  private builtinSampler(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const name = this.evaluate(args[0]);

    if (name.type !== 'string') {
      throw new MFError('TYPE', 'sampler() name must be string', position, this.filePath);
    }

    if (!track.samplerInstruments) {
      track.samplerInstruments = [];
    }

    track.samplerInstruments.push({
      type: 'sampler',
      id: name.value,
      name: name.value,
      zones: [],
    });

    return makeNull();
  }

  private builtinSampleZone(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const filePath = this.evaluate(args[0]);
    const rootNote = this.evaluate(args[1]);
    const lowNote = args.length > 2 ? this.evaluate(args[2]) : rootNote;
    const highNote = args.length > 3 ? this.evaluate(args[3]) : rootNote;

    if (filePath.type !== 'string') {
      throw new MFError('TYPE', 'sampleZone() filePath must be string', position, this.filePath);
    }

    const zone: SampleZone = {
      filePath: filePath.value,
      rootNote: rootNote.type === 'pitch' ? rootNote.midi : toNumber(rootNote),
      lowNote: lowNote.type === 'pitch' ? lowNote.midi : toNumber(lowNote),
      highNote: highNote.type === 'pitch' ? highNote.midi : toNumber(highNote),
      lowVelocity: 1,
      highVelocity: 127,
    };

    if (track.samplerInstruments && track.samplerInstruments.length > 0) {
      track.samplerInstruments[track.samplerInstruments.length - 1].zones.push(zone);
    }

    return makeNull();
  }

  private builtinRoundRobin(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const mode = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'cycle' };

    if (track.samplerInstruments && track.samplerInstruments.length > 0) {
      const sampler = track.samplerInstruments[track.samplerInstruments.length - 1];
      if (!sampler.roundRobins) {
        sampler.roundRobins = [];
      }
      sampler.roundRobins.push({
        type: 'roundRobin',
        zones: [],
        mode: (mode as any).value || 'cycle',
      });
    }

    return makeNull();
  }

  private builtinVelocityLayer(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowVelocity = toNumber(this.evaluate(args[0]));
    const highVelocity = toNumber(this.evaluate(args[1]));
    const crossfade = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;

    if (track.samplerInstruments && track.samplerInstruments.length > 0) {
      const sampler = track.samplerInstruments[track.samplerInstruments.length - 1];
      if (!sampler.velocityLayers) {
        sampler.velocityLayers = [];
      }
      sampler.velocityLayers.push({
        type: 'velocityLayer',
        lowVelocity,
        highVelocity,
        zones: [],
        crossfade,
      });
    }

    return makeNull();
  }

  private builtinKeySwitch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const triggerNote = this.evaluate(args[0]);
    const articulation = this.evaluate(args[1]);
    const latching = args.length > 2 ? isTruthy(this.evaluate(args[2])) : true;

    if (triggerNote.type !== 'pitch' || articulation.type !== 'string') {
      throw new MFError('TYPE', 'keySwitch() requires pitch and string', position, this.filePath);
    }

    if (track.samplerInstruments && track.samplerInstruments.length > 0) {
      const sampler = track.samplerInstruments[track.samplerInstruments.length - 1];
      if (!sampler.keySwitches) {
        sampler.keySwitches = [];
      }
      sampler.keySwitches.push({
        type: 'keySwitch',
        triggerNote: triggerNote.midi,
        articulation: articulation.value,
        samples: [],
        latching,
      });
    }

    return makeNull();
  }

  // ============================================
  // Analysis
  // ============================================

  private builtinSpectrumAnalyzer(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const fftSize = args.length > 0 ? toNumber(this.evaluate(args[0])) : 2048;
    const scale = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'logarithmic' };

    track.spectrumAnalyzer = {
      type: 'spectrumAnalyzer',
      fftSize: fftSize as 512 | 1024 | 2048 | 4096 | 8192 | 16384,
      windowType: 'hanning',
      overlap: 0.5,
      minFreq: 20,
      maxFreq: 20000,
      minDb: -90,
      maxDb: 0,
      scale: (scale as any).value || 'logarithmic',
      smoothing: 0.8,
    };

    return makeNull();
  }

  private builtinLoudnessMeter(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const standard = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'EBU-R128' };
    const targetLUFS = args.length > 1 ? toNumber(this.evaluate(args[1])) : -14;

    track.loudnessMeter = {
      type: 'loudnessMeter',
      standard: (standard as any).value || 'EBU-R128',
      targetLUFS,
      truePeak: true,
    };

    return makeNull();
  }

  private builtinPhaseMeter(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const displayMode = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'goniometer' };

    track.phaseCorrelationMeter = {
      type: 'phaseCorrelation',
      windowSize: 50,
      displayMode: (displayMode as any).value || 'goniometer',
    };

    return makeNull();
  }

  private builtinAnalyzerSnapshot(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.analyzerSnapshots) {
      track.analyzerSnapshots = [];
    }

    track.analyzerSnapshots.push({
      type: 'analyzerSnapshot',
      tick: track.cursor,
    });

    return makeNull();
  }

  // ============================================
  // Advanced Audio Processing
  // ============================================

  private builtinVocoder(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const carrierType = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'synth' };
    const bands = args.length > 1 ? toNumber(this.evaluate(args[1])) : 16;
    const formantShift = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'vocoder',
      carrierType: (carrierType as any).value || 'synth',
      bands,
      formantShift,
      attack: 5,
      release: 50,
      highFreqEmphasis: 50,
      params: { mix: 100, bypass: false },
    } as any);

    return makeNull();
  }

  private builtinConvolutionReverb(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const irFile = this.evaluate(args[0]);
    const predelay = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0;
    const decay = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;
    const mix = args.length > 3 ? toNumber(this.evaluate(args[3])) : 30;

    if (irFile.type !== 'string') {
      throw new MFError('TYPE', 'convolutionReverb() IR file must be string', position, this.filePath);
    }

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'convolutionReverb',
      irFile: irFile.value,
      predelay,
      decay,
      lowCut: 20,
      highCut: 20000,
      mix,
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinAmpSim(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const ampType = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'clean' };
    const gain = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const master = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'ampSimulator',
      ampType: (ampType as any).value || 'clean',
      gain,
      tone: { bass: 0, mid: 0, treble: 0, presence: 0 },
      master,
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinCabinetSim(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const cabType = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: '4x12' };
    const micType = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'dynamic' };
    const micPosition = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'on-axis' };

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'cabinetSimulator',
      cabType: (cabType as any).value || '4x12',
      micType: (micType as any).value || 'dynamic',
      micPosition: (micPosition as any).value || 'on-axis',
      distance: 50,
      roomMix: 20,
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinTapeSaturation(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const tapeType = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: '15ips' };
    const saturation = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const inputGain = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'tapeSaturation',
      tapeType: (tapeType as any).value || '15ips',
      inputGain,
      saturation,
      bias: 50,
      flutter: 20,
      wowRate: 0.5,
      hiss: 10,
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinTransientShaper(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const attack = args.length > 0 ? toNumber(this.evaluate(args[0])) : 0;
    const sustain = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0;
    const outputGain = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'transientShaper',
      attack,
      sustain,
      outputGain,
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinDeEsser(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const frequency = args.length > 0 ? toNumber(this.evaluate(args[0])) : 6000;
    const threshold = args.length > 1 ? toNumber(this.evaluate(args[1])) : -20;
    const ratio = args.length > 2 ? toNumber(this.evaluate(args[2])) : 4;

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'deEsser',
      frequency,
      threshold,
      ratio,
      range: 12,
      mode: 'split',
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinExciter(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const frequency = args.length > 0 ? toNumber(this.evaluate(args[0])) : 3000;
    const harmonics = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const mix = args.length > 2 ? toNumber(this.evaluate(args[2])) : 30;
    const mode = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'tube' };

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'exciter',
      frequency,
      harmonics,
      mix,
      mode: (mode as any).value || 'tube',
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinNoiseReduction(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const threshold = args.length > 0 ? toNumber(this.evaluate(args[0])) : -40;
    const reduction = args.length > 1 ? toNumber(this.evaluate(args[1])) : 20;
    const mode = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'broadband' };

    if (!track.effects) track.effects = [];
    track.effects.push({
      type: 'effect',
      tick: track.cursor,
      effectType: 'noiseReduction',
      threshold,
      reduction,
      attack: 5,
      release: 100,
      mode: (mode as any).value || 'broadband',
      params: { bypass: false },
    } as any);

    return makeNull();
  }

  private builtinSpectralEdit(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowFreq = toNumber(this.evaluate(args[0]));
    const highFreq = toNumber(this.evaluate(args[1]));
    const dur = this.evaluate(args[2]);
    const operation = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'cut' };
    const gain = args.length > 4 ? toNumber(this.evaluate(args[4])) : -12;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'spectralEdit() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.spectralEdits) {
      track.spectralEdits = [];
    }

    track.spectralEdits.push({
      type: 'spectralEdit',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      lowFreq,
      highFreq,
      operation: (operation as any).value || 'cut',
      gain,
    });

    return makeNull();
  }

  // ============================================
  // Sequencing Extensions
  // ============================================

  private builtinStepSequencer(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const steps = args.length > 1 ? toNumber(this.evaluate(args[1])) : 16;
    const rate = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: '16n' };
    const direction = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'forward' };

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'stepSequencer() id must be string', position, this.filePath);
    }

    if (!track.stepSequencers) {
      track.stepSequencers = [];
    }

    track.stepSequencers.push({
      type: 'stepSequencer',
      id: id.value,
      steps,
      rate: (rate as any).value || '16n',
      pattern: [],
      direction: (direction as any).value || 'forward',
    });

    return makeNull();
  }

  private builtinStep(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const stepNum = Math.floor(toNumber(this.evaluate(args[0])));
    const note = args.length > 1 ? this.evaluate(args[1]) : null;
    const velocity = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;
    const gate = args.length > 3 ? toNumber(this.evaluate(args[3])) : 80;
    const probability = args.length > 4 ? toNumber(this.evaluate(args[4])) : 100;

    if (track.stepSequencers && track.stepSequencers.length > 0) {
      const sequencer = track.stepSequencers[track.stepSequencers.length - 1];
      sequencer.pattern.push({
        active: true,
        note: note?.type === 'pitch' ? note.midi : undefined,
        velocity,
        gate,
        probability,
        offset: 0,
      });
    }

    return makeNull();
  }

  private builtinFollowAction(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const action = this.evaluate(args[1]);
    const probability = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;
    const time = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0;

    if (clipId.type !== 'string' || action.type !== 'string') {
      throw new MFError('TYPE', 'followAction() clipId and action must be strings', position, this.filePath);
    }

    if (!track.followActions) {
      track.followActions = [];
    }

    track.followActions.push({
      type: 'followAction',
      clipId: clipId.value,
      action: action.value as any,
      probability,
      time,
    });

    return makeNull();
  }

  private builtinScaleLock(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const root = toNumber(this.evaluate(args[0]));
    const scale = this.evaluate(args[1]);
    const mode = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'nearest' };

    if (scale.type !== 'string') {
      throw new MFError('TYPE', 'scaleLock() scale must be string', position, this.filePath);
    }

    if (!track.scaleLocks) {
      track.scaleLocks = [];
    }

    track.scaleLocks.push({
      type: 'scaleLock',
      tick: track.cursor,
      root: root % 12,
      scale: scale.value as any,
      mode: (mode as any).value || 'nearest',
    });

    return makeNull();
  }

  private builtinChordLock(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const root = toNumber(this.evaluate(args[0]));
    const chordType = this.evaluate(args[1]);
    const voicing = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'close' };

    if (chordType.type !== 'string') {
      throw new MFError('TYPE', 'chordLock() chordType must be string', position, this.filePath);
    }

    if (!track.chordLocks) {
      track.chordLocks = [];
    }

    track.chordLocks.push({
      type: 'chordLock',
      tick: track.cursor,
      root: root % 12,
      chordType: chordType.value,
      voicing: (voicing as any).value || 'close',
    });

    return makeNull();
  }

  private builtinDivisi(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const parts = Math.floor(toNumber(this.evaluate(args[0])));
    const dur = this.evaluate(args[1]);
    const method = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'top-down' };

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'divisi() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.divisiSections) {
      track.divisiSections = [];
    }

    track.divisiSections.push({
      type: 'divisi',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      trackId: track.id,
      parts: Math.max(2, Math.min(8, parts)),
      method: (method as any).value || 'top-down',
    });

    return makeNull();
  }

  private builtinExpressionMap(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const name = args.length > 1 ? this.evaluate(args[1]) : id;

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'expressionMap() id must be string', position, this.filePath);
    }

    if (!track.expressionMaps) {
      track.expressionMaps = [];
    }

    track.expressionMaps.push({
      type: 'expressionMap',
      id: id.value,
      name: name.type === 'string' ? name.value : id.value,
      entries: [],
    });

    return makeNull();
  }

  private builtinArticulationMapping(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const articulation = this.evaluate(args[0]);
    const keyswitch = args.length > 1 ? this.evaluate(args[1]) : null;
    const programChange = args.length > 2 ? toNumber(this.evaluate(args[2])) : undefined;

    if (articulation.type !== 'string') {
      throw new MFError('TYPE', 'articulation() name must be string', position, this.filePath);
    }

    if (track.expressionMaps && track.expressionMaps.length > 0) {
      const expMap = track.expressionMaps[track.expressionMaps.length - 1];
      expMap.entries.push({
        articulation: articulation.value,
        keyswitch: keyswitch?.type === 'pitch' ? keyswitch.midi : undefined,
        programChange,
      });
    }

    return makeNull();
  }

  // ============================================
  // Sync & Communication
  // ============================================

  private builtinOSC(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sendPort = args.length > 0 ? toNumber(this.evaluate(args[0])) : 8000;
    const receivePort = args.length > 1 ? toNumber(this.evaluate(args[1])) : 9000;
    const sendHost = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: '127.0.0.1' };

    track.oscConfig = {
      type: 'oscConfig',
      enabled: true,
      sendPort,
      receivePort,
      sendHost: (sendHost as any).value || '127.0.0.1',
    };

    return makeNull();
  }

  private builtinOSCMap(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const address = this.evaluate(args[0]);
    const target = this.evaluate(args[1]);
    const min = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const max = args.length > 3 ? toNumber(this.evaluate(args[3])) : 127;

    if (address.type !== 'string' || target.type !== 'string') {
      throw new MFError('TYPE', 'oscMap() address and target must be strings', position, this.filePath);
    }

    if (!track.oscMappings) {
      track.oscMappings = [];
    }

    track.oscMappings.push({
      type: 'oscMapping',
      address: address.value,
      target: target.value,
      min,
      max,
    });

    return makeNull();
  }

  private builtinNetworkMIDI(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sessionName = this.evaluate(args[0]);
    const port = args.length > 1 ? toNumber(this.evaluate(args[1])) : 5004;
    const protocol = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'rtp-midi' };

    if (sessionName.type !== 'string') {
      throw new MFError('TYPE', 'networkMidi() sessionName must be string', position, this.filePath);
    }

    track.networkMidiConfig = {
      type: 'networkMidi',
      enabled: true,
      sessionName: sessionName.value,
      port,
      protocol: (protocol as any).value || 'rtp-midi',
    };

    return makeNull();
  }

  private builtinMIDIClock(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const mode = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'master' };
    const outputPort = args.length > 1 ? this.evaluate(args[1]) : null;

    track.midiClockConfig = {
      type: 'midiClock',
      mode: (mode as any).value || 'master',
      sendStart: true,
      sendContinue: true,
      sendStop: true,
      outputPort: outputPort?.type === 'string' ? outputPort.value : undefined,
    };

    return makeNull();
  }

  private builtinTimecode(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const format = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'mtc' };
    const frameRate = args.length > 1 ? toNumber(this.evaluate(args[1])) : 30;
    const mode = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'generate' };
    const offset = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: '00:00:00:00' };

    track.timecodeConfig = {
      type: 'timecode',
      format: (format as any).value || 'mtc',
      frameRate: frameRate as 24 | 25 | 29.97 | 30,
      dropFrame: false,
      offset: (offset as any).value || '00:00:00:00',
      mode: (mode as any).value || 'generate',
    };

    return makeNull();
  }

  // ============================================
  // Mastering
  // ============================================

  private builtinDithering(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const targetBitDepth = args.length > 0 ? toNumber(this.evaluate(args[0])) : 16;
    const noiseShaping = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'pow-r' };
    const ditherType = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'triangular' };

    track.ditheringConfig = {
      type: 'dithering',
      targetBitDepth: (targetBitDepth === 24 ? 24 : 16) as 16 | 24,
      noiseShaping: (noiseShaping as any).value || 'pow-r',
      ditherType: (ditherType as any).value || 'triangular',
      autoblack: true,
    };

    return makeNull();
  }

  private builtinLoudnessMatch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const targetLUFS = args.length > 0 ? toNumber(this.evaluate(args[0])) : -14;
    const maxTruePeak = args.length > 1 ? toNumber(this.evaluate(args[1])) : -1;
    const algorithm = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'lufs' };

    track.loudnessMatchingConfig = {
      type: 'loudnessMatching',
      targetLUFS,
      maxTruePeak,
      tolerance: 0.5,
      algorithm: (algorithm as any).value || 'lufs',
    };

    return makeNull();
  }

  private builtinReferenceTrack(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const filePath = this.evaluate(args[0]);
    const gain = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0;

    if (filePath.type !== 'string') {
      throw new MFError('TYPE', 'referenceTrack() filePath must be string', position, this.filePath);
    }

    if (!track.referenceTracks) {
      track.referenceTracks = [];
    }

    track.referenceTracks.push({
      type: 'referenceTrack',
      filePath: filePath.value,
      gain,
      active: true,
    });

    return makeNull();
  }

  // ============================================
  // Metadata
  // ============================================

  private builtinID3(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const field = this.evaluate(args[0]);
    const value = this.evaluate(args[1]);

    if (field.type !== 'string') {
      throw new MFError('TYPE', 'id3() field must be string', position, this.filePath);
    }

    if (!track.id3Metadata) {
      track.id3Metadata = { type: 'id3' };
    }

    const fieldName = field.value as keyof typeof track.id3Metadata;
    if (value.type === 'string') {
      (track.id3Metadata as any)[fieldName] = value.value;
    } else if (value.type === 'int' || value.type === 'float') {
      (track.id3Metadata as any)[fieldName] = value.value;
    }

    return makeNull();
  }

  private builtinISRC(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const code = this.evaluate(args[0]);
    const trackId = args.length > 1 ? this.evaluate(args[1]) : null;

    if (code.type !== 'string') {
      throw new MFError('TYPE', 'isrc() code must be string', position, this.filePath);
    }

    if (!track.isrcCodes) {
      track.isrcCodes = [];
    }

    track.isrcCodes.push({
      type: 'isrc',
      code: code.value,
      trackId: trackId?.type === 'string' ? trackId.value : undefined,
    });

    return makeNull();
  }

  private builtinSongStructure(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const section = this.evaluate(args[0]);
    const label = args.length > 1 ? this.evaluate(args[1]) : null;
    const color = args.length > 2 ? this.evaluate(args[2]) : null;

    if (section.type !== 'string') {
      throw new MFError('TYPE', 'songStructure() section must be string', position, this.filePath);
    }

    if (!track.songStructureMarkers) {
      track.songStructureMarkers = [];
    }

    track.songStructureMarkers.push({
      type: 'songStructure',
      tick: track.cursor,
      section: section.value as any,
      label: label?.type === 'string' ? label.value : undefined,
      color: color?.type === 'string' ? color.value : undefined,
    });

    return makeNull();
  }

  // ============================================
  // Audio Editing & Restoration
  // ============================================

  private builtinFreeze(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const startTick = track.cursor;
    const dur = this.evaluate(args[0]);

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'freeze() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.freezeTracks) {
      track.freezeTracks = [];
    }

    track.freezeTracks.push({
      type: 'freeze',
      trackId: track.id,
      startTick,
      endTick: startTick + durTicks,
    });

    return makeNull();
  }

  private builtinAudioWarp(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const mode = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'beats' };
    const quantizeStrength = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'audioWarp() clipId must be string', position, this.filePath);
    }

    if (!track.audioWarps) {
      track.audioWarps = [];
    }

    track.audioWarps.push({
      type: 'audioWarp',
      audioClipId: clipId.value,
      mode: (mode as any).value || 'beats',
      quantizeStrength,
      preserveTransients: true,
    });

    return makeNull();
  }

  private builtinWarpMarker(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const originalPos = toNumber(this.evaluate(args[1]));
    const warpedPos = toNumber(this.evaluate(args[2]));

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'warpMarker() clipId must be string', position, this.filePath);
    }

    if (!track.warpMarkers) {
      track.warpMarkers = [];
    }

    track.warpMarkers.push({
      type: 'warpMarker',
      audioClipId: clipId.value,
      originalPosition: originalPos,
      warpedPosition: warpedPos,
    });

    return makeNull();
  }

  private builtinBeatSlice(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clipId = this.evaluate(args[0]);
    const sensitivity = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const minLength = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (clipId.type !== 'string') {
      throw new MFError('TYPE', 'beatSlice() clipId must be string', position, this.filePath);
    }

    if (!track.beatSlices) {
      track.beatSlices = [];
    }

    track.beatSlices.push({
      type: 'beatSlice',
      audioClipId: clipId.value,
      slicePoints: [],
      sensitivity,
      minSliceLength: minLength,
    });

    return makeNull();
  }

  private builtinSpectralRepair(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowFreq = toNumber(this.evaluate(args[0]));
    const highFreq = toNumber(this.evaluate(args[1]));
    const dur = this.evaluate(args[2]);
    const repairType = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'attenuate' };
    const strength = args.length > 4 ? toNumber(this.evaluate(args[4])) : 50;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'spectralRepair() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.spectralRepairs) {
      track.spectralRepairs = [];
    }

    track.spectralRepairs.push({
      type: 'spectralRepair',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      lowFreq,
      highFreq,
      repairType: (repairType as any).value || 'attenuate',
      strength,
    });

    return makeNull();
  }

  private builtinAudioRestore(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const mode = this.evaluate(args[0]);
    const threshold = args.length > 1 ? toNumber(this.evaluate(args[1])) : -20;
    const strength = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
    const frequency = args.length > 3 ? toNumber(this.evaluate(args[3])) : 50;

    if (mode.type !== 'string') {
      throw new MFError('TYPE', 'audioRestore() mode must be string', position, this.filePath);
    }

    if (!track.audioRestorations) {
      track.audioRestorations = [];
    }

    track.audioRestorations.push({
      type: 'audioRestoration',
      mode: mode.value as any,
      threshold,
      strength,
      frequency,
    });

    return makeNull();
  }

  private builtinVocalAlign(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const refTrackId = this.evaluate(args[0]);
    const alignTrackId = this.evaluate(args[1]);
    const tightness = args.length > 2 ? toNumber(this.evaluate(args[2])) : 80;
    const alignPitch = args.length > 3 ? isTruthy(this.evaluate(args[3])) : true;
    const alignTiming = args.length > 4 ? isTruthy(this.evaluate(args[4])) : true;

    if (refTrackId.type !== 'string' || alignTrackId.type !== 'string') {
      throw new MFError('TYPE', 'vocalAlign() track IDs must be strings', position, this.filePath);
    }

    if (!track.vocalAlignments) {
      track.vocalAlignments = [];
    }

    track.vocalAlignments.push({
      type: 'vocalAlignment',
      referenceTrackId: refTrackId.value,
      alignTrackId: alignTrackId.value,
      tightness,
      alignPitch,
      alignTiming,
    });

    return makeNull();
  }

  // ============================================
  // Dynamics Processing
  // ============================================

  private builtinMidSide(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const mode = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'process' };
    const midGain = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0;
    const sideGain = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const midWidth = args.length > 3 ? toNumber(this.evaluate(args[3])) : 100;

    if (!track.midSideProcessing) {
      track.midSideProcessing = [];
    }

    track.midSideProcessing.push({
      type: 'midSide',
      tick: track.cursor,
      mode: (mode as any).value || 'process',
      midGain,
      sideGain,
      midWidth,
    });

    return makeNull();
  }

  private builtinDynamicEQ(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.dynamicEQs) {
      track.dynamicEQs = [];
    }

    track.dynamicEQs.push({
      type: 'dynamicEQ',
      tick: track.cursor,
      bands: [],
    });

    return makeNull();
  }

  private builtinDynamicEQBand(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const freq = toNumber(this.evaluate(args[0]));
    const gain = toNumber(this.evaluate(args[1]));
    const q = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
    const threshold = args.length > 3 ? toNumber(this.evaluate(args[3])) : -20;
    const ratio = args.length > 4 ? toNumber(this.evaluate(args[4])) : 2;
    const dynamicGain = args.length > 5 ? toNumber(this.evaluate(args[5])) : 6;
    const mode = args.length > 6 ? this.evaluate(args[6]) : { type: 'string', value: 'compress' };

    if (track.dynamicEQs && track.dynamicEQs.length > 0) {
      const eq = track.dynamicEQs[track.dynamicEQs.length - 1];
      eq.bands.push({
        frequency: freq,
        gain,
        q,
        threshold,
        ratio,
        attack: 10,
        release: 100,
        dynamicGain,
        mode: (mode as any).value || 'compress',
      });
    }

    return makeNull();
  }

  private builtinLinearPhaseEQ(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const latency = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'medium' };

    if (!track.linearPhaseEQs) {
      track.linearPhaseEQs = [];
    }

    track.linearPhaseEQs.push({
      type: 'linearPhaseEQ',
      tick: track.cursor,
      latency: (latency as any).value || 'medium',
      bands: [],
    });

    return makeNull();
  }

  private builtinEQBand(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const freq = toNumber(this.evaluate(args[0]));
    const gain = toNumber(this.evaluate(args[1]));
    const q = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
    const bandType = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'peak' };

    if (track.linearPhaseEQs && track.linearPhaseEQs.length > 0) {
      const eq = track.linearPhaseEQs[track.linearPhaseEQs.length - 1];
      eq.bands.push({
        frequency: freq,
        gain,
        q,
        type: (bandType as any).value || 'peak',
      });
    }

    return makeNull();
  }

  private builtinParallel(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dryLevel = args.length > 0 ? toNumber(this.evaluate(args[0])) : 50;
    const wetLevel = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const phase = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'normal' };

    if (!track.parallelProcessing) {
      track.parallelProcessing = [];
    }

    track.parallelProcessing.push({
      type: 'parallel',
      tick: track.cursor,
      effectChain: [],
      dryLevel,
      wetLevel,
      phase: (phase as any).value || 'normal',
    });

    return makeNull();
  }

  // ============================================
  // Recording
  // ============================================

  private builtinTakeLane(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (!track.takeLanes) {
      track.takeLanes = [];
    }

    track.takeLanes.push({
      type: 'takeLane',
      trackId: track.id,
      takes: [],
      activeTakeIndex: 0,
    });

    return makeNull();
  }

  private builtinTake(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const name = this.evaluate(args[0]);
    const rating = args.length > 1 ? toNumber(this.evaluate(args[1])) : undefined;

    if (name.type !== 'string') {
      throw new MFError('TYPE', 'take() name must be string', position, this.filePath);
    }

    if (track.takeLanes && track.takeLanes.length > 0) {
      const lane = track.takeLanes[track.takeLanes.length - 1];
      lane.takes.push({
        id: `take_${lane.takes.length + 1}`,
        name: name.value,
        startTick: track.cursor,
        endTick: track.cursor,
        events: [],
        muted: false,
        rating,
      });
    }

    return makeNull();
  }

  private builtinComp(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const takeId = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const crossfadeIn = args.length > 2 ? toNumber(this.evaluate(args[2])) : 48;
    const crossfadeOut = args.length > 3 ? toNumber(this.evaluate(args[3])) : 48;

    if (takeId.type !== 'string' || dur.type !== 'dur') {
      throw new MFError('TYPE', 'comp() requires takeId string and duration', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.compRegions) {
      track.compRegions = [];
    }

    track.compRegions.push({
      type: 'comp',
      trackId: track.id,
      startTick: track.cursor,
      endTick: track.cursor + durTicks,
      sourceTakeId: takeId.value,
      crossfadeIn,
      crossfadeOut,
    });

    return makeNull();
  }

  private builtinPunchIn(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const preroll = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1;

    if (!track.punchPoints) {
      track.punchPoints = [];
    }

    track.punchPoints.push({
      type: 'punch',
      mode: 'in',
      tick: track.cursor,
      preroll,
      postroll: 0,
    });

    return makeNull();
  }

  private builtinPunchOut(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const postroll = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1;

    if (!track.punchPoints) {
      track.punchPoints = [];
    }

    track.punchPoints.push({
      type: 'punch',
      mode: 'out',
      tick: track.cursor,
      preroll: 0,
      postroll,
    });

    return makeNull();
  }

  private builtinLoopRecord(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    const mode = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'takes' };
    const countIn = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
    const maxTakes = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'loopRecord() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.loopRecordings) {
      track.loopRecordings = [];
    }

    track.loopRecordings.push({
      type: 'loopRecording',
      startTick: track.cursor,
      endTick: track.cursor + durTicks,
      mode: (mode as any).value || 'takes',
      countIn,
      maxTakes,
    });

    return makeNull();
  }

  private builtinAutomationRecord(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const param = this.evaluate(args[0]);
    const mode = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'touch' };
    const reduction = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

    if (param.type !== 'string') {
      throw new MFError('TYPE', 'automationRecord() parameter must be string', position, this.filePath);
    }

    if (!track.automationRecordings) {
      track.automationRecordings = [];
    }

    track.automationRecordings.push({
      type: 'automationRecording',
      parameter: param.value,
      mode: (mode as any).value || 'touch',
      reduction,
    });

    return makeNull();
  }

  // ============================================
  // Groove & Humanize
  // ============================================

  private builtinGroove(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const name = args.length > 1 ? this.evaluate(args[1]) : id;
    const quantize = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'groove() id must be string', position, this.filePath);
    }

    if (!track.grooveTemplates) {
      track.grooveTemplates = [];
    }

    track.grooveTemplates.push({
      type: 'groove',
      id: id.value,
      name: name.type === 'string' ? name.value : id.value,
      timingOffsets: [],
      velocityOffsets: [],
      quantizeAmount: quantize,
    });

    return makeNull();
  }

  private builtinApplyGroove(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    // Apply an existing groove template to the track
    return makeNull();
  }

  private builtinHumanizeRegion(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    const timingRange = args.length > 1 ? toNumber(this.evaluate(args[1])) : 10;
    const velocityRange = args.length > 2 ? toNumber(this.evaluate(args[2])) : 10;
    const durationRange = args.length > 3 ? toNumber(this.evaluate(args[3])) : 5;
    const seed = args.length > 4 ? toNumber(this.evaluate(args[4])) : undefined;

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'humanizeRegion() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);

    if (!track.humanizeSettings) {
      track.humanizeSettings = [];
    }

    track.humanizeSettings.push({
      type: 'humanize',
      tick: track.cursor,
      endTick: track.cursor + durTicks,
      timingRange,
      velocityRange,
      durationRange,
      seed,
    });

    return makeNull();
  }

  private builtinRandomize(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const param = this.evaluate(args[0]);
    const min = toNumber(this.evaluate(args[1]));
    const max = toNumber(this.evaluate(args[2]));
    const distribution = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'uniform' };
    const probability = args.length > 4 ? toNumber(this.evaluate(args[4])) : 100;

    if (param.type !== 'string') {
      throw new MFError('TYPE', 'randomize() parameter must be string', position, this.filePath);
    }

    if (!track.randomizations) {
      track.randomizations = [];
    }

    track.randomizations.push({
      type: 'randomize',
      parameter: param.value as any,
      min,
      max,
      distribution: (distribution as any).value || 'uniform',
      probability,
    });

    return makeNull();
  }

  // ============================================
  // Controller & Macro
  // ============================================

  private builtinMIDILearn(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const controlType = this.evaluate(args[1]);
    const targetParam = this.evaluate(args[2]);
    const channel = args.length > 3 ? toNumber(this.evaluate(args[3])) : 1;
    const controlNumber = args.length > 4 ? toNumber(this.evaluate(args[4])) : undefined;

    if (id.type !== 'string' || controlType.type !== 'string' || targetParam.type !== 'string') {
      throw new MFError('TYPE', 'midiLearn() requires string arguments', position, this.filePath);
    }

    if (!track.midiLearnMappings) {
      track.midiLearnMappings = [];
    }

    track.midiLearnMappings.push({
      type: 'midiLearn',
      id: id.value,
      channel,
      controlType: controlType.value as any,
      controlNumber,
      targetParameter: targetParam.value,
      min: 0,
      max: 127,
      curve: 'linear',
    });

    return makeNull();
  }

  private builtinMacro(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const name = args.length > 1 ? this.evaluate(args[1]) : id;
    const value = args.length > 2 ? toNumber(this.evaluate(args[2])) : 64;

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'macro() id must be string', position, this.filePath);
    }

    if (!track.macroControls) {
      track.macroControls = [];
    }

    track.macroControls.push({
      type: 'macro',
      id: id.value,
      name: name.type === 'string' ? name.value : id.value,
      value,
      mappings: [],
    });

    return makeNull();
  }

  private builtinMacroMap(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const targetParam = this.evaluate(args[0]);
    const min = toNumber(this.evaluate(args[1]));
    const max = toNumber(this.evaluate(args[2]));
    const curve = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'linear' };

    if (targetParam.type !== 'string') {
      throw new MFError('TYPE', 'macroMap() targetParameter must be string', position, this.filePath);
    }

    if (track.macroControls && track.macroControls.length > 0) {
      const macro = track.macroControls[track.macroControls.length - 1];
      macro.mappings.push({
        targetParameter: targetParam.value,
        min,
        max,
        curve: (curve as any).value || 'linear',
      });
    }

    return makeNull();
  }

  // ============================================
  // Export & Batch Processing
  // ============================================

  private builtinStemExport(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const name = this.evaluate(args[0]);
    const trackIds = args.length > 1 ? this.evaluate(args[1]) : { type: 'array', elements: [] };
    const format = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'wav' };
    const bitDepth = args.length > 3 ? toNumber(this.evaluate(args[3])) : 24;
    const sampleRate = args.length > 4 ? toNumber(this.evaluate(args[4])) : 48000;

    if (name.type !== 'string') {
      throw new MFError('TYPE', 'stemExport() name must be string', position, this.filePath);
    }

    const ids: string[] = [];
    if (trackIds.type === 'array') {
      for (const elem of trackIds.elements) {
        if (elem.type === 'string') {
          ids.push(elem.value);
        }
      }
    }

    if (!track.stemExports) {
      track.stemExports = [];
    }

    track.stemExports.push({
      type: 'stemExport',
      name: name.value,
      trackIds: ids,
      format: (format as any).value || 'wav',
      bitDepth: (bitDepth === 16 ? 16 : bitDepth === 32 ? 32 : 24) as 16 | 24 | 32,
      sampleRate: sampleRate as 44100 | 48000 | 88200 | 96000,
      normalize: false,
      tailLength: 0,
    });

    return makeNull();
  }

  private builtinBatch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const inputPattern = this.evaluate(args[0]);
    const outputPattern = this.evaluate(args[1]);

    if (inputPattern.type !== 'string' || outputPattern.type !== 'string') {
      throw new MFError('TYPE', 'batch() patterns must be strings', position, this.filePath);
    }

    if (!track.batchProcessings) {
      track.batchProcessings = [];
    }

    track.batchProcessings.push({
      type: 'batch',
      inputPattern: inputPattern.value,
      outputPattern: outputPattern.value,
      operations: [],
    });

    return makeNull();
  }

  private builtinBatchOp(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const opType = this.evaluate(args[0]);

    if (opType.type !== 'string') {
      throw new MFError('TYPE', 'batchOp() type must be string', position, this.filePath);
    }

    if (track.batchProcessings && track.batchProcessings.length > 0) {
      const batch = track.batchProcessings[track.batchProcessings.length - 1];
      batch.operations.push({
        type: opType.value as any,
        params: {},
      });
    }

    return makeNull();
  }

  private builtinExportPreset(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const name = args.length > 1 ? this.evaluate(args[1]) : id;
    const format = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'wav' };
    const sampleRate = args.length > 3 ? toNumber(this.evaluate(args[3])) : 48000;
    const channels = args.length > 4 ? this.evaluate(args[4]) : { type: 'string', value: 'stereo' };

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'exportPreset() id must be string', position, this.filePath);
    }

    if (!track.exportPresets) {
      track.exportPresets = [];
    }

    track.exportPresets.push({
      type: 'exportPreset',
      id: id.value,
      name: name.type === 'string' ? name.value : id.value,
      format: (format as any).value || 'wav',
      sampleRate,
      channels: (channels as any).value || 'stereo',
    });

    return makeNull();
  }

  // ============================================
  // Atmos/Spatial Extensions
  // ============================================

  private builtinAtmosObject(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const id = this.evaluate(args[0]);
    const name = args.length > 1 ? this.evaluate(args[1]) : id;
    const x = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const y = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0;
    const z = args.length > 4 ? toNumber(this.evaluate(args[4])) : 0;

    if (id.type !== 'string') {
      throw new MFError('TYPE', 'atmosObject() id must be string', position, this.filePath);
    }

    if (!track.atmosObjects) {
      track.atmosObjects = [];
    }

    track.atmosObjects.push({
      type: 'atmosObject',
      id: id.value,
      name: name.type === 'string' ? name.value : id.value,
      trackId: track.id,
      isStatic: false,
      position: { x, y, z },
      size: 50,
      automation: [],
    });

    return makeNull();
  }

  private builtinAtmosMove(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const x = toNumber(this.evaluate(args[0]));
    const y = toNumber(this.evaluate(args[1]));
    const z = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
    const size = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

    if (track.atmosObjects && track.atmosObjects.length > 0) {
      const obj = track.atmosObjects[track.atmosObjects.length - 1];
      obj.automation.push({
        tick: track.cursor,
        x,
        y,
        z,
        size,
      });
    }

    return makeNull();
  }

  private builtinHeadphoneVirtual(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const hrtfProfile = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'generic' };
    const roomSize = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
    const distance = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
    const angle = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0;

    track.headphoneVirtualization = {
      type: 'headphoneVirtualization',
      enabled: true,
      hrtfProfile: (hrtfProfile as any).value || 'generic',
      roomSize,
      distance,
      angle,
    };

    return makeNull();
  }

  private builtinSurroundAuto(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pattern = args.length > 0 ? this.evaluate(args[0]) : { type: 'string', value: 'circle' };
    const speed = args.length > 1 ? toNumber(this.evaluate(args[1])) : 0.5;
    const width = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;
    const centerBias = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0;

    if (!track.surroundAutomation) {
      track.surroundAutomation = [];
    }

    track.surroundAutomation.push({
      type: 'surroundAutomation',
      tick: track.cursor,
      pattern: (pattern as any).value || 'circle',
      speed,
      width,
      centerBias,
    });

    return makeNull();
  }

  // ============================================
  // Collaboration
  // ============================================

  private builtinProjectNote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const text = this.evaluate(args[0]);
    const author = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'Anonymous' };

    if (text.type !== 'string') {
      throw new MFError('TYPE', 'note() text must be string', position, this.filePath);
    }

    if (!track.projectNotes) {
      track.projectNotes = [];
    }

    track.projectNotes.push({
      type: 'projectNote',
      id: `note_${track.projectNotes.length + 1}`,
      author: author.type === 'string' ? author.value : 'Anonymous',
      timestamp: Date.now(),
      tick: track.cursor,
      trackId: track.id,
      text: text.value,
      resolved: false,
    });

    return makeNull();
  }

  private builtinCollaborator(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const name = this.evaluate(args[0]);
    const role = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'editor' };
    const email = args.length > 2 ? this.evaluate(args[2]) : null;
    const color = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: '#FF0000' };

    if (name.type !== 'string') {
      throw new MFError('TYPE', 'collaborator() name must be string', position, this.filePath);
    }

    if (!track.collaborators) {
      track.collaborators = [];
    }

    track.collaborators.push({
      type: 'collaborator',
      id: `collab_${track.collaborators.length + 1}`,
      name: name.value,
      email: email?.type === 'string' ? email.value : undefined,
      role: (role as any).value || 'editor',
      color: (color as any).value || '#FF0000',
    });

    return makeNull();
  }

  // Advanced vocal control functions
  private builtinPhoneme(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'phoneme() only valid in vocal tracks', position, this.filePath);
    }

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);
    const phonemeArr = this.evaluate(args[2]);

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'phoneme() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'phoneme() duration must be Dur', position, this.filePath);
    }
    if (phonemeArr.type !== 'array') {
      throw new MFError('TYPE', 'phoneme() phonemes must be array', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;

    // Parse phoneme units from array (strings only for now)
    const phonemes: PhonemeUnit[] = [];
    const defaultDuration = 100 / phonemeArr.elements.length;
    for (const elem of phonemeArr.elements) {
      if (elem.type === 'string') {
        // Simple string phoneme with equal duration
        phonemes.push({
          symbol: elem.value,
          duration: defaultDuration,
        });
      } else if (elem.type === 'array' && elem.elements.length >= 2) {
        // Array format: [symbol, duration] or [symbol, duration, velocity]
        const symbol = elem.elements[0];
        const duration = elem.elements[1];
        const velocity = elem.elements.length > 2 ? elem.elements[2] : null;
        phonemes.push({
          symbol: symbol.type === 'string' ? symbol.value : '',
          duration: duration.type === 'int' || duration.type === 'float' ? toNumber(duration) : defaultDuration,
          velocity: velocity && (velocity.type === 'int' || velocity.type === 'float') ? toNumber(velocity) : undefined,
        });
      }
    }

    const event: PhonemeEvent = {
      type: 'phoneme',
      tick,
      dur: durTicks,
      key: pitch.midi,
      phonemes,
    };
    track.events.push(event);

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinConsonantOffset(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'consonantOffset() only valid in vocal tracks', position, this.filePath);
    }

    const offset = this.evaluate(args[0]);
    if (offset.type !== 'int') {
      throw new MFError('TYPE', 'consonantOffset() offset must be int (ticks)', position, this.filePath);
    }

    const event: ConsonantOffsetEvent = {
      type: 'consonantOffset',
      tick: track.cursor,
      offset: offset.value,
    };
    track.events.push(event);

    return makeNull();
  }

  private builtinBreath(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'breath() only valid in vocal tracks', position, this.filePath);
    }

    const dur = this.evaluate(args[0]);
    const intensity = args.length > 1 ? this.evaluate(args[1]) : makeInt(80);

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'breath() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;

    const event: BreathEvent = {
      type: 'breath',
      tick,
      dur: durTicks,
      intensity: intensity.type === 'int' ? intensity.value : 80,
    };
    track.events.push(event);

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinAutoBreath(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'autoBreath() only valid in vocal tracks', position, this.filePath);
    }

    const enabled = args.length > 0 ? this.evaluate(args[0]) : makeBool(true);
    const minRestDur = args.length > 1 ? this.evaluate(args[1]) : null;
    const breathDur = args.length > 2 ? this.evaluate(args[2]) : null;
    const intensity = args.length > 3 ? this.evaluate(args[3]) : makeInt(80);

    // Store auto-breath settings in track meta (use 1/0 for boolean)
    track.meta.autoBreathEnabled = enabled.type === 'bool' ? (enabled.value ? 1 : 0) : 1;
    if (minRestDur && minRestDur.type === 'dur') {
      track.meta.autoBreathMinRest = this.durToTicks(minRestDur, position);
    }
    if (breathDur && breathDur.type === 'dur') {
      track.meta.autoBreathDuration = this.durToTicks(breathDur, position);
    }
    track.meta.autoBreathIntensity = intensity.type === 'int' ? intensity.value : 80;

    return makeNull();
  }

  private builtinPortamentoShape(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'portamentoShape() only valid in vocal tracks', position, this.filePath);
    }

    const shape = this.evaluate(args[0]);
    const intensity = args.length > 1 ? this.evaluate(args[1]) : makeInt(64);

    if (shape.type !== 'string') {
      throw new MFError('TYPE', 'portamentoShape() shape must be string', position, this.filePath);
    }

    const validShapes: PortamentoShape[] = ['linear', 'exponential', 'logarithmic', 's-curve', 'early', 'late'];
    if (!validShapes.includes(shape.value as PortamentoShape)) {
      throw new MFError('TYPE', `portamentoShape() shape must be one of: ${validShapes.join(', ')}`, position, this.filePath);
    }

    const event: PortamentoShapeEvent = {
      type: 'portamentoShape',
      tick: track.cursor,
      shape: shape.value as PortamentoShape,
      intensity: intensity.type === 'int' ? intensity.value : 64,
    };
    track.events.push(event);

    return makeNull();
  }

  // Cross-staff notation
  private builtinCrossStaff(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'crossStaff() only valid in MIDI tracks', position, this.filePath);
    }

    if (!track.grandStaff) {
      throw new MFError('TYPE', 'crossStaff() requires grandStaff() to be set first', position, this.filePath);
    }

    const noteKey = this.evaluate(args[0]);
    const targetStaff = this.evaluate(args[1]);

    if (noteKey.type !== 'pitch' && noteKey.type !== 'int') {
      throw new MFError('TYPE', 'crossStaff() noteKey must be Pitch or int', position, this.filePath);
    }
    if (targetStaff.type !== 'string' || !['upper', 'lower'].includes(targetStaff.value)) {
      throw new MFError('TYPE', 'crossStaff() targetStaff must be "upper" or "lower"', position, this.filePath);
    }

    const keyValue = noteKey.type === 'pitch' ? noteKey.midi : noteKey.value;

    const event: CrossStaffEvent = {
      type: 'crossStaff',
      tick: track.cursor,
      noteKey: keyValue,
      targetStaff: targetStaff.value as 'upper' | 'lower',
    };
    track.events.push(event);

    return makeNull();
  }

  // Clef change
  private builtinClef(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const clefArg = this.evaluate(args[0]);
    if (clefArg.type !== 'string') {
      throw new MFError('TYPE', 'clef() argument must be string', position, this.filePath);
    }

    const validClefs: ClefType[] = ['treble', 'bass', 'alto', 'tenor', 'percussion', 'tab', 'treble8va', 'treble8vb', 'bass8va', 'bass8vb'];
    if (!validClefs.includes(clefArg.value as ClefType)) {
      throw createError('E130', `Invalid clef type '${clefArg.value}'. Valid: ${validClefs.join(', ')}`, position, this.filePath);
    }

    if (!track.clefChanges) track.clefChanges = [];
    const event: ClefChangeEvent = {
      type: 'clefChange',
      tick: track.cursor,
      clef: clefArg.value as ClefType,
    };
    track.clefChanges.push(event);

    return makeNull();
  }

  // Key signature
  private builtinKey(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const fifthsArg = this.evaluate(args[0]);
    const modeArg = args.length >= 2 ? this.evaluate(args[1]) : makeString('major');

    if (fifthsArg.type !== 'int') {
      throw new MFError('TYPE', 'key() fifths must be int (-7 to 7)', position, this.filePath);
    }
    if (fifthsArg.value < -7 || fifthsArg.value > 7) {
      throw createError('E131', `Key fifths ${fifthsArg.value} out of range -7..7`, position, this.filePath);
    }
    if (modeArg.type !== 'string' || !['major', 'minor'].includes(modeArg.value)) {
      throw new MFError('TYPE', 'key() mode must be "major" or "minor"', position, this.filePath);
    }

    if (!track.keySignatures) track.keySignatures = [];
    const event: KeySignatureEvent = {
      type: 'keySignature',
      tick: track.cursor,
      fifths: fifthsArg.value,
      mode: modeArg.value as KeyMode,
    };
    track.keySignatures.push(event);

    return makeNull();
  }

  // Fingering
  private builtinFingering(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const fingerArg = this.evaluate(args[1]);
    const handArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
      throw new MFError('TYPE', 'fingering() noteKey must be Pitch or int', position, this.filePath);
    }
    if (fingerArg.type !== 'int' && fingerArg.type !== 'string') {
      throw new MFError('TYPE', 'fingering() finger must be int (1-5) or string', position, this.filePath);
    }

    const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

    if (!track.fingerings) track.fingerings = [];
    const event: FingeringEvent = {
      type: 'fingering',
      tick: track.cursor,
      noteKey: keyValue,
      finger: fingerArg.type === 'int' ? fingerArg.value : fingerArg.value,
    };
    if (handArg && handArg.type === 'string' && ['left', 'right'].includes(handArg.value)) {
      event.hand = handArg.value as 'left' | 'right';
    }
    track.fingerings.push(event);

    return makeNull();
  }

  // Stacked articulations
  private builtinStackedArticulations(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const articulationsArg = this.evaluate(args[1]);

    if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
      throw new MFError('TYPE', 'articulations() noteKey must be Pitch or int', position, this.filePath);
    }
    if (articulationsArg.type !== 'array') {
      throw new MFError('TYPE', 'articulations() must receive an array of articulation strings', position, this.filePath);
    }

    const validArticulations: ArticulationType[] = ['staccato', 'legato', 'accent', 'tenuto', 'marcato', 'staccatissimo', 'fermata', 'breath', 'caesura'];
    const articulations: ArticulationType[] = [];
    for (const elem of articulationsArg.elements) {
      if (elem.type !== 'string' || !validArticulations.includes(elem.value as ArticulationType)) {
        throw createError('E132', `Invalid articulation '${elem.type === 'string' ? elem.value : elem.type}'. Valid: ${validArticulations.join(', ')}`, position, this.filePath);
      }
      articulations.push(elem.value as ArticulationType);
    }

    const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

    if (!track.stackedArticulations) track.stackedArticulations = [];
    const event: StackedArticulationEvent = {
      type: 'stackedArticulation',
      tick: track.cursor,
      noteKey: keyValue,
      articulations,
    };
    track.stackedArticulations.push(event);

    return makeNull();
  }

  // Multi-measure rest
  private builtinMultiRest(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const measuresArg = this.evaluate(args[0]);
    if (measuresArg.type !== 'int' || measuresArg.value < 1) {
      throw new MFError('TYPE', 'multiRest() measures must be positive int', position, this.filePath);
    }

    if (!track.multiRests) track.multiRests = [];
    const event: MultiRestEvent = {
      type: 'multiRest',
      tick: track.cursor,
      measures: measuresArg.value,
    };
    track.multiRests.push(event);

    // Advance cursor by the appropriate number of measures
    // (Would need time signature info; for simplicity, we don't advance here)
    return makeNull();
  }

  // Slash notation
  private builtinSlashNotation(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const durArg = this.evaluate(args[0]);
    const slashTypeArg = args.length >= 2 ? this.evaluate(args[1]) : makeString('rhythmic');

    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'slashNotation() duration must be Dur', position, this.filePath);
    }
    if (slashTypeArg.type !== 'string' || !['rhythmic', 'beat'].includes(slashTypeArg.value)) {
      throw new MFError('TYPE', 'slashNotation() type must be "rhythmic" or "beat"', position, this.filePath);
    }

    const durationTicks = this.durToTicks(durArg, position);

    if (!track.slashNotations) track.slashNotations = [];
    const event: SlashNotationEvent = {
      type: 'slashNotation',
      tick: track.cursor,
      endTick: track.cursor + durationTicks,
      slashType: slashTypeArg.value as 'rhythmic' | 'beat',
    };
    track.slashNotations.push(event);
    track.cursor += durationTicks;

    return makeNull();
  }

  // Barline
  private builtinBarline(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const styleArg = this.evaluate(args[0]);
    if (styleArg.type !== 'string') {
      throw new MFError('TYPE', 'barline() style must be string', position, this.filePath);
    }

    const validStyles: BarlineType[] = ['single', 'double', 'final', 'repeat-start', 'repeat-end', 'repeat-both', 'dashed', 'tick', 'short', 'none'];
    if (!validStyles.includes(styleArg.value as BarlineType)) {
      throw createError('E133', `Invalid barline style '${styleArg.value}'. Valid: ${validStyles.join(', ')}`, position, this.filePath);
    }

    if (!track.barlines) track.barlines = [];
    const event: BarlineEvent = {
      type: 'barline',
      tick: track.cursor,
      style: styleArg.value as BarlineType,
    };
    track.barlines.push(event);

    return makeNull();
  }

  // Tempo text
  private builtinTempoText(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const markingArg = this.evaluate(args[0]);
    const bpmArg = args.length >= 2 ? this.evaluate(args[1]) : null;

    if (markingArg.type !== 'string') {
      throw new MFError('TYPE', 'tempoText() marking must be string', position, this.filePath);
    }

    const validMarkings: TempoMarkingType[] = [
      'grave', 'largo', 'lento', 'adagio', 'andante', 'andantino',
      'moderato', 'allegretto', 'allegro', 'vivace', 'presto', 'prestissimo',
      'accelerando', 'ritardando', 'rallentando', 'a-tempo', 'rubato', 'custom'
    ];

    if (!track.tempoTexts) track.tempoTexts = [];
    const event: TempoTextEvent = {
      type: 'tempoText',
      tick: track.cursor,
      marking: validMarkings.includes(markingArg.value as TempoMarkingType)
        ? markingArg.value as TempoMarkingType
        : 'custom',
      customText: !validMarkings.includes(markingArg.value as TempoMarkingType) ? markingArg.value : undefined,
    };
    if (bpmArg && (bpmArg.type === 'int' || bpmArg.type === 'float')) {
      event.bpm = toNumber(bpmArg);
    }
    track.tempoTexts.push(event);

    return makeNull();
  }

  // Hide empty staves
  private builtinHideEmptyStaves(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const enabledArg = this.evaluate(args[0]);
    const firstExemptArg = args.length >= 2 ? this.evaluate(args[1]) : null;

    if (enabledArg.type !== 'bool') {
      throw new MFError('TYPE', 'hideEmptyStaves() enabled must be bool', position, this.filePath);
    }

    const event: HideEmptyStavesEvent = {
      type: 'hideEmptyStaves',
      tick: track.cursor,
      enabled: enabledArg.value,
    };
    if (firstExemptArg && firstExemptArg.type === 'bool') {
      event.firstSystemExempt = firstExemptArg.value;
    }
    track.hideEmptyStaves = event;

    return makeNull();
  }

  // Vocal style
  private builtinVocalStyle(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'vocalStyle() only valid in vocal tracks', position, this.filePath);
    }

    const styleArg = this.evaluate(args[0]);
    const intensityArg = args.length >= 2 ? this.evaluate(args[1]) : null;

    if (styleArg.type !== 'string') {
      throw new MFError('TYPE', 'vocalStyle() style must be string', position, this.filePath);
    }

    const validStyles: VocalStyleType[] = ['soft', 'normal', 'power', 'falsetto', 'whisper', 'breathy', 'belt', 'head', 'chest'];
    if (!validStyles.includes(styleArg.value as VocalStyleType)) {
      throw createError('E134', `Invalid vocal style '${styleArg.value}'. Valid: ${validStyles.join(', ')}`, position, this.filePath);
    }

    if (!track.vocalStyles) track.vocalStyles = [];
    const event: VocalStyleEvent = {
      type: 'vocalStyle',
      tick: track.cursor,
      style: styleArg.value as VocalStyleType,
    };
    if (intensityArg && intensityArg.type === 'int') {
      if (intensityArg.value < 0 || intensityArg.value > 127) {
        throw createError('E121', `vocalStyle intensity ${intensityArg.value} out of range 0..127`, position, this.filePath);
      }
      event.intensity = intensityArg.value;
    }
    track.vocalStyles.push(event);

    return makeNull();
  }

  // Note envelope (ADSR)
  private builtinNoteEnvelope(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // Args: attack, decay, sustain, release (all optional, defaults to null)
    const attackArg = args.length >= 1 ? this.evaluate(args[0]) : null;
    const decayArg = args.length >= 2 ? this.evaluate(args[1]) : null;
    const sustainArg = args.length >= 3 ? this.evaluate(args[2]) : null;
    const releaseArg = args.length >= 4 ? this.evaluate(args[3]) : null;

    if (!track.noteEnvelopes) track.noteEnvelopes = [];
    const event: NoteEnvelopeEvent = {
      type: 'noteEnvelope',
      tick: track.cursor,
    };

    if (attackArg && (attackArg.type === 'int' || attackArg.type === 'float')) {
      event.attack = toNumber(attackArg);
    }
    if (decayArg && (decayArg.type === 'int' || decayArg.type === 'float')) {
      event.decay = toNumber(decayArg);
    }
    if (sustainArg && sustainArg.type === 'int') {
      if (sustainArg.value < 0 || sustainArg.value > 127) {
        throw createError('E121', `noteEnvelope sustain ${sustainArg.value} out of range 0..127`, position, this.filePath);
      }
      event.sustain = sustainArg.value;
    }
    if (releaseArg && (releaseArg.type === 'int' || releaseArg.type === 'float')) {
      event.release = toNumber(releaseArg);
    }

    track.noteEnvelopes.push(event);

    return makeNull();
  }

  // Vocal tension
  private builtinVocalTension(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'tension() only valid in vocal tracks', position, this.filePath);
    }

    const tensionArg = this.evaluate(args[0]);
    if (tensionArg.type !== 'int') {
      throw new MFError('TYPE', 'tension() value must be int (0-127)', position, this.filePath);
    }
    if (tensionArg.value < 0 || tensionArg.value > 127) {
      throw createError('E121', `tension value ${tensionArg.value} out of range 0..127`, position, this.filePath);
    }

    if (!track.vocalTensions) track.vocalTensions = [];
    const event: VocalTensionEvent = {
      type: 'vocalTension',
      tick: track.cursor,
      tension: tensionArg.value,
    };
    track.vocalTensions.push(event);

    return makeNull();
  }

  // Melisma
  private builtinMelisma(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'vocal') {
      throw new MFError('TYPE', 'melisma() only valid in vocal tracks', position, this.filePath);
    }

    const lyricArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);

    if (lyricArg.type !== 'string') {
      throw new MFError('TYPE', 'melisma() lyric must be string', position, this.filePath);
    }
    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'melisma() duration must be Dur', position, this.filePath);
    }

    const durationTicks = this.durToTicks(durArg, position);

    if (!track.melismas) track.melismas = [];
    const event: MelismaEvent = {
      type: 'melisma',
      tick: track.cursor,
      endTick: track.cursor + durationTicks,
      lyric: lyricArg.value,
    };
    track.melismas.push(event);

    return makeNull();
  }

  // Turn
  private builtinTurn(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const invertedArg = args.length >= 2 ? this.evaluate(args[1]) : null;
    const delayedArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
      throw new MFError('TYPE', 'turn() noteKey must be Pitch or int', position, this.filePath);
    }

    const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

    if (!track.turns) track.turns = [];
    const event: TurnEvent = {
      type: 'turn',
      tick: track.cursor,
      noteKey: keyValue,
    };
    if (invertedArg && invertedArg.type === 'bool') {
      event.inverted = invertedArg.value;
    }
    if (delayedArg && delayedArg.type === 'bool') {
      event.delayed = delayedArg.value;
    }
    track.turns.push(event);

    return makeNull();
  }

  // Harmonic
  private builtinHarmonic(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const typeArg = this.evaluate(args[1]);
    const touchedArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
      throw new MFError('TYPE', 'harmonic() noteKey must be Pitch or int', position, this.filePath);
    }
    if (typeArg.type !== 'string') {
      throw new MFError('TYPE', 'harmonic() type must be string', position, this.filePath);
    }

    const validTypes: HarmonicType[] = ['natural', 'artificial', 'pinch', 'tap'];
    if (!validTypes.includes(typeArg.value as HarmonicType)) {
      throw new MFError('TYPE', `harmonic() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
    }

    const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

    if (!track.harmonics) track.harmonics = [];
    const event: HarmonicEvent = {
      type: 'harmonic',
      tick: track.cursor,
      noteKey: keyValue,
      harmonicType: typeArg.value as HarmonicType,
    };
    if (touchedArg && (touchedArg.type === 'pitch' || touchedArg.type === 'int')) {
      event.touchedNote = touchedArg.type === 'pitch' ? touchedArg.midi : touchedArg.value;
    }
    track.harmonics.push(event);

    return makeNull();
  }

  // Pedal
  private builtinPedal(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pedalTypeArg = this.evaluate(args[0]);
    const actionArg = this.evaluate(args[1]);
    const levelArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (pedalTypeArg.type !== 'string') {
      throw new MFError('TYPE', 'pedal() pedalType must be string', position, this.filePath);
    }
    if (actionArg.type !== 'string') {
      throw new MFError('TYPE', 'pedal() action must be string', position, this.filePath);
    }

    const validPedalTypes: PedalType[] = ['sustain', 'sostenuto', 'unaCorda'];
    const validActions: PedalAction[] = ['start', 'end', 'change', 'half'];

    if (!validPedalTypes.includes(pedalTypeArg.value as PedalType)) {
      throw new MFError('TYPE', `pedal() pedalType must be one of: ${validPedalTypes.join(', ')}`, position, this.filePath);
    }
    if (!validActions.includes(actionArg.value as PedalAction)) {
      throw new MFError('TYPE', `pedal() action must be one of: ${validActions.join(', ')}`, position, this.filePath);
    }

    if (!track.pedals) track.pedals = [];
    const event: PedalEvent = {
      type: 'pedal',
      tick: track.cursor,
      pedalType: pedalTypeArg.value as PedalType,
      action: actionArg.value as PedalAction,
    };
    if (levelArg && levelArg.type === 'int') {
      if (levelArg.value < 0 || levelArg.value > 127) {
        throw createError('E121', `pedal level ${levelArg.value} out of range 0..127`, position, this.filePath);
      }
      event.level = levelArg.value;
    }
    track.pedals.push(event);

    return makeNull();
  }

  // Feathered beam
  private builtinFeatheredBeam(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const directionArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);

    if (directionArg.type !== 'string') {
      throw new MFError('TYPE', 'featheredBeam() direction must be string', position, this.filePath);
    }
    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'featheredBeam() duration must be Dur', position, this.filePath);
    }

    const validDirections: FeatheredBeamDirection[] = ['accel', 'rit'];
    if (!validDirections.includes(directionArg.value as FeatheredBeamDirection)) {
      throw new MFError('TYPE', `featheredBeam() direction must be one of: ${validDirections.join(', ')}`, position, this.filePath);
    }

    const durationTicks = this.durToTicks(durArg, position);

    if (!track.featheredBeams) track.featheredBeams = [];
    const event: FeatheredBeamEvent = {
      type: 'featheredBeam',
      tick: track.cursor,
      endTick: track.cursor + durationTicks,
      direction: directionArg.value as FeatheredBeamDirection,
    };
    track.featheredBeams.push(event);

    return makeNull();
  }

  // Cluster
  private builtinCluster(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const lowNoteArg = this.evaluate(args[0]);
    const highNoteArg = this.evaluate(args[1]);
    const durArg = this.evaluate(args[2]);
    const styleArg = args.length >= 4 ? this.evaluate(args[3]) : null;

    if (lowNoteArg.type !== 'pitch' && lowNoteArg.type !== 'int') {
      throw new MFError('TYPE', 'cluster() lowNote must be Pitch or int', position, this.filePath);
    }
    if (highNoteArg.type !== 'pitch' && highNoteArg.type !== 'int') {
      throw new MFError('TYPE', 'cluster() highNote must be Pitch or int', position, this.filePath);
    }
    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'cluster() duration must be Dur', position, this.filePath);
    }

    const lowNote = lowNoteArg.type === 'pitch' ? lowNoteArg.midi : lowNoteArg.value;
    const highNote = highNoteArg.type === 'pitch' ? highNoteArg.midi : highNoteArg.value;
    const durationTicks = this.durToTicks(durArg, position);

    if (!track.clusters) track.clusters = [];
    const event: ClusterEvent = {
      type: 'cluster',
      tick: track.cursor,
      lowNote,
      highNote,
      dur: durationTicks,
    };
    if (styleArg && styleArg.type === 'string' && ['chromatic', 'diatonic', 'black', 'white'].includes(styleArg.value)) {
      event.style = styleArg.value as 'chromatic' | 'diatonic' | 'black' | 'white';
    }
    track.clusters.push(event);
    track.cursor += durationTicks;

    return makeNull();
  }

  // Sprechstimme
  private builtinSprechstimme(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);
    const textArg = this.evaluate(args[2]);

    if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
      throw new MFError('TYPE', 'sprechstimme() noteKey must be Pitch or int', position, this.filePath);
    }
    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'sprechstimme() duration must be Dur', position, this.filePath);
    }
    if (textArg.type !== 'string') {
      throw new MFError('TYPE', 'sprechstimme() text must be string', position, this.filePath);
    }

    const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;
    const durationTicks = this.durToTicks(durArg, position);

    if (!track.sprechstimmes) track.sprechstimmes = [];
    const event: SprechstimmeEvent = {
      type: 'sprechstimme',
      tick: track.cursor,
      dur: durationTicks,
      noteKey: keyValue,
      text: textArg.value,
    };
    track.sprechstimmes.push(event);
    track.cursor += durationTicks;

    return makeNull();
  }

  // Bracket group
  private builtinBracketGroup(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const trackIdsArg = this.evaluate(args[0]);
    const typeArg = this.evaluate(args[1]);
    const nameArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (trackIdsArg.type !== 'array') {
      throw new MFError('TYPE', 'bracketGroup() trackIds must be an array of strings', position, this.filePath);
    }
    if (typeArg.type !== 'string') {
      throw new MFError('TYPE', 'bracketGroup() type must be string', position, this.filePath);
    }

    const validTypes: BracketType[] = ['bracket', 'brace', 'line', 'square'];
    if (!validTypes.includes(typeArg.value as BracketType)) {
      throw new MFError('TYPE', `bracketGroup() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
    }

    const trackIds: string[] = [];
    for (const elem of trackIdsArg.elements) {
      if (elem.type !== 'string') {
        throw new MFError('TYPE', 'bracketGroup() trackIds array must contain only strings', position, this.filePath);
      }
      trackIds.push(elem.value);
    }

    if (!track.bracketGroups) track.bracketGroups = [];
    const event: BracketGroupEvent = {
      type: 'bracketGroup',
      trackIds,
      bracketType: typeArg.value as BracketType,
    };
    if (nameArg && nameArg.type === 'string') {
      event.name = nameArg.value;
    }
    track.bracketGroups.push(event);

    return makeNull();
  }

  // Cue staff
  private builtinCueStaff(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sourceTrackArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);
    const sizeArg = args.length >= 3 ? this.evaluate(args[2]) : null;

    if (sourceTrackArg.type !== 'string') {
      throw new MFError('TYPE', 'cueStaff() sourceTrackId must be string', position, this.filePath);
    }
    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'cueStaff() duration must be Dur', position, this.filePath);
    }

    const durationTicks = this.durToTicks(durArg, position);

    if (!track.cueStaffs) track.cueStaffs = [];
    const event: CueStaffEvent = {
      type: 'cueStaff',
      tick: track.cursor,
      endTick: track.cursor + durationTicks,
      sourceTrackId: sourceTrackArg.value,
    };
    if (sizeArg && (sizeArg.type === 'float' || sizeArg.type === 'int')) {
      event.size = toNumber(sizeArg);
    }
    track.cueStaffs.push(event);

    return makeNull();
  }

  // Note color
  private builtinNoteColor(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const colorArg = this.evaluate(args[0]);
    const noteKeyArg = args.length >= 2 ? this.evaluate(args[1]) : null;

    if (colorArg.type !== 'string') {
      throw new MFError('TYPE', 'noteColor() color must be string (hex color)', position, this.filePath);
    }

    // Basic hex color validation
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorArg.value)) {
      throw new MFError('TYPE', 'noteColor() color must be hex format (#RRGGBB)', position, this.filePath);
    }

    if (!track.noteColors) track.noteColors = [];
    const event: NoteColorEvent = {
      type: 'noteColor',
      tick: track.cursor,
      color: colorArg.value,
    };
    if (noteKeyArg && (noteKeyArg.type === 'pitch' || noteKeyArg.type === 'int')) {
      event.noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;
    }
    track.noteColors.push(event);

    return makeNull();
  }

  // ============================================
  // Fourth batch: Score structure
  // ============================================

  private builtinVolta(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const endingsArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);

    // Parse endings (e.g., [1], [1, 2], or single number)
    let endings: number[] = [];
    if (endingsArg.type === 'int') {
      endings = [endingsArg.value];
    } else if (endingsArg.type === 'array') {
      endings = endingsArg.elements.map((e: RuntimeValue) => toNumber(e));
    }

    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'volta() duration must be Dur', position, this.filePath);
    }
    const dur = this.durToTicks(durArg, position);

    if (!track.voltas) track.voltas = [];
    track.voltas.push({
      type: 'volta',
      tick: track.cursor,
      endTick: track.cursor + dur,
      endings,
    });

    return makeNull();
  }

  private builtinCadenza(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const enabled = args.length > 0 ? isTruthy(this.evaluate(args[0])) : true;
    const durArg = args.length > 1 ? this.evaluate(args[1]) : null;

    if (!track.cadenzas) track.cadenzas = [];
    const event: CadenzaEvent = {
      type: 'cadenza',
      tick: track.cursor,
      enabled,
    };
    if (durArg && durArg.type === 'dur') {
      event.endTick = track.cursor + this.durToTicks(durArg, position);
    }
    track.cadenzas.push(event);

    return makeNull();
  }

  private builtinDivisiMark(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const markingArg = this.evaluate(args[0]);
    if (markingArg.type !== 'string') {
      throw new MFError('TYPE', 'divisiMark() marking must be string', position, this.filePath);
    }

    const validMarks: DivisiType[] = ['div.', 'unis.', 'a 2', 'a 3', 'solo', 'tutti'];
    const marking = markingArg.value as DivisiType | string;

    if (!track.divisiMarks) track.divisiMarks = [];
    track.divisiMarks.push({
      type: 'divisiMark',
      tick: track.cursor,
      marking,
    });

    return makeNull();
  }

  private builtinMetricMod(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const fromNoteArg = this.evaluate(args[0]);
    const toNoteArg = this.evaluate(args[1]);

    // Parse note values as fractions (e.g., 1/4, 1/8) - dur type is used for fractions
    let fromNote = { numerator: 1, denominator: 4 };
    let toNote = { numerator: 1, denominator: 4 };

    if (fromNoteArg.type === 'dur') {
      if (fromNoteArg.ticks !== undefined) {
        throw new MFError('TYPE', 'metricMod() requires fraction-based durations, not tick-based', position, this.filePath);
      }
      if (fromNoteArg.numerator !== undefined && fromNoteArg.denominator !== undefined) {
        fromNote = { numerator: fromNoteArg.numerator, denominator: fromNoteArg.denominator };
      }
    }
    if (toNoteArg.type === 'dur') {
      if (toNoteArg.ticks !== undefined) {
        throw new MFError('TYPE', 'metricMod() requires fraction-based durations, not tick-based', position, this.filePath);
      }
      if (toNoteArg.numerator !== undefined && toNoteArg.denominator !== undefined) {
        toNote = { numerator: toNoteArg.numerator, denominator: toNoteArg.denominator };
      }
    }

    if (!track.metricModulations) track.metricModulations = [];
    track.metricModulations.push({
      type: 'metricModulation',
      tick: track.cursor,
      fromNote,
      toNote,
    });

    return makeNull();
  }

  private builtinConductorCue(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const textArg = this.evaluate(args[0]);
    const instrumentArg = args.length > 1 ? this.evaluate(args[1]) : null;

    if (textArg.type !== 'string') {
      throw new MFError('TYPE', 'conductorCue() text must be string', position, this.filePath);
    }

    if (!track.conductorCues) track.conductorCues = [];
    const event: ConductorCueEvent = {
      type: 'conductorCue',
      tick: track.cursor,
      text: textArg.value,
    };
    if (instrumentArg && instrumentArg.type === 'string') {
      event.instrument = instrumentArg.value;
    }
    track.conductorCues.push(event);

    return makeNull();
  }

  private builtinEditorial(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const typeArg = this.evaluate(args[1]);

    if (typeArg.type !== 'string') {
      throw new MFError('TYPE', 'editorial() type must be string', position, this.filePath);
    }

    const validTypes: EditorialType[] = ['bracket', 'parenthesis', 'dashed', 'small'];
    if (!validTypes.includes(typeArg.value as EditorialType)) {
      throw new MFError('TYPE', `editorial() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
    }

    const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);

    if (!track.editorials) track.editorials = [];
    track.editorials.push({
      type: 'editorial',
      tick: track.cursor,
      noteKey,
      editorialType: typeArg.value as EditorialType,
    });

    return makeNull();
  }

  // ============================================
  // Fourth batch: Instrument techniques
  // ============================================

  private builtinBrassMute(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const muteTypeArg = this.evaluate(args[0]);

    if (muteTypeArg.type !== 'string') {
      throw new MFError('TYPE', 'brassMute() type must be string', position, this.filePath);
    }

    const validTypes: BrassMuteType[] = ['straight', 'cup', 'harmon', 'plunger', 'bucket', 'wah', 'open'];
    if (!validTypes.includes(muteTypeArg.value as BrassMuteType)) {
      throw new MFError('TYPE', `brassMute() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
    }

    if (!track.brassMutes) track.brassMutes = [];
    track.brassMutes.push({
      type: 'brassMute',
      tick: track.cursor,
      muteType: muteTypeArg.value as BrassMuteType,
    });

    return makeNull();
  }

  private builtinStringPosition(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const positionArg = this.evaluate(args[1]);
    const stringArg = args.length > 2 ? this.evaluate(args[2]) : null;

    const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);
    const pos = toNumber(positionArg);

    if (!track.stringPositions) track.stringPositions = [];
    const event: StringPositionEvent = {
      type: 'stringPosition',
      tick: track.cursor,
      noteKey,
      position: pos,
    };
    if (stringArg && stringArg.type === 'string') {
      event.string = stringArg.value;
    }
    track.stringPositions.push(event);

    return makeNull();
  }

  private builtinMultiphonic(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const notesArg = this.evaluate(args[0]);
    const durArg = this.evaluate(args[1]);
    const fingeringArg = args.length > 2 ? this.evaluate(args[2]) : null;

    // Parse notes array
    let notes: number[] = [];
    if (notesArg.type === 'array') {
      notes = notesArg.elements.map((e: RuntimeValue) => e.type === 'pitch' ? e.midi : toNumber(e));
    }

    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'multiphonic() duration must be Dur', position, this.filePath);
    }
    const dur = this.durToTicks(durArg, position);

    if (!track.multiphonics) track.multiphonics = [];
    const event: MultiphonicEvent = {
      type: 'multiphonic',
      tick: track.cursor,
      dur,
      notes,
    };
    if (fingeringArg && fingeringArg.type === 'string') {
      event.fingering = fingeringArg.value;
    }
    track.multiphonics.push(event);

    return makeNull();
  }

  private builtinElectronicsCue(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const cueArg = this.evaluate(args[0]);
    const actionArg = args.length > 1 ? this.evaluate(args[1]) : null;

    if (cueArg.type !== 'string') {
      throw new MFError('TYPE', 'electronicsCue() cue must be string', position, this.filePath);
    }

    if (!track.electronicsCues) track.electronicsCues = [];
    const event: ElectronicsCueEvent = {
      type: 'electronicsCue',
      tick: track.cursor,
      cue: cueArg.value,
    };
    if (actionArg && actionArg.type === 'string') {
      event.action = actionArg.value as 'start' | 'stop' | 'fade';
    }
    track.electronicsCues.push(event);

    return makeNull();
  }

  // ============================================
  // Fourth batch: Guitar techniques
  // ============================================

  private builtinBendCurve(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const bendAmountArg = this.evaluate(args[1]);
    const shapeArg = this.evaluate(args[2]);
    const durArg = args.length > 3 ? this.evaluate(args[3]) : null;

    const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);
    const bendAmount = toNumber(bendAmountArg);

    if (shapeArg.type !== 'string') {
      throw new MFError('TYPE', 'bendCurve() shape must be string', position, this.filePath);
    }

    const validShapes: BendCurveShape[] = ['immediate', 'gradual', 'prebend', 'release'];
    if (!validShapes.includes(shapeArg.value as BendCurveShape)) {
      throw new MFError('TYPE', `bendCurve() shape must be one of: ${validShapes.join(', ')}`, position, this.filePath);
    }

    if (!track.bendCurves) track.bendCurves = [];
    const event: BendCurveEvent = {
      type: 'bendCurve',
      tick: track.cursor,
      noteKey,
      bendAmount,
      shape: shapeArg.value as BendCurveShape,
    };
    if (durArg && durArg.type === 'dur') {
      event.dur = this.durToTicks(durArg, position);
    }
    track.bendCurves.push(event);

    return makeNull();
  }

  private builtinSlide(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const startNoteArg = this.evaluate(args[0]);
    const endNoteArg = this.evaluate(args[1]);
    const slideTypeArg = this.evaluate(args[2]);
    const durArg = this.evaluate(args[3]);

    const startNote = startNoteArg.type === 'pitch' ? startNoteArg.midi : toNumber(startNoteArg);
    const endNote = endNoteArg.type === 'pitch' ? endNoteArg.midi : toNumber(endNoteArg);

    if (slideTypeArg.type !== 'string') {
      throw new MFError('TYPE', 'slide() type must be string', position, this.filePath);
    }

    const validTypes: SlideType[] = ['legato', 'shift', 'gliss', 'scoop', 'fall'];
    if (!validTypes.includes(slideTypeArg.value as SlideType)) {
      throw new MFError('TYPE', `slide() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
    }

    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'slide() duration must be Dur', position, this.filePath);
    }
    const dur = this.durToTicks(durArg, position);

    if (!track.slides) track.slides = [];
    track.slides.push({
      type: 'slide',
      tick: track.cursor,
      startNote,
      endNote,
      slideType: slideTypeArg.value as SlideType,
      dur,
    });

    return makeNull();
  }

  private builtinTap(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const noteKeyArg = this.evaluate(args[0]);
    const handArg = this.evaluate(args[1]);
    const durArg = this.evaluate(args[2]);

    const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);

    if (handArg.type !== 'string') {
      throw new MFError('TYPE', 'tap() hand must be string', position, this.filePath);
    }

    const validHands: TapHand[] = ['left', 'right', 'both'];
    if (!validHands.includes(handArg.value as TapHand)) {
      throw new MFError('TYPE', `tap() hand must be one of: ${validHands.join(', ')}`, position, this.filePath);
    }

    if (durArg.type !== 'dur') {
      throw new MFError('TYPE', 'tap() duration must be Dur', position, this.filePath);
    }
    const dur = this.durToTicks(durArg, position);

    if (!track.taps) track.taps = [];
    track.taps.push({
      type: 'tap',
      tick: track.cursor,
      noteKey,
      hand: handArg.value as TapHand,
      dur,
    });

    return makeNull();
  }

  // ============================================
  // Fourth batch: DAW features
  // ============================================

  private builtinSection(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const nameArg = this.evaluate(args[0]);
    const measuresArg = this.evaluate(args[1]);
    const colorArg = args.length > 2 ? this.evaluate(args[2]) : null;

    if (nameArg.type !== 'string') {
      throw new MFError('TYPE', 'section() name must be string', position, this.filePath);
    }

    const measures = toNumber(measuresArg);

    if (!track.arrangerSections) track.arrangerSections = [];
    const event: ArrangerSection = {
      type: 'arrangerSection',
      tick: track.cursor,
      name: nameArg.value,
      measures,
    };
    if (colorArg && colorArg.type === 'string') {
      event.color = colorArg.value;
    }
    track.arrangerSections.push(event);

    return makeNull();
  }

  private builtinChordTrack(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const chordArg = this.evaluate(args[0]);
    const durArg = args.length > 1 ? this.evaluate(args[1]) : null;

    if (chordArg.type !== 'string') {
      throw new MFError('TYPE', 'chordTrack() chord must be string', position, this.filePath);
    }

    if (!track.chordTrack) {
      track.chordTrack = { type: 'chordTrack', entries: [] };
    }

    const entry: ChordTrackEntry = {
      tick: track.cursor,
      chord: chordArg.value,
    };
    if (durArg && durArg.type === 'dur') {
      entry.duration = this.durToTicks(durArg, position);
    }
    track.chordTrack.entries.push(entry);

    return makeNull();
  }

  private builtinStepInput(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const enabledArg = this.evaluate(args[0]);
    const stepSizeArg = args.length > 1 ? this.evaluate(args[1]) : { type: 'fraction', numerator: 1, denominator: 4 };

    let stepSize = { numerator: 1, denominator: 4 };
    if (stepSizeArg.type === 'fraction') {
      stepSize = { numerator: stepSizeArg.numerator, denominator: stepSizeArg.denominator };
    }

    if (!track.stepInputSettings) track.stepInputSettings = [];
    track.stepInputSettings.push({
      type: 'stepInput',
      tick: track.cursor,
      enabled: isTruthy(enabledArg),
      stepSize,
    });

    return makeNull();
  }

  // ============================================
  // Fourth batch: Collaboration
  // ============================================

  private builtinMeasureComment(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const measureArg = this.evaluate(args[0]);
    const commentArg = this.evaluate(args[1]);
    const authorArg = args.length > 2 ? this.evaluate(args[2]) : null;

    const measure = toNumber(measureArg);

    if (commentArg.type !== 'string') {
      throw new MFError('TYPE', 'measureComment() comment must be string', position, this.filePath);
    }

    if (!track.measureComments) track.measureComments = [];
    const event: MeasureCommentEvent = {
      type: 'measureComment',
      tick: track.cursor,
      measure,
      comment: commentArg.value,
    };
    if (authorArg && authorArg.type === 'string') {
      event.author = authorArg.value;
    }
    track.measureComments.push(event);

    return makeNull();
  }

  private builtinCheckpoint(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const nameArg = this.evaluate(args[0]);

    if (nameArg.type !== 'string') {
      throw new MFError('TYPE', 'checkpoint() name must be string', position, this.filePath);
    }

    if (!track.versionCheckpoints) track.versionCheckpoints = [];
    track.versionCheckpoints.push({
      type: 'versionCheckpoint',
      tick: track.cursor,
      name: nameArg.value,
      timestamp: Date.now(),
    });

    return makeNull();
  }

  // ============================================
  // Fifth batch: Notation/diagrams
  // ============================================

  private builtinChordDiagram(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const nameArg = this.evaluate(args[0]);
    const stringsArg = this.evaluate(args[1]);
    const fretsArg = this.evaluate(args[2]);

    if (nameArg.type !== 'string') {
      throw new MFError('TYPE', 'chordDiagram() name must be string', position, this.filePath);
    }

    const strings = toNumber(stringsArg);
    let frets: (number | 'x' | 'o')[] = [];
    if (fretsArg.type === 'array') {
      frets = fretsArg.elements.map((e: RuntimeValue) => {
        if (e.type === 'string') return e.value as 'x' | 'o';
        return toNumber(e);
      });
    }

    if (!track.chordDiagrams) track.chordDiagrams = [];
    track.chordDiagrams.push({
      type: 'chordDiagram',
      tick: track.cursor,
      name: nameArg.value,
      strings,
      frets,
    });

    return makeNull();
  }

  private builtinScaleDiagram(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const rootArg = this.evaluate(args[0]);
    const scaleTypeArg = this.evaluate(args[1]);
    const startFretArg = this.evaluate(args[2]);
    const endFretArg = this.evaluate(args[3]);

    if (rootArg.type !== 'string' || scaleTypeArg.type !== 'string') {
      throw new MFError('TYPE', 'scaleDiagram() root and scaleType must be strings', position, this.filePath);
    }

    if (!track.scaleDiagrams) track.scaleDiagrams = [];
    track.scaleDiagrams.push({
      type: 'scaleDiagram',
      tick: track.cursor,
      root: rootArg.value,
      scaleType: scaleTypeArg.value,
      strings: 6,
      startFret: toNumber(startFretArg),
      endFret: toNumber(endFretArg),
      notes: [],
    });

    return makeNull();
  }

  private builtinHarpPedalDiagram(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pedalsArg = this.evaluate(args[0]);
    const styleArg = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'standard' };

    let pedals: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];
    if (pedalsArg.type === 'array' && pedalsArg.elements.length === 7) {
      pedals = pedalsArg.elements.map((e: RuntimeValue) => toNumber(e)) as [number, number, number, number, number, number, number];
    }

    if (!track.harpPedalDiagrams) track.harpPedalDiagrams = [];
    track.harpPedalDiagrams.push({
      type: 'harpPedalDiagram',
      tick: track.cursor,
      pedals,
      displayStyle: (styleArg as any).value || 'standard',
    });

    return makeNull();
  }

  private builtinPartExtraction(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const partNameArg = this.evaluate(args[0]);

    if (partNameArg.type !== 'string') {
      throw new MFError('TYPE', 'partExtraction() partName must be string', position, this.filePath);
    }

    if (!track.partExtractions) track.partExtractions = [];
    track.partExtractions.push({
      type: 'partExtraction',
      trackId: track.id,
      partName: partNameArg.value,
      showMeasureNumbers: true,
      showRehearsalMarks: true,
      showTempoMarkings: true,
      showDynamics: true,
      multiRestThreshold: 4,
      cueNotes: true,
    });

    return makeNull();
  }

  private builtinTranspositionDisplay(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const modeArg = this.evaluate(args[0]);

    if (modeArg.type !== 'string') {
      throw new MFError('TYPE', 'transpositionDisplay() mode must be string', position, this.filePath);
    }

    const validModes = ['concert', 'transposed'];
    if (!validModes.includes(modeArg.value)) {
      throw new MFError('TYPE', `transpositionDisplay() mode must be one of: ${validModes.join(', ')}`, position, this.filePath);
    }

    track.transpositionDisplay = {
      type: 'transpositionDisplay',
      tick: track.cursor,
      trackId: track.id,
      displayMode: modeArg.value as 'concert' | 'transposed',
    };

    return makeNull();
  }

  private builtinMeasureNumbers(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const showArg = this.evaluate(args[0]);
    const frequencyArg = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'every' };

    track.measureNumberConfig = {
      type: 'measureNumberConfig',
      showNumbers: isTruthy(showArg),
      frequency: (frequencyArg as any).value || 'every',
    };

    return makeNull();
  }

  // ============================================
  // Fifth batch: Synthesis
  // ============================================

  private builtinWavetable(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const wavetableArg = this.evaluate(args[0]);
    const positionArg = this.evaluate(args[1]);

    if (wavetableArg.type !== 'string') {
      throw new MFError('TYPE', 'wavetable() wavetable must be string', position, this.filePath);
    }

    if (!track.wavetableSynths) track.wavetableSynths = [];
    track.wavetableSynths.push({
      type: 'wavetableSynth',
      tick: track.cursor,
      wavetable: wavetableArg.value,
      position: toNumber(positionArg),
    });

    return makeNull();
  }

  private builtinFMSynth(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const algorithmArg = this.evaluate(args[0]);
    const operatorsArg = this.evaluate(args[1]);

    const algorithm = toNumber(algorithmArg);
    let operators: FMOperator[] = [];

    if (operatorsArg.type === 'array') {
      operators = operatorsArg.elements.map((op: any) => ({
        ratio: 1,
        level: 100,
        envelope: { attack: 10, decay: 100, sustain: 80, release: 200 },
      }));
    }

    if (!track.fmSynths) track.fmSynths = [];
    track.fmSynths.push({
      type: 'fmSynth',
      tick: track.cursor,
      algorithm,
      operators,
    });

    return makeNull();
  }

  private builtinAdditiveSynth(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const partialsArg = this.evaluate(args[0]);

    let partials: AdditivePartial[] = [];
    if (partialsArg.type === 'array') {
      partials = partialsArg.elements.map((p: any, i: number) => ({
        harmonic: i + 1,
        amplitude: toNumber(p),
      }));
    }

    if (!track.additiveSynths) track.additiveSynths = [];
    track.additiveSynths.push({
      type: 'additiveSynth',
      tick: track.cursor,
      partials,
    });

    return makeNull();
  }

  private builtinSubtractiveSynth(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const waveformArg = this.evaluate(args[0]);
    const cutoffArg = this.evaluate(args[1]);
    const resonanceArg = this.evaluate(args[2]);

    if (waveformArg.type !== 'string') {
      throw new MFError('TYPE', 'subtractiveSynth() waveform must be string', position, this.filePath);
    }

    if (!track.subtractiveSynths) track.subtractiveSynths = [];
    track.subtractiveSynths.push({
      type: 'subtractiveSynth',
      tick: track.cursor,
      oscillators: [{
        waveform: waveformArg.value as any,
        octave: 0,
        detune: 0,
        level: 1,
      }],
      filter: {
        type: 'lowpass',
        cutoff: toNumber(cutoffArg),
        resonance: toNumber(resonanceArg),
      },
      envelope: { attack: 10, decay: 100, sustain: 80, release: 200 },
    });

    return makeNull();
  }

  private builtinPhysicalModel(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const modelTypeArg = this.evaluate(args[0]);
    const exciterTypeArg = this.evaluate(args[1]);
    const resonatorTypeArg = this.evaluate(args[2]);

    if (modelTypeArg.type !== 'string' || exciterTypeArg.type !== 'string' || resonatorTypeArg.type !== 'string') {
      throw new MFError('TYPE', 'physicalModel() requires string arguments', position, this.filePath);
    }

    if (!track.physicalModels) track.physicalModels = [];
    track.physicalModels.push({
      type: 'physicalModel',
      tick: track.cursor,
      modelType: modelTypeArg.value as any,
      exciter: {
        type: exciterTypeArg.value as any,
        position: 0.5,
        force: 0.8,
      },
      resonator: {
        type: resonatorTypeArg.value as any,
        size: 1,
        material: 'steel',
      },
    });

    return makeNull();
  }

  // ============================================
  // Fifth batch: Audio processing (formantShift only - others already exist)
  // ============================================

  private builtinFormantShift(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const shiftArg = this.evaluate(args[0]);
    const preservePitchArg = args.length > 1 ? this.evaluate(args[1]) : makeBool(true);

    if (!track.formantShifts) track.formantShifts = [];
    track.formantShifts.push({
      type: 'formantShift',
      tick: track.cursor,
      shift: toNumber(shiftArg),
      preservePitch: isTruthy(preservePitchArg),
    });

    return makeNull();
  }

  // ============================================
  // Fifth batch: Video
  // ============================================

  private builtinVideoSync(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pathArg = this.evaluate(args[0]);
    const frameRateArg = this.evaluate(args[1]);

    if (pathArg.type !== 'string') {
      throw new MFError('TYPE', 'videoSync() path must be string', position, this.filePath);
    }

    if (!track.videoSyncs) track.videoSyncs = [];
    track.videoSyncs.push({
      type: 'videoSync',
      tick: track.cursor,
      videoPath: pathArg.value,
      startFrame: 0,
      frameRate: toNumber(frameRateArg),
    });

    return makeNull();
  }

  private builtinHitPoint(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const timecodeArg = this.evaluate(args[0]);
    const descriptionArg = this.evaluate(args[1]);
    const priorityArg = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'medium' };

    if (timecodeArg.type !== 'string' || descriptionArg.type !== 'string') {
      throw new MFError('TYPE', 'hitPoint() timecode and description must be strings', position, this.filePath);
    }

    if (!track.hitPoints) track.hitPoints = [];
    track.hitPoints.push({
      type: 'hitPoint',
      tick: track.cursor,
      timecode: timecodeArg.value,
      description: descriptionArg.value,
      priority: (priorityArg as any).value || 'medium',
    });

    return makeNull();
  }

  private builtinTimecodeDisplay(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const formatArg = this.evaluate(args[0]);
    const frameRateArg = this.evaluate(args[1]);

    if (formatArg.type !== 'string') {
      throw new MFError('TYPE', 'timecodeDisplay() format must be string', position, this.filePath);
    }

    track.timecodeDisplay = {
      type: 'timecodeDisplay',
      format: formatArg.value as any,
      frameRate: toNumber(frameRateArg) as any,
      dropFrame: false,
    };

    return makeNull();
  }

  // ============================================
  // Fifth batch: Workflow
  // ============================================

  private builtinProjectTemplate(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const nameArg = this.evaluate(args[0]);

    if (nameArg.type !== 'string') {
      throw new MFError('TYPE', 'projectTemplate() name must be string', position, this.filePath);
    }

    track.projectTemplate = {
      type: 'projectTemplate',
      name: nameArg.value,
      tracks: [],
      globalSettings: {
        ppq: this.ir.ppq,
        tempo: 120,
        timeSig: { numerator: 4, denominator: 4 },
      },
    };

    return makeNull();
  }

  private builtinTrackFolder(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const nameArg = this.evaluate(args[0]);
    const trackIdsArg = this.evaluate(args[1]);

    if (nameArg.type !== 'string') {
      throw new MFError('TYPE', 'trackFolder() name must be string', position, this.filePath);
    }

    let trackIds: string[] = [];
    if (trackIdsArg.type === 'array') {
      trackIds = trackIdsArg.elements
        .filter((e: RuntimeValue) => e.type === 'string')
        .map((e: RuntimeValue) => (e as any).value);
    }

    if (!track.trackFolders) track.trackFolders = [];
    track.trackFolders.push({
      type: 'trackFolder',
      id: `folder_${track.trackFolders.length}`,
      name: nameArg.value,
      trackIds,
    });

    return makeNull();
  }

  private builtinCollaboratorSession(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const sessionIdArg = this.evaluate(args[0]);
    const syncModeArg = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'realtime' };

    if (sessionIdArg.type !== 'string') {
      throw new MFError('TYPE', 'collaboratorSession() sessionId must be string', position, this.filePath);
    }

    track.collaboratorSession = {
      type: 'collaboratorSession',
      sessionId: sessionIdArg.value,
      collaborators: [],
      syncMode: (syncModeArg as any).value || 'realtime',
      conflictResolution: 'last-write',
    };

    return makeNull();
  }

  private builtinVersionDiff(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const baseVersionArg = this.evaluate(args[0]);
    const compareVersionArg = this.evaluate(args[1]);

    if (baseVersionArg.type !== 'string' || compareVersionArg.type !== 'string') {
      throw new MFError('TYPE', 'versionDiff() versions must be strings', position, this.filePath);
    }

    if (!track.versionDiffs) track.versionDiffs = [];
    track.versionDiffs.push({
      type: 'versionDiff',
      baseVersion: baseVersionArg.value,
      compareVersion: compareVersionArg.value,
      changes: [],
    });

    return makeNull();
  }

  // Helper methods
  private checkGlobalPhase(position: any): void {
    if (this.trackStarted) {
      throw createError('E050', 'Global function called after track started', position, this.filePath);
    }
  }

  private checkTrackPhase(position: any): void {
    if (!this.currentTrack) {
      throw new MFError('RUNTIME', 'Function must be called inside track block', position, this.filePath);
    }
  }

  private durToTicks(dur: DurValue, position: any): number {
    // Handle tick-based duration directly
    if (dur.ticks !== undefined) {
      let ticks = dur.ticks;

      // Apply nested tuplet ratios
      if (this.currentTrack?.tupletStack && this.currentTrack.tupletStack.length > 0) {
        for (const tuplet of this.currentTrack.tupletStack) {
          ticks = (ticks * tuplet.normal) / tuplet.actual;
        }
        ticks = Math.round(ticks);
      }

      if (ticks < 1) {
        throw createError('E101', `Duration too small after tuplet application`, position, this.filePath);
      }
      return ticks;
    }

    // Handle fraction-based duration
    if (dur.numerator === undefined || dur.denominator === undefined) {
      throw createError('E101', 'Invalid duration value', position, this.filePath);
    }

    if (this.ir.ppq === 0) {
      throw createError('E001', 'ppq not set', position, this.filePath);
    }
    // ticks = ppq * 4 * n / d
    let ticks = (this.ir.ppq * 4 * dur.numerator) / dur.denominator;

    // Apply dotted note multiplier
    if (dur.dots && dur.dots > 0) {
      let multiplier = 1;
      let addition = 0.5;
      for (let i = 0; i < dur.dots; i++) {
        multiplier += addition;
        addition /= 2;
      }
      ticks *= multiplier;
    }

    // Apply nested tuplet ratios (multiply all normal/actual ratios)
    if (this.currentTrack?.tupletStack && this.currentTrack.tupletStack.length > 0) {
      for (const tuplet of this.currentTrack.tupletStack) {
        ticks = (ticks * tuplet.normal) / tuplet.actual;
      }
    }

    // Round to nearest integer for nested tuplets
    ticks = Math.round(ticks);

    if (ticks < 1) {
      throw createError('E101', `Duration too small after tuplet application`, position, this.filePath);
    }
    return ticks;
  }

  private timeToTick(time: { bar: number; beat: number; sub: number }, position?: any): number {
    if (this.ir.ppq === 0) {
      return 0; // Will be validated later
    }
    if (this.ir.timeSigs.length === 0) {
      return 0; // Will be validated later
    }

    // Validate bar and beat are positive
    if (time.bar < 1 || time.beat < 1) {
      throw new MFError('E102', `Invalid time: bar and beat must be >= 1`, position, this.filePath);
    }

    // Sort time signatures by tick
    const sortedTimeSigs = [...this.ir.timeSigs].sort((a, b) => a.tick - b.tick);

    // Calculate tick by iterating through bars with changing time signatures
    let currentTick = 0;
    let currentBar = 1;
    let timeSigIndex = 0;

    // Get time signature at tick 0
    let currentTimeSig = sortedTimeSigs[0];

    // Iterate through bars until we reach the target bar
    while (currentBar < time.bar) {
      const ticksPerBeat = (this.ir.ppq * 4) / currentTimeSig.denominator;
      const ticksPerBar = ticksPerBeat * currentTimeSig.numerator;

      // Check if there's a new time signature at the next bar
      const nextBarTick = currentTick + ticksPerBar;

      // Find next time signature that starts at or before nextBarTick
      while (
        timeSigIndex < sortedTimeSigs.length - 1 &&
        sortedTimeSigs[timeSigIndex + 1].tick <= nextBarTick
      ) {
        // Only change at bar boundaries
        if (sortedTimeSigs[timeSigIndex + 1].tick === nextBarTick) {
          timeSigIndex++;
          currentTimeSig = sortedTimeSigs[timeSigIndex];
        } else {
          timeSigIndex++;
        }
      }

      currentTick = nextBarTick;
      currentBar++;
    }

    // Now we're at the target bar
    const ticksPerBeat = (this.ir.ppq * 4) / currentTimeSig.denominator;
    const ticksPerBar = ticksPerBeat * currentTimeSig.numerator;

    // E102: Validate sub is within beat tick range
    if (time.sub < 0 || time.sub >= ticksPerBeat) {
      throw createError('E102', `Time sub ${time.sub} out of range (0 <= sub < ${ticksPerBeat})`, position, this.filePath);
    }

    // Validate beat is within bar
    if (time.beat > currentTimeSig.numerator) {
      throw new MFError('E102', `Beat ${time.beat} exceeds time signature (${currentTimeSig.numerator}/${currentTimeSig.denominator})`, position, this.filePath);
    }

    const beatTicks = (time.beat - 1) * ticksPerBeat;

    return currentTick + beatTicks + time.sub;
  }

  private checkVocalOverlap(track: TrackState, tick: number, dur: number, position: any): void {
    const endTick = tick + dur;
    for (const event of track.events) {
      if (event.type === 'note') {
        const eventEnd = event.tick + event.dur;
        // Check overlap
        if (tick < eventEnd && endTick > event.tick) {
          throw createError('E200', 'Vocal note overlap detected', position, this.filePath);
        }
      }
    }
  }

  private valuesEqual(a: RuntimeValue, b: RuntimeValue): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
      case 'int':
      case 'float':
        return a.value === (b as typeof a).value;
      case 'string':
        return a.value === (b as typeof a).value;
      case 'bool':
        return a.value === (b as typeof a).value;
      case 'pitch':
        return a.midi === (b as typeof a).midi;
      case 'dur':
        return a.numerator === (b as typeof a).numerator && a.denominator === (b as typeof a).denominator;
      case 'time':
        return a.bar === (b as typeof a).bar && a.beat === (b as typeof a).beat && a.sub === (b as typeof a).sub;
      case 'null':
        return true;
      default:
        return false;
    }
  }

  private gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  private validateIR(): void {
    if (this.ir.ppq === 0) {
      throw createError('E001', 'ppq not set');
    }

    // Check tempo at tick 0
    const hasTempo0 = this.ir.tempos.some((t) => t.tick === 0);
    if (!hasTempo0) {
      throw createError('E010', 'tempo at tick=0 not set');
    }

    // Check timeSig at tick 0
    const hasTimeSig0 = this.ir.timeSigs.some((t) => t.tick === 0);
    if (!hasTimeSig0) {
      throw createError('E011', 'timeSig at tick=0 not set');
    }
  }

  private buildFinalIR(): SongIR {
    // Sort tempos and timeSigs by tick
    this.ir.tempos.sort((a, b) => a.tick - b.tick);
    this.ir.timeSigs.sort((a, b) => a.tick - b.tick);

    // Build tracks array
    for (const [id, state] of this.tracks) {
      // Sort events by tick
      state.events.sort((a, b) => a.tick - b.tick);

      if (state.kind === 'vocal') {
        // Sort vocaloid params by tick, then by param type for consistency
        if (state.vocaloidParams && state.vocaloidParams.length > 0) {
          state.vocaloidParams.sort((a, b) => a.tick - b.tick || a.param.localeCompare(b.param));
        }

        const track: VocalTrack = {
          id: state.id,
          kind: 'vocal',
          name: state.id,
          meta: {
            engine: state.meta.engine as string | undefined,
            voice: state.meta.voice as string | undefined,
          },
          phrases: state.phrases ?? [],
          events: state.events,
          vocaloidParams: state.vocaloidParams && state.vocaloidParams.length > 0
            ? state.vocaloidParams
            : undefined,
        };
        this.ir.tracks.push(track);
      } else {
        const track: MidiTrack = {
          id: state.id,
          kind: 'midi',
          name: state.id,
          channel: state.channel ?? 0,
          program: state.program ?? 0,
          defaultVel: state.defaultVel ?? 96,
          events: state.events,
        };
        this.ir.tracks.push(track);
      }
    }

    return this.ir;
  }
}
