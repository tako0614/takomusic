import { addRat, compareRat, makeRat, mulRat, ratFromInt } from './rat.js';
import type { Rat } from './rat.js';
import type { ScoreIR, TempoEvent, MeterEvent, Track, Placement, Clip, Event, MarkerEvent } from './ir.js';
import type { Diagnostic } from './diagnostics.js';
import {
  ClipEventValue,
  ClipValueData,
  MarkerEventValue,
  MeterEventValue,
  PosValue,
  ScoreValueData,
  TempoEventValue,
  TrackValueData,
  isPosExpr,
  isPosRef,
  isRat,
} from './runtime.js';

type ResolvedMeterEvent = { at: Rat; numerator: number; denominator: number };

export function normalizeScore(score: ScoreValueData, diagnostics: Diagnostic[]): ScoreIR {
  const meterMap = resolveMeterMap(score.meterMap, diagnostics);
  const tempoMap = resolveTempoMap(score.tempoMap, meterMap, diagnostics);

  const tracks = score.tracks.map((track) => normalizeTrack(track, meterMap, diagnostics));

  const ir: ScoreIR = {
    tako: {
      irVersion: 3,
      generator: 'takomusic',
    },
    meta: score.meta,
    tempoMap,
    meterMap: meterMap.map((m) => ({ at: m.at, numerator: m.numerator, denominator: m.denominator })),
    sounds: score.sounds,
    tracks,
    markers: score.markers.map((m) => normalizeMarker(m, meterMap, diagnostics)),
  };

  validateMaps(ir, diagnostics);
  return ir;
}

function resolveMeterMap(events: MeterEventValue[], diagnostics: Diagnostic[]): ResolvedMeterEvent[] {
  const resolved: ResolvedMeterEvent[] = [];
  for (const event of events) {
    const at = resolvePosValue(event.at, resolved, diagnostics);
    resolved.push({ at, numerator: event.numerator, denominator: event.denominator });
  }
  return resolved.sort((a, b) => compareRat(a.at, b.at));
}

function resolveTempoMap(events: TempoEventValue[], meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): TempoEvent[] {
  const resolved: TempoEvent[] = [];
  for (const event of events) {
    const at = resolvePosValue(event.at, meterMap, diagnostics);
    resolved.push({ at, bpm: event.bpm, unit: event.unit });
  }
  return resolved.sort((a, b) => compareRat(a.at, b.at));
}

function resolvePosValue(pos: PosValue, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): Rat {
  if (isRat(pos.value)) return pos.value;
  if (isPosExpr(pos.value)) {
    const base = resolvePosRef(pos.value.base, meterMap, diagnostics);
    return addRat(base, pos.value.offset);
  }
  if (isPosRef(pos.value)) {
    return resolvePosRef(pos.value, meterMap, diagnostics);
  }
  return makeRat(0, 1);
}

function resolvePosRef(ref: { bar: number; beat: number }, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): Rat {
  if (meterMap.length === 0) {
    if (ref.bar === 1 && ref.beat === 1) {
      return makeRat(0, 1);
    }
    diagnostics.push({ severity: 'error', message: 'meterMap is empty' });
    return makeRat(0, 1);
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

  if (ref.beat < 1 || ref.beat > current.numerator) {
    diagnostics.push({ severity: 'error', message: `beat ${ref.beat} out of range` });
  }

  const beatLen = makeRat(1, current.denominator);
  const offset = mulRat(beatLen, ratFromInt(ref.beat - 1));
  return addRat(currentPos, offset);
}

function normalizeTrack(track: TrackValueData, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): Track {
  const placements = track.placements.map((p) => normalizePlacement(p, meterMap, diagnostics));
  return {
    name: track.name,
    role: track.role,
    sound: track.sound,
    mix: track.mix,
    placements,
  };
}

function normalizePlacement(placement: any, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): Placement {
  return {
    at: resolvePosValue(placement.at, meterMap, diagnostics),
    clip: normalizeClip(placement.clip, meterMap, diagnostics),
  };
}

function normalizeClip(clip: ClipValueData, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): Clip {
  const events = clip.events.map((event, index) => normalizeEvent(event, meterMap, diagnostics, index));
  const sorted = stableSort(events, (a, b) => compareRat(eventPos(a), eventPos(b)));
  const length = clip.length ? clip.length : deriveClipLength(sorted, diagnostics);
  return {
    events: sorted,
    length,
  };
}

function normalizeEvent(event: ClipEventValue, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[], index: number): Event {
  switch (event.type) {
    case 'note':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
      };
    case 'chord':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
      };
    case 'drumHit':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
      };
    case 'breath':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
      };
    case 'control':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
      };
    case 'automation':
      return {
        ...event,
        start: resolvePosValue(event.start, meterMap, diagnostics),
        end: resolvePosValue(event.end, meterMap, diagnostics),
      };
    case 'marker':
      return normalizeMarker(event, meterMap, diagnostics);
    default:
      diagnostics.push({ severity: 'warning', message: `Unknown event type at ${index}` });
      return event as unknown as Event;
  }
}

function normalizeMarker(event: MarkerEventValue, meterMap: ResolvedMeterEvent[], diagnostics: Diagnostic[]): MarkerEvent {
  return {
    ...event,
    pos: resolvePosValue(event.pos, meterMap, diagnostics),
  };
}

function deriveClipLength(events: Event[], diagnostics: Diagnostic[]): Rat | undefined {
  let max: Rat | undefined;
  for (const event of events) {
    const end = eventEnd(event, diagnostics);
    if (!end) continue;
    if (!max || compareRat(end, max) > 0) {
      max = end;
    }
  }
  return max;
}

function eventEnd(event: Event, diagnostics: Diagnostic[]): Rat | null {
  switch (event.type) {
    case 'note':
    case 'chord':
    case 'drumHit':
    case 'breath': {
      if (event.dur.n < 0) diagnostics.push({ severity: 'error', message: 'Negative duration' });
      return addRat(event.start, event.dur);
    }
    case 'control':
      return event.start;
    case 'automation':
      return event.end;
    case 'marker':
      return event.pos;
    default:
      return null;
  }
}

function eventPos(event: Event): Rat {
  if ('start' in event) return (event as any).start as Rat;
  if ('pos' in event) return (event as any).pos as Rat;
  return ratFromInt(0);
}

function stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const cmp = compare(a.item, b.item);
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

function validateMaps(ir: ScoreIR, diagnostics: Diagnostic[]): void {
  if (ir.meterMap.length === 0) {
    diagnostics.push({ severity: 'error', message: 'meterMap is empty' });
  }
  if (ir.tempoMap.length === 0) {
    diagnostics.push({ severity: 'error', message: 'tempoMap is empty' });
  }
  if (!ir.meterMap.some((m) => m.at.n === 0)) {
    diagnostics.push({ severity: 'warning', message: 'meterMap missing at 0' });
  }
  if (!ir.tempoMap.some((t) => t.at.n === 0)) {
    diagnostics.push({ severity: 'warning', message: 'tempoMap missing at 0' });
  }
}
