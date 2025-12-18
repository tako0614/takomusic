// MIDI builtin functions: cc, expression, modulation, pan, volume, sustain, pitchBend, aftertouch, nrpn, sysex

import type { Expression } from '../../types/ast.js';
import type { CCEvent, PitchBendEvent, AftertouchEvent, PolyAftertouchEvent, NRPNEvent, SysExEvent } from '../../types/ir.js';
import { RuntimeValue, makeNull, makeInt, toNumber } from '../runtime.js';
import { MFError, createError } from '../../errors.js';

// Using 'any' for 'this' to avoid circular dependency and private member issues

export function builtinCC(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'cc() only valid in MIDI tracks', position, this.filePath);
  }

  const controller = this.evaluate(args[0]);
  const value = this.evaluate(args[1]);

  if (controller.type !== 'int') {
    throw new MFError('TYPE', 'cc() controller must be int', position, this.filePath);
  }
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'cc() value must be int', position, this.filePath);
  }

  if (controller.value < 0 || controller.value > 127) {
    throw createError('E120', `CC controller ${controller.value} out of range 0..127`, position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `CC value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: controller.value,
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinExpression(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'expression() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'expression() value must be int', position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `expression value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: 11, // CC11 = Expression
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinModulation(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'modulation() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'modulation() value must be int', position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `modulation value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: 1, // CC1 = Modulation
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinPan(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'pan() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'pan() value must be int', position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `pan value ${value.value} out of range 0..127 (64=center)`, position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: 10, // CC10 = Pan
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinVolume(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'volume() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'volume() value must be int', position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `volume value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: 7, // CC7 = Volume
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinSustain(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'sustain() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'bool') {
    throw new MFError('TYPE', 'sustain() expects bool (true/false)', position, this.filePath);
  }

  const event: CCEvent = {
    type: 'cc',
    tick: track.cursor,
    controller: 64, // CC64 = Sustain Pedal
    value: value.value ? 127 : 0,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinPitchBend(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'pitchBend() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'pitchBend() value must be int', position, this.filePath);
  }
  if (value.value < -8192 || value.value > 8191) {
    throw createError('E122', `pitchBend value ${value.value} out of range -8192..8191`, position, this.filePath);
  }

  const event: PitchBendEvent = {
    type: 'pitchBend',
    tick: track.cursor,
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinAftertouch(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'aftertouch() only valid in MIDI tracks', position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'aftertouch() value must be int', position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `aftertouch value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: AftertouchEvent = {
    type: 'aftertouch',
    tick: track.cursor,
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinPolyAftertouch(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'polyAftertouch() only valid in MIDI tracks', position, this.filePath);
  }

  const key = this.evaluate(args[0]);
  const value = this.evaluate(args[1]);

  if (key.type !== 'int' && key.type !== 'pitch') {
    throw new MFError('TYPE', 'polyAftertouch() key must be int or Pitch', position, this.filePath);
  }
  if (value.type !== 'int') {
    throw new MFError('TYPE', 'polyAftertouch() value must be int', position, this.filePath);
  }

  const keyVal = key.type === 'pitch' ? key.midi : key.value;
  if (keyVal < 0 || keyVal > 127) {
    throw createError('E110', `polyAftertouch key ${keyVal} out of range 0..127`, position, this.filePath);
  }
  if (value.value < 0 || value.value > 127) {
    throw createError('E121', `polyAftertouch value ${value.value} out of range 0..127`, position, this.filePath);
  }

  const event: PolyAftertouchEvent = {
    type: 'polyAftertouch',
    tick: track.cursor,
    key: keyVal,
    value: value.value,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinNRPN(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'nrpn() only valid in MIDI tracks', position, this.filePath);
  }

  const paramMSB = this.evaluate(args[0]);
  const paramLSB = this.evaluate(args[1]);
  const valueMSB = this.evaluate(args[2]);
  const valueLSB = args.length >= 4 ? this.evaluate(args[3]) : null;

  if (paramMSB.type !== 'int' || paramLSB.type !== 'int' || valueMSB.type !== 'int') {
    throw new MFError('TYPE', 'nrpn() parameters must be int', position, this.filePath);
  }

  const event: NRPNEvent = {
    type: 'nrpn',
    tick: track.cursor,
    paramMSB: paramMSB.value,
    paramLSB: paramLSB.value,
    valueMSB: valueMSB.value,
    valueLSB: valueLSB && valueLSB.type === 'int' ? valueLSB.value : undefined,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinRPN(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'rpn() only valid in MIDI tracks', position, this.filePath);
  }

  const paramMSB = this.evaluate(args[0]);
  const paramLSB = this.evaluate(args[1]);
  const valueMSB = this.evaluate(args[2]);

  if (paramMSB.type !== 'int' || paramLSB.type !== 'int' || valueMSB.type !== 'int') {
    throw new MFError('TYPE', 'rpn() parameters must be int', position, this.filePath);
  }

  // RPN uses CC 101 (MSB), 100 (LSB), 6 (Data Entry)
  const ccEvents: CCEvent[] = [
    { type: 'cc', tick: track.cursor, controller: 101, value: paramMSB.value },
    { type: 'cc', tick: track.cursor, controller: 100, value: paramLSB.value },
    { type: 'cc', tick: track.cursor, controller: 6, value: valueMSB.value },
  ];
  track.events.push(...ccEvents);
  return makeNull();
}

export function builtinSysEx(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'midi') {
    throw new MFError('TYPE', 'sysex() only valid in MIDI tracks', position, this.filePath);
  }

  const data = this.evaluate(args[0]);
  if (data.type !== 'array') {
    throw new MFError('TYPE', 'sysex() expects array of int bytes', position, this.filePath);
  }

  const bytes: number[] = [];
  for (const el of data.elements) {
    if (el.type !== 'int') {
      throw new MFError('TYPE', 'sysex() array must contain only int', position, this.filePath);
    }
    if (el.value < 0 || el.value > 127) {
      throw createError('E121', `sysex byte ${el.value} out of range 0..127`, position, this.filePath);
    }
    bytes.push(el.value);
  }

  const event: SysExEvent = {
    type: 'sysex',
    tick: track.cursor,
    data: bytes,
  };
  track.events.push(event);
  return makeNull();
}

export function builtinTempoCurve(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkGlobalPhase(position);

  const startTime = this.evaluate(args[0]);
  const endTime = this.evaluate(args[1]);
  const startBpm = this.evaluate(args[2]);
  const endBpm = this.evaluate(args[3]);
  const steps = args.length >= 5 ? this.evaluate(args[4]) : makeInt(16);

  if (startTime.type !== 'time') {
    throw new MFError('TYPE', 'tempoCurve() startTime must be Time', position, this.filePath);
  }
  if (endTime.type !== 'time') {
    throw new MFError('TYPE', 'tempoCurve() endTime must be Time', position, this.filePath);
  }
  if (steps.type !== 'int') {
    throw new MFError('TYPE', 'tempoCurve() steps must be int', position, this.filePath);
  }

  const startTick = this.timeToTick(startTime, position);
  const endTick = this.timeToTick(endTime, position);
  const startBpmVal = toNumber(startBpm);
  const endBpmVal = toNumber(endBpm);
  const numSteps = steps.value;

  if (numSteps < 2) {
    throw createError('E123', 'tempoCurve() steps must be at least 2', position, this.filePath);
  }

  // Generate tempo points with linear interpolation
  const tickStep = (endTick - startTick) / (numSteps - 1);
  const bpmStep = (endBpmVal - startBpmVal) / (numSteps - 1);

  for (let i = 0; i < numSteps; i++) {
    const tick = Math.round(startTick + tickStep * i);
    const bpm = startBpmVal + bpmStep * i;
    this.ir.tempos.push({ tick, bpm });
  }

  return makeNull();
}
