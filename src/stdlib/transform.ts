import { makeRat, mulRat, ratToNumber } from '../rat.js';
import { transposePitch } from '../pitch.js';
import {
  ClipEventValue,
  ClipValueData,
  ObjectValue,
  PosValue,
  RuntimeValue,
  makeClip,
  makeNativeFunction,
  makeObject,
  isRat,
} from '../runtime.js';

export function createTransformModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('transpose', makeNativeFunction('transpose', (args) => {
    const clip = expectClip(args[0]);
    const semitones = Math.floor(expectNumber(args[1]));
    const events = clip.events.map((ev) => transposeEvent(ev, semitones));
    const out: ClipValueData = { events, length: clip.length };
    return makeClip(out);
  }));

  props.set('stretch', makeNativeFunction('stretch', (args) => {
    const clip = expectClip(args[0]);
    const factor = expectRat(args[1]);
    const events = clip.events.map((ev) => stretchEvent(ev, factor));
    const length = clip.length ? mulRat(clip.length, factor) : undefined;
    const out: ClipValueData = { events };
    if (length) out.length = length;
    return makeClip(out);
  }));

  props.set('quantize', makeNativeFunction('quantize', (args) => {
    const clip = expectClip(args[0]);
    const grid = expectRat(args[1]);
    const strength = args.length > 2 ? expectNumber(args[2]) : 1;
    const events = clip.events.map((ev) => quantizeEvent(ev, grid, strength));
    return makeClip({ events, length: clip.length });
  }));

  props.set('swing', makeNativeFunction('swing', (args) => {
    const clip = expectClip(args[0]);
    const grid = expectRat(args[1]);
    const amount = args.length > 2 ? expectNumber(args[2]) : 0.5;
    const events = clip.events.map((ev) => swingEvent(ev, grid, amount));
    return makeClip({ events, length: clip.length });
  }));

  props.set('humanize', makeNativeFunction('humanize', (args) => {
    const clip = expectClip(args[0]);
    const rng = args[1];
    const timing = args.length > 2 ? expectNumber(args[2]) : 0.0;
    const velocity = args.length > 3 ? expectNumber(args[3]) : 0.0;
    const events = clip.events.map((ev, idx) => humanizeEvent(ev, rng, timing, velocity, idx));
    return makeClip({ events, length: clip.length });
  }));

  return makeObject(props);
}

function transposeEvent(event: ClipEventValue, semitones: number): ClipEventValue {
  if (event.type === 'note') {
    return { ...event, pitch: transposePitch(event.pitch, semitones) };
  }
  if (event.type === 'chord') {
    return { ...event, pitches: event.pitches.map((p) => transposePitch(p, semitones)) };
  }
  return event;
}

function stretchEvent(event: ClipEventValue, factor: ReturnType<typeof expectRat>): ClipEventValue {
  if (event.type === 'marker') {
    return { ...event, pos: scalePos(event.pos, factor) };
  }
  if (event.type === 'automation') {
    return { ...event, start: scalePos(event.start, factor), end: scalePos(event.end, factor) };
  }
  if (event.type === 'note' || event.type === 'chord' || event.type === 'drumHit') {
    return { ...event, start: scalePos(event.start, factor), dur: mulRat(event.dur, factor) };
  }
  if (event.type === 'control') {
    return { ...event, start: scalePos(event.start, factor) };
  }
  return event;
}

function quantizeEvent(event: ClipEventValue, grid: ReturnType<typeof expectRat>, strength: number): ClipEventValue {
  if (event.type === 'marker') {
    return { ...event, pos: quantizePos(event.pos, grid, strength) };
  }
  if (event.type === 'automation') {
    return { ...event, start: quantizePos(event.start, grid, strength), end: quantizePos(event.end, grid, strength) };
  }
  if ('start' in event) {
    return { ...event, start: quantizePos(event.start, grid, strength) };
  }
  return event;
}

function swingEvent(event: ClipEventValue, grid: ReturnType<typeof expectRat>, amount: number): ClipEventValue {
  if (event.type === 'marker') {
    return { ...event, pos: swingPos(event.pos, grid, amount) };
  }
  if (event.type === 'automation') {
    return { ...event, start: swingPos(event.start, grid, amount), end: swingPos(event.end, grid, amount) };
  }
  if ('start' in event) {
    return { ...event, start: swingPos(event.start, grid, amount) };
  }
  return event;
}

function humanizeEvent(
  event: ClipEventValue,
  rng: RuntimeValue,
  timing: number,
  velocity: number,
  idx: number
): ClipEventValue {
  const jitter = timing * (hashFloat(rng, idx) - 0.5) * 2;
  if (event.type === 'marker') {
    return { ...event, pos: offsetPos(event.pos, jitter) };
  }
  if (event.type === 'automation') {
    return { ...event, start: offsetPos(event.start, jitter), end: offsetPos(event.end, jitter) };
  }
  if ('start' in event) {
    const newEvent: any = { ...event, start: offsetPos(event.start, jitter) };
    if ('velocity' in newEvent) {
      const vel = typeof newEvent.velocity === 'number' ? newEvent.velocity : 1;
      newEvent.velocity = vel * (1 + velocity * (hashFloat(rng, idx + 1) - 0.5));
    }
    return newEvent;
  }
  return event;
}

function scalePos(pos: PosValue, factor: ReturnType<typeof expectRat>): PosValue {
  if (!isRat(pos.value)) {
    throw new Error('stretch requires absolute positions');
  }
  return { type: 'pos', value: mulRat(pos.value, factor) };
}

function quantizePos(pos: PosValue, grid: ReturnType<typeof expectRat>, strength: number): PosValue {
  if (!isRat(pos.value)) return pos;
  const ratio = ratToNumber(pos.value) / ratToNumber(grid);
  const snapped = Math.round(ratio) * ratToNumber(grid);
  if (strength >= 1) {
    return { type: 'pos', value: makeRatFromNumber(snapped) };
  }
  const blended = ratToNumber(pos.value) + (snapped - ratToNumber(pos.value)) * strength;
  return { type: 'pos', value: makeRatFromNumber(blended) };
}

function swingPos(pos: PosValue, grid: ReturnType<typeof expectRat>, amount: number): PosValue {
  if (!isRat(pos.value)) return pos;
  const ratio = ratToNumber(pos.value) / ratToNumber(grid);
  const idx = Math.floor(ratio);
  const isOff = idx % 2 === 1;
  if (!isOff) return pos;
  const offset = ratToNumber(grid) * amount * 0.5;
  const shifted = ratToNumber(pos.value) + offset;
  return { type: 'pos', value: makeRatFromNumber(shifted) };
}

function offsetPos(pos: PosValue, offset: number): PosValue {
  if (!isRat(pos.value)) return pos;
  const shifted = ratToNumber(pos.value) + offset;
  return { type: 'pos', value: makeRatFromNumber(shifted) };
}

function hashFloat(rng: RuntimeValue, seed: number): number {
  const base = rng.type === 'rng' ? rng.state : 123456789;
  const hashed = (base + seed * 2654435761) >>> 0;
  return (hashed % 10000) / 10000;
}

function makeRatFromNumber(value: number) {
  const scaled = Math.round(value * 1000);
  return makeRat(scaled, 1000);
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
