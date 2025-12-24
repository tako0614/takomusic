import { addRat, compareRat, mulRat, ratFromInt, subRat } from '../rat.js';
import {
  ClipEventValue,
  ClipValueData,
  FunctionValue,
  ObjectValue,
  PosValue,
  RuntimeValue,
  makeClip,
  makeNativeFunction,
  makeObject,
  makeRatValue,
  makeString,
} from '../runtime.js';
import { clipLength, shiftEvent } from './utils.js';

export function createCoreModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('concat', makeNativeFunction('concat', (args) => {
    const a = expectClip(args[0]);
    const b = expectClip(args[1]);
    const offset = clipLength(a);
    if (!offset) {
      throw new Error('concat requires clips with known length');
    }
    const shifted = b.events.map((ev) => shiftEvent(ev, offset));
    const events = [...a.events, ...shifted];
    const length = clipLength({ events });
    const clip: ClipValueData = { events };
    if (length) clip.length = length;
    return makeClip(clip);
  }));

  props.set('overlay', makeNativeFunction('overlay', (args) => {
    const a = expectClip(args[0]);
    const b = expectClip(args[1]);
    const events = [...a.events, ...b.events];
    const lengthA = clipLength(a);
    const lengthB = clipLength(b);
    const clip: ClipValueData = { events };
    if (lengthA && lengthB) {
      clip.length = lengthA.n * lengthB.d >= lengthB.n * lengthA.d ? lengthA : lengthB;
    } else if (lengthA) {
      clip.length = lengthA;
    } else if (lengthB) {
      clip.length = lengthB;
    }
    return makeClip(clip);
  }));

  props.set('repeat', makeNativeFunction('repeat', (args) => {
    const clip = expectClip(args[0]);
    const count = Math.floor(expectNumber(args[1]));
    if (count <= 0) {
      return makeClip({ events: [], length: ratFromInt(0) });
    }
    const len = clipLength(clip);
    if (!len) {
      throw new Error('repeat requires clips with known length');
    }
    const events: ClipEventValue[] = [];
    for (let i = 0; i < count; i++) {
      const offset = mulRat(len, ratFromInt(i));
      for (const ev of clip.events) {
        events.push(shiftEvent(ev, offset));
      }
    }
    return makeClip({ events, length: mulRat(len, ratFromInt(count)) });
  }));

  props.set('slice', makeNativeFunction('slice', (args) => {
    const clip = expectClip(args[0]);
    const start = expectPos(args[1]);
    const end = expectPos(args[2]);
    const startRat = posToRat(start);
    const endRat = posToRat(end);
    if (!startRat || !endRat) {
      throw new Error('slice requires absolute positions');
    }
    const events = clip.events
      .filter((ev) => {
        const pos = eventStartRat(ev);
        if (!pos) return false;
        return compareRat(pos, startRat) >= 0 && compareRat(pos, endRat) <= 0;
      })
      .map((ev) => shiftEvent(ev, subRat(ratFromInt(0), startRat)));
    const length = subRat(endRat, startRat);
    return makeClip({ events, length });
  }));

  props.set('mapEvents', makeNativeFunction('mapEvents', (args, named, ctx) => {
    const clip = expectClip(args[0]);
    const fn = expectFunction(args[1]);
    const events: ClipEventValue[] = [];
    for (const ev of clip.events) {
      const obj = eventToObject(ev);
      const result = ctx.callFunction(fn, [obj], new Map());
      if (result.type === 'null') continue;
      if (result.type !== 'object') {
        throw new Error('mapEvents callback must return object or null');
      }
      events.push(objectToEvent(result));
    }
    const length = clipLength({ events });
    const out: ClipValueData = { events };
    if (length) out.length = length;
    return makeClip(out);
  }));

  props.set('withTrack', makeNativeFunction('withTrack', (args) => {
    const score = args[0];
    const track = args[1];
    if (score.type !== 'score') throw new Error('withTrack expects Score');
    if (track.type !== 'object') throw new Error('withTrack expects Track object');
    const tracks = [...score.score.tracks, objectToTrack(track)];
    return { type: 'score', score: { ...score.score, tracks } } as RuntimeValue;
  }));

  props.set('mapTracks', makeNativeFunction('mapTracks', (args, _named, ctx) => {
    const score = args[0];
    const fn = args[1];
    if (score.type !== 'score') throw new Error('mapTracks expects Score');
    if (fn.type !== 'function') throw new Error('mapTracks expects function');
    const tracks = score.score.tracks.map((track) => {
      const obj = trackToObject(track);
      const result = ctx.callFunction(fn, [obj], new Map());
      if (result.type !== 'object') {
        throw new Error('mapTracks callback must return object');
      }
      return objectToTrack(result);
    });
    return { type: 'score', score: { ...score.score, tracks } } as RuntimeValue;
  }));

  return makeObject(props);
}

function expectClip(value: RuntimeValue): ClipValueData {
  if (!value || value.type !== 'clip') {
    throw new Error('Expected Clip');
  }
  return value.clip;
}

function expectFunction(value: RuntimeValue): FunctionValue {
  if (value.type !== 'function') {
    throw new Error('Expected function');
  }
  return value;
}

function expectNumber(value: RuntimeValue): number {
  if (value.type === 'number') return value.value;
  if (value.type === 'rat') return value.value.n / value.value.d;
  throw new Error('Expected number');
}

function expectPos(value: RuntimeValue): PosValue {
  if (value.type !== 'pos') throw new Error('Expected position');
  return value;
}

function posToRat(pos: PosValue) {
  if (pos.value && typeof (pos.value as any).n === 'number') {
    return pos.value as any;
  }
  return null;
}

function eventStartRat(event: ClipEventValue) {
  if (event.type === 'marker') return posToRat(event.pos);
  if (event.type === 'automation') return posToRat(event.start);
  return posToRat((event as any).start);
}

function eventToObject(event: ClipEventValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('type', makeString(event.type));
  if (event.type === 'marker') {
    props.set('pos', event.pos as any);
    props.set('kind', makeString(event.kind));
    props.set('label', makeString(event.label));
    return makeObject(props);
  }
  if (event.type === 'automation') {
    props.set('start', event.start as any);
    props.set('end', event.end as any);
    props.set('param', makeString(event.param));
    props.set('curve', { type: 'curve', curve: event.curve } as RuntimeValue);
    return makeObject(props);
  }
  props.set('start', (event as any).start as RuntimeValue);
  if ((event as any).dur) {
    props.set('dur', makeRatValue((event as any).dur));
  }
  if (event.type === 'note') {
    props.set('pitch', { type: 'pitch', value: event.pitch } as RuntimeValue);
  }
  if (event.type === 'chord') {
    props.set('pitches', { type: 'array', elements: event.pitches.map((p) => ({ type: 'pitch', value: p } as RuntimeValue)) });
  }
  if (event.type === 'drumHit') {
    props.set('key', makeString(event.key));
  }
  return makeObject(props);
}

function objectToEvent(obj: ObjectValue): ClipEventValue {
  const typeValue = obj.props.get('type');
  if (!typeValue || typeValue.type !== 'string') {
    throw new Error('Event object missing type');
  }
  const type = typeValue.value;
  if (type === 'marker') {
    const pos = obj.props.get('pos') as RuntimeValue;
    const kind = obj.props.get('kind') as RuntimeValue;
    const label = obj.props.get('label') as RuntimeValue;
    if (!pos || pos.type !== 'pos') throw new Error('marker requires pos');
    return {
      type: 'marker',
      pos,
      kind: (kind && kind.type === 'string') ? kind.value : '',
      label: (label && label.type === 'string') ? label.value : '',
    };
  }
  const start = obj.props.get('start');
  if (!start || start.type !== 'pos') throw new Error('event requires start');
  const durValue = obj.props.get('dur');
  const dur = durValue && durValue.type === 'rat' ? durValue.value : ratFromInt(0);
  if (type === 'note') {
    const pitch = obj.props.get('pitch');
    if (!pitch || pitch.type !== 'pitch') throw new Error('note requires pitch');
    return { type: 'note', start, dur, pitch: pitch.value };
  }
  if (type === 'chord') {
    const pitches = obj.props.get('pitches');
    if (!pitches || pitches.type !== 'array') throw new Error('chord requires pitches');
    return {
      type: 'chord',
      start,
      dur,
      pitches: pitches.elements.map((p) => (p.type === 'pitch' ? p.value : { midi: 60, cents: 0 })),
    };
  }
  if (type === 'drumHit') {
    const key = obj.props.get('key');
    if (!key || key.type !== 'string') throw new Error('drumHit requires key');
    return { type: 'drumHit', start, dur, key: key.value };
  }
  if (type === 'control') {
    const kind = obj.props.get('kind');
    const data = obj.props.get('data');
    return {
      type: 'control',
      start,
      kind: kind && kind.type === 'string' ? kind.value : 'control',
      data: data && data.type === 'object' ? objectToPlain(data) : {},
    };
  }
  if (type === 'automation') {
    const end = obj.props.get('end');
    const param = obj.props.get('param');
    const curve = obj.props.get('curve');
    if (!end || end.type !== 'pos') throw new Error('automation requires end');
    if (!param || param.type !== 'string') throw new Error('automation requires param');
    if (!curve || curve.type !== 'curve') throw new Error('automation requires curve');
    return { type: 'automation', start, end, param: param.value, curve: curve.curve };
  }
  throw new Error(`Unknown event type: ${type}`);
}

function objectToPlain(obj: ObjectValue): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of obj.props.entries()) {
    if (val.type === 'string' || val.type === 'number' || val.type === 'bool') {
      out[key] = val.value;
    } else if (val.type === 'rat') {
      out[key] = { n: val.value.n, d: val.value.d };
    }
  }
  return out;
}

function trackToObject(track: any): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('name', makeString(track.name));
  props.set('role', makeString(track.role));
  props.set('sound', makeString(track.sound));
  props.set('placements', { type: 'array', elements: track.placements.map((p: any) => placementToObject(p)) } as RuntimeValue);
  return makeObject(props);
}

function placementToObject(placement: any): RuntimeValue {
  const props = new Map<string, RuntimeValue>();
  props.set('at', placement.at);
  props.set('clip', { type: 'clip', clip: placement.clip } as RuntimeValue);
  return makeObject(props);
}

function objectToTrack(obj: ObjectValue): any {
  const name = obj.props.get('name');
  const role = obj.props.get('role');
  const sound = obj.props.get('sound');
  const placements = obj.props.get('placements');
  const placementList: any[] = [];
  if (placements && placements.type === 'array') {
    for (const p of placements.elements) {
      if (p.type === 'object') {
        const at = p.props.get('at');
        const clip = p.props.get('clip');
        if (at && at.type === 'pos' && clip && clip.type === 'clip') {
          placementList.push({ at, clip: clip.clip });
        }
      }
    }
  }
  return {
    name: name && name.type === 'string' ? name.value : 'Track',
    role: role && role.type === 'string' ? role.value : 'Instrument',
    sound: sound && sound.type === 'string' ? sound.value : '',
    placements: placementList,
  };
}
