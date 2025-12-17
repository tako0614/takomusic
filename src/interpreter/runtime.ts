// Runtime value types for MFS interpreter

export type RuntimeValue =
  | IntValue
  | FloatValue
  | StringValue
  | BoolValue
  | PitchValue
  | DurValue
  | TimeValue
  | ArrayValue
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
  return { type: 'pitch', midi };
}

export function makeDur(numerator: number, denominator: number): DurValue {
  return { type: 'dur', numerator, denominator };
}

export function makeTime(bar: number, beat: number, sub: number): TimeValue {
  return { type: 'time', bar, beat, sub };
}

export function makeArray(elements: RuntimeValue[]): ArrayValue {
  return { type: 'array', elements };
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
    case 'null':
      return 'null';
  }
}
