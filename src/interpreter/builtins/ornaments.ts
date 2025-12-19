// Ornaments builtin functions: trill, mordent, arpeggio, glissando, tremolo
// These functions generate actual MIDI note events for the ornaments

import type { Expression } from '../../types/ast.js';
import type { NoteEvent } from '../../types/ir.js';
import { RuntimeValue, makeNull, makeInt, makeBool, toNumber, isTruthy } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinTrill(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);
  const interval = args.length >= 3 ? this.evaluate(args[2]) : makeInt(2);

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'trill() pitch must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'trill() duration must be Dur', position, this.filePath);
  }
  if (interval.type !== 'int') {
    throw new MFError('TYPE', 'trill() interval must be int', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const trillNoteDur = Math.max(1, Math.floor(this.ir.ppq / 8));
  const upperPitch = pitch.midi + interval.value;
  const vel = track.defaultVel ?? 96;

  let currentTick = startTick;
  let isUpper = false;

  while (currentTick < startTick + durTicks) {
    const noteDur = Math.min(trillNoteDur, startTick + durTicks - currentTick);
    const event: NoteEvent = {
      type: 'note',
      tick: currentTick,
      dur: noteDur,
      key: isUpper ? upperPitch : pitch.midi,
      vel,
    };
    track.events.push(event);
    currentTick += trillNoteDur;
    isUpper = !isUpper;
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinMordent(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);
  const upper = args.length >= 3 ? this.evaluate(args[2]) : makeBool(true);

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'mordent() pitch must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'mordent() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const ornamentDur = Math.max(1, Math.floor(this.ir.ppq / 8));
  const auxPitch = pitch.midi + (isTruthy(upper) ? 2 : -2);
  const vel = track.defaultVel ?? 96;

  track.events.push({ type: 'note', tick: startTick, dur: ornamentDur, key: pitch.midi, vel });
  track.events.push({ type: 'note', tick: startTick + ornamentDur, dur: ornamentDur, key: auxPitch, vel });
  track.events.push({ type: 'note', tick: startTick + ornamentDur * 2, dur: durTicks - ornamentDur * 2, key: pitch.midi, vel });

  track.cursor += durTicks;
  return makeNull();
}

export function builtinArpeggio(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'arpeggio() only valid in MIDI tracks', position, this.filePath);
  }

  const pitches = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);
  const spread = args.length >= 3 ? this.evaluate(args[2]) : makeInt(Math.floor(this.ir.ppq / 8));

  if (pitches.type !== 'array') {
    throw new MFError('TYPE', 'arpeggio() pitches must be array', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'arpeggio() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const spreadTicks = (spread as any).value || Math.floor(this.ir.ppq / 8);
  const vel = track.defaultVel ?? 96;

  for (let i = 0; i < pitches.elements.length; i++) {
    const p = pitches.elements[i];
    if (p.type !== 'pitch') {
      throw new MFError('TYPE', 'arpeggio() elements must be Pitch', position, this.filePath);
    }
    const noteTick = startTick + i * spreadTicks;
    const noteDur = durTicks - i * spreadTicks;
    if (noteDur > 0) {
      track.events.push({ type: 'note', tick: noteTick, dur: noteDur, key: p.midi, vel });
    }
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinGlissando(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const startPitch = this.evaluate(args[0]);
  const endPitch = this.evaluate(args[1]);
  const dur = this.evaluate(args[2]);

  if (startPitch.type !== 'pitch' || endPitch.type !== 'pitch') {
    throw new MFError('TYPE', 'glissando() pitches must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'glissando() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const vel = track.defaultVel ?? 96;

  const startMidi = startPitch.midi;
  const endMidi = endPitch.midi;
  const direction = endMidi > startMidi ? 1 : -1;
  const numNotes = Math.abs(endMidi - startMidi) + 1;
  const noteDur = Math.max(1, Math.floor(durTicks / numNotes));

  for (let i = 0; i < numNotes; i++) {
    const pitch = startMidi + i * direction;
    const tick = startTick + i * noteDur;
    if (tick < startTick + durTicks) {
      track.events.push({ type: 'note', tick, dur: noteDur, key: pitch, vel });
    }
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinTremolo(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);
  const speed = args.length >= 3 ? this.evaluate(args[2]) : makeInt(32);

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'tremolo() pitch must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'tremolo() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const speedVal = (speed as any).value || 32;
  const noteDur = Math.max(1, Math.floor((this.ir.ppq * 4) / speedVal));
  const vel = track.defaultVel ?? 96;

  let currentTick = startTick;
  while (currentTick < startTick + durTicks) {
    const actualDur = Math.min(noteDur, startTick + durTicks - currentTick);
    track.events.push({ type: 'note', tick: currentTick, dur: actualDur, key: pitch.midi, vel });
    currentTick += noteDur;
  }

  track.cursor += durTicks;
  return makeNull();
}
