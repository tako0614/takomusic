// AST node types for TakoMusic language

import type { Position } from './token';

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
  | IfStatement
  | ForStatement
  | ReturnStatement
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

export interface ProcDeclaration extends BaseNode {
  kind: 'ProcDeclaration';
  name: string;
  params: string[];
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

export interface ReturnStatement extends BaseNode {
  kind: 'ReturnStatement';
  value: Expression | null;
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
  | ArrayLiteral
  | ObjectLiteral
  | RangeExpression
  | ArrowFunction
  | MemberExpression;

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
  callee: string;
  arguments: Expression[];
}

export interface ArrayLiteral extends BaseNode {
  kind: 'ArrayLiteral';
  elements: Expression[];
}

export interface ObjectLiteral extends BaseNode {
  kind: 'ObjectLiteral';
  properties: { key: string; value: Expression }[];
}

export interface RangeExpression extends BaseNode {
  kind: 'RangeExpression';
  start: Expression;
  end: Expression;
  inclusive: boolean;
}

export interface ArrowFunction extends BaseNode {
  kind: 'ArrowFunction';
  params: string[];
  body: Expression;
}

export interface MemberExpression extends BaseNode {
  kind: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
}
