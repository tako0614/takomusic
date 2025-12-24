import { addRat, compareRat, ratFromInt } from '../rat.js';
import {
  ClipEventValue,
  ClipValueData,
  PosValue,
  isPosExpr,
  isPosRef,
  isRat,
  makePosExpr,
  makePosValue,
} from '../runtime.js';
import type { Rat } from '../rat.js';

export function shiftPosValue(pos: PosValue, offset: Rat): PosValue {
  if (isRat(pos.value)) {
    return makePosValue(addRat(pos.value, offset));
  }
  if (isPosRef(pos.value)) {
    return makePosValue(makePosExpr(pos.value, offset));
  }
  if (isPosExpr(pos.value)) {
    return makePosValue(makePosExpr(pos.value.base, addRat(pos.value.offset, offset)));
  }
  return pos;
}

export function shiftEvent(event: ClipEventValue, offset: Rat): ClipEventValue {
  switch (event.type) {
    case 'note':
      return { ...event, start: shiftPosValue(event.start, offset) };
    case 'chord':
      return { ...event, start: shiftPosValue(event.start, offset) };
    case 'drumHit':
      return { ...event, start: shiftPosValue(event.start, offset) };
    case 'control':
      return { ...event, start: shiftPosValue(event.start, offset) };
    case 'automation':
      return { ...event, start: shiftPosValue(event.start, offset), end: shiftPosValue(event.end, offset) };
    case 'marker':
      return { ...event, pos: shiftPosValue(event.pos, offset) };
    default:
      return event;
  }
}

export function clipLength(clip: ClipValueData): Rat | null {
  if (clip.length) return clip.length;
  let max: Rat | null = null;
  for (const event of clip.events) {
    const end = eventEndRat(event);
    if (!end) return null;
    if (!max || compareRat(end, max) > 0) {
      max = end;
    }
  }
  return max ?? ratFromInt(0);
}

function eventEndRat(event: ClipEventValue): Rat | null {
  switch (event.type) {
    case 'note':
    case 'chord':
    case 'drumHit': {
      const start = posToRat(event.start);
      if (!start) return null;
      return addRat(start, event.dur);
    }
    case 'control': {
      return posToRat(event.start);
    }
    case 'automation': {
      return posToRat(event.end);
    }
    case 'marker': {
      return posToRat(event.pos);
    }
    default:
      return null;
  }
}

function posToRat(pos: PosValue): Rat | null {
  if (isRat(pos.value)) return pos.value;
  return null;
}
