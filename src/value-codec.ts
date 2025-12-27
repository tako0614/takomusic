import { makeRat, ratFromInt } from './rat.js';
import type { Rat } from './rat.js';
import type { Curve, LyricSpan } from './ir.js';
import {
  ClipEventValue,
  ClipValueData,
  MarkerEventValue,
  MeterEventValue,
  ObjectValue,
  PosValue,
  RangeValue,
  RuntimeValue,
  ScoreValueData,
  SoundDeclValue,
  TempoEventValue,
  TrackValueData,
  makeArray,
  makeBool,
  makeNumber,
  makeNull,
  makeObject,
  makePitchValue,
  makePosExpr,
  makePosRef,
  makePosValue,
  makeRatValue,
  makeString,
  isPosExpr,
  isPosRef,
  isRat,
} from './runtime.js';

type DrumKeyEntry = NonNullable<SoundDeclValue['drumKeys']>[number];

export function clipToObject(clip: ClipValueData): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  const events = clip.events.map((event) => eventToObject(event));
  props.set('events', makeArray(events));
  if (clip.length) {
    props.set('length', makeRatValue(clip.length));
  }
  return makeObject(props);
}

export function scoreToObject(score: ScoreValueData): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('meta', metaToObject(score.meta));
  props.set('tempoMap', makeArray(score.tempoMap.map((t) => tempoToObject(t))));
  props.set('meterMap', makeArray(score.meterMap.map((m) => meterToObject(m))));
  props.set('sounds', makeArray(score.sounds.map((s) => soundToObject(s))));
  props.set('tracks', makeArray(score.tracks.map((t) => trackToObject(t))));
  props.set('markers', makeArray(score.markers.map((m) => markerToObject(m))));
  return makeObject(props);
}

export function coerceScore(value: RuntimeValue): ScoreValueData {
  if (value.type === 'score') return value.score;
  if (value.type !== 'object') {
    throw new Error('Expected Score object');
  }
  const meta = coerceMeta(value.props.get('meta'));
  const tempoMap = coerceTempoMap(value.props.get('tempoMap'));
  const meterMap = coerceMeterMap(value.props.get('meterMap'));
  const sounds = coerceSounds(value.props.get('sounds'));
  const tracks = coerceTracks(value.props.get('tracks'));
  const markers = coerceMarkers(value.props.get('markers'));
  return { meta, tempoMap, meterMap, sounds, tracks, markers };
}

export function coerceClip(value: RuntimeValue): ClipValueData {
  if (value.type === 'clip') return value.clip;
  if (value.type !== 'object') {
    throw new Error('Expected Clip object');
  }
  const eventsValue = value.props.get('events');
  if (!eventsValue || eventsValue.type !== 'array') {
    throw new Error('Clip.events must be an array');
  }
  const events: ClipEventValue[] = [];
  for (const item of eventsValue.elements) {
    if (!item || item.type === 'null') continue;
    if (item.type !== 'object') {
      throw new Error('Clip event must be an object');
    }
    events.push(coerceEvent(item));
  }
  const clip: ClipValueData = { events };
  const lengthValue = value.props.get('length');
  if (lengthValue && lengthValue.type !== 'null') {
    clip.length = coerceRat(lengthValue);
  }
  return clip;
}

function eventToObject(event: ClipEventValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('type', makeString(event.type));
  if (event.type === 'marker') {
    props.set('pos', event.pos as RuntimeValue);
    props.set('kind', makeString(event.kind));
    props.set('label', makeString(event.label));
    return makeObject(props);
  }
  if (event.type === 'automation') {
    props.set('start', event.start as RuntimeValue);
    props.set('end', event.end as RuntimeValue);
    props.set('param', makeString(event.param));
    props.set('curve', curveToObject(event.curve));
    if (event.ext) props.set('ext', plainToValue(event.ext));
    return makeObject(props);
  }
  props.set('start', (event as any).start as RuntimeValue);
  if ((event as any).dur) {
    props.set('dur', makeRatValue((event as any).dur));
  }
  if (event.type === 'note') {
    props.set('pitch', makePitchValue(event.pitch));
  }
  if (event.type === 'chord') {
    props.set(
      'pitches',
      makeArray(event.pitches.map((p) => makePitchValue(p)))
    );
  }
  if (event.type === 'drumHit') {
    props.set('key', makeString(event.key));
  }
  if (event.type === 'breath') {
    props.set('intensity', makeNumber(event.intensity));
  }
  if ((event as any).velocity !== undefined) {
    props.set('velocity', makeNumber((event as any).velocity as number));
  }
  if ((event as any).voice !== undefined) {
    props.set('voice', makeNumber((event as any).voice as number));
  }
  if ((event as any).techniques) {
    props.set('techniques', makeArray(((event as any).techniques as string[]).map((t) => makeString(t))));
  }
  if ((event as any).lyric) {
    props.set('lyric', lyricSpanToValue((event as any).lyric as LyricSpan));
  }
  if ((event as any).ext) {
    props.set('ext', plainToValue((event as any).ext as Record<string, unknown>));
  }
  if (event.type === 'control') {
    props.set('kind', makeString(event.kind));
    props.set('data', plainToValue(event.data));
  }
  return makeObject(props);
}

function trackToObject(track: TrackValueData): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('name', makeString(track.name));
  props.set('role', makeString(track.role));
  props.set('sound', makeString(track.sound));
  if (track.mix) {
    const mixProps = new Map<string, RuntimeValue>();
    if (track.mix.gain !== undefined) mixProps.set('gain', makeNumber(track.mix.gain));
    if (track.mix.pan !== undefined) mixProps.set('pan', makeNumber(track.mix.pan));
    props.set('mix', makeObject(mixProps));
  }
  const placements = track.placements.map((p) => {
    const placementProps = new Map<string, RuntimeValue>();
    placementProps.set('at', p.at as RuntimeValue);
    placementProps.set('clip', clipToObject(p.clip));
    return makeObject(placementProps);
  });
  props.set('placements', makeArray(placements));
  return makeObject(props);
}

function soundToObject(sound: SoundDeclValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('id', makeString(sound.id));
  props.set('kind', makeString(sound.kind));
  if (sound.label) props.set('label', makeString(sound.label));
  if (sound.family) props.set('family', makeString(sound.family));
  if (sound.tags) props.set('tags', makeArray(sound.tags.map((t) => makeString(t))));
  if (sound.range) {
    props.set('range', makeRangeValue(makePitchValue(sound.range.low), makePitchValue(sound.range.high)));
  }
  if (sound.transposition !== undefined) {
    props.set('transposition', makeNumber(sound.transposition));
  }
  if (sound.drumKeys) {
    const keys = sound.drumKeys.map((key) => {
      const keyProps = new Map<string, RuntimeValue>();
      keyProps.set('key', makeString(key.key));
      if (key.label) keyProps.set('label', makeString(key.label));
      if (key.group) keyProps.set('group', makeString(key.group));
      if (key.tags) keyProps.set('tags', makeArray(key.tags.map((t) => makeString(t))));
      return makeObject(keyProps);
    });
    props.set('drumKeys', makeArray(keys));
  }
  if (sound.vocal) {
    const vocalProps = new Map<string, RuntimeValue>();
    if (sound.vocal.lang) vocalProps.set('lang', makeString(sound.vocal.lang));
    if (sound.vocal.defaultLyricMode) vocalProps.set('defaultLyricMode', makeString(sound.vocal.defaultLyricMode));
    if (sound.vocal.preferredAlphabet) vocalProps.set('preferredAlphabet', makeString(sound.vocal.preferredAlphabet));
    if (sound.vocal.tags) vocalProps.set('tags', makeArray(sound.vocal.tags.map((t) => makeString(t))));
    if (sound.vocal.range) {
      vocalProps.set('range', makeRangeValue(makePitchValue(sound.vocal.range.low), makePitchValue(sound.vocal.range.high)));
    }
    props.set('vocal', makeObject(vocalProps));
  }
  if (sound.hints) props.set('hints', plainToValue(sound.hints));
  if (sound.ext) props.set('ext', plainToValue(sound.ext));
  return makeObject(props);
}

function tempoToObject(event: TempoEventValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('at', event.at as RuntimeValue);
  props.set('bpm', makeNumber(event.bpm));
  props.set('unit', makeRatValue(event.unit));
  return makeObject(props);
}

function meterToObject(event: MeterEventValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('at', event.at as RuntimeValue);
  props.set('numerator', makeNumber(event.numerator));
  props.set('denominator', makeNumber(event.denominator));
  return makeObject(props);
}

function markerToObject(event: MarkerEventValue): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('pos', event.pos as RuntimeValue);
  props.set('kind', makeString(event.kind));
  props.set('label', makeString(event.label));
  return makeObject(props);
}

function metaToObject(meta: ScoreValueData['meta']): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  if (meta.title) props.set('title', makeString(meta.title));
  if (meta.artist) props.set('artist', makeString(meta.artist));
  if (meta.album) props.set('album', makeString(meta.album));
  if (meta.copyright) props.set('copyright', makeString(meta.copyright));
  if (meta.ext) props.set('ext', plainToValue(meta.ext));
  return makeObject(props);
}

function curveToObject(curve: Curve): ObjectValue {
  const props = new Map<string, RuntimeValue>();
  props.set('kind', makeString(curve.kind));
  const points = curve.points.map((p) => {
    const pointProps = new Map<string, RuntimeValue>();
    pointProps.set('t', makeNumber(p.t));
    pointProps.set('v', makeNumber(p.v));
    return makeObject(pointProps);
  });
  props.set('points', makeArray(points));
  return makeObject(props);
}

function makeRangeValue(start: RuntimeValue, end: RuntimeValue): RangeValue {
  return { type: 'range', start, end };
}

function lyricSpanToValue(span: LyricSpan): RuntimeValue {
  const props = new Map<string, RuntimeValue>();
  props.set('kind', makeString(span.kind));
  if (span.text) props.set('text', makeString(span.text));
  if (span.wordPos) props.set('wordPos', makeString(span.wordPos));
  return makeObject(props);
}

function coerceMeta(value: RuntimeValue | undefined): ScoreValueData['meta'] {
  if (!value || value.type !== 'object') return {};
  const meta: ScoreValueData['meta'] = {};
  for (const [key, val] of value.props.entries()) {
    if (key === 'title' || key === 'artist' || key === 'album' || key === 'copyright') {
      meta[key] = expectString(val);
      continue;
    }
    if (key === 'ext' && val.type === 'object') {
      meta.ext = valueToPlain(val) as Record<string, unknown>;
      continue;
    }
    if (!meta.ext) meta.ext = {};
    meta.ext[key] = valueToPlain(val);
  }
  return meta;
}

function coerceTempoMap(value: RuntimeValue | undefined): TempoEventValue[] {
  if (!value || value.type === 'null') return [];
  if (value.type !== 'array') throw new Error('tempoMap must be an array');
  const events: TempoEventValue[] = [];
  for (const item of value.elements) {
    if (item.type !== 'object') continue;
    const at = coercePos(item.props.get('at'));
    const bpm = expectNumber(item.props.get('bpm'));
    const unitValue = item.props.get('unit');
    const unit = unitValue ? coerceRat(unitValue) : makeRat(1, 4);
    events.push({ at, bpm, unit });
  }
  return events;
}

function coerceMeterMap(value: RuntimeValue | undefined): MeterEventValue[] {
  if (!value || value.type === 'null') return [];
  if (value.type !== 'array') throw new Error('meterMap must be an array');
  const events: MeterEventValue[] = [];
  for (const item of value.elements) {
    if (item.type !== 'object') continue;
    const at = coercePos(item.props.get('at'));
    const numerator = expectNumber(item.props.get('numerator'));
    const denominator = expectNumber(item.props.get('denominator'));
    events.push({ at, numerator: Math.floor(numerator), denominator: Math.floor(denominator) });
  }
  return events;
}

function coerceSounds(value: RuntimeValue | undefined): SoundDeclValue[] {
  if (!value || value.type === 'null') return [];
  if (value.type !== 'array') throw new Error('sounds must be an array');
  const sounds: SoundDeclValue[] = [];
  for (const item of value.elements) {
    if (item.type !== 'object') continue;
    const id = expectString(item.props.get('id'));
    const kind = expectString(item.props.get('kind'));
    if (!isSoundKind(kind)) {
      throw new Error(`Unknown sound kind: ${kind}`);
    }
    const sound: SoundDeclValue = { id, kind };
    const label = item.props.get('label');
    if (label && label.type === 'string') sound.label = label.value;
    const family = item.props.get('family');
    if (family && family.type === 'string') sound.family = family.value;
    const tags = item.props.get('tags');
    if (tags) sound.tags = coerceStringArray(tags);
    const range = item.props.get('range');
    if (range) {
      const parsed = coercePitchRange(range);
      if (parsed) sound.range = parsed;
    }
    const transposition = item.props.get('transposition');
    if (transposition && transposition.type === 'number') {
      sound.transposition = Math.floor(transposition.value);
    }
    const drumKeys = item.props.get('drumKeys');
    if (drumKeys && drumKeys.type === 'array') {
      sound.drumKeys = drumKeys.elements
        .map((entry) => coerceDrumKey(entry))
        .filter((entry): entry is DrumKeyEntry => entry !== null);
    }
    const vocal = item.props.get('vocal');
    if (vocal && vocal.type === 'object') {
      sound.vocal = coerceVocal(vocal);
    }
    const hints = item.props.get('hints');
    if (hints) sound.hints = valueToPlain(hints) as Record<string, unknown>;
    const ext = item.props.get('ext');
    if (ext) sound.ext = valueToPlain(ext) as Record<string, unknown>;
    sounds.push(sound);
  }
  return sounds;
}

function coerceTracks(value: RuntimeValue | undefined): TrackValueData[] {
  if (!value || value.type === 'null') return [];
  if (value.type !== 'array') throw new Error('tracks must be an array');
  const tracks: TrackValueData[] = [];
  for (const item of value.elements) {
    if (item.type !== 'object') continue;
    const name = expectString(item.props.get('name'));
    const role = expectString(item.props.get('role'));
    if (!isTrackRole(role)) throw new Error(`Unknown track role: ${role}`);
    const sound = expectString(item.props.get('sound'));
    const placementsValue = item.props.get('placements');
    if (!placementsValue || placementsValue.type !== 'array') {
      throw new Error('track.placements must be an array');
    }
    const placements = placementsValue.elements.map((placement) => {
      if (placement.type !== 'object') {
        throw new Error('placement must be an object');
      }
      const at = coercePos(placement.props.get('at'));
      const clip = coerceClip(expectValue(placement.props.get('clip'), 'clip'));
      return { at, clip };
    });
    const track: TrackValueData = { name, role, sound, placements };
    const mixValue = item.props.get('mix');
    if (mixValue && mixValue.type === 'object') {
      const mix: TrackValueData['mix'] = {};
      const gain = mixValue.props.get('gain');
      const pan = mixValue.props.get('pan');
      if (gain && gain.type === 'number') mix.gain = gain.value;
      if (pan && pan.type === 'number') mix.pan = pan.value;
      track.mix = mix;
    }
    tracks.push(track);
  }
  return tracks;
}

function coerceMarkers(value: RuntimeValue | undefined): MarkerEventValue[] {
  if (!value || value.type === 'null') return [];
  if (value.type !== 'array') throw new Error('markers must be an array');
  const markers: MarkerEventValue[] = [];
  for (const item of value.elements) {
    if (item.type !== 'object') continue;
    const pos = coercePos(item.props.get('pos'));
    const kind = expectString(item.props.get('kind'));
    const label = expectString(item.props.get('label'));
    markers.push({ type: 'marker', pos, kind, label });
  }
  return markers;
}

function coerceEvent(obj: ObjectValue): ClipEventValue {
  const typeValue = obj.props.get('type');
  if (!typeValue || typeValue.type !== 'string') {
    throw new Error('Event missing type');
  }
  const type = typeValue.value;
  if (type === 'marker') {
    const pos = coercePos(obj.props.get('pos'));
    const kind = expectString(obj.props.get('kind'));
    const label = expectString(obj.props.get('label'));
    return { type: 'marker', pos, kind, label };
  }
  if (type === 'automation') {
    const start = coercePos(obj.props.get('start'));
    const end = coercePos(obj.props.get('end'));
    const param = expectString(obj.props.get('param'));
    const curveValue = expectValue(obj.props.get('curve'), 'curve');
    const curve = coerceCurve(curveValue);
    const event: ClipEventValue = { type: 'automation', start, end, param, curve };
    const ext = obj.props.get('ext');
    if (ext) event.ext = valueToPlain(ext) as Record<string, unknown>;
    return event;
  }
  const start = coercePos(obj.props.get('start'));
  const durValue = obj.props.get('dur');
  const dur = durValue ? coerceRat(durValue) : ratFromInt(0);
  if (type === 'note') {
    const pitch = coercePitch(expectValue(obj.props.get('pitch'), 'pitch'));
    const event: any = { type: 'note', start, dur, pitch };
    applyEventExtras(event, obj);
    return event;
  }
  if (type === 'chord') {
    const pitchesValue = expectValue(obj.props.get('pitches'), 'pitches');
    const pitches = coercePitchArray(pitchesValue);
    const event: any = { type: 'chord', start, dur, pitches };
    applyEventExtras(event, obj);
    return event;
  }
  if (type === 'drumHit') {
    const key = expectString(obj.props.get('key'));
    const event: any = { type: 'drumHit', start, dur, key };
    applyEventExtras(event, obj);
    return event;
  }
  if (type === 'breath') {
    const intensityValue = obj.props.get('intensity');
    const intensity = intensityValue && intensityValue.type === 'number' ? intensityValue.value : 0.6;
    const event: ClipEventValue = { type: 'breath', start, dur, intensity };
    const ext = obj.props.get('ext');
    if (ext) event.ext = valueToPlain(ext) as Record<string, unknown>;
    return event;
  }
  if (type === 'control') {
    const kind = expectString(obj.props.get('kind'));
    const dataValue = obj.props.get('data');
    const data = dataValue ? (valueToPlain(dataValue) as Record<string, unknown>) : {};
    const event: ClipEventValue = { type: 'control', start, kind, data };
    const ext = obj.props.get('ext');
    if (ext) event.ext = valueToPlain(ext) as Record<string, unknown>;
    return event;
  }
  throw new Error(`Unknown event type: ${type}`);
}

function applyEventExtras(event: any, obj: ObjectValue): void {
  const velocity = obj.props.get('velocity');
  if (velocity && velocity.type === 'number') event.velocity = velocity.value;
  const voice = obj.props.get('voice');
  if (voice && voice.type === 'number') event.voice = Math.floor(voice.value);
  const techniques = obj.props.get('techniques');
  if (techniques) event.techniques = coerceStringArray(techniques);
  const lyric = obj.props.get('lyric');
  if (lyric && lyric.type !== 'null') event.lyric = coerceLyricSpan(lyric);
  const ext = obj.props.get('ext');
  if (ext) event.ext = valueToPlain(ext) as Record<string, unknown>;
}

export function coerceLyricSpan(value: RuntimeValue): LyricSpan {
  if (value.type === 'string') {
    return { kind: 'syllable', text: value.value };
  }
  if (value.type === 'object') {
    const kindValue = value.props.get('kind');
    const kind = kindValue && kindValue.type === 'string' ? kindValue.value : 'syllable';
    if (kind === 'extend') return { kind: 'extend' };
    const textValue = value.props.get('text');
    const wordPosValue = value.props.get('wordPos');
    const span: LyricSpan = { kind: 'syllable' };
    if (textValue && textValue.type === 'string') span.text = textValue.value;
    if (wordPosValue && wordPosValue.type === 'string') {
      span.wordPos = wordPosValue.value as LyricSpan['wordPos'];
    }
    return span;
  }
  if (value.type === 'lyricToken') {
    return value.token.kind === 'extend'
      ? { kind: 'extend' }
      : { kind: 'syllable', text: value.token.text };
  }
  throw new Error('Invalid lyric span');
}

export function coerceCurve(value: RuntimeValue): Curve {
  if (value.type === 'curve') return value.curve;
  if (value.type !== 'object') throw new Error('curve must be an object');
  const kindValue = value.props.get('kind');
  const kind = kindValue && kindValue.type === 'string' ? kindValue.value : 'piecewiseLinear';
  if (kind !== 'piecewiseLinear') {
    throw new Error(`Unknown curve kind: ${kind}`);
  }
  const pointsValue = value.props.get('points');
  if (!pointsValue || pointsValue.type !== 'array') {
    throw new Error('curve.points must be an array');
  }
  const points: Curve['points'] = [];
  for (const item of pointsValue.elements) {
    if (item.type === 'array' && item.elements.length >= 2) {
      const t = expectNumber(item.elements[0]);
      const v = expectNumber(item.elements[1]);
      points.push({ t, v });
      continue;
    }
    if (item.type === 'object') {
      const t = expectNumber(item.props.get('t'));
      const v = expectNumber(item.props.get('v'));
      points.push({ t, v });
    }
  }
  return { kind: 'piecewiseLinear', points };
}

function coercePitchRange(value: RuntimeValue): SoundDeclValue['range'] | null {
  if (value.type === 'range') {
    const low = coercePitch(value.start);
    const high = coercePitch(value.end);
    return { low, high };
  }
  if (value.type === 'object') {
    const lowValue = value.props.get('low');
    const highValue = value.props.get('high');
    if (lowValue && highValue) {
      return { low: coercePitch(lowValue), high: coercePitch(highValue) };
    }
  }
  return null;
}

function coerceDrumKey(value: RuntimeValue): DrumKeyEntry | null {
  if (value.type === 'string') {
    return { key: value.value };
  }
  if (value.type !== 'object') return null;
  const keyValue = value.props.get('key');
  if (!keyValue || keyValue.type !== 'string') return null;
  const entry: DrumKeyEntry = { key: keyValue.value };
  const label = value.props.get('label');
  if (label && label.type === 'string') entry.label = label.value;
  const group = value.props.get('group');
  if (group && group.type === 'string') entry.group = group.value;
  const tags = value.props.get('tags');
  if (tags) entry.tags = coerceStringArray(tags);
  return entry;
}

function coerceVocal(value: ObjectValue): SoundDeclValue['vocal'] {
  const vocal: SoundDeclValue['vocal'] = {};
  const lang = value.props.get('lang');
  if (lang && lang.type === 'string') vocal.lang = lang.value;
  const mode = value.props.get('defaultLyricMode');
  if (mode && mode.type === 'string') {
    if (mode.value === 'text' || mode.value === 'syllables' || mode.value === 'phonemes') {
      vocal.defaultLyricMode = mode.value;
    }
  }
  const alphabet = value.props.get('preferredAlphabet');
  if (alphabet && alphabet.type === 'string') vocal.preferredAlphabet = alphabet.value;
  const tags = value.props.get('tags');
  if (tags) vocal.tags = coerceStringArray(tags);
  const range = value.props.get('range');
  if (range) {
    const parsed = coercePitchRange(range);
    if (parsed) vocal.range = parsed;
  }
  return vocal;
}

function coercePitchArray(value: RuntimeValue): Array<{ midi: number; cents: number }> {
  if (value.type !== 'array') throw new Error('Expected pitch array');
  return value.elements.map((el) => coercePitch(el));
}

function coerceStringArray(value: RuntimeValue): string[] {
  if (value.type === 'array') {
    return value.elements.map((el) => expectString(el));
  }
  if (value.type === 'string') return [value.value];
  return [];
}

function coercePitch(value: RuntimeValue): { midi: number; cents: number } {
  if (value.type === 'pitch') return value.value;
  if (value.type === 'object') {
    const midi = value.props.get('midi');
    const cents = value.props.get('cents');
    if (midi && cents && midi.type === 'number' && cents.type === 'number') {
      return { midi: Math.floor(midi.value), cents: cents.value };
    }
  }
  throw new Error('Expected pitch');
}

function coercePos(value: RuntimeValue | undefined): PosValue {
  if (!value) throw new Error('Expected position');
  if (value.type === 'pos') return value;
  if (value.type === 'rat') return makePosValue(value.value);
  if (value.type === 'number' && Number.isInteger(value.value)) {
    return makePosValue(ratFromInt(value.value));
  }
  if (value.type === 'object') {
    const kindValue = value.props.get('kind');
    if (!kindValue || kindValue.type !== 'string') {
      throw new Error('Invalid position object');
    }
    if (kindValue.value === 'posref') {
      const bar = expectNumber(value.props.get('bar'));
      const beat = expectNumber(value.props.get('beat'));
      return makePosValue(makePosRef(Math.floor(bar), Math.floor(beat)));
    }
    if (kindValue.value === 'posexpr') {
      const baseValue = value.props.get('base');
      const offsetValue = value.props.get('offset');
      const base = coercePos(baseValue);
      if (!isPosRef(base.value)) {
        throw new Error('posexpr.base must be a posref');
      }
      const offset = coerceRat(expectValue(offsetValue, 'offset'));
      return makePosValue(makePosExpr(base.value, offset));
    }
    if (kindValue.value === 'pos') {
      const ratValue = value.props.get('rat');
      const rat = coerceRat(expectValue(ratValue, 'rat'));
      return makePosValue(rat);
    }
  }
  throw new Error('Expected position');
}

function coerceRat(value: RuntimeValue): Rat {
  if (value.type === 'rat') return value.value;
  if (value.type === 'number' && Number.isInteger(value.value)) {
    return ratFromInt(value.value);
  }
  if (value.type === 'object') {
    const nValue = value.props.get('n');
    const dValue = value.props.get('d');
    if (nValue && dValue && nValue.type === 'number' && dValue.type === 'number') {
      return makeRat(Math.floor(nValue.value), Math.floor(dValue.value));
    }
  }
  throw new Error('Expected rational');
}

function expectNumber(value: RuntimeValue | undefined): number {
  if (!value) throw new Error('Expected number');
  if (value.type === 'number') return value.value;
  if (value.type === 'rat') return value.value.n / value.value.d;
  throw new Error('Expected number');
}

function expectString(value: RuntimeValue | undefined): string {
  if (!value) throw new Error('Expected string');
  if (value.type === 'string') return value.value;
  throw new Error('Expected string');
}

function expectValue(value: RuntimeValue | undefined, label: string): RuntimeValue {
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

function valueToPlain(value: RuntimeValue): unknown {
  switch (value.type) {
    case 'number':
    case 'string':
    case 'bool':
      return value.value;
    case 'null':
      return null;
    case 'rat':
      return { n: value.value.n, d: value.value.d };
    case 'pitch':
      return { midi: value.value.midi, cents: value.value.cents };
    case 'array':
      return value.elements.map((el) => valueToPlain(el));
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const [key, val] of value.props.entries()) {
        obj[key] = valueToPlain(val);
      }
      return obj;
    }
    case 'range':
      return { start: valueToPlain(value.start), end: valueToPlain(value.end) };
    case 'pos':
      if (isRat(value.value)) return { n: value.value.n, d: value.value.d };
      if (isPosRef(value.value)) return { bar: value.value.bar, beat: value.value.beat };
      if (isPosExpr(value.value)) return { base: value.value.base, offset: value.value.offset };
      return 'pos';
    case 'curve':
    case 'clip':
    case 'score':
    case 'lyric':
    case 'lyricToken':
    case 'rng':
      return value.type;
    default:
      return value.type;
  }
}

function plainToValue(value: unknown): RuntimeValue {
  if (value === null || value === undefined) return makeNull();
  if (typeof value === 'number') return makeNumber(value);
  if (typeof value === 'string') return makeString(value);
  if (typeof value === 'boolean') return makeBool(value);
  if (Array.isArray(value)) {
    return makeArray(value.map((item) => plainToValue(item)));
  }
  if (typeof value === 'object') {
    const props = new Map<string, RuntimeValue>();
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      props.set(key, plainToValue(val));
    }
    return makeObject(props);
  }
  return makeNull();
}

function isSoundKind(kind: string): kind is SoundDeclValue['kind'] {
  return kind === 'instrument' || kind === 'drumKit' || kind === 'vocal' || kind === 'fx';
}

function isTrackRole(role: string): role is TrackValueData['role'] {
  return role === 'Instrument' || role === 'Drums' || role === 'Vocal' || role === 'Automation';
}
