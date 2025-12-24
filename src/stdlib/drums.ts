import { addRat, makeRat, mulRat, ratFromInt } from '../rat.js';
import {
  ClipEventValue,
  ClipValueData,
  ObjectValue,
  RuntimeValue,
  makeArray,
  makeClip,
  makeNativeFunction,
  makeObject,
  makeString,
} from '../runtime.js';

const DRUM_KEYS = [
  'kick',
  'snare',
  'hhc',
  'hho',
  'crash',
  'ride',
  'tom1',
  'tom2',
  'tom3',
  'clap',
  'perc1',
];

export function createDrumsModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  for (const key of DRUM_KEYS) {
    props.set(key, makeString(key));
  }

  props.set('fourOnFloor', makeNativeFunction('fourOnFloor', (args) => {
    const bars = Math.max(1, Math.floor(expectNumber(args[0])));
    const unit = expectRat(args[1]);
    const events: ClipEventValue[] = [];
    const beats = bars * 4;
    for (let i = 0; i < beats; i++) {
      events.push({
        type: 'drumHit',
        start: { type: 'pos', value: mulRat(unit, ratFromInt(i)) },
        dur: unit,
        key: 'kick',
        velocity: 0.9,
      });
    }
    const length = mulRat(unit, ratFromInt(beats));
    return makeClip({ events, length });
  }));

  props.set('basicRock', makeNativeFunction('basicRock', (args) => {
    const bars = Math.max(1, Math.floor(expectNumber(args[0])));
    const unit = expectRat(args[1]);
    const events: ClipEventValue[] = [];
    for (let bar = 0; bar < bars; bar++) {
      const base = mulRat(unit, ratFromInt(bar * 4));
      const beatOffsets = [0, 1, 2, 3];
      for (const beat of beatOffsets) {
        const start = addRat(base, mulRat(unit, ratFromInt(beat)));
        events.push({ type: 'drumHit', start: { type: 'pos', value: start }, dur: unit, key: 'hhc', velocity: 0.5 });
      }
      events.push({ type: 'drumHit', start: { type: 'pos', value: addRat(base, ratFromInt(0)) }, dur: unit, key: 'kick', velocity: 0.9 });
      events.push({ type: 'drumHit', start: { type: 'pos', value: addRat(base, unit) }, dur: unit, key: 'snare', velocity: 0.8 });
      events.push({ type: 'drumHit', start: { type: 'pos', value: addRat(base, mulRat(unit, ratFromInt(2))) }, dur: unit, key: 'kick', velocity: 0.9 });
      events.push({ type: 'drumHit', start: { type: 'pos', value: addRat(base, mulRat(unit, ratFromInt(3))) }, dur: unit, key: 'snare', velocity: 0.8 });
    }
    const length = mulRat(unit, ratFromInt(bars * 4));
    return makeClip({ events, length });
  }));

  props.set('fill', makeNativeFunction('fill', (args) => {
    const kind = args[0].type === 'string' ? args[0].value : 'snare';
    const length = expectRat(args[1]);
    const hits = 4;
    const unit = makeRat(length.n, length.d * hits);
    const events: ClipEventValue[] = [];
    for (let i = 0; i < hits; i++) {
      events.push({
        type: 'drumHit',
        start: { type: 'pos', value: mulRat(unit, ratFromInt(i)) },
        dur: unit,
        key: kind,
        velocity: 0.7,
      });
    }
    return makeClip({ events, length });
  }));

  props.set('ghost', makeNativeFunction('ghost', (args) => {
    const clip = expectClip(args[0]);
    const amount = expectNumber(args[1]);
    const events = clip.events.map((ev) => {
      if (ev.type === 'drumHit' || ev.type === 'note' || ev.type === 'chord') {
        const vel = typeof (ev as any).velocity === 'number' ? (ev as any).velocity : 1;
        return { ...ev, velocity: vel * amount };
      }
      return ev;
    });
    return makeClip({ events, length: clip.length });
  }));

  return makeObject(props);
}

function expectClip(value: RuntimeValue): ClipValueData {
  if (!value || value.type !== 'clip') throw new Error('Expected Clip');
  return value.clip;
}

function expectNumber(value: RuntimeValue): number {
  if (value.type === 'number') return value.value;
  if (value.type === 'rat') return value.value.n / value.value.d;
  throw new Error('Expected number');
}

function expectRat(value: RuntimeValue) {
  if (value.type === 'rat') return value.value;
  if (value.type === 'number') return makeRat(value.value, 1);
  throw new Error('Expected Rat');
}
