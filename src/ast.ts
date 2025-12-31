import type { Position } from './token.js';

export interface BaseNode {
  kind: string;
  position: Position;
}

export interface Program extends BaseNode {
  kind: 'Program';
  imports: ImportDecl[];
  body: TopDecl[];
}

export type TopDecl = FnDecl | ConstDecl | TypeAliasDecl | EnumDecl;

export interface ImportDecl extends BaseNode {
  kind: 'ImportDecl';
  spec: ImportSpec;
  from: StringLiteral;
}

export type ImportSpec = ImportAll | ImportNamed;

export interface ImportAll extends BaseNode {
  kind: 'ImportAll';
  alias: string;
}

export interface ImportNamed extends BaseNode {
  kind: 'ImportNamed';
  names: string[];
}

export interface FnDecl extends BaseNode {
  kind: 'FnDecl';
  name: string;
  typeParams?: string[];  // Generic type parameters: fn identity<T>(x: T) -> T
  params: Param[];
  returnType?: TypeRef;
  body: Block;
  exported: boolean;
}

export interface Param extends BaseNode {
  kind: 'Param';
  name: string;
  type?: TypeRef;
}

export interface ConstDecl extends BaseNode {
  kind: 'ConstDecl';
  name: string;
  pattern?: TuplePattern;  // For tuple destructuring: const (a, b) = expr
  value: Expr;
  mutable: boolean;
  type?: TypeRef;
  exported: boolean;
}

export interface TypeRef extends BaseNode {
  kind: 'TypeRef';
  name: string;
  typeArgs?: TypeRef[];  // Generic type arguments: Box<Number>, Map<String, Number>
}

export interface TypeAliasDecl extends BaseNode {
  kind: 'TypeAliasDecl';
  name: string;
  typeExpr: TypeRef;
}

// Algebraic Data Type (enum) declarations
export interface EnumVariant extends BaseNode {
  kind: 'EnumVariant';
  name: string;
  payload?: TypeRef;  // Optional payload type for variants like Custom([Number])
}

export interface EnumDecl extends BaseNode {
  kind: 'EnumDecl';
  name: string;
  variants: EnumVariant[];
  exported: boolean;
}

export interface Block extends BaseNode {
  kind: 'Block';
  statements: Statement[];
}

export type Statement =
  | ConstDecl
  | ReturnStmt
  | IfStmt
  | ForStmt
  | AssignmentStmt
  | ExprStmt;

export interface ReturnStmt extends BaseNode {
  kind: 'ReturnStmt';
  value?: Expr;
}

export interface IfStmt extends BaseNode {
  kind: 'IfStmt';
  test: Expr;
  consequent: Block;
  alternate?: Block | IfStmt;
}

export interface ForStmt extends BaseNode {
  kind: 'ForStmt';
  iterator: string;
  iterable: Expr;
  body: Block;
}

export interface AssignmentStmt extends BaseNode {
  kind: 'AssignmentStmt';
  target: Expr;
  value: Expr;
}

export interface ExprStmt extends BaseNode {
  kind: 'ExprStmt';
  expr: Expr;
}

export type Expr =
  | NumberLiteral
  | StringLiteral
  | TemplateLiteral
  | BoolLiteral
  | NullLiteral
  | PitchLiteral
  | DurLiteral
  | PosRefLiteral
  | Identifier
  | ArrayLiteral
  | ObjectLiteral
  | TupleLiteral
  | MemberExpr
  | IndexExpr
  | CallExpr
  | UnaryExpr
  | BinaryExpr
  | PipeExpr
  | MatchExpr
  | ScoreExpr
  | ClipExpr;

export interface NumberLiteral extends BaseNode {
  kind: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends BaseNode {
  kind: 'StringLiteral';
  value: string;
}

export interface TemplateLiteral extends BaseNode {
  kind: 'TemplateLiteral';
  quasis: string[];      // Static string parts
  expressions: Expr[];   // Interpolated expressions
}

export interface BoolLiteral extends BaseNode {
  kind: 'BoolLiteral';
  value: boolean;
}

export interface NullLiteral extends BaseNode {
  kind: 'NullLiteral';
}

export interface PitchLiteral extends BaseNode {
  kind: 'PitchLiteral';
  value: string;
}

export interface DurLiteral extends BaseNode {
  kind: 'DurLiteral';
  value: string;
}

export interface PosRefLiteral extends BaseNode {
  kind: 'PosRefLiteral';
  bar: number;
  beat: number;
}

export interface Identifier extends BaseNode {
  kind: 'Identifier';
  name: string;
}

export interface ArrayLiteral extends BaseNode {
  kind: 'ArrayLiteral';
  elements: (Expr | SpreadElement)[];
}

export interface SpreadElement extends BaseNode {
  kind: 'SpreadElement';
  argument: Expr;
}

export interface TupleLiteral extends BaseNode {
  kind: 'TupleLiteral';
  elements: Expr[];
}

// Pattern for tuple destructuring: const (a, b, ...rest) = expr
export interface TuplePattern extends BaseNode {
  kind: 'TuplePattern';
  elements: TuplePatternElement[];
}

export interface TuplePatternElement extends BaseNode {
  kind: 'TuplePatternElement';
  name: string;
  rest: boolean;  // true for ...rest patterns
}

export interface ObjectLiteral extends BaseNode {
  kind: 'ObjectLiteral';
  properties: (ObjectProperty | SpreadElement)[];
}

export interface ObjectProperty extends BaseNode {
  kind: 'ObjectProperty';
  key: string;
  value: Expr;
}

export interface MemberExpr extends BaseNode {
  kind: 'MemberExpr';
  object: Expr;
  property: string;
}

export interface IndexExpr extends BaseNode {
  kind: 'IndexExpr';
  object: Expr;
  index: Expr;
}

export interface CallExpr extends BaseNode {
  kind: 'CallExpr';
  callee: Expr;
  args: CallArg[];
}

export interface CallArg extends BaseNode {
  kind: 'CallArg';
  name?: string;
  value: Expr;
}

export interface UnaryExpr extends BaseNode {
  kind: 'UnaryExpr';
  operator: string;
  operand: Expr;
}

export interface BinaryExpr extends BaseNode {
  kind: 'BinaryExpr';
  operator: string;
  left: Expr;
  right: Expr;
}

export interface PipeExpr extends BaseNode {
  kind: 'PipeExpr';
  left: Expr;
  call: CallExpr;
}

export interface MatchExpr extends BaseNode {
  kind: 'MatchExpr';
  value: Expr;
  arms: MatchArm[];
}

export interface RangePattern extends BaseNode {
  kind: 'RangePattern';
  start: NumberLiteral;
  end: NumberLiteral;
}

export type MatchPattern = Expr | RangePattern;

export interface MatchArm extends BaseNode {
  kind: 'MatchArm';
  pattern?: MatchPattern;
  guard?: Expr;  // Optional guard condition: pattern if guard -> value
  value: Expr;
  isDefault: boolean;
}

export interface ScoreExpr extends BaseNode {
  kind: 'ScoreExpr';
  items: ScoreItem[];
}

export type ScoreItem =
  | MetaBlock
  | TempoBlock
  | MeterBlock
  | SoundDecl
  | TrackDecl
  | ScoreMarker;

export interface MetaBlock extends BaseNode {
  kind: 'MetaBlock';
  fields: MetaField[];
}

export interface MetaField extends BaseNode {
  kind: 'MetaField';
  key: string;
  value: Expr;
}

export interface TempoBlock extends BaseNode {
  kind: 'TempoBlock';
  items: TempoItem[];
}

export interface TempoItem extends BaseNode {
  kind: 'TempoItem';
  at: Expr;
  bpm: Expr;
  unit?: Expr;
  // Gradational tempo fields (Phase 3-B)
  endAt?: Expr;           // End position for gradational tempo
  curveType?: 'linear' | 'ease';  // 'linear' for ramp, 'ease' for ease-in-out
}

export interface MeterBlock extends BaseNode {
  kind: 'MeterBlock';
  items: MeterItem[];
}

export interface MeterItem extends BaseNode {
  kind: 'MeterItem';
  at: Expr;
  numerator: Expr;
  denominator: Expr;
}

export interface SoundDecl extends BaseNode {
  kind: 'SoundDecl';
  id: string;
  soundKind: string;
  body: SoundBodyItem[];
}

export type SoundBodyItem =
  | SoundField
  | DrumKeysBlock
  | VocalBlock;

export interface SoundField extends BaseNode {
  kind: 'SoundField';
  key: string;
  value: Expr;
}

export interface DrumKeysBlock extends BaseNode {
  kind: 'DrumKeysBlock';
  keys: string[];
}

export interface VocalBlock extends BaseNode {
  kind: 'VocalBlock';
  fields: SoundField[];
}

export interface TrackDecl extends BaseNode {
  kind: 'TrackDecl';
  name: string;
  role: string;
  sound: string;
  body: TrackStmt[];
}

export interface ScoreMarker extends BaseNode {
  kind: 'ScoreMarker';
  pos: Expr;
  markerKind: Expr;
  label: Expr;
}

export type TrackStmt = PlaceStmt;

export interface PlaceStmt extends BaseNode {
  kind: 'PlaceStmt';
  at: Expr;
  clip: Expr;
}

export interface ClipExpr extends BaseNode {
  kind: 'ClipExpr';
  body: ClipStmt[];
}

export type ClipStmt =
  | AtStmt
  | RestStmt
  | BreathStmt
  | NoteStmt
  | ChordStmt
  | HitStmt
  | CCStmt
  | AutomationStmt
  | MarkerStmt
  | ArpStmt
  | TripletStmt;

export interface AtStmt extends BaseNode {
  kind: 'AtStmt';
  pos: Expr;
}

export interface RestStmt extends BaseNode {
  kind: 'RestStmt';
  dur: Expr;
}

export interface BreathStmt extends BaseNode {
  kind: 'BreathStmt';
  dur: Expr;
  intensity: Expr | null;
}

export interface NoteStmt extends BaseNode {
  kind: 'NoteStmt';
  pitch: Expr;
  dur: Expr;
  opts: NamedArg[];
}

export interface ChordStmt extends BaseNode {
  kind: 'ChordStmt';
  pitches: Expr;
  dur: Expr;
  opts: NamedArg[];
}

export interface HitStmt extends BaseNode {
  kind: 'HitStmt';
  key: Expr;
  dur: Expr;
  opts: NamedArg[];
}

export interface CCStmt extends BaseNode {
  kind: 'CCStmt';
  num: Expr;
  value: Expr;
}

export interface AutomationStmt extends BaseNode {
  kind: 'AutomationStmt';
  param: Expr;
  start: Expr;
  end: Expr;
  curve: Expr;
}

export interface MarkerStmt extends BaseNode {
  kind: 'MarkerStmt';
  markerKind: Expr;
  label: Expr;
}

export type ArpDirection = 'up' | 'down' | 'updown' | 'downup' | 'random';

export interface ArpStmt extends BaseNode {
  kind: 'ArpStmt';
  pitches: Expr;
  duration: Expr;
  direction: ArpDirection;
  opts: NamedArg[];
}

export interface NamedArg extends BaseNode {
  kind: 'NamedArg';
  name: string;
  value: Expr;
}

export interface TripletStmt extends BaseNode {
  kind: 'TripletStmt';
  n: number;        // Number of notes (e.g., 3 for triplet)
  inTime: number;   // Time span to fit notes into (e.g., 2 for triplet = 3 notes in time of 2)
  body: ClipStmt[];
}
