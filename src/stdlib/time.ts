import { addRat, compareRat, makeRat, mulRat, ratFromInt } from '../rat.js';
import {
  MeterEventValue,
  ObjectValue,
  PosValue,
  RuntimeValue,
  makeNativeFunction,
  makeObject,
  makePosRef,
  makePosValue,
  makeRatValue,
  isPosExpr,
  isPosRef,
  isRat,
} from '../runtime.js';
import type { Rat } from '../rat.js';

export function createTimeModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('barBeat', makeNativeFunction('barBeat', (args) => {
    const bar = expectInt(args[0]);
    const beat = expectInt(args[1]);
    return makePosValue(makePosRef(bar, beat));
  }));

  props.set('resolvePos', makeNativeFunction('resolvePos', (args) => {
    const pos = expectPos(args[0]);
    const meterMap = resolveMeterMap(parseMeterMap(args[1]));
    const resolved = resolvePosAgainst(pos, meterMap);
    return makePosValue(resolved);
  }));

  props.set('dur', makeNativeFunction('dur', (args) => {
    const n = expectInt(args[0]);
    const d = expectInt(args[1]);
    return makeRatValue(makeRat(n, d));
  }));

  props.set('dot', makeNativeFunction('dot', (args) => {
    const value = expectRat(args[0]);
    return makeRatValue(addRat(value, makeRat(value.n, value.d * 2)));
  }));

  props.set('w', makeRatValue(makeRat(1, 1)));
  props.set('h', makeRatValue(makeRat(1, 2)));
  props.set('q', makeRatValue(makeRat(1, 4)));
  props.set('e', makeRatValue(makeRat(1, 8)));
  props.set('s', makeRatValue(makeRat(1, 16)));
  props.set('t', makeRatValue(makeRat(1, 32)));
  props.set('x', makeRatValue(makeRat(1, 64)));

  return makeObject(props);
}

function expectInt(value: RuntimeValue): number {
  if (value.type === 'number') return Math.floor(value.value);
  if (value.type === 'rat') return Math.floor(value.value.n / value.value.d);
  throw new Error('Expected int');
}

function expectRat(value: RuntimeValue): Rat {
  if (value.type === 'rat') return value.value;
  if (value.type === 'number') return makeRat(value.value, 1);
  throw new Error('Expected Rat');
}

function expectPos(value: RuntimeValue): PosValue {
  if (value.type !== 'pos') throw new Error('Expected Pos');
  return value;
}

function parseMeterMap(value: RuntimeValue): MeterEventValue[] {
  if (value.type === 'score') {
    return value.score.meterMap;
  }
  if (value.type === 'array') {
    const events: MeterEventValue[] = [];
    for (const item of value.elements) {
      if (item.type !== 'object') continue;
      const at = item.props.get('at');
      const numerator = item.props.get('numerator');
      const denominator = item.props.get('denominator');
      if (at && at.type === 'pos' && numerator && denominator) {
        events.push({
          at,
          numerator: expectInt(numerator),
          denominator: expectInt(denominator),
        });
      }
    }
    return events;
  }
  throw new Error('Expected meter map');
}

type ResolvedMeterEvent = { at: Rat; numerator: number; denominator: number };

function resolveMeterMap(events: MeterEventValue[]): ResolvedMeterEvent[] {
  const resolved: ResolvedMeterEvent[] = [];
  for (const event of events) {
    const at = resolvePosAgainst(event.at, resolved);
    resolved.push({ at, numerator: event.numerator, denominator: event.denominator });
  }
  return resolved;
}

function resolvePosAgainst(pos: PosValue, meterMap: ResolvedMeterEvent[]): Rat {
  if (isRat(pos.value)) return pos.value;
  if (isPosExpr(pos.value)) {
    const base = resolvePosRef(pos.value.base, meterMap);
    return addRat(base, pos.value.offset);
  }
  if (isPosRef(pos.value)) {
    return resolvePosRef(pos.value, meterMap);
  }
  return makeRat(0, 1);
}

function resolvePosRef(ref: { bar: number; beat: number }, meterMap: ResolvedMeterEvent[]): Rat {
  if (meterMap.length === 0) {
    if (ref.bar === 1 && ref.beat === 1) {
      return makeRat(0, 1);
    }
    throw new Error('meterMap is empty');
  }

  const sorted = [...meterMap].sort((a, b) => compareRat(a.at, b.at));
  let current = sorted[0];
  let currentPos = makeRat(0, 1);
  let currentBar = 1;
  let idx = 0;

  while (currentBar < ref.bar) {
    const barLen = makeRat(current.numerator, current.denominator);
    currentPos = addRat(currentPos, barLen);
    currentBar++;
    while (idx + 1 < sorted.length && compareRat(sorted[idx + 1].at, currentPos) === 0) {
      idx++;
      current = sorted[idx];
    }
  }

  const beatLen = makeRat(1, current.denominator);
  const offset = mulRat(beatLen, ratFromInt(ref.beat - 1));
  return addRat(currentPos, offset);
}
