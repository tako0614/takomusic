import type {
  Program,
  ImportDecl,
  ImportSpec,
  FnDecl,
  ConstDecl,
  TypeAliasDecl,
  EnumDecl,
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
  TupleLiteral,
  TuplePattern,
  MemberExpr,
  IndexExpr,
  CallExpr,
  UnaryExpr,
  BinaryExpr,
  MatchExpr,
  MatchPattern,
  RangePattern,
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
  TripletStmt,
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
  | 'tuple'
  | 'object'
  | 'range'
  | 'curve'
  | 'rng'
  | 'lyric'
  | 'lyricToken'
  | 'function'
  | 'typeParam'   // Generic type parameter (e.g., T, U)
  | 'enum'        // Enum type (the namespace object)
  | 'enumVariant'; // Enum variant value

interface TypeInfo {
  kind: TypeKind;
  element?: TypeInfo;
  elements?: TypeInfo[];
  returns?: TypeInfo;
  typeParamName?: string;  // For generic type parameters
  typeParams?: string[];   // For generic functions: fn identity<T>(x: T) -> T
  typeArgs?: TypeInfo[];   // For parameterized types: Array<Number>
  enumName?: string;       // For enum types: the name of the enum
  variantName?: string;    // For enumVariant types: the variant name
  variantPayload?: TypeInfo; // For enumVariant types: the payload type (if any)
  variants?: Map<string, TypeInfo>; // For enum types: map of variant names to their types
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
    // Clip operations
    concat: fnType(CLIP),
    overlay: fnType(CLIP),
    repeat: fnType(CLIP),
    slice: fnType(CLIP),
    mapEvents: fnType(CLIP),
    shift: fnType(CLIP),
    padTo: fnType(CLIP),
    length: fnType(TIME),
    updateEvent: fnType(UNKNOWN),
    merge: fnType(CLIP),
    reverse: fnType(CLIP),
    retrograde: fnType(CLIP),
    invert: fnType(CLIP),
    split: fnType(arrayType(CLIP)),
    augment: fnType(CLIP),
    diminish: fnType(CLIP),
    // Score operations
    withTrack: fnType(SCORE),
    mapTracks: fnType(SCORE),
    getTracks: fnType(arrayType(UNKNOWN)),
    // Generic array functions
    map: fnType(arrayType(UNKNOWN)),
    filter: fnType(arrayType(UNKNOWN)),
    fold: fnType(UNKNOWN),
    flatMap: fnType(arrayType(UNKNOWN)),
    zip: fnType(arrayType(UNKNOWN)),
    enumerate: fnType(arrayType(UNKNOWN)),
    range: fnType(arrayType(NUMBER)),
    find: fnType(UNKNOWN),
    findIndex: fnType(NUMBER),
    every: fnType(BOOL),
    some: fnType(BOOL),
    includes: fnType(BOOL),
    take: fnType(arrayType(UNKNOWN)),
    drop: fnType(arrayType(UNKNOWN)),
    // Math utilities
    max: fnType(NUMBER),
    min: fnType(NUMBER),
    abs: fnType(NUMBER),
    floor: fnType(NUMBER),
    ceil: fnType(NUMBER),
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
    nextFloat: fnType(tupleType([RNG, NUMBER])),
    nextInt: fnType(tupleType([RNG, NUMBER])),
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
    autoBreath: fnType(CLIP),
  },
  'std:rhythm': {
    euclidean: fnType(arrayType(BOOL)),
    euclideanClip: fnType(CLIP),
    polyrhythm: fnType(CLIP),
    groove: fnType(UNKNOWN),
    applyGroove: fnType(CLIP),
    clave: fnType(CLIP),
    crossRhythm: fnType(CLIP),
    accent: fnType(arrayType(NUMBER)),
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
    const typeAliases = new Map<string, TypeRef>();

    for (const decl of program.imports) {
      this.applyImport(decl, env, moduleAliases);
    }

    // First pass: collect type aliases
    for (const decl of program.body) {
      if (decl.kind === 'TypeAliasDecl') {
        typeAliases.set(decl.name, decl.typeExpr);
      }
    }

    for (const decl of program.body) {
      if (decl.kind === 'FnDecl') {
        const returnType = decl.returnType ? typeFromTypeRef(decl.returnType, typeAliases) : UNKNOWN;
        if (returnType.kind !== 'unknown') {
          env.set(decl.name, fnType(returnType));
        }
      }
    }

    // Second pass: register enum types
    for (const decl of program.body) {
      if (decl.kind === 'EnumDecl') {
        this.checkEnumDecl(decl, env, typeAliases);
      }
    }

    for (const decl of program.body) {
      if (decl.kind === 'ConstDecl') {
        this.checkConstDecl(decl, env, moduleAliases, typeAliases);
      } else if (decl.kind === 'FnDecl') {
        this.checkFnDecl(decl, env, moduleAliases, typeAliases);
      }
      // TypeAliasDecl and EnumDecl are handled in earlier passes
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

  private checkEnumDecl(decl: EnumDecl, env: TypeEnv, typeAliases: Map<string, TypeRef>): void {
    // Build a type for the enum (which is an object containing variants)
    const variants = new Map<string, TypeInfo>();

    for (const variant of decl.variants) {
      if (variant.payload) {
        // Variant with payload is a function type: (payloadType) -> enumVariant
        const payloadType = typeFromTypeRef(variant.payload, typeAliases);
        const variantType: TypeInfo = {
          kind: 'function',
          returns: {
            kind: 'enumVariant',
            enumName: decl.name,
            variantName: variant.name,
            variantPayload: payloadType,
          },
        };
        variants.set(variant.name, variantType);
      } else {
        // Simple variant is an enumVariant value
        const variantType: TypeInfo = {
          kind: 'enumVariant',
          enumName: decl.name,
          variantName: variant.name,
        };
        variants.set(variant.name, variantType);
      }
    }

    // Register the enum type in the environment
    const enumType: TypeInfo = {
      kind: 'enum',
      enumName: decl.name,
      variants,
    };
    env.set(decl.name, enumType);
  }

  private checkFnDecl(decl: FnDecl, parent: TypeEnv, moduleAliases: Map<string, string>, typeAliases: Map<string, TypeRef>): void {
    const env = new TypeEnv(parent);

    // Register type parameters in the environment (e.g., T, U in fn identity<T, U>)
    const typeParamSet = new Set<string>(decl.typeParams ?? []);

    for (const param of decl.params) {
      const type = param.type ? typeFromTypeRef(param.type, typeAliases, typeParamSet) : UNKNOWN;
      env.set(param.name, type);
    }
    this.checkBlock(decl.body, env, moduleAliases, decl.returnType ? typeFromTypeRef(decl.returnType, typeAliases, typeParamSet) : UNKNOWN, typeAliases);
  }

  private checkConstDecl(decl: ConstDecl, env: TypeEnv, moduleAliases: Map<string, string>, typeAliases: Map<string, TypeRef>): void {
    const valueType = this.inferExpr(decl.value, env, moduleAliases);

    // Handle tuple destructuring pattern
    if (decl.pattern) {
      this.checkTupleDestructuring(decl.pattern, valueType, env);
      return;
    }

    const annotated = decl.type ? typeFromTypeRef(decl.type, typeAliases) : UNKNOWN;
    if (annotated.kind !== 'unknown' && valueType.kind !== 'unknown' && !isCompatible(annotated, valueType)) {
      this.report(
        `Type mismatch for '${decl.name}': expected ${annotated.kind}, got ${valueType.kind}`,
        decl.position
      );
    }
    env.set(decl.name, annotated.kind === 'unknown' ? valueType : annotated);
  }

  private checkTupleDestructuring(pattern: TuplePattern, valueType: TypeInfo, env: TypeEnv): void {
    // Check if the value is a tuple or array type
    if (valueType.kind !== 'tuple' && valueType.kind !== 'array') {
      if (valueType.kind !== 'unknown') {
        this.report(`Cannot destructure ${valueType.kind} as tuple`, pattern.position);
      }
      // Still bind the names with unknown types
      for (const elem of pattern.elements) {
        env.set(elem.name, elem.rest ? arrayType(UNKNOWN) : UNKNOWN);
      }
      return;
    }

    // For tuple types, we can infer element types
    if (valueType.kind === 'tuple' && valueType.elements) {
      let elementIndex = 0;
      for (const elem of pattern.elements) {
        if (elem.rest) {
          // Rest element gets remaining element types as an array
          const remainingTypes = valueType.elements.slice(elementIndex);
          if (remainingTypes.length === 0) {
            env.set(elem.name, arrayType(UNKNOWN));
          } else if (remainingTypes.every(t => t.kind === remainingTypes[0].kind)) {
            env.set(elem.name, arrayType(remainingTypes[0]));
          } else {
            env.set(elem.name, arrayType(UNKNOWN));
          }
        } else {
          const elemType = elementIndex < valueType.elements.length
            ? valueType.elements[elementIndex]
            : UNKNOWN;
          env.set(elem.name, elemType);
          elementIndex++;
        }
      }
    } else if (valueType.kind === 'array') {
      // For array types, all elements have the same type
      const elementType = valueType.element ?? UNKNOWN;
      for (const elem of pattern.elements) {
        env.set(elem.name, elem.rest ? arrayType(elementType) : elementType);
      }
    }
  }

  private checkBlock(
    block: Block,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo,
    typeAliases: Map<string, TypeRef>
  ): void {
    const localEnv = new TypeEnv(env);
    for (const stmt of block.statements) {
      this.checkStatement(stmt, localEnv, moduleAliases, returnType, typeAliases);
    }
  }

  private checkStatement(
    stmt: Statement,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo,
    typeAliases: Map<string, TypeRef>
  ): void {
    switch (stmt.kind) {
      case 'ConstDecl':
        this.checkConstDecl(stmt, env, moduleAliases, typeAliases);
        break;
      case 'ReturnStmt':
        this.checkReturn(stmt, env, moduleAliases, returnType);
        break;
      case 'IfStmt':
        this.checkIf(stmt, env, moduleAliases, returnType, typeAliases);
        break;
      case 'ForStmt':
        this.checkFor(stmt, env, moduleAliases, returnType, typeAliases);
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
    returnType: TypeInfo,
    typeAliases: Map<string, TypeRef>
  ): void {
    this.inferExpr(stmt.test, env, moduleAliases);
    this.checkBlock(stmt.consequent, env, moduleAliases, returnType, typeAliases);
    if (stmt.alternate) {
      if (stmt.alternate.kind === 'IfStmt') {
        this.checkIf(stmt.alternate, env, moduleAliases, returnType, typeAliases);
      } else {
        this.checkBlock(stmt.alternate, env, moduleAliases, returnType, typeAliases);
      }
    }
  }

  private checkFor(
    stmt: ForStmt,
    env: TypeEnv,
    moduleAliases: Map<string, string>,
    returnType: TypeInfo,
    typeAliases: Map<string, TypeRef>
  ): void {
    this.inferExpr(stmt.iterable, env, moduleAliases);
    const loopEnv = new TypeEnv(env);
    loopEnv.set(stmt.iterator, UNKNOWN);
    this.checkBlock(stmt.body, loopEnv, moduleAliases, returnType, typeAliases);
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
      case 'TupleLiteral':
        return this.inferTuple(expr, env, moduleAliases);
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
    const types = expr.elements.map((el) => {
      if (el.kind === 'SpreadElement') {
        // For spread elements, infer the type of the spread argument
        const arrayType = this.inferExpr(el.argument, env, moduleAliases);
        if (arrayType.kind === 'array' && arrayType.element) {
          return arrayType.element;
        }
        return UNKNOWN;
      }
      return this.inferExpr(el, env, moduleAliases);
    });
    const base = types.find((t) => t.kind !== 'unknown');
    if (!base) return arrayType(UNKNOWN);
    const hasDifferent = types.some((t) => t.kind !== 'unknown' && t.kind !== base.kind);
    if (!hasDifferent) return arrayType(base);
    return tupleType(types);
  }

  private inferTuple(expr: TupleLiteral, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const types = expr.elements.map((el) => this.inferExpr(el, env, moduleAliases));
    return tupleType(types);
  }

  private inferObject(expr: ObjectLiteral, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    for (const prop of expr.properties) {
      if (prop.kind === 'SpreadElement') {
        // Spread elements don't contribute to kind detection
        continue;
      }
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

    // Handle enum member access: Direction.Up
    if (objectType.kind === 'enum' && objectType.variants) {
      const variantType = objectType.variants.get(expr.property);
      if (variantType) return variantType;
    }

    if ((objectType.kind === 'array' || objectType.kind === 'tuple') && expr.property === 'length') return NUMBER;
    return UNKNOWN;
  }

  private inferIndex(expr: IndexExpr, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    const objectType = this.inferExpr(expr.object, env, moduleAliases);
    if (objectType.kind === 'array' && objectType.element) {
      return objectType.element;
    }
    if (objectType.kind === 'tuple' && objectType.elements) {
      const index = this.literalTupleIndex(expr.index);
      if (index !== null && index >= 0 && index < objectType.elements.length) {
        return objectType.elements[index];
      }
    }
    return UNKNOWN;
  }

  private literalTupleIndex(expr: Expr): number | null {
    if (expr.kind !== 'NumberLiteral') return null;
    if (!Number.isInteger(expr.value)) return null;
    return expr.value;
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
        const patternType = this.inferPattern(arm.pattern, env, moduleAliases);
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

  private inferPattern(pattern: MatchPattern, env: TypeEnv, moduleAliases: Map<string, string>): TypeInfo {
    if (pattern.kind === 'RangePattern') {
      // Range patterns are only valid for numeric types
      return NUMBER;
    }
    // Otherwise it's a regular expression pattern
    return this.inferExpr(pattern, env, moduleAliases);
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
      case 'BreathStmt':
        this.expectDur(stmt.dur, env, moduleAliases, stmt.position, 'breath duration');
        if (stmt.intensity) {
          this.expectNumber(stmt.intensity, env, moduleAliases, stmt.position, 'breath intensity');
        }
        break;
      case 'ArpStmt':
        this.expectPitchArray(stmt.pitches, env, moduleAliases, stmt.position);
        this.expectDur(stmt.duration, env, moduleAliases, stmt.position, 'arp duration');
        this.checkOpts(stmt.opts, env, moduleAliases);
        break;
      case 'TripletStmt':
        this.checkTriplet(stmt, env, moduleAliases);
        break;
      default:
        break;
    }
  }

  private checkTriplet(stmt: TripletStmt, env: TypeEnv, moduleAliases: Map<string, string>): void {
    // Validate n and inTime values
    if (stmt.n <= 0) {
      this.report(`Triplet n must be positive, got ${stmt.n}`, stmt.position);
    }
    if (stmt.inTime <= 0) {
      this.report(`Triplet inTime must be positive, got ${stmt.inTime}`, stmt.position);
    }

    // Recursively check body statements
    for (const bodyStmt of stmt.body) {
      this.checkClipStmt(bodyStmt, env, moduleAliases);
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

function typeFromTypeRef(ref: TypeRef, typeAliases?: Map<string, TypeRef>, typeParams?: Set<string>): TypeInfo {
  // Check if this is a type parameter (e.g., T, U in fn identity<T, U>)
  if (typeParams && typeParams.has(ref.name)) {
    return { kind: 'typeParam', typeParamName: ref.name };
  }

  // Check if this is a type alias first
  if (typeAliases) {
    const aliasedType = typeAliases.get(ref.name);
    if (aliasedType) {
      // Recursively resolve to prevent infinite loops (simple case only)
      return typeFromTypeRef(aliasedType, typeAliases, typeParams);
    }
  }

  // Process type arguments if present (e.g., Array<Number>)
  let typeArgs: TypeInfo[] | undefined;
  if (ref.typeArgs && ref.typeArgs.length > 0) {
    typeArgs = ref.typeArgs.map(arg => typeFromTypeRef(arg, typeAliases, typeParams));
  }

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
    case 'Array':
      // Array<T> - use type argument if provided
      if (typeArgs && typeArgs.length > 0) {
        return { kind: 'array', element: typeArgs[0], typeArgs };
      }
      return { kind: 'array', element: UNKNOWN };
    case 'Tuple':
      // Tuple<T, U, ...> - use type arguments
      if (typeArgs && typeArgs.length > 0) {
        return { kind: 'tuple', elements: typeArgs, typeArgs };
      }
      return { kind: 'tuple', elements: [] };
    default:
      // For unknown types, return unknown but preserve type args if any
      if (typeArgs) {
        return { kind: 'unknown', typeArgs };
      }
      return UNKNOWN;
  }
}

function fnType(returns: TypeInfo): TypeInfo {
  return { kind: 'function', returns };
}

function arrayType(element: TypeInfo): TypeInfo {
  return { kind: 'array', element };
}

function tupleType(elements: TypeInfo[]): TypeInfo {
  return { kind: 'tuple', elements };
}

function rangeType(element: TypeInfo): TypeInfo {
  return { kind: 'range', element };
}

function unifyTypes(a: TypeInfo, b: TypeInfo): TypeInfo {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === 'tuple' && b.kind === 'tuple') {
    if (!a.elements || !b.elements || a.elements.length !== b.elements.length) return UNKNOWN;
    const elements = a.elements.map((el, idx) => unifyTypes(el, b.elements![idx]));
    return tupleType(elements);
  }
  if (a.kind === b.kind) return a;
  return UNKNOWN;
}

function isCompatible(expected: TypeInfo, actual: TypeInfo): boolean {
  if (expected.kind === 'unknown' || actual.kind === 'unknown') return true;
  // Type parameters are compatible with any type (will be inferred)
  if (expected.kind === 'typeParam' || actual.kind === 'typeParam') return true;
  if (expected.kind === actual.kind) {
    // For enum variants, also check that they're from the same enum
    if (expected.kind === 'enumVariant' && actual.kind === 'enumVariant') {
      return expected.enumName === actual.enumName;
    }
    return true;
  }
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
