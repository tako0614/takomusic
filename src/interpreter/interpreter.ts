// Interpreter for MFS language

import type {
  Program,
  Statement,
  Expression,
  ProcDeclaration,
  TrackBlock,
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
} from '../types/ir.js';
import {
  RuntimeValue,
  makeInt,
  makeFloat,
  makeString,
  makeBool,
  makePitch,
  makeDur,
  makeTime,
  makeArray,
  makeNull,
  toNumber,
  isTruthy,
} from './runtime.js';
import { Scope } from './scope.js';
import { createError, MFError } from '../errors.js';
import { TrackState, DRUM_MAP } from './trackState.js';
import * as coreBuiltins from './builtins/core.js';
import * as midiBuiltins from './builtins/midi.js';

export class Interpreter {
  private ir: SongIR;
  private scope: Scope;
  private tracks: Map<string, TrackState> = new Map();
  private currentTrack: TrackState | null = null;
  private trackStarted: boolean = false;
  private callStack: Set<string> = new Set();
  private forIterationCount: number = 0;
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.scope = new Scope();
    this.ir = {
      schemaVersion: '0.1',
      title: null,
      ppq: 0,
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

  execute(program: Program): SongIR {
    // First pass: collect all proc declarations from this module
    for (const stmt of program.statements) {
      if (stmt.kind === 'ProcDeclaration') {
        this.scope.defineProc(stmt);
      } else if (stmt.kind === 'ExportStatement') {
        if (stmt.declaration.kind === 'ProcDeclaration') {
          this.scope.defineProc(stmt.declaration);
        }
      }
    }

    // Find and execute main()
    const mainProc = this.scope.lookupProc('main');
    if (!mainProc) {
      throw new MFError('E400', 'No main() procedure found', undefined, this.filePath);
    }

    // Execute main
    this.executeStatements(mainProc.body);

    // Validate IR
    this.validateIR();

    // Build final IR
    return this.buildFinalIR();
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
          const childScope = this.scope.createChild();
          const oldScope = this.scope;
          this.scope = childScope;
          this.executeStatements(stmt.alternate);
          this.scope = oldScope;
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

        for (let i = start; i < end; i++) {
          this.forIterationCount++;
          const childScope = this.scope.createChild();
          childScope.defineConst(stmt.variable, makeInt(i));
          const oldScope = this.scope;
          this.scope = childScope;
          this.executeStatements(stmt.body);
          this.scope = oldScope;
        }
        break;
      }

      case 'TrackBlock': {
        this.executeTrackBlock(stmt);
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

      default:
        throw new Error(`Unknown statement kind: ${(stmt as Statement).kind}`);
    }
  }

  private executeTrackBlock(block: TrackBlock): void {
    this.trackStarted = true;

    // Get or create track state
    let trackState = this.tracks.get(block.id);
    if (!trackState) {
      trackState = {
        id: block.id,
        kind: block.trackKind,
        cursor: 0,
        events: [],
        meta: {},
      };

      // Parse options
      if (block.options) {
        for (const prop of block.options.properties) {
          const value = this.evaluate(prop.value);
          if (value.type === 'string') {
            trackState.meta[prop.key] = value.value;
          } else if (value.type === 'int') {
            if (prop.key === 'ch') {
              trackState.channel = value.value - 1; // Convert to 0-based
            } else if (prop.key === 'program') {
              trackState.program = value.value;
            } else if (prop.key === 'vel') {
              trackState.defaultVel = value.value;
            } else {
              trackState.meta[prop.key] = value.value;
            }
          }
        }
      }

      // Set defaults for MIDI tracks
      if (block.trackKind === 'midi') {
        trackState.channel = trackState.channel ?? 0;
        trackState.program = trackState.program ?? 0;
        trackState.defaultVel = trackState.defaultVel ?? 96;
      }

      this.tracks.set(block.id, trackState);
    }

    // Enter track context
    const oldTrack = this.currentTrack;
    this.currentTrack = trackState;

    // Execute body in new scope
    const childScope = this.scope.createChild();
    const oldScope = this.scope;
    this.scope = childScope;
    this.executeStatements(block.body);
    this.scope = oldScope;

    // Exit track context
    this.currentTrack = oldTrack;
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

      case 'PitchLiteral':
        return makePitch(expr.midi);

      case 'DurLiteral':
        // Validate: Dur cannot be negative or zero
        if (expr.numerator <= 0 || expr.denominator <= 0) {
          throw new MFError('E101', `Invalid duration: ${expr.numerator}/${expr.denominator} (must be positive)`, expr.position, this.filePath);
        }
        return makeDur(expr.numerator, expr.denominator);

      case 'TimeLiteral':
        return makeTime(expr.bar, expr.beat, expr.sub);

      case 'ArrayLiteral':
        return makeArray(expr.elements.map((e) => this.evaluate(e)));

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

      case 'ObjectLiteral':
      case 'RangeExpression':
        throw new Error(`${expr.kind} cannot be evaluated as expression`);

      default:
        throw new Error(`Unknown expression kind: ${(expr as Expression).kind}`);
    }
  }

  private evaluateBinary(op: string, leftExpr: Expression, rightExpr: Expression): RuntimeValue {
    const left = this.evaluate(leftExpr);
    const right = this.evaluate(rightExpr);

    // Short-circuit evaluation for logical operators
    if (op === '&&') {
      return makeBool(isTruthy(left) && isTruthy(right));
    }
    if (op === '||') {
      return makeBool(isTruthy(left) || isTruthy(right));
    }

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
      // Pitch + Int
      if (left.type === 'pitch' && right.type === 'int') {
        return makePitch(left.midi + right.value);
      }
      // Dur + Dur
      if (left.type === 'dur' && right.type === 'dur') {
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

    throw new Error(`Unknown binary operator: ${op}`);
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

    throw new Error(`Unknown unary operator: ${op}`);
  }

  private evaluateCall(
    callee: string,
    args: Expression[],
    position: { line: number; column: number; offset: number }
  ): RuntimeValue {
    // Built-in functions
    switch (callee) {
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
        return this.builtinAudioClip(args, position);
      case 'effect':
        return this.builtinEffect(args, position);
      case 'reverb':
        return this.builtinReverb(args, position);
      case 'delay':
        return this.builtinDelay(args, position);
      case 'eq':
        return this.builtinEQ(args, position);
      case 'compressor':
        return this.builtinCompressor(args, position);

      // Microtonality & Tuning
      case 'tuning':
        return this.builtinTuning(args, position);
      case 'cents':
        return this.builtinCents(args, position);
      case 'quarterTone':
        return this.builtinQuarterTone(args, position);
      case 'pitchCorrection':
        return this.builtinPitchCorrection(args, position);

      // Algorithmic Composition
      case 'euclidean':
        return this.builtinEuclidean(args, position);
      case 'probability':
        return this.builtinProbability(args, position);
      case 'markov':
        return this.builtinMarkov(args, position);
      case 'randomSeed':
        return this.builtinRandomSeed(args, position);
      case 'randomNote':
        return this.builtinRandomNote(args, position);
      case 'randomRhythm':
        return this.builtinRandomRhythm(args, position);
      case 'constraint':
        return this.builtinConstraint(args, position);
      case 'cellular':
        return this.builtinCellular(args, position);
      case 'lsystem':
        return this.builtinLSystem(args, position);

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
        return this.builtinPhaser(args, position);
      case 'flanger':
        return this.builtinFlanger(args, position);
      case 'chorus':
        return this.builtinChorus(args, position);
      case 'distortion':
        return this.builtinDistortion(args, position);
      case 'filter':
        return this.builtinFilter(args, position);
      case 'sidechain':
        return this.builtinSidechain(args, position);

      // Live Performance
      case 'midiMap':
        return this.builtinMidiMap(args, position);
      case 'scene':
        return this.builtinScene(args, position);
      case 'launchScene':
        return this.builtinLaunchScene(args, position);
      case 'liveLoop':
        return this.builtinLiveLoop(args, position);

      // Score Layout
      case 'pageBreak':
        return this.builtinPageBreak(args, position);
      case 'systemBreak':
        return this.builtinSystemBreak(args, position);
      case 'staffSpacing':
        return this.builtinStaffSpacing(args, position);
      case 'text':
        return this.builtinText(args, position);
      case 'rehearsalMark':
        return this.builtinRehearsalMark(args, position);
      case 'direction':
        return this.builtinDirection(args, position);

      // Audio manipulation
      case 'timeStretch':
        return this.builtinTimeStretch(args, position);
      case 'pitchShift':
        return this.builtinPitchShift(args, position);
      case 'sampleSlicer':
        return this.builtinSampleSlicer(args, position);
      case 'granular':
        return this.builtinGranular(args, position);

      // Advanced automation
      case 'automationLane':
        return this.builtinAutomationLane(args, position);
      case 'automationPoint':
        return this.builtinAutomationPoint(args, position);
      case 'lfo':
        return this.builtinLFO(args, position);
      case 'envelopeFollower':
        return this.builtinEnvelopeFollower(args, position);
      case 'modMatrix':
        return this.builtinModMatrix(args, position);

      // Mixing/Mastering
      case 'bus':
        return this.builtinBus(args, position);
      case 'send':
        return this.builtinSend(args, position);
      case 'stereoWidth':
        return this.builtinStereoWidth(args, position);
      case 'limiter':
        return this.builtinLimiter(args, position);
      case 'maximizer':
        return this.builtinMaximizer(args, position);
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
    }

    // User-defined proc
    const proc = this.scope.lookupProc(callee);
    if (proc) {
      // Check for recursion
      if (this.callStack.has(callee)) {
        throw createError('E310', `Recursion detected in '${callee}'`, position, this.filePath);
      }

      this.callStack.add(callee);

      // Create scope with parameters
      const childScope = this.scope.createChild();
      for (let i = 0; i < proc.params.length; i++) {
        const value = i < args.length ? this.evaluate(args[i]) : makeNull();
        childScope.defineConst(proc.params[i], value);
      }

      const oldScope = this.scope;
      this.scope = childScope;
      this.executeStatements(proc.body);
      this.scope = oldScope;

      this.callStack.delete(callee);
      return makeNull();
    }

    throw createError('E400', `Undefined function '${callee}'`, position, this.filePath);
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

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, steps.value);
    const tickStep = durTicks / (numSteps - 1);
    const valStep = (endVal.value - startVal.value) / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const value = Math.round(Math.min(127, Math.max(0, startVal.value + valStep * i)));
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

    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', 'expressionCurve() values must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'expressionCurve() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, (steps as any).value || 16);
    const tickStep = durTicks / (numSteps - 1);
    const valStep = (endVal.value - startVal.value) / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const value = Math.round(Math.min(127, Math.max(0, startVal.value + valStep * i)));
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

    if (startVal.type !== 'int' || endVal.type !== 'int') {
      throw new MFError('TYPE', 'pitchBendCurve() values must be int', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'pitchBendCurve() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const startTick = track.cursor;
    const numSteps = Math.max(2, (steps as any).value || 16);
    const tickStep = durTicks / (numSteps - 1);
    const valStep = (endVal.value - startVal.value) / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const value = Math.round(Math.min(8191, Math.max(-8192, startVal.value + valStep * i)));
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

    track.currentTuplet = { actual, normal };
    return makeNull();
  }

  private builtinTupletEnd(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    track.currentTuplet = undefined;
    return makeNull();
  }

  private builtinTriplet(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    // triplet creates a 3:2 tuplet context for the callback
    track.currentTuplet = { actual: 3, normal: 2 };

    // If there's a callback argument (proc), execute it
    if (args.length > 0) {
      const callback = args[0];
      if (callback.kind === 'CallExpression') {
        this.evaluateCall(callback.callee, callback.arguments, position);
      }
      track.currentTuplet = undefined;
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

  private durToTicks(dur: { numerator: number; denominator: number }, position: any): number {
    if (this.ir.ppq === 0) {
      throw createError('E001', 'ppq not set', position, this.filePath);
    }
    // ticks = ppq * 4 * n / d
    const ticks = (this.ir.ppq * 4 * dur.numerator) / dur.denominator;
    if (!Number.isInteger(ticks)) {
      throw createError('E101', `Dur ${dur.numerator}/${dur.denominator} does not divide evenly`, position, this.filePath);
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
