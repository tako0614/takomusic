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
        const track: VocalTrack = {
          id: state.id,
          kind: 'vocal',
          name: state.id,
          meta: {
            engine: state.meta.engine as string | undefined,
            voice: state.meta.voice as string | undefined,
          },
          events: state.events,
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
