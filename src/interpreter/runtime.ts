// Runtime value types for MFS interpreter

import type { Parameter, Expression, Statement } from '../types/ast.js';
import type { Scope } from './scope.js';

export type RuntimeValue =
  | IntValue
  | FloatValue
  | StringValue
  | BoolValue
  | PitchValue
  | DurValue
  | TimeValue
  | ArrayValue
  | ObjectValue
  | FunctionValue
  | NullValue;

export interface IntValue {
  type: 'int';
  value: number;
}

export interface FloatValue {
  type: 'float';
  value: number;
}

export interface StringValue {
  type: 'string';
  value: string;
}

export interface BoolValue {
  type: 'bool';
  value: boolean;
}

export interface PitchValue {
  type: 'pitch';
  midi: number;
}

export interface DurValue {
  type: 'dur';
  numerator: number;
  denominator: number;
  dots: number; // 0 = none, 1 = dotted (1.5x), 2 = double-dotted (1.75x)
}

export interface TimeValue {
  type: 'time';
  bar: number;
  beat: number;
  sub: number;
}

export interface ArrayValue {
  type: 'array';
  elements: RuntimeValue[];
}

export interface ObjectValue {
  type: 'object';
  properties: Map<string, RuntimeValue>;
}

export interface FunctionValue {
  type: 'function';
  params: Parameter[];
  body: Expression | Statement[];
  closure: Scope;
}

export interface NullValue {
  type: 'null';
}

export function makeInt(value: number): IntValue {
  return { type: 'int', value };
}

export function makeFloat(value: number): FloatValue {
  return { type: 'float', value };
}

export function makeString(value: string): StringValue {
  return { type: 'string', value };
}

export function makeBool(value: boolean): BoolValue {
  return { type: 'bool', value };
}

export function makePitch(midi: number): PitchValue {
  // Validate MIDI value is in valid range 0-127
  if (midi < 0 || midi > 127) {
    throw new Error(`Pitch out of range: MIDI value ${midi} (must be 0-127)`);
  }
  return { type: 'pitch', midi };
}

export function makeDur(numerator: number, denominator: number, dots: number = 0): DurValue {
  return { type: 'dur', numerator, denominator, dots };
}

export function makeTime(bar: number, beat: number, sub: number): TimeValue {
  return { type: 'time', bar, beat, sub };
}

export function makeArray(elements: RuntimeValue[]): ArrayValue {
  return { type: 'array', elements };
}

export function makeObject(properties?: Map<string, RuntimeValue>): ObjectValue {
  return { type: 'object', properties: properties ?? new Map() };
}

export function makeFunction(
  params: Parameter[],
  body: Expression | Statement[],
  closure: Scope
): FunctionValue {
  return { type: 'function', params, body, closure };
}

export function makeNull(): NullValue {
  return { type: 'null' };
}

export function toNumber(val: RuntimeValue): number {
  if (val.type === 'int' || val.type === 'float') {
    return val.value;
  }
  if (val.type === 'pitch') {
    return val.midi;
  }
  throw new Error(`Cannot convert ${val.type} to number`);
}

export function isTruthy(val: RuntimeValue): boolean {
  if (val.type === 'bool') return val.value;
  if (val.type === 'null') return false;
  if (val.type === 'int') return val.value !== 0;
  if (val.type === 'float') return val.value !== 0;
  if (val.type === 'string') return val.value.length > 0;
  return true;
}

export function valueToString(val: RuntimeValue): string {
  switch (val.type) {
    case 'int':
    case 'float':
      return val.value.toString();
    case 'string':
      return val.value;
    case 'bool':
      return val.value ? 'true' : 'false';
    case 'pitch':
      return `Pitch(${val.midi})`;
    case 'dur':
      return `${val.numerator}/${val.denominator}`;
    case 'time':
      return `${val.bar}:${val.beat}:${val.sub}`;
    case 'array':
      return `[${val.elements.map(valueToString).join(', ')}]`;
    case 'object': {
      const entries = Array.from(val.properties.entries())
        .map(([k, v]) => `${k}: ${valueToString(v)}`)
        .join(', ');
      return `{${entries}}`;
    }
    case 'function':
      return `[Function(${val.params.length} params)]`;
    case 'null':
      return 'null';
  }
}

// Alias for use in string concatenation
export const toString = valueToString;

/**
 * Deep clone a RuntimeValue.
 * Primitive types (int, float, string, bool, pitch, dur, time, null) are immutable
 * so they can be returned as-is.
 * Arrays and objects are cloned recursively.
 * Functions are not cloned (closures are shared).
 */
export function deepClone(val: RuntimeValue): RuntimeValue {
  switch (val.type) {
    case 'int':
    case 'float':
    case 'string':
    case 'bool':
    case 'pitch':
    case 'dur':
    case 'time':
    case 'null':
    case 'function':
      // Immutable types or functions (shared closures)
      return val;
    case 'array':
      return makeArray(val.elements.map(deepClone));
    case 'object': {
      const clonedProps = new Map<string, RuntimeValue>();
      for (const [key, value] of val.properties) {
        clonedProps.set(key, deepClone(value));
      }
      return makeObject(clonedProps);
    }
  }
}
