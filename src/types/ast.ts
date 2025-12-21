// AST node types for MFS language

import type { Position } from './token.js';

export interface BaseNode {
  kind: string;
  position: Position;
}

// ============ Program ============

export interface Program extends BaseNode {
  kind: 'Program';
  statements: Statement[];
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
  | DestructuringDeclaration
  | IfStatement
  | ForStatement
  | ForEachStatement
  | WhileStatement
  | MatchStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ExpressionStatement
  | TrackBlock;

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

// Destructuring patterns
export type DestructuringPattern = ArrayPattern | ObjectPattern;

export interface ArrayPattern extends BaseNode {
  kind: 'ArrayPattern';
  elements: (string | DestructuringPattern | null)[]; // null for holes [a, , b]
  rest?: string;
}

export interface ObjectPattern extends BaseNode {
  kind: 'ObjectPattern';
  properties: { key: string; value: string | DestructuringPattern }[];
  rest?: string;
}

export interface DestructuringDeclaration extends BaseNode {
  kind: 'DestructuringDeclaration';
  pattern: DestructuringPattern;
  value: Expression;
  mutable: boolean; // true for let, false for const
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

export interface TrackBlock extends BaseNode {
  kind: 'TrackBlock';
  trackKind: 'vocal' | 'midi';
  id: string;
  options: ObjectLiteral | null;
  body: Statement[];
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
  numerator: number;
  denominator: number;
  dots: number; // 0 = none, 1 = dotted (1.5x), 2 = double-dotted (1.75x)
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
