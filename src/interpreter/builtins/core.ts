// Core builtin functions: title, ppq, tempo, timeSig, at, advance, note, rest, chord, drum

import type { Expression } from '../../types/ast.js';
import type { NoteEvent, RestEvent } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError, createError } from '../../errors.js';
import { DRUM_MAP } from '../trackState.js';

// Using 'any' for 'this' to avoid circular dependency and private member issues

export function builtinTitle(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkGlobalPhase(position);
  const val = this.evaluate(args[0]);
  if (val.type !== 'string') {
    throw new MFError('TYPE', 'title() expects string', position, this.filePath);
  }
  this.ir.title = val.value;
  return makeNull();
}

export function builtinPpq(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkGlobalPhase(position);
  const val = this.evaluate(args[0]);
  if (val.type !== 'int') {
    throw new MFError('TYPE', 'ppq() expects int', position, this.filePath);
  }
  this.ir.ppq = val.value;
  return makeNull();
}

export function builtinTempo(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkGlobalPhase(position);

  if (args.length === 1) {
    // tempo(bpm)
    const bpm = this.evaluate(args[0]);
    const bpmVal = toNumber(bpm);
    this.ir.tempos.push({ tick: 0, bpm: bpmVal });
  } else {
    // tempo(time, bpm)
    const time = this.evaluate(args[0]);
    const bpm = this.evaluate(args[1]);
    if (time.type !== 'time') {
      throw new MFError('TYPE', 'tempo() time must be Time', position, this.filePath);
    }
    const tick = this.timeToTick(time, position);
    this.ir.tempos.push({ tick, bpm: toNumber(bpm) });
  }
  return makeNull();
}

export function builtinTimeSig(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkGlobalPhase(position);

  if (args.length === 2) {
    // timeSig(num, den)
    const num = this.evaluate(args[0]);
    const den = this.evaluate(args[1]);
    if (num.type !== 'int' || den.type !== 'int') {
      throw new MFError('TYPE', 'timeSig() expects int, int', position, this.filePath);
    }
    this.ir.timeSigs.push({ tick: 0, numerator: num.value, denominator: den.value });
  } else {
    // timeSig(time, num, den)
    const time = this.evaluate(args[0]);
    const num = this.evaluate(args[1]);
    const den = this.evaluate(args[2]);
    if (time.type !== 'time') {
      throw new MFError('TYPE', 'timeSig() time must be Time', position, this.filePath);
    }
    // Must be at bar start
    if (time.beat !== 1 || time.sub !== 0) {
      throw createError('E020', 'timeSig must be at bar start (beat=1, sub=0)', position, this.filePath);
    }
    const tick = this.timeToTick(time, position);
    if (num.type !== 'int' || den.type !== 'int') {
      throw new MFError('TYPE', 'timeSig() expects int, int', position, this.filePath);
    }
    this.ir.timeSigs.push({ tick, numerator: num.value, denominator: den.value });
  }
  return makeNull();
}

export function builtinAt(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const time = this.evaluate(args[0]);
  if (time.type !== 'time') {
    throw new MFError('TYPE', 'at() expects Time', position, this.filePath);
  }
  const tick = this.timeToTick(time, position);
  this.currentTrack!.cursor = tick;
  return makeNull();
}

export function builtinAtTick(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const tick = this.evaluate(args[0]);
  if (tick.type !== 'int') {
    throw new MFError('TYPE', 'atTick() expects int', position, this.filePath);
  }
  this.currentTrack!.cursor = tick.value;
  return makeNull();
}

export function builtinAdvance(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const dur = this.evaluate(args[0]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'advance() expects Dur', position, this.filePath);
  }
  const ticks = this.durToTicks(dur, position);
  this.currentTrack!.cursor += ticks;
  return makeNull();
}

export function builtinAdvanceTick(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const dt = this.evaluate(args[0]);
  if (dt.type !== 'int') {
    throw new MFError('TYPE', 'advanceTick() expects int', position, this.filePath);
  }
  this.currentTrack!.cursor += dt.value;
  return makeNull();
}

export function builtinNote(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'note() pitch must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'note() duration must be Dur', position, this.filePath);
  }

  // Validate pitch range
  if (pitch.midi < 0 || pitch.midi > 127) {
    throw createError('E110', `Pitch ${pitch.midi} out of range 0..127`, position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const tick = track.cursor;

  if (track.kind === 'vocal') {
    // Vocal needs lyric
    if (args.length < 3) {
      throw createError('E210', 'Vocal note requires lyric', position, this.filePath);
    }
    const lyric = this.evaluate(args[2]);
    if (lyric.type !== 'string' || lyric.value === '') {
      throw createError('E210', 'Vocal lyric must be non-empty string', position, this.filePath);
    }

    // Check for overlap
    this.checkVocalOverlap(track, tick, durTicks, position);

    const event: NoteEvent = {
      type: 'note',
      tick,
      dur: durTicks,
      key: pitch.midi,
      lyric: lyric.value,
    };
    track.events.push(event);
  } else {
    // MIDI track
    const vel = args.length >= 3
      ? toNumber(this.evaluate(args[2]))
      : track.defaultVel ?? 96;

    const event: NoteEvent = {
      type: 'note',
      tick,
      dur: durTicks,
      key: pitch.midi,
      vel,
    };
    track.events.push(event);
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinRest(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const dur = this.evaluate(args[0]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'rest() expects Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const tick = track.cursor;

  const event: RestEvent = {
    type: 'rest',
    tick,
    dur: durTicks,
  };
  track.events.push(event);

  track.cursor += durTicks;
  return makeNull();
}

export function builtinChord(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitchArr = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);

  if (pitchArr.type !== 'array') {
    throw new MFError('TYPE', 'chord() expects array of pitches', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'chord() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const tick = track.cursor;

  const vel = args.length >= 3
    ? toNumber(this.evaluate(args[2]))
    : track.defaultVel ?? 96;

  for (const p of pitchArr.elements) {
    if (p.type !== 'pitch') {
      throw new MFError('TYPE', 'chord() array must contain only Pitch', position, this.filePath);
    }
    if (p.midi < 0 || p.midi > 127) {
      throw createError('E110', `Pitch ${p.midi} out of range 0..127`, position, this.filePath);
    }
    const event: NoteEvent = {
      type: 'note',
      tick,
      dur: durTicks,
      key: p.midi,
      vel,
    };
    track.events.push(event);
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinDrum(this: any, args: Expression[], position: any, rawArgs: Expression[]): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  // Get drum name from raw AST to get the identifier name
  const drumNameExpr = rawArgs[0];
  let drumName: string;

  if (drumNameExpr.kind === 'Identifier') {
    drumName = drumNameExpr.name;
  } else if (drumNameExpr.kind === 'StringLiteral') {
    drumName = drumNameExpr.value;
  } else {
    const evaluated = this.evaluate(drumNameExpr);
    if (evaluated.type === 'string') {
      drumName = evaluated.value;
    } else {
      throw new MFError('TYPE', 'drum() expects drum name identifier or string', position, this.filePath);
    }
  }

  const dur = this.evaluate(args[1]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'drum() duration must be Dur', position, this.filePath);
  }

  const midiNote = DRUM_MAP[drumName];
  if (midiNote === undefined) {
    throw createError('E110', `Unknown drum name: ${drumName}`, position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const tick = track.cursor;

  const vel = args.length >= 3
    ? toNumber(this.evaluate(args[2]))
    : track.defaultVel ?? 96;

  const event: NoteEvent = {
    type: 'note',
    tick,
    dur: durTicks,
    key: midiNote,
    vel,
  };
  track.events.push(event);

  track.cursor += durTicks;
  return makeNull();
}
