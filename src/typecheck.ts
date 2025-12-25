import type {
  Program,
  ImportDecl,
  ImportSpec,
  FnDecl,
  ConstDecl,
  Param,
  TypeRef,
  Block,
  Statement,
  ReturnStmt,
  IfStmt,
  ForStmt,
  AssignmentStmt,
  ExprStmt,
  Expr,
  ArrayLiteral,
  ObjectLiteral,
  MemberExpr,
  IndexExpr,
  CallExpr,
  UnaryExpr,
  BinaryExpr,
  MatchExpr,
  ScoreExpr,
  ScoreItem,
  MetaBlock,
  TempoBlock,
  MeterBlock,
  SoundDecl,
  SoundBodyItem,
  SoundField,
  VocalBlock,
  TrackDecl,
  PlaceStmt,
  ClipExpr,
  ClipStmt,
  NamedArg,
  ScoreMarker,
} from './ast.js';
import type { Diagnostic } from './diagnostics.js';
import type { Position } from './token.js';

type TypeKind =
  | 'unknown'
  | 'number'
  | 'string'
  | 'bool'
  | 'null'
  | 'pitch'
  | 'time'
  | 'pos'
  | 'clip'
  | 'score'
  | 'array'
  | 'object'
  | 'range'
  | 'curve'
  | 'rng'
  | 'lyric'
  | 'lyricToken'
  | 'function';

interface TypeInfo {
  kind: TypeKind;
  element?: TypeInfo;
  returns?: TypeInfo;
}

const UNKNOWN: TypeInfo = { kind: 'unknown' };
const NUMBER: TypeInfo = { kind: 'number' };
const STRING: TypeInfo = { kind: 'string' };
const BOOL: TypeInfo = { kind: 'bool' };
const NULL: TypeInfo = { kind: 'null' };
const PITCH: TypeInfo = { kind: 'pitch' };
const TIME: TypeInfo = { kind: 'time' };
const POS: TypeInfo = { kind: 'pos' };
const CLIP: TypeInfo = { kind: 'clip' };
const SCORE: TypeInfo = { kind: 'score' };
const CURVE: TypeInfo = { kind: 'curve' };
const RNG: TypeInfo = { kind: 'rng' };
const LYRIC: TypeInfo = { kind: 'lyric' };
const LYRIC_TOKEN: TypeInfo = { kind: 'lyricToken' };

const STD_EXPORTS: Record<string, Record<string, TypeInfo>> = {
  'std:core': {
    concat: fnType(CLIP),
    overlay: fnType(CLIP),
    repeat: fnType(CLIP),
    slice: fnType(CLIP),
    mapEvents: fnType(CLIP),
    withTrack: fnType(SCORE),
    mapTracks: fnType(SCORE),
  },
  'std:time': {
    barBeat: fnType(POS),
    resolvePos: fnType(POS),
    dur: fnType(TIME),
    dot: fnType(TIME),
    w: TIME,
    h: TIME,
    q: TIME,
    e: TIME,
    s: TIME,
    t: TIME,
    x: TIME,
    whole: TIME,
    half: TIME,
    quarter: TIME,
    eighth: TIME,
    sixteenth: TIME,
    thirtySecond: TIME,
    sixtyFourth: TIME,
  },
  'std:random': {
    rng: fnType(RNG),
    nextFloat: fnType(UNKNOWN),
    nextInt: fnType(UNKNOWN),
  },
  'std:transform': {
    transpose: fnType(CLIP),
    stretch: fnType(CLIP),
    quantize: fnType(CLIP),
    swing: fnType(CLIP),
    humanize: fnType(CLIP),
  },
  'std:curves': {
    linear: fnType(CURVE),
    easeInOut: fnType(CURVE),
    piecewise: fnType(CURVE),
  },
  'std:theory': {
    majorTriad: fnType(arrayType(PITCH)),
    minorTriad: fnType(arrayType(PITCH)),
    scaleMajor: fnType(arrayType(PITCH)),
    scaleMinor: fnType(arrayType(PITCH)),
  },
  'std:drums': {
    kick: STRING,
    snare: STRING,
    hhc: STRING,
    hho: STRING,
    crash: STRING,
    ride: STRING,
    tom1: STRING,
    tom2: STRING,
    tom3: STRING,
    clap: STRING,
    perc1: STRING,
    fourOnFloor: fnType(CLIP),
    basicRock: fnType(CLIP),
    fill: fnType(CLIP),
    ghost: fnType(CLIP),
  },
  'std:vocal': {
    Strict: STRING,
    BestEffort: STRING,
    MelismaHeuristic: STRING,
    S: fnType(LYRIC_TOKEN),
    Ext: LYRIC_TOKEN,
    ext: fnType(LYRIC_TOKEN),
    text: fnType(LYRIC),
    syllables: fnType(LYRIC),
    phonemes: fnType(LYRIC),
    align: fnType(CLIP),
    vibrato: fnType(CLIP),
    portamento: fnType(CLIP),
    breathiness: fnType(CLIP),
    loudness: fnType(CLIP),
  },
};

class TypeEnv {
  private values = new Map<string, TypeInfo>();
  constructor(private parent?: TypeEnv) {}

  set(name: string, type: TypeInfo): void {
    this.values.set(name, type);
  }

  get(name: string): TypeInfo | undefined {
    if (this.values.has(name)) return this.values.get(name);
    return this.parent?.get(name);
  }
}

export function typeCheckProgram(program: Program, diagnostics: Diagnostic[], filePath?: string): void {
  const checker = new TypeChecker(diagnostics, filePath);
  checker.checkProgram(program);
}

class TypeChecker {
  private diagnostics: Diagnostic[];
  private filePath?: string;

  constructor(diagnostics: Diagnostic[], filePath?: string) {
    this.diagnostics = diagnostics;
    this.filePath = filePath;
  }

  checkProgram(program: Program): void {
    const env = new TypeEnv();
    const moduleAliases = new Map<string, string>();

    for (const decl of program.imports) {
      this.applyImport(decl, env, moduleAliases);
    }

    for (const decl of program.body) {
      if (decl.kind === 'FnDecl') {
        const returnType = decl.returnType ? typeFromTypeRef(decl.returnType) : UNKNOWN;
        if (returnType.kind !== 'unknown') {
          env.set(decl.name, fnType(returnType));
        }
      }
    }

    for (const decl of program.body) {
      if (decl.kind === 'ConstDecl') {
        this.checkConstDecl(decl, env, moduleAliases);
      } else if (decl.kind === 'FnDecl') {
        this.checkFnDecl(decl, env, moduleAliases);
      }
    }
  }

  private applyImport(decl: ImportDecl, env: TypeEnv, moduleAliases: Map<string, string>): void {
    const from = decl.from.value;
    const exports = STD_EXPORTS[from];

    if (decl.spec.kind === 'ImportAll') {
      moduleAliases.set(decl.spec.alias, from);
      if (exports) {
        env.set(decl.spec.alias, { kind: 'object' });
      }
      return;
    }

    if (!exports) return;
    for (const name of decl.spec.names) {
      const type = exports[name];
      if (type) {
        env.set(name, type);
      }
    }
  }

  private checkFnDecl(decl: FnDecl, parent: TypeEnv, moduleAliases: Map<string, string>): void {
    const env = new TypeEnv(parent);
    for (const param of decl.params) {
      const type = param.type ? typeFromTypeRef(param.type) : UNKNOWN;
      env.set(param.name, type);
    }
    this.checkBlock(decl.body, env, moduleAliases, decl.returnType ? typeFromTypeRef(decl.returnType) : UNKNOWN);
  }

  private checkConstDecl(decl: ConstDecl, env: TypeEnv, moduleAliases: Map<string, string>): void {
    const valueType = this.inferExpr(decl.value, env, moduleAliases);
    const annotated = decl.type ? typeFromTypeRef(decl.type) : UNKNOWN;
    if (annotated.kind !== 'unknown' && valueType.kind !== 'unknown' && !isCompatible(annotated, valueType)) {
      this.report(
        `Type mismatch for '${decl.name}': expected ${annotated.kind}, got ${valueType.kind}`,
        decl.position
      );
    }
    env.set(decl.name, annotated.kind === 'unknown' ? valueType : annotated);
  }

  private checkBlock(
    block: Block,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo
  ): void {
    const localEnv = new TypeEnv(env);
    for (const stmt of block.statements) {
      this.checkStatement(stmt, localEnv, moduleAliases, returnType);
    }
  }

  private checkStatement(
    stmt: Statement,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo
  ): void {
    switch (stmt.kind) {
      case 'ConstDecl':
        this.checkConstDecl(stmt, env, moduleAliases);
        break;
      case 'ReturnStmt':
        this.checkReturn(stmt, env, moduleAliases, returnType);
        break;
      case 'IfStmt':
        this.checkIf(stmt, env, moduleAliases, returnType);
        break;
      case 'ForStmt':
        this.checkFor(stmt, env, moduleAliases, returnType);
        break;
      case 'AssignmentStmt':
        this.checkAssignment(stmt, env, moduleAliases);
        break;
      case 'ExprStmt':
        this.inferExpr(stmt.expr, env, moduleAliases);
        break;
      default:
        break;
    }
  }

  private checkReturn(
    stmt: ReturnStmt,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo
  ): void {
    if (!stmt.value) return;
    const valueType = this.inferExpr(stmt.value, env, moduleAliases);
    if (returnType.kind !== 'unknown' && valueType.kind !== 'unknown' && !isCompatible(returnType, valueType)) {
      this.report(`Return type mismatch: expected ${returnType.kind}, got ${valueType.kind}`, stmt.position);
    }
  }

  private checkIf(
    stmt: IfStmt,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo
  ): void {
    this.inferExpr(stmt.test, env, moduleAliases);
    this.checkBlock(stmt.consequent, env, moduleAliases, returnType);
    if (stmt.alternate) {
      if (stmt.alternate.kind === 'IfStmt') {
        this.checkIf(stmt.alternate, env, moduleAliases, returnType);
      } else {
        this.checkBlock(stmt.alternate, env, moduleAliases, returnType);
      }
    }
  }

  private checkFor(
    stmt: ForStmt,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo
  ): void {
    this.inferExpr(stmt.iterable, env, moduleAliases);
    const loopEnv = new TypeEnv(env);
    loopEnv.set(stmt.iterator, UNKNOWN);
    this.checkBlock(stmt.body, loopEnv, moduleAliases, returnType);
  }

  private checkAssignment(stmt: AssignmentStmt, env: TypeEnv, moduleAliases: Map<string, string>): void {
    const targetType = this.inferExpr(stmt.target, env, moduleAliases);
    const valueType = this.inferExpr(stmt.value, env, moduleAliases);
    if (targetType.kind !== 'unknown' && valueType.kind !== 'unknown' && !isCompatible(targetType, valueType)) {
      this.report(`Assignment type mismatch: ${targetType.kind} = ${valueType.kind}`, stmt.position);
    }
  }

  private inferExpr(expr: Expr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    switch (expr.kind) {
      case 'NumberLiteral':
        return NUMBER;
      case 'StringLiteral':
        return STRING;
      case 'BoolLiteral':
        return BOOL;
      case 'NullLiteral':
        return NULL;
      case 'PitchLiteral':
        return PITCH;
      case 'DurLiteral':
        return TIME;
      case 'PosRefLiteral':
        return POS;
      case 'Identifier': {
        const found = env.get(expr.name);
        return found ?? UNKNOWN;
      }
      case 'ArrayLiteral':
        return this.inferArray(expr, env, moduleAliases);
      case 'ObjectLiteral':
        return this.inferObject(expr, env, moduleAliases);
      case 'MemberExpr':
        return this.inferMember(expr, env, moduleAliases);
      case 'IndexExpr':
        return this.inferIndex(expr, env, moduleAliases);
      case 'CallExpr':
        return this.inferCall(expr, env, moduleAliases);
      case 'UnaryExpr':
        return this.inferUnary(expr, env, moduleAliases);
      case 'BinaryExpr':
        return this.inferBinary(expr, env, moduleAliases);
      case 'MatchExpr':
        return this.inferMatch(expr, env, moduleAliases);
      case 'ScoreExpr':
        this.checkScore(expr, env, moduleAliases);
        return SCORE;
      case 'ClipExpr':
        this.checkClip(expr, env, moduleAliases);
        return CLIP;
      default:
        return UNKNOWN;
    }
  }

  private inferArray(expr: ArrayLiteral, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    if (expr.elements.length === 0) return arrayType(UNKNOWN);
    const types = expr.elements.map((el) => this.inferExpr(el, env, moduleAliases));
    const base = types.find((t) => t.kind !== 'unknown');
    if (!base) return arrayType(UNKNOWN);
    const same = types.every((t) => t.kind === 'unknown' || t.kind === base.kind);
    return same ? arrayType(base) : arrayType(UNKNOWN);
  }

  private inferObject(expr: ObjectLiteral, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    for (const prop of expr.properties) {
      if (prop.key === 'kind') {
        const valueType = this.inferExpr(prop.value, env, moduleAliases);
        if (valueType.kind === 'string') {
          return { kind: 'object' };
        }
      }
    }
    return { kind: 'object' };
  }

  private inferMember(expr: MemberExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    if (expr.object.kind === 'Identifier') {
      const alias = moduleAliases.get(expr.object.name);
      if (alias) {
        const exported = STD_EXPORTS[alias]?.[expr.property];
        if (exported) return exported;
      }
    }
    const objectType = this.inferExpr(expr.object, env, moduleAliases);
    if (objectType.kind === 'array' && expr.property === 'length') return NUMBER;
    return UNKNOWN;
  }

  private inferIndex(expr: IndexExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const objectType = this.inferExpr(expr.object, env, moduleAliases);
    if (objectType.kind === 'array' && objectType.element) {
      return objectType.element;
    }
    return UNKNOWN;
  }

  private inferCall(expr: CallExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const calleeType = this.inferExpr(expr.callee, env, moduleAliases);
    if (calleeType.kind === 'function' && calleeType.returns) {
      return calleeType.returns;
    }
    return UNKNOWN;
  }

  private inferUnary(expr: UnaryExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const operand = this.inferExpr(expr.operand, env, moduleAliases);
    if (expr.operator === '!') return BOOL;
    if (expr.operator === '-') {
      if (operand.kind === 'number' || operand.kind === 'time') return operand;
      return UNKNOWN;
    }
    return UNKNOWN;
  }

  private inferBinary(expr: BinaryExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    if (expr.operator === '..') {
      const left = this.inferExpr(expr.left, env, moduleAliases);
      const right = this.inferExpr(expr.right, env, moduleAliases);
      const element = unifyTypes(left, right);
      return rangeType(element);
    }
    const left = this.inferExpr(expr.left, env, moduleAliases);
    const right = this.inferExpr(expr.right, env, moduleAliases);

    switch (expr.operator) {
      case '+':
        if (left.kind === 'pos' && right.kind === 'pos') {
          this.report('Pos + Pos is not allowed', expr.position);
        }
        return inferAdd(left, right);
      case '-':
        return inferSub(left, right);
      case '*':
        return inferMul(left, right);
      case '/':
        return inferDiv(left, right);
      case '%':
        return NUMBER;
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
      case '&&':
      case '||':
        return BOOL;
      default:
        return UNKNOWN;
    }
  }

  private inferMatch(expr: MatchExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const targetType = this.inferExpr(expr.value, env, moduleAliases);
    let result: TypeInfo = UNKNOWN;
    let hasResult = false;

    for (const arm of expr.arms) {
      if (arm.pattern) {
        const patternType = this.inferExpr(arm.pattern, env, moduleAliases);
        if (
          targetType.kind !== 'unknown' &&
          patternType.kind !== 'unknown' &&
          targetType.kind !== patternType.kind
        ) {
          this.report(
            `Match pattern type mismatch: expected ${targetType.kind}, got ${patternType.kind}`,
            arm.position
          );
        }
      }
      const valueType = this.inferExpr(arm.value, env, moduleAliases);
      if (!hasResult) {
        result = valueType;
        hasResult = true;
      } else {
        result = unifyTypes(result, valueType);
      }
    }

    return result;
  }

  private checkScore(expr: ScoreExpr, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const item of expr.items) {
      this.checkScoreItem(item, env, moduleAliases);
    }
  }

  private checkScoreItem(item: ScoreItem, env: TypeEnv, moduleAliases: Map<string, string>): void {
    switch (item.kind) {
      case 'MetaBlock':
        this.checkMeta(item, env, moduleAliases);
        break;
      case 'TempoBlock':
        this.checkTempo(item, env, moduleAliases);
        break;
      case 'MeterBlock':
        this.checkMeter(item, env, moduleAliases);
        break;
      case 'SoundDecl':
        this.checkSound(item, env, moduleAliases);
        break;
      case 'TrackDecl':
        this.checkTrack(item, env, moduleAliases);
        break;
      case 'ScoreMarker':
        this.checkScoreMarker(item, env, moduleAliases);
        break;
      default:
        break;
    }
  }

  private checkMeta(block: MetaBlock, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const field of block.fields) {
      this.inferExpr(field.value, env, moduleAliases);
    }
  }

  private checkTempo(block: TempoBlock, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const item of block.items) {
      this.expectPos(item.at, env, moduleAliases, item.position, 'tempo at');
      this.expectNumber(item.bpm, env, moduleAliases, item.position, 'tempo bpm');
      if (item.unit) {
        this.expectDur(item.unit, env, moduleAliases, item.position, 'tempo unit');
      }
    }
  }

  private checkMeter(block: MeterBlock, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const item of block.items) {
      this.expectPos(item.at, env, moduleAliases, item.position, 'meter at');
      this.expectNumber(item.numerator, env, moduleAliases, item.position, 'meter numerator');
      this.expectNumber(item.denominator, env, moduleAliases, item.position, 'meter denominator');
    }
  }

  private checkSound(decl: SoundDecl, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const item of decl.body) {
      if (item.kind === 'SoundField') {
        this.checkSoundField(item, env, moduleAliases);
      } else if (item.kind === 'VocalBlock') {
        this.checkVocal(item, env, moduleAliases);
      }
    }
  }

  private checkSoundField(field: SoundField, env: TypeEnv, moduleAliases: Map<string, string>): void {
    switch (field.key) {
      case 'range':
        this.expectRangeOfPitch(field.value, env, moduleAliases, field.position);
        break;
      case 'transposition':
        this.expectNumber(field.value, env, moduleAliases, field.position, 'transposition');
        break;
      case 'tags':
        this.expectStringArray(field.value, env, moduleAliases, field.position, 'tags');
        break;
      case 'label':
      case 'family':
        this.expectString(field.value, env, moduleAliases, field.position, field.key);
        break;
      default:
        this.inferExpr(field.value, env, moduleAliases);
        break;
    }
  }

  private checkVocal(block: VocalBlock, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const field of block.fields) {
      if (field.kind !== 'SoundField') continue;
      switch (field.key) {
        case 'lang':
        case 'defaultLyricMode':
        case 'preferredAlphabet':
          this.expectString(field.value, env, moduleAliases, field.position, field.key);
          break;
        case 'tags':
          this.expectStringArray(field.value, env, moduleAliases, field.position, 'vocal tags');
          break;
        case 'range':
          this.expectRangeOfPitch(field.value, env, moduleAliases, field.position);
          break;
        default:
          this.inferExpr(field.value, env, moduleAliases);
          break;
      }
    }
  }

  private checkTrack(decl: TrackDecl, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const stmt of decl.body) {
      this.checkPlace(stmt, env, moduleAliases);
    }
  }

  private checkPlace(stmt: PlaceStmt, env: TypeEnv, moduleAliases: Map<string, string>): void {
    this.expectPos(stmt.at, env, moduleAliases, stmt.position, 'place at');
    this.expectClip(stmt.clip, env, moduleAliases, stmt.position);
  }

  private checkScoreMarker(marker: ScoreMarker, env: TypeEnv, moduleAliases: Map<string, string>): void {
    this.expectPos(marker.pos, env, moduleAliases, marker.position, 'marker pos');
    this.expectString(marker.markerKind, env, moduleAliases, marker.position, 'marker kind');
    this.expectString(marker.label, env, moduleAliases, marker.position, 'marker label');
  }

  private checkClip(expr: ClipExpr, env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const stmt of expr.body) {
      this.checkClipStmt(stmt, env, moduleAliases);
    }
  }

  private checkClipStmt(stmt: ClipStmt, env: TypeEnv, moduleAliases: Map<string, string>): void {
    switch (stmt.kind) {
      case 'AtStmt':
        this.expectPos(stmt.pos, env, moduleAliases, stmt.position, 'at');
        break;
      case 'RestStmt':
        this.expectDur(stmt.dur, env, moduleAliases, stmt.position, 'rest');
        break;
      case 'NoteStmt':
        this.expectPitch(stmt.pitch, env, moduleAliases, stmt.position);
        this.expectDur(stmt.dur, env, moduleAliases, stmt.position, 'note duration');
        this.checkOpts(stmt.opts, env, moduleAliases);
        break;
      case 'ChordStmt':
        this.expectPitchArray(stmt.pitches, env, moduleAliases, stmt.position);
        this.expectDur(stmt.dur, env, moduleAliases, stmt.position, 'chord duration');
        this.checkOpts(stmt.opts, env, moduleAliases);
        break;
      case 'HitStmt':
        this.expectString(stmt.key, env, moduleAliases, stmt.position, 'hit key');
        this.expectDur(stmt.dur, env, moduleAliases, stmt.position, 'hit duration');
        this.checkOpts(stmt.opts, env, moduleAliases);
        break;
      case 'CCStmt':
        this.expectNumber(stmt.num, env, moduleAliases, stmt.position, 'cc num');
        this.expectNumber(stmt.value, env, moduleAliases, stmt.position, 'cc value');
        break;
      case 'AutomationStmt':
        this.expectString(stmt.param, env, moduleAliases, stmt.position, 'automation param');
        this.expectPos(stmt.start, env, moduleAliases, stmt.position, 'automation start');
        this.expectPos(stmt.end, env, moduleAliases, stmt.position, 'automation end');
        this.inferExpr(stmt.curve, env, moduleAliases);
        break;
      case 'MarkerStmt':
        this.expectString(stmt.markerKind, env, moduleAliases, stmt.position, 'marker kind');
        this.expectString(stmt.label, env, moduleAliases, stmt.position, 'marker label');
        break;
      default:
        break;
    }
  }

  private checkOpts(opts: NamedArg[], env: TypeEnv, moduleAliases: Map<string, string>): void {
    for (const opt of opts) {
      switch (opt.name) {
        case 'vel':
        case 'voice':
          this.expectNumber(opt.value, env, moduleAliases, opt.position, opt.name);
          break;
        case 'tech':
          this.expectStringArray(opt.value, env, moduleAliases, opt.position, 'tech');
          break;
        default:
          this.inferExpr(opt.value, env, moduleAliases);
          break;
      }
    }
  }

  private expectNumber(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position,
    context: string
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'number' && type.kind !== 'time') {
      this.report(`Expected number for ${context}`, position);
    }
  }

  private expectString(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position,
    context: string
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'string') {
      this.report(`Expected string for ${context}`, position);
    }
  }

  private expectStringArray(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position,
    context: string
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind === 'string') return;
    if (type.kind === 'array') {
      if (!type.element || type.element.kind === 'unknown' || type.element.kind === 'string') return;
    }
    this.report(`Expected string array for ${context}`, position);
  }

  private expectPitch(expr: Expr, env: TypeEnv, moduleAliases: Map<string, string>, position: Position): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'pitch') {
      this.report('Expected pitch', position);
    }
  }

  private expectPitchArray(expr: Expr, env: TypeEnv, moduleAliases: Map<string, string>, position: Position): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'array') {
      this.report('Expected pitch array', position);
      return;
    }
    if (!type.element || type.element.kind === 'unknown') return;
    if (type.element.kind !== 'pitch') {
      this.report('Expected pitch array', position);
    }
  }

  private expectDur(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position,
    context: string
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'time' && type.kind !== 'number') {
      this.report(`Expected duration for ${context}`, position);
    }
  }

  private expectPos(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position,
    context: string
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'pos' && type.kind !== 'time' && type.kind !== 'number') {
      this.report(`Expected position for ${context}`, position);
    }
  }

  private expectClip(expr: Expr, env: TypeEnv, moduleAliases: Map<string, string>, position: Position): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'clip') {
      this.report('Expected Clip value', position);
    }
  }

  private expectRangeOfPitch(
    expr: Expr,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    position: Position
  ): void {
    const type = this.inferExpr(expr, env, moduleAliases);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'range') {
      this.report('Expected pitch range', position);
      return;
    }
    if (type.element && type.element.kind !== 'unknown' && type.element.kind !== 'pitch') {
      this.report('Expected pitch range', position);
    }
  }

  private report(message: string, position: Position): void {
    this.diagnostics.push({ severity: 'error', message, position, filePath: this.filePath });
  }
}

function typeFromTypeRef(ref: TypeRef): TypeInfo {
  switch (ref.name) {
    case 'Score':
      return SCORE;
    case 'Clip':
      return CLIP;
    case 'Pos':
      return POS;
    case 'Dur':
    case 'Rat':
      return TIME;
    case 'Pitch':
      return PITCH;
    case 'Int':
    case 'Float':
    case 'Number':
      return NUMBER;
    case 'String':
      return STRING;
    case 'Bool':
      return BOOL;
    case 'Curve':
      return CURVE;
    case 'Rng':
      return RNG;
    case 'Lyric':
      return LYRIC;
    case 'LyricToken':
      return LYRIC_TOKEN;
    default:
      return UNKNOWN;
  }
}

function fnType(returns: TypeInfo): TypeInfo {
  return { kind: 'function', returns };
}

function arrayType(element: TypeInfo): TypeInfo {
  return { kind: 'array', element };
}

function rangeType(element: TypeInfo): TypeInfo {
  return { kind: 'range', element };
}

function unifyTypes(a: TypeInfo, b: TypeInfo): TypeInfo {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === b.kind) return a;
  return UNKNOWN;
}

function isCompatible(expected: TypeInfo, actual: TypeInfo): boolean {
  if (expected.kind === 'unknown' || actual.kind === 'unknown') return true;
  if (expected.kind === actual.kind) return true;
  if (expected.kind === 'time' && actual.kind === 'number') return true;
  if (expected.kind === 'number' && actual.kind === 'time') return true;
  if (expected.kind === 'pos' && (actual.kind === 'time' || actual.kind === 'number')) return true;
  return false;
}

function inferAdd(left: TypeInfo, right: TypeInfo): TypeInfo {
  if (left.kind === 'pos' && isTimeLike(right)) return POS;
  if (right.kind === 'pos' && isTimeLike(left)) return POS;
  if (isTimeLike(left) && isTimeLike(right)) return TIME;
  if (left.kind === 'number' && right.kind === 'number') return NUMBER;
  if (left.kind === 'string' && right.kind === 'string') return STRING;
  return UNKNOWN;
}

function inferSub(left: TypeInfo, right: TypeInfo): TypeInfo {
  if (left.kind === 'pos' && right.kind === 'pos') return TIME;
  if (left.kind === 'pos' && isTimeLike(right)) return POS;
  if (isTimeLike(left) && isTimeLike(right)) return TIME;
  if (left.kind === 'number' && right.kind === 'number') return NUMBER;
  return UNKNOWN;
}

function inferMul(left: TypeInfo, right: TypeInfo): TypeInfo {
  if (left.kind === 'number' && right.kind === 'number') return NUMBER;
  if (isTimeLike(left) && right.kind === 'number') return TIME;
  if (left.kind === 'number' && isTimeLike(right)) return TIME;
  if (left.kind === 'time' && right.kind === 'time') return TIME;
  return UNKNOWN;
}

function inferDiv(left: TypeInfo, right: TypeInfo): TypeInfo {
  if (left.kind === 'number' && right.kind === 'number') return TIME;
  if (left.kind === 'time' && right.kind === 'number') return TIME;
  if (left.kind === 'time' && right.kind === 'time') return TIME;
  return UNKNOWN;
}

function isTimeLike(value: TypeInfo): boolean {
  return value.kind === 'time' || value.kind === 'number';
}
