import type { Rat } from './rat.js';
import type { Pitch } from './pitch.js';
import type { Curve, LyricSpan } from './ir.js';
import type { Param, Block } from './ast.js';
import type { Scope } from './scope.js';

export interface NumberValue {
  type: 'number';
  value: number;
}

export interface BoolValue {
  type: 'bool';
  value: boolean;
}

export interface StringValue {
  type: 'string';
  value: string;
}

export interface NullValue {
  type: 'null';
}

export interface RatValue {
  type: 'rat';
  value: Rat;
}

export interface PosRef {
  kind: 'posref';
  bar: number;
  beat: number;
}

export interface PosExpr {
  kind: 'posExpr';
  base: PosRef;
  offset: Rat;
}

export type PosAtom = Rat | PosRef | PosExpr;

export interface PosValue {
  type: 'pos';
  value: PosAtom;
}

export interface PitchValue {
  type: 'pitch';
  value: Pitch;
}

export interface ArrayValue {
  type: 'array';
  elements: RuntimeValue[];
}

export interface ObjectValue {
  type: 'object';
  props: Map<string, RuntimeValue>;
}

export interface FunctionValue {
  type: 'function';
  name?: string;
  params?: Param[];
  body?: Block;
  closure?: Scope;
  native?: NativeFn;
}

export interface RangeValue {
  type: 'range';
  start: RuntimeValue;
  end: RuntimeValue;
}

export interface ClipValue {
  type: 'clip';
  clip: ClipValueData;
}

export interface ScoreValue {
  type: 'score';
  score: ScoreValueData;
}

export interface CurveValue {
  type: 'curve';
  curve: Curve;
}

export interface LyricValue {
  type: 'lyric';
  lyric: Lyric;
}

export interface LyricTokenValue {
  type: 'lyricToken';
  token: LyricToken;
}

export interface RngValue {
  type: 'rng';
  state: number;
}

export type RuntimeValue =
  | NumberValue
  | BoolValue
  | StringValue
  | NullValue
  | RatValue
  | PosValue
  | PitchValue
  | ArrayValue
  | ObjectValue
  | FunctionValue
  | RangeValue
  | ClipValue
  | ScoreValue
  | CurveValue
  | LyricValue
  | LyricTokenValue
  | RngValue;

export interface MetaValue {
  title?: string;
  artist?: string;
  album?: string;
  copyright?: string;
  ext?: Record<string, unknown>;
}

export interface TempoEventValue {
  at: PosValue;
  bpm: number;
  unit: Rat;
}

export interface MeterEventValue {
  at: PosValue;
  numerator: number;
  denominator: number;
}

export interface PitchRangeValue {
  low: Pitch;
  high: Pitch;
}

export interface DrumKeyDeclValue {
  key: string;
  label?: string;
  group?: string;
  tags?: string[];
}

export interface VocalDeclValue {
  lang?: string;
  defaultLyricMode?: 'text' | 'syllables' | 'phonemes';
  preferredAlphabet?: string;
  range?: PitchRangeValue;
  tags?: string[];
}

export interface SoundDeclValue {
  id: string;
  kind: 'instrument' | 'drumKit' | 'vocal' | 'fx';
  label?: string;
  family?: string;
  tags?: string[];
  range?: PitchRangeValue;
  transposition?: number;
  drumKeys?: DrumKeyDeclValue[];
  vocal?: VocalDeclValue;
  hints?: Record<string, unknown>;
  ext?: Record<string, unknown>;
}

export type TrackRole = 'Instrument' | 'Drums' | 'Vocal' | 'Automation';

export interface MixValue {
  gain?: number;
  pan?: number;
}

export interface PlacementValue {
  at: PosValue;
  clip: ClipValueData;
}

export interface TrackValueData {
  name: string;
  role: TrackRole;
  sound: string;
  mix?: MixValue;
  placements: PlacementValue[];
}

export interface ClipValueData {
  length?: Rat;
  events: ClipEventValue[];
}

export type ClipEventValue =
  | NoteEventValue
  | ChordEventValue
  | DrumHitEventValue
  | ControlEventValue
  | AutomationEventValue
  | MarkerEventValue;

export interface NoteEventValue {
  type: 'note';
  start: PosValue;
  dur: Rat;
  pitch: Pitch;
  velocity?: number;
  voice?: number;
  techniques?: string[];
  lyric?: LyricSpan;
  ext?: Record<string, unknown>;
}

export interface ChordEventValue {
  type: 'chord';
  start: PosValue;
  dur: Rat;
  pitches: Pitch[];
  velocity?: number;
  voice?: number;
  techniques?: string[];
  ext?: Record<string, unknown>;
}

export interface DrumHitEventValue {
  type: 'drumHit';
  start: PosValue;
  dur: Rat;
  key: string;
  velocity?: number;
  techniques?: string[];
  ext?: Record<string, unknown>;
}

export interface ControlEventValue {
  type: 'control';
  start: PosValue;
  kind: string;
  data: Record<string, unknown>;
  ext?: Record<string, unknown>;
}

export interface AutomationEventValue {
  type: 'automation';
  param: string;
  start: PosValue;
  end: PosValue;
  curve: Curve;
  ext?: Record<string, unknown>;
}

export interface MarkerEventValue {
  type: 'marker';
  pos: PosValue;
  kind: string;
  label: string;
}

export interface ScoreValueData {
  meta: MetaValue;
  tempoMap: TempoEventValue[];
  meterMap: MeterEventValue[];
  sounds: SoundDeclValue[];
  tracks: TrackValueData[];
  markers: MarkerEventValue[];
}

export type LyricToken =
  | { kind: 'syllable'; text: string }
  | { kind: 'extend' };

export interface Lyric {
  kind: 'text' | 'syllables' | 'phonemes';
  tokens: LyricToken[];
  lang: string;
  alphabet?: string;
  words?: Array<[number, number]>;
}

export interface NativeContext {
  callFunction: (fn: FunctionValue, args: RuntimeValue[], named: Map<string, RuntimeValue>) => RuntimeValue;
}

export type NativeFn = (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext) => RuntimeValue;

export function makeNumber(value: number): NumberValue {
  return { type: 'number', value };
}

export function makeBool(value: boolean): BoolValue {
  return { type: 'bool', value };
}

export function makeString(value: string): StringValue {
  return { type: 'string', value };
}

export function makeNull(): NullValue {
  return { type: 'null' };
}

export function makeRatValue(value: Rat): RatValue {
  return { type: 'rat', value };
}

export function makePosValue(value: PosAtom): PosValue {
  return { type: 'pos', value };
}

export function makePosRef(bar: number, beat: number): PosRef {
  return { kind: 'posref', bar, beat };
}

export function makePosExpr(base: PosRef, offset: Rat): PosExpr {
  return { kind: 'posExpr', base, offset };
}

export function makePitchValue(value: Pitch): PitchValue {
  return { type: 'pitch', value };
}

export function makeArray(elements: RuntimeValue[]): ArrayValue {
  return { type: 'array', elements };
}

export function makeObject(props: Map<string, RuntimeValue>): ObjectValue {
  return { type: 'object', props };
}

export function makeNativeFunction(name: string, native: NativeFn): FunctionValue {
  return { type: 'function', name, native };
}

export function makeClip(clip: ClipValueData): ClipValue {
  return { type: 'clip', clip };
}

export function makeScore(score: ScoreValueData): ScoreValue {
  return { type: 'score', score };
}

export function makeCurve(curve: Curve): CurveValue {
  return { type: 'curve', curve };
}

export function makeLyric(lyric: Lyric): LyricValue {
  return { type: 'lyric', lyric };
}

export function makeLyricToken(token: LyricToken): LyricTokenValue {
  return { type: 'lyricToken', token };
}

export function makeRng(state: number): RngValue {
  return { type: 'rng', state };
}

export function isRat(value: PosAtom): value is Rat {
  return typeof (value as Rat).n === 'number' && typeof (value as Rat).d === 'number' && !(value as PosRef).kind;
}

export function isPosRef(value: PosAtom): value is PosRef {
  return (value as PosRef).kind === 'posref';
}

export function isPosExpr(value: PosAtom): value is PosExpr {
  return (value as PosExpr).kind === 'posExpr';
}
