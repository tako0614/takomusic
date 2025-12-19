// Notation builtin functions: tuplet, grace, fermata, repeats, ottava, voice, etc.

import type { Expression } from '../../types/ast.js';
import type { TupletInfo, GraceNoteEvent, FermataEvent, OttavaEvent } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber, isTruthy } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinTuplet(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const actual = toNumber(this.evaluate(args[0]));
  const normal = toNumber(this.evaluate(args[1]));

  if (actual < 2 || normal < 1) {
    throw new MFError('RANGE', 'tuplet() actual must be >= 2 and normal >= 1', position, this.filePath);
  }

  if (!track.tupletStack) {
    track.tupletStack = [];
  }

  const newTuplet: TupletInfo = { actual, normal };
  track.tupletStack.push(newTuplet);
  track.currentTuplet = newTuplet;

  return makeNull();
}

export function builtinTupletEnd(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.tupletStack && track.tupletStack.length > 0) {
    track.tupletStack.pop();
    track.currentTuplet = track.tupletStack.length > 0
      ? track.tupletStack[track.tupletStack.length - 1]
      : undefined;
  } else {
    track.currentTuplet = undefined;
  }

  return makeNull();
}

export function builtinTriplet(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (!track.tupletStack) {
    track.tupletStack = [];
  }

  const tripletTuplet: TupletInfo = { actual: 3, normal: 2 };
  track.tupletStack.push(tripletTuplet);
  track.currentTuplet = tripletTuplet;

  if (args.length > 0) {
    const callback = args[0];
    if (callback.kind === 'CallExpression') {
      this.evaluateCall(callback.callee, callback.arguments, position);
    }
    track.tupletStack.pop();
    track.currentTuplet = track.tupletStack.length > 0
      ? track.tupletStack[track.tupletStack.length - 1]
      : undefined;
  }

  return makeNull();
}

export function builtinGrace(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'grace() pitch must be Pitch', position, this.filePath);
  }

  const slash = args.length > 1 ? isTruthy(this.evaluate(args[1])) : true;
  const lyric = args.length > 2 ? this.evaluate(args[2]) : undefined;

  if (!track.graceNotes) {
    track.graceNotes = [];
  }

  const graceNote: GraceNoteEvent = {
    type: 'graceNote',
    tick: track.cursor,
    key: pitch.midi,
    slash,
    lyric: lyric?.type === 'string' ? lyric.value : undefined,
  };
  track.graceNotes.push(graceNote);
  return makeNull();
}

export function builtinAcciaccatura(this: any, args: Expression[], position: any): RuntimeValue {
  const pitch = this.evaluate(args[0]);
  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'acciaccatura() pitch must be Pitch', position, this.filePath);
  }
  return builtinGrace.call(this, [args[0], { kind: 'BoolLiteral', value: true } as any], position);
}

export function builtinAppoggiatura(this: any, args: Expression[], position: any): RuntimeValue {
  const pitch = this.evaluate(args[0]);
  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'appoggiatura() pitch must be Pitch', position, this.filePath);
  }
  return builtinGrace.call(this, [args[0], { kind: 'BoolLiteral', value: false } as any], position);
}

export function builtinFermata(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (!track.fermatas) {
    track.fermatas = [];
  }

  const shape = args.length > 0 ? this.evaluate(args[0]) : undefined;
  const shapeStr = shape?.type === 'string' ? shape.value : 'normal';

  const fermata: FermataEvent = {
    type: 'fermata',
    tick: track.cursor,
    shape: shapeStr as 'normal' | 'angled' | 'square',
  };
  track.fermatas.push(fermata);
  return makeNull();
}

export function builtinRepeatStart(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'start' });
  return makeNull();
}

export function builtinRepeatEnd(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'end' });
  return makeNull();
}

export function builtinDC(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'dc' });
  return makeNull();
}

export function builtinDS(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'ds' });
  return makeNull();
}

export function builtinFine(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'fine' });
  return makeNull();
}

export function builtinCoda(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'coda' });
  return makeNull();
}

export function builtinSegno(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'segno' });
  return makeNull();
}

export function builtinToCoda(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (!track.repeats) track.repeats = [];
  track.repeats.push({ type: 'repeat', tick: track.cursor, kind: 'toCoda' });
  return makeNull();
}

export function builtinOttava(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const shift = toNumber(this.evaluate(args[0]));
  track.currentOttava = { startTick: track.cursor, shift };

  return makeNull();
}

export function builtinOttavaEnd(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.currentOttava) {
    if (!track.ottavas) track.ottavas = [];
    const ottava: OttavaEvent = {
      type: 'ottava',
      tick: track.currentOttava.startTick,
      endTick: track.cursor,
      shift: track.currentOttava.shift,
    };
    track.ottavas.push(ottava);
    track.currentOttava = undefined;
  }

  return makeNull();
}

export function builtinVoice(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const voiceNum = toNumber(this.evaluate(args[0]));
  if (voiceNum < 1 || voiceNum > 4) {
    throw new MFError('RANGE', 'voice() number must be 1-4', position, this.filePath);
  }
  track.currentVoice = voiceNum;

  return makeNull();
}

export function builtinSlurStart(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  track.currentSlurStart = track.cursor;
  return makeNull();
}

export function builtinSlurEnd(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.currentSlurStart !== undefined) {
    if (!track.notation) {
      track.notation = { slurs: [], ties: [], dynamics: [], hairpins: [], articulations: [] };
    }
    track.notation.slurs.push({
      type: 'slur',
      startTick: track.currentSlurStart,
      endTick: track.cursor,
    });
    track.currentSlurStart = undefined;
  }

  return makeNull();
}

export function builtinTie(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (!track.notation) {
    track.notation = { slurs: [], ties: [], dynamics: [], hairpins: [], articulations: [] };
  }

  // Find the last note event at current cursor or before
  let lastNote = null;
  for (let i = track.events.length - 1; i >= 0; i--) {
    if (track.events[i].type === 'note') {
      lastNote = track.events[i];
      break;
    }
  }

  if (lastNote) {
    track.notation.ties.push({
      type: 'tie',
      startTick: lastNote.tick,
      endTick: track.cursor,
      key: (lastNote as any).key,
    });
  }

  return makeNull();
}
