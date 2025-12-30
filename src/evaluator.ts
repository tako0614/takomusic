import {
  addRat,
  divRat,
  isIntegerNumber,
  makeRat,
  mulRat,
  ratFromInt,
  ratToNumber,
  subRat,
} from './rat.js';
import { parsePitchLiteral, transposePitch } from './pitch.js';
import { Scope } from './scope.js';
import type { Diagnostic } from './diagnostics.js';
import type { LyricSpan } from './ir.js';
import type {
  Block,
  ClipExpr,
  CallArg,
  Expr,
  FnDecl,
  ForStmt,
  IfStmt,
  MatchExpr,
  Param,
  ReturnStmt,
  ScoreExpr,
  SoundBodyItem,
  Statement,
  TempoItem,
  MeterItem,
  TrackDecl,
} from './ast.js';
import {
  ArrayValue,
  AutomationEventValue,
  BreathEventValue,
  ClipEventValue,
  ClipValueData,
  DrumHitEventValue,
  FunctionValue,
  MarkerEventValue,
  NoteEventValue,
  ObjectValue,
  PlacementValue,
  PosAtom,
  PosRef,
  PosValue,
  RangeValue,
  RatValue,
  RuntimeValue,
  ScoreValueData,
  SoundDeclValue,
  TempoEventValue,
  TrackRole,
  TrackValueData,
  VocalDeclValue,
  makeArray,
  makeBool,
  makeNull,
  makeNumber,
  makeObject,
  makePitchValue,
  makePosExpr,
  makePosRef,
  makePosValue,
  makeRatValue,
  makeString,
  isPosExpr,
  isPosRef,
  isRat,
} from './runtime.js';
import { clipToObject, scoreToObject, coerceClip, coerceCurve, coerceLyricSpan } from './value-codec.js';

class ReturnSignal {
  value: RuntimeValue;

  constructor(value: RuntimeValue) {
    this.value = value;
  }
}

export class V3Evaluator {
  private diagnostics: Diagnostic[];
  private filePath?: string;
  private callDepth = 0;
  private static readonly MAX_CALL_DEPTH = 512;

  constructor(diagnostics: Diagnostic[], filePath?: string) {
    this.diagnostics = diagnostics;
    this.filePath = filePath;
  }

  createFunction(decl: FnDecl, scope: Scope): FunctionValue {
    return {
      type: 'function',
      name: decl.name,
      params: decl.params,
      body: decl.body,
      closure: scope,
    };
  }

  evaluateConst(decl: { name: string; value: Expr; mutable: boolean }, scope: Scope): void {
    const value = this.evaluateExpr(decl.value, scope);
    scope.define(decl.name, value, decl.mutable);
  }

  evaluateExpr(expr: Expr, scope: Scope): RuntimeValue {
    switch (expr.kind) {
      case 'NumberLiteral':
        return makeNumber(expr.value);
      case 'StringLiteral':
        return makeString(expr.value);
      case 'BoolLiteral':
        return makeBool(expr.value);
      case 'NullLiteral':
        return makeNull();
      case 'PitchLiteral':
        return makePitchValue(parsePitchLiteral(expr.value));
      case 'DurLiteral':
        return makeRatValue(parseDurLiteral(expr.value));
      case 'PosRefLiteral':
        return makePosValue(makePosRef(expr.bar, expr.beat));
      case 'Identifier':
        return scope.get(expr.name);
      case 'ArrayLiteral': {
        const elements = expr.elements.map((el) => this.evaluateExpr(el, scope));
        return makeArray(elements);
      }
      case 'ObjectLiteral': {
        const props = new Map<string, RuntimeValue>();
        for (const prop of expr.properties) {
          props.set(prop.key, this.evaluateExpr(prop.value, scope));
        }
        return makeObject(props);
      }
      case 'MemberExpr':
        return this.evaluateMember(expr.object, expr.property, scope, expr.position);
      case 'IndexExpr':
        return this.evaluateIndex(expr.object, expr.index, scope, expr.position);
      case 'CallExpr':
        return this.evaluateCall(expr.callee, expr.args, scope);
      case 'UnaryExpr':
        return this.evaluateUnary(expr.operator, expr.operand, scope, expr.position);
        case 'BinaryExpr':
          return this.evaluateBinary(expr.operator, expr.left, expr.right, scope, expr.position);
        case 'MatchExpr':
          return this.evaluateMatch(expr, scope);
        case 'ScoreExpr':
          return scoreToObject(this.evaluateScore(expr, scope));
        case 'ClipExpr':
          return clipToObject(this.evaluateClip(expr, scope));
      default:
        throw this.error('Unsupported expression', (expr as any).position);
    }
  }

  private evaluateMember(objectExpr: Expr, property: string, scope: Scope, position: any): RuntimeValue {
    const obj = this.evaluateExpr(objectExpr, scope);
    if (obj.type === 'object') {
      return obj.props.get(property) ?? makeNull();
    }
    if (obj.type === 'array') {
      if (property === 'length') {
        return makeNumber(obj.elements.length);
      }
      return makeNull();
    }
    if (obj.type === 'string') {
      if (property === 'length') {
        return makeNumber(obj.value.length);
      }
      return makeNull();
    }
    if (obj.type === 'rat') {
      if (property === 'n') return makeNumber(obj.value.n);
      if (property === 'd') return makeNumber(obj.value.d);
      return makeNull();
    }
    if (obj.type === 'pitch') {
      if (property === 'midi') return makeNumber(obj.value.midi);
      if (property === 'cents') return makeNumber(obj.value.cents);
      return makeNull();
    }
    if (obj.type === 'range') {
      if (property === 'start') return obj.start;
      if (property === 'end') return obj.end;
      return makeNull();
    }
    if (obj.type === 'pos') {
      if (property === 'kind') {
        if (isRat(obj.value)) return makeString('rat');
        if (isPosRef(obj.value)) return makeString('posref');
        if (isPosExpr(obj.value)) return makeString('posexpr');
        return makeString('pos');
      }
      if (property === 'bar' && isPosRef(obj.value)) {
        return makeNumber(obj.value.bar);
      }
      if (property === 'beat' && isPosRef(obj.value)) {
        return makeNumber(obj.value.beat);
      }
      if (property === 'base' && isPosExpr(obj.value)) {
        return makePosValue(obj.value.base);
      }
      if (property === 'offset' && isPosExpr(obj.value)) {
        return makeRatValue(obj.value.offset);
      }
      if (property === 'rat' && isRat(obj.value)) {
        return makeRatValue(obj.value);
      }
      return makeNull();
    }
    if (obj.type === 'rng') {
      if (property === 'state') return makeNumber(obj.state);
      return makeNull();
    }
    throw this.error('Member access on non-object', position);
  }

  private evaluateIndex(objectExpr: Expr, indexExpr: Expr, scope: Scope, position: any): RuntimeValue {
    const obj = this.evaluateExpr(objectExpr, scope);
    const indexValue = this.evaluateExpr(indexExpr, scope);

    if (obj.type === 'array') {
      const index = this.expectIndex(indexValue, position);
      if (index < 0 || index >= obj.elements.length) return makeNull();
      return obj.elements[index] ?? makeNull();
    }
    if (obj.type === 'string') {
      const index = this.expectIndex(indexValue, position);
      if (index < 0 || index >= obj.value.length) return makeNull();
      return makeString(obj.value.charAt(index));
    }
    if (obj.type === 'object') {
      const key = this.expectIndexKey(indexValue, position);
      return obj.props.get(key) ?? makeNull();
    }
    throw this.error('Index access on non-indexable value', position);
  }

  evaluateStatement(stmt: Statement, scope: Scope): RuntimeValue | null {
    switch (stmt.kind) {
      case 'ConstDecl':
        this.evaluateConst(stmt, scope);
        return null;
      case 'ReturnStmt':
        return this.evaluateReturn(stmt, scope);
      case 'IfStmt':
        return this.evaluateIf(stmt, scope);
      case 'ForStmt':
        return this.evaluateFor(stmt, scope);
      case 'AssignmentStmt':
        this.evaluateAssignment(stmt, scope);
        return null;
      case 'ExprStmt':
        this.evaluateExpr(stmt.expr, scope);
        return null;
      default:
        throw this.error('Unsupported statement', (stmt as any).position);
    }
  }

  callFunction(fn: FunctionValue, args: RuntimeValue[], named: Map<string, RuntimeValue>): RuntimeValue {
    if (fn.native) {
      return fn.native(args, named, { callFunction: this.callFunction.bind(this) });
    }
    if (!fn.body || !fn.closure || !fn.params) {
      throw new Error('Invalid function value');
    }
    if (this.callDepth >= V3Evaluator.MAX_CALL_DEPTH) {
      throw new Error('Call stack depth exceeded');
    }
    this.callDepth++;

    const callScope = new Scope(fn.closure);
    bindParams(fn.params, args, named, callScope, fn.name);
    try {
      this.evaluateBlock(fn.body, callScope);
      this.callDepth--;
      return makeNull();
    } catch (err) {
      this.callDepth--;
      if (err instanceof ReturnSignal) {
        return err.value;
      }
      throw err;
    }
  }

  private evaluateBlock(block: Block, scope: Scope): void {
    for (const stmt of block.statements) {
      const result = this.evaluateStatement(stmt, scope);
      if (result instanceof ReturnSignal) {
        throw result;
      }
    }
  }

  private evaluateReturn(stmt: ReturnStmt, scope: Scope): RuntimeValue {
    const value = stmt.value ? this.evaluateExpr(stmt.value, scope) : makeNull();
    throw new ReturnSignal(value);
  }

  private evaluateIf(stmt: IfStmt, scope: Scope): RuntimeValue | null {
    const test = this.evaluateExpr(stmt.test, scope);
    if (isTruthy(test)) {
      this.evaluateBlock(stmt.consequent, new Scope(scope));
      return null;
    }
    if (stmt.alternate) {
      if (stmt.alternate.kind === 'IfStmt') {
        return this.evaluateIf(stmt.alternate, scope);
      }
      this.evaluateBlock(stmt.alternate, new Scope(scope));
    }
    return null;
  }

  private evaluateFor(stmt: ForStmt, scope: Scope): RuntimeValue | null {
    const iterable = this.evaluateExpr(stmt.iterable, scope);
    if (iterable.type === 'array') {
      for (const item of iterable.elements) {
        const iterScope = new Scope(scope);
        iterScope.define(stmt.iterator, item, true);
        this.evaluateBlock(stmt.body, iterScope);
      }
      return null;
    }
    if (iterable.type === 'range') {
      const start = this.expectIndex(iterable.start, stmt.position);
      const end = this.expectIndex(iterable.end, stmt.position);
      if (start > end) return null;
      for (let i = start; i <= end; i++) {
        const iterScope = new Scope(scope);
        iterScope.define(stmt.iterator, makeNumber(i), true);
        this.evaluateBlock(stmt.body, iterScope);
      }
      return null;
    }
    throw this.error('for-in expects an array or numeric range', stmt.position);
    return null;
  }

  private evaluateAssignment(stmt: { target: Expr; value: Expr }, scope: Scope): void {
    if (stmt.target.kind === 'Identifier') {
      const value = this.evaluateExpr(stmt.value, scope);
      scope.assign(stmt.target.name, value);
      return;
    }
    if (stmt.target.kind === 'MemberExpr') {
      const obj = this.evaluateExpr(stmt.target.object, scope);
      if (obj.type !== 'object') {
        throw this.error('Assignment target must be object property', stmt.target.position);
      }
      const value = this.evaluateExpr(stmt.value, scope);
      obj.props.set(stmt.target.property, value);
      return;
    }
    if (stmt.target.kind === 'IndexExpr') {
      const obj = this.evaluateExpr(stmt.target.object, scope);
      const indexValue = this.evaluateExpr(stmt.target.index, scope);
      const value = this.evaluateExpr(stmt.value, scope);
      if (obj.type === 'array') {
        const index = this.expectIndex(indexValue, stmt.target.position);
        if (index < 0) {
          throw this.error('Array index out of range', stmt.target.position);
        }
        while (obj.elements.length < index) {
          obj.elements.push(makeNull());
        }
        if (index === obj.elements.length) {
          obj.elements.push(value);
        } else {
          obj.elements[index] = value;
        }
        return;
      }
      if (obj.type === 'object') {
        const key = this.expectIndexKey(indexValue, stmt.target.position);
        obj.props.set(key, value);
        return;
      }
      throw this.error('Assignment target must be array or object', stmt.target.position);
    }
    throw this.error('Invalid assignment target', stmt.target.position);
  }

  private evaluateCall(callee: Expr, args: CallArg[], scope: Scope): RuntimeValue {
    const fnValue = this.evaluateExpr(callee, scope);
    if (fnValue.type !== 'function') {
      throw this.error('Attempted to call a non-function', callee.position);
    }

    const positional: RuntimeValue[] = [];
    const named = new Map<string, RuntimeValue>();
    for (const arg of args) {
      if (arg.name) {
        named.set(arg.name, this.evaluateExpr(arg.value, scope));
      } else {
        positional.push(this.evaluateExpr(arg.value, scope));
      }
    }
    return this.callFunction(fnValue, positional, named);
  }

  private evaluateUnary(operator: string, operand: Expr, scope: Scope, position: any): RuntimeValue {
    const value = this.evaluateExpr(operand, scope);
    switch (operator) {
      case '!':
        return makeBool(!isTruthy(value));
      case '-':
        if (value.type === 'number') {
          return makeNumber(-value.value);
        }
        if (value.type === 'rat') {
          return makeRatValue(makeRat(-value.value.n, value.value.d));
        }
        throw this.error('Unary - expects number or Rat', position);
      default:
        throw this.error(`Unknown unary operator: ${operator}`, position);
    }
  }

  private evaluateBinary(
    operator: string,
    leftExpr: Expr,
    rightExpr: Expr,
    scope: Scope,
    position: any
  ): RuntimeValue {
    if (operator === '&&') {
      const left = this.evaluateExpr(leftExpr, scope);
      if (!isTruthy(left)) return left;
      return this.evaluateExpr(rightExpr, scope);
    }
    if (operator === '||') {
      const left = this.evaluateExpr(leftExpr, scope);
      if (isTruthy(left)) return left;
      return this.evaluateExpr(rightExpr, scope);
    }
    if (operator === '??') {
      const left = this.evaluateExpr(leftExpr, scope);
      if (left.type !== 'null') return left;
      return this.evaluateExpr(rightExpr, scope);
    }
    if (operator === '..') {
      const start = this.evaluateExpr(leftExpr, scope);
      const end = this.evaluateExpr(rightExpr, scope);
      const range: RangeValue = { type: 'range', start, end };
      return range;
    }

    const left = this.evaluateExpr(leftExpr, scope);
    const right = this.evaluateExpr(rightExpr, scope);

      switch (operator) {
        case '+':
          return addValues(left, right, position);
      case '-':
        return subValues(left, right, position);
      case '*':
        return mulValues(left, right, position);
      case '/':
        return divValues(left, right, position);
      case '%':
        return modValues(left, right, position);
      case '==':
        return makeBool(valuesEqual(left, right));
      case '!=':
        return makeBool(!valuesEqual(left, right));
      case '<':
        return makeBool(compareValues(left, right, position) < 0);
      case '<=':
        return makeBool(compareValues(left, right, position) <= 0);
      case '>':
        return makeBool(compareValues(left, right, position) > 0);
      case '>=':
        return makeBool(compareValues(left, right, position) >= 0);
        default:
          throw this.error(`Unknown binary operator: ${operator}`, position);
      }
    }

    private evaluateMatch(expr: MatchExpr, scope: Scope): RuntimeValue {
      const value = this.evaluateExpr(expr.value, scope);
      let fallback: Expr | null = null;
      for (const arm of expr.arms) {
        if (arm.isDefault) {
          fallback = arm.value;
          continue;
        }
        if (!arm.pattern) continue;
        const patternValue = this.evaluateExpr(arm.pattern, scope);
        if (valuesEqual(value, patternValue)) {
          return this.evaluateExpr(arm.value, scope);
        }
      }
      if (fallback) {
        return this.evaluateExpr(fallback, scope);
      }
      return makeNull();
    }

  private evaluateScore(expr: ScoreExpr, scope: Scope): ScoreValueData {
    const meta: ScoreValueData['meta'] = {};
    const tempoMap: TempoEventValue[] = [];
    const meterMap: ScoreValueData['meterMap'] = [];
    const sounds: SoundDeclValue[] = [];
    const tracks: TrackValueData[] = [];
    const markers: MarkerEventValue[] = [];
    const trackNodes: TrackDecl[] = [];

    for (const item of expr.items) {
      switch (item.kind) {
        case 'MetaBlock':
          for (const field of item.fields) {
            const value = this.evaluateExpr(field.value, scope);
            if (field.key === 'title' || field.key === 'artist' || field.key === 'album' || field.key === 'copyright') {
              meta[field.key] = this.expectString(value, field.position);
            } else {
              if (!meta.ext) meta.ext = {};
              meta.ext[field.key] = this.toPlainValue(value);
            }
          }
          break;
        case 'TempoBlock':
          tempoMap.push(...this.evaluateTempoBlock(item.items, scope));
          break;
        case 'MeterBlock':
          meterMap.push(...this.evaluateMeterBlock(item.items, scope));
          break;
        case 'SoundDecl':
          sounds.push(this.evaluateSoundDecl(item.body, item.id, item.soundKind, scope, item.position));
          break;
        case 'TrackDecl':
          trackNodes.push(item);
          break;
        case 'ScoreMarker': {
          const pos = this.expectPos(this.evaluateExpr(item.pos, scope), item.position);
          const kind = this.expectStringLike(this.evaluateExpr(item.markerKind, scope), item.position);
          const label = this.expectStringLike(this.evaluateExpr(item.label, scope), item.position);
          markers.push({ type: 'marker', pos, kind, label });
          break;
        }
        default:
          throw this.error('Unknown score item', (item as any).position);
      }
    }

    const soundMap = new Map<string, SoundDeclValue>();
    for (const sound of sounds) {
      soundMap.set(sound.id, sound);
    }

    for (const trackNode of trackNodes) {
      tracks.push(this.evaluateTrackDecl(trackNode, scope, soundMap));
    }

    return { meta, tempoMap, meterMap, sounds, tracks, markers };
  }

  private evaluateTempoBlock(items: TempoItem[], scope: Scope): TempoEventValue[] {
    const results: TempoEventValue[] = [];
    for (const item of items) {
      const at = this.expectPos(this.evaluateExpr(item.at, scope), item.position);
      const bpmValue = this.evaluateExpr(item.bpm, scope);
      const bpm = this.expectNumber(bpmValue, item.position);
      const unit = item.unit
        ? this.expectRat(this.evaluateExpr(item.unit, scope), item.position)
        : makeRat(1, 4);
      results.push({ at, bpm, unit });
    }
    return results;
  }

  private evaluateMeterBlock(items: MeterItem[], scope: Scope): ScoreValueData['meterMap'] {
    const results: ScoreValueData['meterMap'] = [];
    for (const item of items) {
      const at = this.expectPos(this.evaluateExpr(item.at, scope), item.position);
      const numerator = this.expectNumber(this.evaluateExpr(item.numerator, scope), item.position);
      const denominator = this.expectNumber(this.evaluateExpr(item.denominator, scope), item.position);
      results.push({
        at,
        numerator: Math.floor(numerator),
        denominator: Math.floor(denominator),
      });
    }
    return results;
  }

  private evaluateSoundDecl(
    body: SoundBodyItem[],
    id: string,
    soundKind: string,
    scope: Scope,
    position: any
  ): SoundDeclValue {
    if (!isSoundKind(soundKind)) {
      throw this.error(`Unknown sound kind: ${soundKind}`, position);
    }
    const sound: SoundDeclValue = { id, kind: soundKind };
    for (const item of body) {
      if (item.kind === 'SoundField') {
        const value = this.evaluateExpr(item.value, scope);
        this.applySoundField(sound, item.key, value, item.position);
        continue;
      }
      if (item.kind === 'DrumKeysBlock') {
        sound.drumKeys = item.keys.map((key) => ({ key }));
        continue;
      }
      if (item.kind === 'VocalBlock') {
        sound.vocal = this.evaluateVocalBlock(item.fields, scope);
        continue;
      }
    }
    return sound;
  }

  private evaluateVocalBlock(fields: SoundBodyItem[], scope: Scope): VocalDeclValue {
    const vocal: VocalDeclValue = {};
    for (const field of fields) {
      if (field.kind !== 'SoundField') continue;
      const value = this.evaluateExpr(field.value, scope);
      switch (field.key) {
        case 'lang':
          vocal.lang = this.expectString(value, field.position);
          break;
        case 'defaultLyricMode': {
          const mode = this.expectString(value, field.position);
          if (mode === 'text' || mode === 'syllables' || mode === 'phonemes') {
            vocal.defaultLyricMode = mode;
          }
          break;
        }
        case 'preferredAlphabet':
          vocal.preferredAlphabet = this.expectString(value, field.position);
          break;
        case 'tags':
          vocal.tags = this.expectStringArray(value, field.position);
          break;
        case 'range': {
          const range = this.expectPitchRange(value, field.position);
          if (range) vocal.range = range;
          break;
        }
        default:
          break;
      }
    }
    return vocal;
  }

  private applySoundField(sound: SoundDeclValue, key: string, value: RuntimeValue, position: any): void {
    switch (key) {
      case 'label':
        sound.label = this.expectString(value, position);
        break;
      case 'family':
        sound.family = this.expectString(value, position);
        break;
      case 'tags':
        sound.tags = this.expectStringArray(value, position);
        break;
      case 'range': {
        const range = this.expectPitchRange(value, position);
        if (range) sound.range = range;
        break;
      }
      case 'transposition':
        sound.transposition = Math.floor(this.expectNumber(value, position));
        break;
      case 'hints':
        sound.hints = this.toPlainValue(value) as Record<string, unknown>;
        break;
      default:
        if (!sound.ext) sound.ext = {};
        sound.ext[key] = this.toPlainValue(value);
        break;
    }
  }

  private evaluateTrackDecl(
    decl: TrackDecl,
    scope: Scope,
    sounds: Map<string, SoundDeclValue>
  ): TrackValueData {
    if (!isTrackRole(decl.role)) {
      throw this.error(`Unknown track role: ${decl.role}`, decl.position);
    }
    const sound = sounds.get(decl.sound);
    if (!sound) {
      this.diagnostics.push({
        severity: 'error',
        message: `Undefined sound id: ${decl.sound}`,
        position: decl.position,
        filePath: this.filePath,
      });
    } else if (!isSoundRoleCompatible(decl.role, sound.kind)) {
      this.diagnostics.push({
        severity: 'warning',
        message: `Track role ${decl.role} does not match sound kind ${sound.kind}`,
        position: decl.position,
        filePath: this.filePath,
      });
    }
    const placements: PlacementValue[] = [];
    for (const stmt of decl.body) {
      const at = this.expectPos(this.evaluateExpr(stmt.at, scope), stmt.position);
      const clipValue = this.evaluateExpr(stmt.clip, scope);
      try {
        const clip = coerceClip(clipValue);
        placements.push({ at, clip });
      } catch (err) {
        throw this.error((err as Error).message, stmt.position);
      }
    }
    const track: TrackValueData = {
      name: decl.name,
      role: decl.role as TrackRole,
      sound: decl.sound,
      placements,
    };
    return track;
  }

  private evaluateClip(expr: ClipExpr, scope: Scope): ClipValueData {
    let cursor: PosValue = makePosValue(ratFromInt(0));
    const events: ClipEventValue[] = [];

    for (const stmt of expr.body) {
      switch (stmt.kind) {
        case 'AtStmt':
          cursor = this.expectPos(this.evaluateExpr(stmt.pos, scope), stmt.position);
          break;
        case 'RestStmt': {
          const dur = this.expectRat(this.evaluateExpr(stmt.dur, scope), stmt.position);
          cursor = addPos(cursor, dur);
          break;
        }
        case 'BreathStmt': {
          const dur = this.expectRat(this.evaluateExpr(stmt.dur, scope), stmt.position);
          let intensity = 0.6; // default
          if (stmt.intensity) {
            intensity = this.expectNumber(this.evaluateExpr(stmt.intensity, scope), stmt.position);
          }
          const event: BreathEventValue = {
            type: 'breath',
            start: cursor,
            dur,
            intensity,
          };
          events.push(event);
          cursor = addPos(cursor, dur);
          break;
        }
        case 'NoteStmt': {
          const pitch = this.expectPitch(this.evaluateExpr(stmt.pitch, scope), stmt.position);
          const dur = this.expectRat(this.evaluateExpr(stmt.dur, scope), stmt.position);
          const event: NoteEventValue = {
            type: 'note',
            start: cursor,
            dur,
            pitch,
          };
          this.applyNoteOptions(event, stmt.opts, scope);
          events.push(event);
          cursor = addPos(cursor, dur);
          break;
        }
        case 'ChordStmt': {
          const pitches = this.expectPitchArray(this.evaluateExpr(stmt.pitches, scope), stmt.position);
          const dur = this.expectRat(this.evaluateExpr(stmt.dur, scope), stmt.position);
          const event: ClipEventValue = {
            type: 'chord',
            start: cursor,
            dur,
            pitches,
          };
          this.applyEventOptions(event, stmt.opts, scope);
          events.push(event);
          cursor = addPos(cursor, dur);
          break;
        }
        case 'HitStmt': {
          const keyValue = this.evaluateExpr(stmt.key, scope);
          const key = this.expectStringLike(keyValue, stmt.position);
          const dur = this.expectRat(this.evaluateExpr(stmt.dur, scope), stmt.position);
          const event: DrumHitEventValue = {
            type: 'drumHit',
            start: cursor,
            dur,
            key,
          };
          this.applyEventOptions(event, stmt.opts, scope);
          events.push(event);
          cursor = addPos(cursor, dur);
          break;
        }
        case 'CCStmt': {
          const number = this.expectNumber(this.evaluateExpr(stmt.num, scope), stmt.position);
          const value = this.expectNumber(this.evaluateExpr(stmt.value, scope), stmt.position);
          events.push({
            type: 'control',
            start: cursor,
            kind: 'cc',
            data: { number, value },
          });
          break;
        }
        case 'AutomationStmt': {
          const param = this.expectStringLike(this.evaluateExpr(stmt.param, scope), stmt.position);
          const start = this.expectPos(this.evaluateExpr(stmt.start, scope), stmt.position);
          const end = this.expectPos(this.evaluateExpr(stmt.end, scope), stmt.position);
          const curveValue = this.evaluateExpr(stmt.curve, scope);
          const curve = this.expectCurve(curveValue, stmt.position);
          const event: AutomationEventValue = {
            type: 'automation',
            param,
            start,
            end,
            curve,
          };
          events.push(event);
          break;
        }
        case 'MarkerStmt': {
          const kind = this.expectStringLike(this.evaluateExpr(stmt.markerKind, scope), stmt.position);
          const label = this.expectStringLike(this.evaluateExpr(stmt.label, scope), stmt.position);
          const event: MarkerEventValue = {
            type: 'marker',
            pos: cursor,
            kind,
            label,
          };
          events.push(event);
          break;
        }
        default:
          throw this.error('Unknown clip statement', (stmt as any).position);
      }
    }

    return { events };
  }

  private applyNoteOptions(event: NoteEventValue, opts: any[], scope: Scope): void {
    const ext: Record<string, unknown> = {};
    for (const opt of opts) {
      const value = this.evaluateExpr(opt.value, scope);
      switch (opt.name) {
        case 'vel':
          event.velocity = this.expectNumber(value, opt.position);
          break;
        case 'voice':
          event.voice = Math.floor(this.expectNumber(value, opt.position));
          break;
        case 'tech':
          event.techniques = this.expectStringArray(value, opt.position);
          break;
        case 'lyric':
          event.lyric = this.expectLyricSpan(value, opt.position);
          break;
        default:
          ext[opt.name] = this.toPlainValue(value);
          break;
      }
    }
    if (Object.keys(ext).length > 0) {
      event.ext = ext;
    }
  }

  private applyEventOptions(event: ClipEventValue, opts: any[], scope: Scope): void {
    if (event.type === 'note') {
      this.applyNoteOptions(event, opts, scope);
      return;
    }
    const ext: Record<string, unknown> = {};
    for (const opt of opts) {
      const value = this.evaluateExpr(opt.value, scope);
      switch (opt.name) {
        case 'vel':
          (event as any).velocity = this.expectNumber(value, opt.position);
          break;
        case 'voice':
          (event as any).voice = Math.floor(this.expectNumber(value, opt.position));
          break;
        case 'tech':
          (event as any).techniques = this.expectStringArray(value, opt.position);
          break;
        default:
          ext[opt.name] = this.toPlainValue(value);
          break;
      }
    }
    if (Object.keys(ext).length > 0) {
      (event as any).ext = ext;
    }
  }

  private expectIndex(value: RuntimeValue, position: any): number {
    if (value.type === 'number' && isIntegerNumber(value.value)) {
      return value.value;
    }
    if (value.type === 'rat' && value.value.n % value.value.d === 0) {
      return value.value.n / value.value.d;
    }
    throw this.error('Expected integer index', position);
  }

  private expectIndexKey(value: RuntimeValue, position: any): string {
    if (value.type === 'string') return value.value;
    if (value.type === 'number' && isIntegerNumber(value.value)) {
      return String(value.value);
    }
    if (value.type === 'rat' && value.value.n % value.value.d === 0) {
      return String(value.value.n / value.value.d);
    }
    throw this.error('Expected string key', position);
  }

  private expectNumber(value: RuntimeValue, position: any): number {
    if (value.type === 'number') return value.value;
    if (value.type === 'rat') return ratToNumber(value.value);
    throw this.typeError('number', value, position);
  }

  private expectRat(value: RuntimeValue, position: any) {
    if (value.type === 'rat') return value.value;
    if (value.type === 'number' && isIntegerNumber(value.value)) {
      return ratFromInt(value.value);
    }
    throw this.typeError('duration (rational)', value, position);
  }

  private expectPos(value: RuntimeValue, position: any): PosValue {
    const pos = coercePosValue(value);
    if (pos) return pos;
    throw this.typeError('position', value, position);
  }

  private expectString(value: RuntimeValue, position: any): string {
    if (value.type === 'string') return value.value;
    throw this.typeError('string', value, position);
  }

  private expectStringLike(value: RuntimeValue, position: any): string {
    if (value.type === 'string') return value.value;
    throw this.typeError('string', value, position);
  }

  private expectStringArray(value: RuntimeValue, position: any): string[] {
    if (value.type === 'array') {
      return value.elements.map((el) => this.expectString(el, position));
    }
    if (value.type === 'string') return [value.value];
    throw this.typeError('string array', value, position);
  }

  private expectPitch(value: RuntimeValue, position: any) {
    if (value.type === 'pitch') return value.value;
    throw this.typeError('pitch', value, position);
  }

  private expectPitchArray(value: RuntimeValue, position: any): Array<{ midi: number; cents: number }> {
    if (value.type === 'array') {
      return value.elements.map((el) => this.expectPitch(el, position));
    }
    throw this.typeError('pitch array', value, position);
  }

  private expectPitchRange(value: RuntimeValue, position: any) {
    if (value.type === 'range') {
      const low = this.expectPitch(value.start, position);
      const high = this.expectPitch(value.end, position);
      return { low, high };
    }
    return null;
  }

  private expectCurve(value: RuntimeValue, position: any) {
    try {
      return coerceCurve(value);
    } catch (err) {
      throw this.error((err as Error).message, position);
    }
  }

  private expectLyricSpan(value: RuntimeValue, position: any): LyricSpan {
    try {
      return coerceLyricSpan(value);
    } catch (err) {
      throw this.error((err as Error).message, position);
    }
  }

  private toPlainValue(value: RuntimeValue): unknown {
    switch (value.type) {
      case 'number':
      case 'string':
      case 'bool':
        return value.value;
      case 'null':
        return null;
      case 'rat':
        return { n: value.value.n, d: value.value.d };
      case 'pitch':
        return { midi: value.value.midi, cents: value.value.cents };
      case 'array':
        return value.elements.map((el) => this.toPlainValue(el));
      case 'object': {
        const obj: Record<string, unknown> = {};
        for (const [key, val] of value.props.entries()) {
          obj[key] = this.toPlainValue(val);
        }
        return obj;
      }
      case 'range':
        return {
          start: this.toPlainValue(value.start),
          end: this.toPlainValue(value.end),
        };
      case 'clip':
      case 'score':
      case 'curve':
      case 'lyric':
      case 'lyricToken':
      case 'rng':
        return value.type;
      default:
        return value.type;
    }
  }

  private error(message: string, position?: any): Error {
    const loc = position
      ? ` at ${this.filePath ?? 'unknown'}:${position.line}:${position.column}`
      : '';
    return new Error(`[v3 eval] ${message}${loc}`);
  }

  private typeError(expected: string, got: RuntimeValue, position?: any): Error {
    const gotType = this.describeType(got);
    return this.error(`Expected ${expected}, got ${gotType}`, position);
  }

  private describeType(value: RuntimeValue): string {
    switch (value.type) {
      case 'number':
        return `number (${value.value})`;
      case 'string':
        return `string ("${value.value.length > 20 ? value.value.slice(0, 20) + '...' : value.value}")`;
      case 'bool':
        return `boolean (${value.value})`;
      case 'null':
        return 'null';
      case 'rat':
        return `rational (${value.value.n}/${value.value.d})`;
      case 'pos':
        if (isRat(value.value)) return `position (rational ${value.value.n}/${value.value.d})`;
        if (isPosRef(value.value)) return `position (${value.value.bar}:${value.value.beat})`;
        if (isPosExpr(value.value)) return `position (${value.value.base.bar}:${value.value.base.beat} + offset)`;
        return 'position';
      case 'pitch':
        return `pitch (midi ${value.value.midi})`;
      case 'array':
        return `array (length ${value.elements.length})`;
      case 'object':
        return `object (${value.props.size} properties)`;
      case 'function':
        return value.name ? `function '${value.name}'` : 'function';
      case 'range':
        return 'range';
      case 'clip':
        return 'clip';
      case 'score':
        return 'score';
      case 'curve':
        return 'curve';
      case 'lyric':
        return 'lyric';
      case 'lyricToken':
        return 'lyricToken';
      case 'rng':
        return 'rng';
      default:
        return (value as RuntimeValue).type;
    }
  }
}

function coerceIntValue(value: RuntimeValue | undefined): number | null {
  if (!value) return null;
  if (value.type === 'number' && isIntegerNumber(value.value)) return value.value;
  if (value.type === 'rat' && value.value.n % value.value.d === 0) {
    return value.value.n / value.value.d;
  }
  return null;
}

function coerceRatValue(value: RuntimeValue | undefined): RatValue['value'] | null {
  if (!value) return null;
  if (value.type === 'rat') return value.value;
  if (value.type === 'number' && isIntegerNumber(value.value)) return ratFromInt(value.value);
  if (value.type === 'object') {
    const nValue = value.props.get('n');
    const dValue = value.props.get('d');
    const n = coerceIntValue(nValue);
    const d = coerceIntValue(dValue);
    if (n !== null && d !== null) {
      return makeRat(n, d);
    }
  }
  return null;
}

function coercePosRefValue(value: RuntimeValue | undefined): PosRef | null {
  if (!value) return null;
  if (value.type === 'pos' && isPosRef(value.value)) {
    return value.value;
  }
  if (value.type === 'object') {
    const kindValue = value.props.get('kind');
    if (kindValue && kindValue.type === 'string' && kindValue.value === 'posref') {
      const bar = coerceIntValue(value.props.get('bar'));
      const beat = coerceIntValue(value.props.get('beat'));
      if (bar !== null && beat !== null) {
        return makePosRef(bar, beat);
      }
    }
  }
  return null;
}

function coercePosValue(value: RuntimeValue): PosValue | null {
  if (value.type === 'pos') return value;
  if (value.type === 'rat') return makePosValue(value.value);
  if (value.type === 'number' && isIntegerNumber(value.value)) {
    return makePosValue(ratFromInt(value.value));
  }
  if (value.type === 'object') {
    const kindValue = value.props.get('kind');
    if (!kindValue || kindValue.type !== 'string') return null;
    const kind = kindValue.value;
    if (kind === 'posref') {
      const bar = coerceIntValue(value.props.get('bar'));
      const beat = coerceIntValue(value.props.get('beat'));
      if (bar !== null && beat !== null) {
        return makePosValue(makePosRef(bar, beat));
      }
      return null;
    }
    if (kind === 'posexpr') {
      const baseRef = coercePosRefValue(value.props.get('base'));
      const offset = coerceRatValue(value.props.get('offset'));
      if (baseRef && offset) {
        return makePosValue(makePosExpr(baseRef, offset));
      }
      return null;
    }
    if (kind === 'pos') {
      const rat = coerceRatValue(value.props.get('rat'));
      if (rat) {
        return makePosValue(rat);
      }
      return null;
    }
  }
  return null;
}

function parseDurLiteral(text: string) {
  const baseMap: Record<string, RatValue['value']> = {
    w: makeRat(1, 1),
    h: makeRat(1, 2),
    q: makeRat(1, 4),
    e: makeRat(1, 8),
    s: makeRat(1, 16),
    t: makeRat(1, 32),
    x: makeRat(1, 64),
  };
  const dots = text.endsWith('.') ? 1 : 0;
  const core = dots ? text.slice(0, -1) : text;
  const base = baseMap[core];
  if (!base) {
    throw new Error(`Unknown duration literal: ${text}`);
  }
  if (!dots) return base;
  const add = makeRat(base.n, base.d * 2);
  return addRat(base, add);
}

function addPos(pos: PosValue, dur: RatValue['value']): PosValue {
  if (isRat(pos.value)) {
    return makePosValue(addRat(pos.value, dur));
  }
  if (isPosRef(pos.value)) {
    return makePosValue(makePosExpr(pos.value, dur));
  }
  if (isPosExpr(pos.value)) {
    return makePosValue(makePosExpr(pos.value.base, addRat(pos.value.offset, dur)));
  }
  return pos;
}

function valuesEqual(a: RuntimeValue, b: RuntimeValue): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'number':
    case 'string':
    case 'bool':
      return a.value === (b as typeof a).value;
    case 'null':
      return true;
    case 'rat':
      return a.value.n === (b as typeof a).value.n && a.value.d === (b as typeof a).value.d;
    case 'pitch':
      return a.value.midi === (b as typeof a).value.midi && a.value.cents === (b as typeof a).value.cents;
    case 'array': {
      const bArr = b as ArrayValue;
      if (a.elements.length !== bArr.elements.length) return false;
      for (let i = 0; i < a.elements.length; i++) {
        if (!valuesEqual(a.elements[i], bArr.elements[i])) return false;
      }
      return true;
    }
    case 'object': {
      const bObj = b as ObjectValue;
      if (a.props.size !== bObj.props.size) return false;
      for (const [key, val] of a.props) {
        if (!bObj.props.has(key)) return false;
        if (!valuesEqual(val, bObj.props.get(key)!)) return false;
      }
      return true;
    }
    case 'range': {
      const bRange = b as RangeValue;
      return valuesEqual(a.start, bRange.start) && valuesEqual(a.end, bRange.end);
    }
    case 'pos': {
      const bPos = b as PosValue;
      if (isRat(a.value) && isRat(bPos.value)) {
        return a.value.n === bPos.value.n && a.value.d === bPos.value.d;
      }
      if (isPosRef(a.value) && isPosRef(bPos.value)) {
        return a.value.bar === bPos.value.bar && a.value.beat === bPos.value.beat;
      }
      if (isPosExpr(a.value) && isPosExpr(bPos.value)) {
        return (
          a.value.base.bar === bPos.value.base.bar &&
          a.value.base.beat === bPos.value.base.beat &&
          a.value.offset.n === bPos.value.offset.n &&
          a.value.offset.d === bPos.value.offset.d
        );
      }
      return false;
    }
    default:
      return a === b;
  }
}

function compareValues(a: RuntimeValue, b: RuntimeValue, position: any): number {
  if (a.type === 'number' && b.type === 'number') {
    return a.value === b.value ? 0 : a.value < b.value ? -1 : 1;
  }
  if (a.type === 'rat' && b.type === 'rat') {
    return a.value.n * b.value.d - b.value.n * a.value.d;
  }
  throw new Error(`Cannot compare values at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function addValues(a: RuntimeValue, b: RuntimeValue, position: any): RuntimeValue {
  if (a.type === 'pitch' && b.type === 'number') {
    return makePitchValue(transposePitch(a.value, Math.floor(b.value)));
  }
  if (b.type === 'pitch' && a.type === 'number') {
    return makePitchValue(transposePitch(b.value, Math.floor(a.value)));
  }
  if (a.type === 'pitch' && b.type === 'rat' && b.value.n % b.value.d === 0) {
    return makePitchValue(transposePitch(a.value, b.value.n / b.value.d));
  }
  if (b.type === 'pitch' && a.type === 'rat' && a.value.n % a.value.d === 0) {
    return makePitchValue(transposePitch(b.value, a.value.n / a.value.d));
  }
  if (a.type === 'number' && b.type === 'number') {
    return makeNumber(a.value + b.value);
  }
  if (a.type === 'string' && b.type === 'string') {
    return makeString(a.value + b.value);
  }
  if (a.type === 'object') {
    const pos = coercePosValue(a);
    if (pos && b.type === 'rat') {
      return makePosValue(addPosAtom(pos.value, b.value));
    }
    if (pos && b.type === 'number' && isIntegerNumber(b.value)) {
      return makePosValue(addPosAtom(pos.value, ratFromInt(b.value)));
    }
  }
  if (b.type === 'object') {
    const pos = coercePosValue(b);
    if (pos && a.type === 'rat') {
      return makePosValue(addPosAtom(pos.value, a.value));
    }
    if (pos && a.type === 'number' && isIntegerNumber(a.value)) {
      return makePosValue(addPosAtom(pos.value, ratFromInt(a.value)));
    }
  }
  if (a.type === 'rat' && b.type === 'rat') {
    return makeRatValue(addRat(a.value, b.value));
  }
  // Support mixed number-rat addition (convert to float)
  if (a.type === 'number' && b.type === 'rat') {
    return makeNumber(a.value + ratToNumber(b.value));
  }
  if (a.type === 'rat' && b.type === 'number') {
    return makeNumber(ratToNumber(a.value) + b.value);
  }
  if (a.type === 'pos' && b.type === 'rat') {
    return makePosValue(addPosAtom(a.value, b.value));
  }
  if (a.type === 'rat' && b.type === 'pos') {
    return makePosValue(addPosAtom(b.value, a.value));
  }
  if (a.type === 'pos' && b.type === 'pos') {
    throw new Error('Pos + Pos is not allowed');
  }
  throw new Error(`Unsupported + operands at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function subValues(a: RuntimeValue, b: RuntimeValue, position: any): RuntimeValue {
  if (a.type === 'pitch' && b.type === 'number') {
    return makePitchValue(transposePitch(a.value, -Math.floor(b.value)));
  }
  if (a.type === 'pitch' && b.type === 'rat' && b.value.n % b.value.d === 0) {
    return makePitchValue(transposePitch(a.value, -(b.value.n / b.value.d)));
  }
  if (a.type === 'number' && b.type === 'number') {
    return makeNumber(a.value - b.value);
  }
  if (a.type === 'object') {
    const pos = coercePosValue(a);
    if (pos && b.type === 'rat') {
      return makePosValue(subPosAtom(pos.value, b.value));
    }
    if (pos && b.type === 'number' && isIntegerNumber(b.value)) {
      return makePosValue(subPosAtom(pos.value, ratFromInt(b.value)));
    }
  }
  if (a.type === 'rat' && b.type === 'rat') {
    return makeRatValue(subRat(a.value, b.value));
  }
  // Support mixed number-rat subtraction (convert to float)
  if (a.type === 'number' && b.type === 'rat') {
    return makeNumber(a.value - ratToNumber(b.value));
  }
  if (a.type === 'rat' && b.type === 'number') {
    return makeNumber(ratToNumber(a.value) - b.value);
  }
  if (a.type === 'pos' && b.type === 'rat') {
    return makePosValue(subPosAtom(a.value, b.value));
  }
  if (a.type === 'pos' && b.type === 'pos') {
    return makeRatValue(subRat(extractRat(a.value), extractRat(b.value)));
  }
  throw new Error(`Unsupported - operands at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function mulValues(a: RuntimeValue, b: RuntimeValue, position: any): RuntimeValue {
  if (a.type === 'number' && b.type === 'number') {
    return makeNumber(a.value * b.value);
  }
  if (a.type === 'rat' && b.type === 'rat') {
    return makeRatValue(mulRat(a.value, b.value));
  }
  if (a.type === 'rat' && b.type === 'number' && isIntegerNumber(b.value)) {
    return makeRatValue(mulRat(a.value, ratFromInt(b.value)));
  }
  if (b.type === 'rat' && a.type === 'number' && isIntegerNumber(a.value)) {
    return makeRatValue(mulRat(b.value, ratFromInt(a.value)));
  }
  // Support mixed number-rat multiplication (convert to float for non-integer numbers)
  if (a.type === 'number' && b.type === 'rat') {
    return makeNumber(a.value * ratToNumber(b.value));
  }
  if (a.type === 'rat' && b.type === 'number') {
    return makeNumber(ratToNumber(a.value) * b.value);
  }
  throw new Error(`Unsupported * operands at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function divValues(a: RuntimeValue, b: RuntimeValue, position: any): RuntimeValue {
  if (a.type === 'number' && b.type === 'number') {
    if (isIntegerNumber(a.value) && isIntegerNumber(b.value)) {
      return makeRatValue(makeRat(a.value, b.value));
    }
    return makeNumber(a.value / b.value);
  }
  if (a.type === 'rat' && b.type === 'rat') {
    return makeRatValue(divRat(a.value, b.value));
  }
  if (a.type === 'rat' && b.type === 'number' && isIntegerNumber(b.value)) {
    return makeRatValue(divRat(a.value, ratFromInt(b.value)));
  }
  throw new Error(`Unsupported / operands at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function modValues(a: RuntimeValue, b: RuntimeValue, position: any): RuntimeValue {
  if (a.type === 'number' && b.type === 'number') {
    return makeNumber(a.value % b.value);
  }
  throw new Error(`Unsupported % operands at ${position?.line ?? 0}:${position?.column ?? 0}`);
}

function isTruthy(value: RuntimeValue): boolean {
  switch (value.type) {
    case 'bool':
      return value.value;
    case 'null':
      return false;
    case 'number':
      return value.value !== 0;
    case 'string':
      return value.value.length > 0;
    default:
      return true;
  }
}

function bindParams(params: Param[], args: RuntimeValue[], named: Map<string, RuntimeValue>, scope: Scope, fnName?: string): void {
  const fnLabel = fnName ? `function '${fnName}'` : 'function';

  if (args.length > params.length) {
    throw new Error(`${fnLabel} expects ${params.length} argument(s) but got ${args.length}`);
  }

  const assigned = new Set<string>();
  const missing: string[] = [];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    if (i < args.length) {
      scope.define(param.name, args[i], true);
      assigned.add(param.name);
      continue;
    }
    if (named.has(param.name)) {
      scope.define(param.name, named.get(param.name)!, true);
      assigned.add(param.name);
      continue;
    }
    // Track missing required parameters
    missing.push(param.name);
    scope.define(param.name, makeNull(), true);
  }

  // Warn about missing parameters (they get null)
  if (missing.length > 0) {
    // Note: In a stricter mode, this could be an error
    // For now, we allow it for backwards compatibility
  }

  for (const name of named.keys()) {
    if (!assigned.has(name)) {
      const paramNames = params.map(p => p.name).join(', ');
      throw new Error(`${fnLabel} has no parameter named '${name}'. Available parameters: ${paramNames}`);
    }
  }
}

function addPosAtom(pos: PosAtom, dur: RatValue['value']): PosAtom {
  if (isRat(pos)) {
    return addRat(pos, dur);
  }
  if (isPosRef(pos)) {
    return makePosExpr(pos, dur);
  }
  if (isPosExpr(pos)) {
    return makePosExpr(pos.base, addRat(pos.offset, dur));
  }
  return pos;
}

function subPosAtom(pos: PosAtom, dur: RatValue['value']): PosAtom {
  if (isRat(pos)) {
    return subRat(pos, dur);
  }
  if (isPosRef(pos)) {
    return makePosExpr(pos, makeRat(-dur.n, dur.d));
  }
  if (isPosExpr(pos)) {
    return makePosExpr(pos.base, subRat(pos.offset, dur));
  }
  return pos;
}

function extractRat(pos: PosAtom): RatValue['value'] {
  if (isRat(pos)) return pos;
  if (isPosExpr(pos)) return pos.offset;
  return ratFromInt(0);
}

function isSoundKind(kind: string): kind is SoundDeclValue['kind'] {
  return kind === 'instrument' || kind === 'drumKit' || kind === 'vocal' || kind === 'fx';
}

function isTrackRole(role: string): role is TrackRole {
  return role === 'Instrument' || role === 'Drums' || role === 'Vocal' || role === 'Automation';
}

function isSoundRoleCompatible(role: TrackRole, kind: SoundDeclValue['kind']): boolean {
  if (role === 'Vocal') return kind === 'vocal';
  if (role === 'Drums') return kind === 'drumKit';
  if (role === 'Instrument') return kind === 'instrument';
  return true;
}
