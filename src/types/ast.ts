// AST node types for TakoScore v2.0 language

import type { Position } from './token.js';

export interface BaseNode {
  kind: string;
  position: Position;
}

// ============ Score ============

export interface Score extends BaseNode {
  kind: 'Score';
  title: string;
  backend: BackendConfig | null;
  globals: GlobalStatement[];
  parts: PartDeclaration[];
}

// ============ Backend Configuration ============

export interface BackendConfig extends BaseNode {
  kind: 'BackendConfig';
  name: string;  // 'neutrino', etc.
  options: BackendOption[];
}

export interface BackendOption extends BaseNode {
  kind: 'BackendOption';
  key: string;
  value: Expression;
}

// ============ Global Statements ============

export type GlobalStatement =
  | TempoStatement
  | TimeSignatureStatement
  | KeySignatureStatement
  | PpqStatement
  | ImportStatement
  | ConstDeclaration
  | ProcDeclaration;

export interface TempoStatement extends BaseNode {
  kind: 'TempoStatement';
  bpm: Expression;
  at?: Expression;  // Optional time position
}

export interface TimeSignatureStatement extends BaseNode {
  kind: 'TimeSignatureStatement';
  numerator: Expression;
  denominator: Expression;
  at?: Expression;  // Optional time position
}

export interface KeySignatureStatement extends BaseNode {
  kind: 'KeySignatureStatement';
  root: Expression;
  mode: 'major' | 'minor';
}

export interface PpqStatement extends BaseNode {
  kind: 'PpqStatement';
  value: Expression;
}

// ============ Parts ============

export interface PartDeclaration extends BaseNode {
  kind: 'PartDeclaration';
  name: string;
  partKind: 'vocal' | 'midi' | null;  // Inferred or explicit
  options: PartOption[];
  body: PartBodyItem[];
}

export interface PartOption extends BaseNode {
  kind: 'PartOption';
  key: string;
  value: Expression;
}

export type PartBodyItem =
  | PhraseBlock
  | RestStatement
  | MidiBar
  | AutomationStatement
  | Statement;

// Voice parameter automation over time
export interface AutomationStatement extends BaseNode {
  kind: 'AutomationStatement';
  paramType: VoiceParamType;
  points: VoiceAutomationPoint[];
}

export interface VoiceAutomationPoint extends BaseNode {
  kind: 'VoiceAutomationPoint';
  time: Expression;   // Time position (e.g., 1:0 = bar 1, beat 0)
  value: Expression;  // Parameter value (0-127 typically)
}

// ============ Phrase Block (Vocal) ============

export interface PhraseBlock extends BaseNode {
  kind: 'PhraseBlock';
  notesSection: NotesSection | null;
  lyricsSection: LyricsSection | null;
  breathMarks: BreathMark[];
}

export interface NotesSection extends BaseNode {
  kind: 'NotesSection';
  bars: NoteBar[];
}

export interface NoteBar extends BaseNode {
  kind: 'NoteBar';
  notes: NoteItem[];
}

export interface NoteItem extends BaseNode {
  kind: 'NoteItem';
  pitch: Expression;
  duration: Expression;
  tieStart?: boolean;   // ~ after note
  tieEnd?: boolean;     // tied from previous
  slurStart?: boolean;  // ( after note
  slurEnd?: boolean;    // ) after note
  voiceParams?: VoiceParams;  // Voice tuning parameters [dyn:100 bre:30]
}

// Voice tuning parameters for vocal synthesis
export interface VoiceParams extends BaseNode {
  kind: 'VoiceParams';
  params: VoiceParam[];
}

export interface VoiceParam extends BaseNode {
  kind: 'VoiceParam';
  type: VoiceParamType;
  value: Expression;
}

// Supported voice parameter types (matches IR VocaloidParamType)
export type VoiceParamType = 'dyn' | 'bre' | 'bri' | 'cle' | 'gen' | 'por' | 'ope' | 'pit';

export interface LyricsSection extends BaseNode {
  kind: 'LyricsSection';
  mode: 'mora' | 'phoneme';
  tokens: LyricToken[];
}

export interface LyricToken extends BaseNode {
  kind: 'LyricToken';
  value: string;      // Mora/phoneme text or '_' for melisma
  isMelisma: boolean; // true if '_'
}

export interface BreathMark extends BaseNode {
  kind: 'BreathMark';
  afterBar: number;   // Index of bar after which breath occurs
}

// ============ Rest Statement ============

export interface RestStatement extends BaseNode {
  kind: 'RestStatement';
  duration: Expression;
}

// ============ MIDI Bar ============

export interface MidiBar extends BaseNode {
  kind: 'MidiBar';
  items: MidiBarItem[];
}

export type MidiBarItem =
  | MidiNote
  | MidiChord
  | MidiDrum
  | MidiRest;

export interface MidiNote extends BaseNode {
  kind: 'MidiNote';
  pitch: Expression;
  duration: Expression;
  velocity?: Expression;
}

export interface MidiChord extends BaseNode {
  kind: 'MidiChord';
  pitches: Expression[];
  duration: Expression;
  velocity?: Expression;
}

export interface MidiDrum extends BaseNode {
  kind: 'MidiDrum';
  name: string;
  duration: Expression;
  velocity?: Expression;
}

export interface MidiRest extends BaseNode {
  kind: 'MidiRest';
  duration: Expression;
}

// ============ Statements ============

export type Statement =
  | ImportStatement
  | ExportStatement
  | ProcDeclaration
  | ConstDeclaration
  | LetDeclaration
  | AssignmentStatement
  | IndexAssignmentStatement
  | PropertyAssignmentStatement
  | IfStatement
  | ForStatement
  | ForEachStatement
  | WhileStatement
  | MatchStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ExpressionStatement
  | PhraseBlock       // For use in procedures called from part body
  | RestStatement     // For use in procedures called from part body
  | MidiBar;          // For use in procedures called from part body

export interface ImportStatement extends BaseNode {
  kind: 'ImportStatement';
  imports: string[];      // Named imports: import { a, b } from "path"
  namespace?: string;     // Namespace import: import * as ns from "path"
  path: string;
}

export interface ExportStatement extends BaseNode {
  kind: 'ExportStatement';
  declaration: ProcDeclaration | ConstDeclaration;
}

// Parameter definition (supports rest and default values)
export interface Parameter {
  name: string;
  rest?: boolean;
  defaultValue?: Expression;
}

export interface ProcDeclaration extends BaseNode {
  kind: 'ProcDeclaration';
  name: string;
  params: Parameter[];
  body: Statement[];
  exported: boolean;
}

export interface ConstDeclaration extends BaseNode {
  kind: 'ConstDeclaration';
  name: string;
  value: Expression;
  exported: boolean;
}

export interface LetDeclaration extends BaseNode {
  kind: 'LetDeclaration';
  name: string;
  value: Expression;
}

export interface AssignmentStatement extends BaseNode {
  kind: 'AssignmentStatement';
  name: string;
  value: Expression;
}

export interface IndexAssignmentStatement extends BaseNode {
  kind: 'IndexAssignmentStatement';
  object: Expression;
  index: Expression;
  value: Expression;
}

export interface PropertyAssignmentStatement extends BaseNode {
  kind: 'PropertyAssignmentStatement';
  object: Expression;
  property: string;
  value: Expression;
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Expression;
  consequent: Statement[];
  alternate: IfStatement | Statement[] | null;
}

export interface ForStatement extends BaseNode {
  kind: 'ForStatement';
  variable: string;
  range: RangeExpression;
  body: Statement[];
}

export interface ForEachStatement extends BaseNode {
  kind: 'ForEachStatement';
  variable: string;
  iterable: Expression;
  body: Statement[];
}

export interface WhileStatement extends BaseNode {
  kind: 'WhileStatement';
  condition: Expression;
  body: Statement[];
}

export interface MatchCase {
  pattern: Expression | null; // null for default case
  body: Statement[];
}

export interface MatchStatement extends BaseNode {
  kind: 'MatchStatement';
  expression: Expression;
  cases: MatchCase[];
}

export interface ReturnStatement extends BaseNode {
  kind: 'ReturnStatement';
  value: Expression | null;
}

export interface BreakStatement extends BaseNode {
  kind: 'BreakStatement';
}

export interface ContinueStatement extends BaseNode {
  kind: 'ContinueStatement';
}

export interface ExpressionStatement extends BaseNode {
  kind: 'ExpressionStatement';
  expression: Expression;
}

// ============ Expressions ============

export type Expression =
  | IntLiteral
  | FloatLiteral
  | StringLiteral
  | BoolLiteral
  | NullLiteral
  | PitchLiteral
  | DurLiteral
  | TimeLiteral
  | Identifier
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | IndexExpression
  | MemberExpression
  | ArrayLiteral
  | ObjectLiteral
  | ArrowFunction
  | SpreadElement
  | RangeExpression
  | ConditionalExpression
  | TemplateLiteral
  | TypeofExpression;

export interface IntLiteral extends BaseNode {
  kind: 'IntLiteral';
  value: number;
}

export interface FloatLiteral extends BaseNode {
  kind: 'FloatLiteral';
  value: number;
}

export interface StringLiteral extends BaseNode {
  kind: 'StringLiteral';
  value: string;
}

export interface TemplateLiteral extends BaseNode {
  kind: 'TemplateLiteral';
  quasis: string[];      // Static string parts
  expressions: Expression[];  // Interpolated expressions
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
  note: string;
  octave: number;
  midi: number;
}

export interface DurLiteral extends BaseNode {
  kind: 'DurLiteral';
  // Note-based duration (w, h, q, e, s, t, x)
  noteValue?: 'w' | 'h' | 'q' | 'e' | 's' | 't' | 'x';
  dots?: number; // 0 = none, 1 = dotted (1.5x), 2 = double-dotted (1.75x)
  // Tick-based duration (480t, 240t, etc.)
  ticks?: number;
  // Fraction representation for internal use
  numerator?: number;
  denominator?: number;
}

export interface TimeLiteral extends BaseNode {
  kind: 'TimeLiteral';
  bar: number;
  beat: number;
  sub: number;
}

export interface Identifier extends BaseNode {
  kind: 'Identifier';
  name: string;
}

export interface BinaryExpression extends BaseNode {
  kind: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  kind: 'UnaryExpression';
  operator: string;
  operand: Expression;
}

export interface CallExpression extends BaseNode {
  kind: 'CallExpression';
  callee: Expression;
  arguments: (Expression | SpreadElement)[];
}

export interface IndexExpression extends BaseNode {
  kind: 'IndexExpression';
  object: Expression;
  index: Expression;
  optional?: boolean;  // ?.[index] optional chaining
}

export interface MemberExpression extends BaseNode {
  kind: 'MemberExpression';
  object: Expression;
  property: string;
  optional?: boolean;  // ?.property optional chaining
}

export interface TypeofExpression extends BaseNode {
  kind: 'TypeofExpression';
  operand: Expression;
}

export interface ArrayLiteral extends BaseNode {
  kind: 'ArrayLiteral';
  elements: (Expression | SpreadElement)[];
}

// Object property types
export type ObjectProperty =
  | { kind: 'property'; key: string; value: Expression; shorthand: boolean }
  | { kind: 'spread'; argument: Expression };

export interface ObjectLiteral extends BaseNode {
  kind: 'ObjectLiteral';
  properties: ObjectProperty[];
}

// Arrow function expression
export interface ArrowFunction extends BaseNode {
  kind: 'ArrowFunction';
  params: Parameter[];
  body: Expression | Statement[];
}

// Spread element for arrays and function calls
export interface SpreadElement extends BaseNode {
  kind: 'SpreadElement';
  argument: Expression;
}

export interface RangeExpression extends BaseNode {
  kind: 'RangeExpression';
  start: Expression;
  end: Expression;
  inclusive: boolean;
}

export interface ConditionalExpression extends BaseNode {
  kind: 'ConditionalExpression';
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}
