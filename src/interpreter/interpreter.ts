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

// Drum name to MIDI note mapping
const DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hhc: 42,
  hho: 46,
  tom1: 50,
  crash: 49,
  ride: 51,
};

interface TrackState {
  id: string;
  kind: 'vocal' | 'midi';
  cursor: number; // tick position
  events: TrackEvent[];
  meta: Record<string, string | number>;
  channel?: number;
  program?: number;
  defaultVel?: number;
  // Vocaloid parameters
  vocaloidParams?: VocaloidParamEvent[];
  // Notation events
  notation?: NotationEvents;
  // Current slur tracking
  currentSlurStart?: number;
  // Extended notation state
  currentTuplet?: TupletInfo;
  currentVoice?: number;
  currentOttava?: { startTick: number; shift: number };
  graceNotes?: GraceNoteEvent[];
  repeats?: RepeatEvent[];
  fermatas?: FermataEvent[];
  ottavas?: OttavaEvent[];
  // Extended features
  grandStaff?: GrandStaffInfo;
  tablature?: TablatureInfo;
  chordSymbols?: ChordSymbolEvent[];
  figuredBass?: FiguredBassEvent[];
  markers?: MarkerEvent[];
  patterns?: PatternInstance[];
  audioClips?: AudioClipEvent[];
  effects?: AudioEffect[];
}

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
      case 'title':
        return this.builtinTitle(args, position);
      case 'ppq':
        return this.builtinPpq(args, position);
      case 'tempo':
        return this.builtinTempo(args, position);
      case 'timeSig':
        return this.builtinTimeSig(args, position);
      case 'at':
        return this.builtinAt(args, position);
      case 'atTick':
        return this.builtinAtTick(args, position);
      case 'advance':
        return this.builtinAdvance(args, position);
      case 'advanceTick':
        return this.builtinAdvanceTick(args, position);
      case 'note':
        return this.builtinNote(args, position);
      case 'rest':
        return this.builtinRest(args, position);
      case 'chord':
        return this.builtinChord(args, position);
      case 'drum':
        return this.builtinDrum(args, position, args);
      // CC and expression functions
      case 'cc':
        return this.builtinCC(args, position);
      case 'expression':
        return this.builtinExpression(args, position);
      case 'modulation':
        return this.builtinModulation(args, position);
      case 'pan':
        return this.builtinPan(args, position);
      case 'volume':
        return this.builtinVolume(args, position);
      case 'sustain':
        return this.builtinSustain(args, position);
      case 'pitchBend':
        return this.builtinPitchBend(args, position);
      // Tempo curve
      case 'tempoCurve':
        return this.builtinTempoCurve(args, position);
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
      // Advanced MIDI functions
      case 'aftertouch':
        return this.builtinAftertouch(args, position);
      case 'polyAftertouch':
        return this.builtinPolyAftertouch(args, position);
      case 'nrpn':
        return this.builtinNRPN(args, position);
      case 'rpn':
        return this.builtinRPN(args, position);
      case 'sysex':
        return this.builtinSysEx(args, position);
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

  // Built-in functions
  private builtinTitle(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);
    const val = this.evaluate(args[0]);
    if (val.type !== 'string') {
      throw new MFError('TYPE', 'title() expects string', position, this.filePath);
    }
    this.ir.title = val.value;
    return makeNull();
  }

  private builtinPpq(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);
    const val = this.evaluate(args[0]);
    if (val.type !== 'int') {
      throw new MFError('TYPE', 'ppq() expects int', position, this.filePath);
    }
    this.ir.ppq = val.value;
    return makeNull();
  }

  private builtinTempo(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);

    if (args.length === 1) {
      // tempo(bpm)
      const bpm = this.evaluate(args[0]);
      const bpmVal = toNumber(bpm);
      this.ir.tempos.push({ tick: 0, bpm: bpmVal });
    } else {
      // tempo(time, bpm)
      const time = this.evaluate(args[0]);
      const bpm = this.evaluate(args[1]);
      if (time.type !== 'time') {
        throw new MFError('TYPE', 'tempo() time must be Time', position, this.filePath);
      }
      const tick = this.timeToTick(time, position);
      this.ir.tempos.push({ tick, bpm: toNumber(bpm) });
    }
    return makeNull();
  }

  private builtinTimeSig(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);

    if (args.length === 2) {
      // timeSig(num, den)
      const num = this.evaluate(args[0]);
      const den = this.evaluate(args[1]);
      if (num.type !== 'int' || den.type !== 'int') {
        throw new MFError('TYPE', 'timeSig() expects int, int', position, this.filePath);
      }
      this.ir.timeSigs.push({ tick: 0, numerator: num.value, denominator: den.value });
    } else {
      // timeSig(time, num, den)
      const time = this.evaluate(args[0]);
      const num = this.evaluate(args[1]);
      const den = this.evaluate(args[2]);
      if (time.type !== 'time') {
        throw new MFError('TYPE', 'timeSig() time must be Time', position, this.filePath);
      }
      // Must be at bar start
      if (time.beat !== 1 || time.sub !== 0) {
        throw createError('E020', 'timeSig must be at bar start (beat=1, sub=0)', position, this.filePath);
      }
      const tick = this.timeToTick(time, position);
      if (num.type !== 'int' || den.type !== 'int') {
        throw new MFError('TYPE', 'timeSig() expects int, int', position, this.filePath);
      }
      this.ir.timeSigs.push({ tick, numerator: num.value, denominator: den.value });
    }
    return makeNull();
  }

  private builtinAt(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const time = this.evaluate(args[0]);
    if (time.type !== 'time') {
      throw new MFError('TYPE', 'at() expects Time', position, this.filePath);
    }
    const tick = this.timeToTick(time, position);
    this.currentTrack!.cursor = tick;
    return makeNull();
  }

  private builtinAtTick(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const tick = this.evaluate(args[0]);
    if (tick.type !== 'int') {
      throw new MFError('TYPE', 'atTick() expects int', position, this.filePath);
    }
    this.currentTrack!.cursor = tick.value;
    return makeNull();
  }

  private builtinAdvance(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const dur = this.evaluate(args[0]);
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'advance() expects Dur', position, this.filePath);
    }
    const ticks = this.durToTicks(dur, position);
    this.currentTrack!.cursor += ticks;
    return makeNull();
  }

  private builtinAdvanceTick(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const dt = this.evaluate(args[0]);
    if (dt.type !== 'int') {
      throw new MFError('TYPE', 'advanceTick() expects int', position, this.filePath);
    }
    this.currentTrack!.cursor += dt.value;
    return makeNull();
  }

  private builtinNote(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const pitch = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'note() pitch must be Pitch', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'note() duration must be Dur', position, this.filePath);
    }

    // Validate pitch range
    if (pitch.midi < 0 || pitch.midi > 127) {
      throw createError('E110', `Pitch ${pitch.midi} out of range 0..127`, position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;

    if (track.kind === 'vocal') {
      // Vocal needs lyric
      if (args.length < 3) {
        throw createError('E210', 'Vocal note requires lyric', position, this.filePath);
      }
      const lyric = this.evaluate(args[2]);
      if (lyric.type !== 'string' || lyric.value === '') {
        throw createError('E210', 'Vocal lyric must be non-empty string', position, this.filePath);
      }

      // Check for overlap
      this.checkVocalOverlap(track, tick, durTicks, position);

      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: durTicks,
        key: pitch.midi,
        lyric: lyric.value,
      };
      track.events.push(event);
    } else {
      // MIDI track
      const vel = args.length >= 3
        ? toNumber(this.evaluate(args[2]))
        : track.defaultVel ?? 96;

      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: durTicks,
        key: pitch.midi,
        vel,
      };
      track.events.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinRest(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    const dur = this.evaluate(args[0]);
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'rest() expects Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;

    const event: RestEvent = {
      type: 'rest',
      tick,
      dur: durTicks,
    };
    track.events.push(event);

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinChord(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'chord() only valid in MIDI tracks', position, this.filePath);
    }

    const pitches = this.evaluate(args[0]);
    const dur = this.evaluate(args[1]);

    if (pitches.type !== 'array') {
      throw new MFError('TYPE', 'chord() pitches must be array', position, this.filePath);
    }
    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'chord() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;
    const vel = args.length >= 3
      ? toNumber(this.evaluate(args[2]))
      : track.defaultVel ?? 96;

    for (const p of pitches.elements) {
      if (p.type !== 'pitch') {
        throw new MFError('TYPE', 'chord() elements must be Pitch', position, this.filePath);
      }
      if (p.midi < 0 || p.midi > 127) {
        throw createError('E110', `Pitch ${p.midi} out of range 0..127`, position, this.filePath);
      }

      const event: NoteEvent = {
        type: 'note',
        tick,
        dur: durTicks,
        key: p.midi,
        vel,
      };
      track.events.push(event);
    }

    track.cursor += durTicks;
    return makeNull();
  }

  private builtinDrum(args: Expression[], position: any, rawArgs: Expression[]): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'drum() only valid in MIDI tracks', position, this.filePath);
    }

    // Get drum name - can be identifier or string
    let drumName: string;
    const nameExpr = rawArgs[0];
    if (nameExpr.kind === 'Identifier') {
      drumName = nameExpr.name;
    } else {
      const name = this.evaluate(args[0]);
      if (name.type !== 'string') {
        throw new MFError('TYPE', 'drum() name must be identifier or string', position, this.filePath);
      }
      drumName = name.value;
    }

    const dur = this.evaluate(args[1]);

    const midiNote = DRUM_MAP[drumName];
    if (midiNote === undefined) {
      throw new MFError('TYPE', `Unknown drum name: ${drumName}`, position, this.filePath);
    }

    if (dur.type !== 'dur') {
      throw new MFError('TYPE', 'drum() duration must be Dur', position, this.filePath);
    }

    const durTicks = this.durToTicks(dur, position);
    const tick = track.cursor;
    const vel = args.length >= 3
      ? toNumber(this.evaluate(args[2]))
      : track.defaultVel ?? 96;

    const event: NoteEvent = {
      type: 'note',
      tick,
      dur: durTicks,
      key: midiNote,
      vel,
    };
    track.events.push(event);

    track.cursor += durTicks;
    return makeNull();
  }

  // CC and control functions
  private builtinCC(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'cc() only valid in MIDI tracks', position, this.filePath);
    }

    const controller = this.evaluate(args[0]);
    const value = this.evaluate(args[1]);

    if (controller.type !== 'int') {
      throw new MFError('TYPE', 'cc() controller must be int', position, this.filePath);
    }
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'cc() value must be int', position, this.filePath);
    }

    if (controller.value < 0 || controller.value > 127) {
      throw createError('E120', `CC controller ${controller.value} out of range 0..127`, position, this.filePath);
    }
    if (value.value < 0 || value.value > 127) {
      throw createError('E121', `CC value ${value.value} out of range 0..127`, position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: controller.value,
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinExpression(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'expression() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'expression() value must be int', position, this.filePath);
    }
    if (value.value < 0 || value.value > 127) {
      throw createError('E121', `expression value ${value.value} out of range 0..127`, position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: 11, // CC11 = Expression
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinModulation(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'modulation() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'modulation() value must be int', position, this.filePath);
    }
    if (value.value < 0 || value.value > 127) {
      throw createError('E121', `modulation value ${value.value} out of range 0..127`, position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: 1, // CC1 = Modulation
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinPan(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'pan() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'pan() value must be int', position, this.filePath);
    }
    if (value.value < 0 || value.value > 127) {
      throw createError('E121', `pan value ${value.value} out of range 0..127 (64=center)`, position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: 10, // CC10 = Pan
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinVolume(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'volume() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'volume() value must be int', position, this.filePath);
    }
    if (value.value < 0 || value.value > 127) {
      throw createError('E121', `volume value ${value.value} out of range 0..127`, position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: 7, // CC7 = Volume
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinSustain(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'sustain() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'bool') {
      throw new MFError('TYPE', 'sustain() expects bool (true/false)', position, this.filePath);
    }

    const event: CCEvent = {
      type: 'cc',
      tick: track.cursor,
      controller: 64, // CC64 = Sustain Pedal
      value: value.value ? 127 : 0,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinPitchBend(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;

    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'pitchBend() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    if (value.type !== 'int') {
      throw new MFError('TYPE', 'pitchBend() value must be int', position, this.filePath);
    }
    if (value.value < -8192 || value.value > 8191) {
      throw createError('E122', `pitchBend value ${value.value} out of range -8192..8191`, position, this.filePath);
    }

    const event: PitchBendEvent = {
      type: 'pitchBend',
      tick: track.cursor,
      value: value.value,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinTempoCurve(args: Expression[], position: any): RuntimeValue {
    this.checkGlobalPhase(position);

    const startTime = this.evaluate(args[0]);
    const endTime = this.evaluate(args[1]);
    const startBpm = this.evaluate(args[2]);
    const endBpm = this.evaluate(args[3]);
    const steps = args.length >= 5 ? this.evaluate(args[4]) : makeInt(16);

    if (startTime.type !== 'time') {
      throw new MFError('TYPE', 'tempoCurve() startTime must be Time', position, this.filePath);
    }
    if (endTime.type !== 'time') {
      throw new MFError('TYPE', 'tempoCurve() endTime must be Time', position, this.filePath);
    }
    if (steps.type !== 'int') {
      throw new MFError('TYPE', 'tempoCurve() steps must be int', position, this.filePath);
    }

    const startTick = this.timeToTick(startTime, position);
    const endTick = this.timeToTick(endTime, position);
    const startBpmVal = toNumber(startBpm);
    const endBpmVal = toNumber(endBpm);
    const numSteps = steps.value;

    if (numSteps < 2) {
      throw createError('E123', 'tempoCurve() steps must be at least 2', position, this.filePath);
    }

    // Generate tempo points with linear interpolation
    const tickStep = (endTick - startTick) / (numSteps - 1);
    const bpmStep = (endBpmVal - startBpmVal) / (numSteps - 1);

    for (let i = 0; i < numSteps; i++) {
      const tick = Math.round(startTick + tickStep * i);
      const bpm = startBpmVal + bpmStep * i;
      this.ir.tempos.push({ tick, bpm });
    }

    return makeNull();
  }

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

  // Advanced MIDI functions
  private builtinAftertouch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'aftertouch() only valid in MIDI tracks', position, this.filePath);
    }

    const value = this.evaluate(args[0]);
    const valueNum = toNumber(value);
    if (valueNum < 0 || valueNum > 127) {
      throw createError('E121', `Aftertouch value ${valueNum} out of range 0..127`, position, this.filePath);
    }

    const event: AftertouchEvent = {
      type: 'aftertouch',
      tick: track.cursor,
      value: valueNum,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinPolyAftertouch(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'polyAftertouch() only valid in MIDI tracks', position, this.filePath);
    }

    const pitch = this.evaluate(args[0]);
    const value = this.evaluate(args[1]);

    if (pitch.type !== 'pitch') {
      throw new MFError('TYPE', 'polyAftertouch() first argument must be Pitch', position, this.filePath);
    }
    const valueNum = toNumber(value);
    if (valueNum < 0 || valueNum > 127) {
      throw createError('E121', `Aftertouch value ${valueNum} out of range 0..127`, position, this.filePath);
    }

    const event: PolyAftertouchEvent = {
      type: 'polyAftertouch',
      tick: track.cursor,
      key: pitch.midi,
      value: valueNum,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinNRPN(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'nrpn() only valid in MIDI tracks', position, this.filePath);
    }

    const paramMSB = toNumber(this.evaluate(args[0]));
    const paramLSB = toNumber(this.evaluate(args[1]));
    const valueMSB = toNumber(this.evaluate(args[2]));
    const valueLSB = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

    if (paramMSB < 0 || paramMSB > 127 || paramLSB < 0 || paramLSB > 127) {
      throw createError('E120', 'NRPN param MSB/LSB must be 0..127', position, this.filePath);
    }
    if (valueMSB < 0 || valueMSB > 127 || (valueLSB !== undefined && (valueLSB < 0 || valueLSB > 127))) {
      throw createError('E121', 'NRPN value MSB/LSB must be 0..127', position, this.filePath);
    }

    const event: NRPNEvent = {
      type: 'nrpn',
      tick: track.cursor,
      paramMSB,
      paramLSB,
      valueMSB,
      valueLSB,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinRPN(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'rpn() only valid in MIDI tracks', position, this.filePath);
    }

    const paramMSB = toNumber(this.evaluate(args[0]));
    const paramLSB = toNumber(this.evaluate(args[1]));
    const valueMSB = toNumber(this.evaluate(args[2]));
    const valueLSB = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

    if (paramMSB < 0 || paramMSB > 127 || paramLSB < 0 || paramLSB > 127) {
      throw createError('E120', 'RPN param MSB/LSB must be 0..127', position, this.filePath);
    }
    if (valueMSB < 0 || valueMSB > 127 || (valueLSB !== undefined && (valueLSB < 0 || valueLSB > 127))) {
      throw createError('E121', 'RPN value MSB/LSB must be 0..127', position, this.filePath);
    }

    // RPN uses CC 101/100 for param, NRPN uses CC 99/98
    // We store as NRPN type but mark it differently for MIDI generator
    const event: NRPNEvent = {
      type: 'nrpn',
      tick: track.cursor,
      paramMSB: paramMSB | 0x80, // Mark as RPN by setting high bit
      paramLSB,
      valueMSB,
      valueLSB,
    };
    track.events.push(event);
    return makeNull();
  }

  private builtinSysEx(args: Expression[], position: any): RuntimeValue {
    this.checkTrackPhase(position);
    const track = this.currentTrack!;
    if (track.kind !== 'midi') {
      throw new MFError('TYPE', 'sysex() only valid in MIDI tracks', position, this.filePath);
    }

    const dataArg = this.evaluate(args[0]);
    if (dataArg.type !== 'array') {
      throw new MFError('TYPE', 'sysex() expects array of bytes', position, this.filePath);
    }

    const data: number[] = [];
    for (const elem of dataArg.elements) {
      const byteVal = toNumber(elem);
      if (byteVal < 0 || byteVal > 127) {
        throw new MFError('RANGE', `SysEx byte ${byteVal} out of range 0..127`, position, this.filePath);
      }
      data.push(byteVal);
    }

    const event: SysExEvent = {
      type: 'sysex',
      tick: track.cursor,
      data,
    };
    track.events.push(event);
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
