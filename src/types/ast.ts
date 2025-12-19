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
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ExpressionStatement
  | TrackBlock;

export interface ImportStatement extends BaseNode {
  kind: 'ImportStatement';
  imports: string[];
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
  alternate: Statement[] | null;
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
  | RangeExpression;

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

export interface BoolLiteral extends BaseNode {
  kind: 'BoolLiteral';
  value: boolean;
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
}

export interface MemberExpression extends BaseNode {
  kind: 'MemberExpression';
  object: Expression;
  property: string;
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
