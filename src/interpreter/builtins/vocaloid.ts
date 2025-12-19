// Vocaloid builtin functions: vocaloidParam, vocaloidCurve, vibrato, portamento, growl, xsynth

import type { Expression } from '../../types/ast.js';
import type { VocaloidParamEvent, VocaloidParamType } from '../../types/ir.js';
import { RuntimeValue, makeNull, makeInt, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinVocaloidParam(
  this: any,
  args: Expression[],
  position: any,
  param: VocaloidParamType
): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', `${param.toLowerCase()}() only valid in vocal tracks`, position, this.filePath);
  }

  const value = this.evaluate(args[0]);
  if (value.type !== 'int') {
    throw new MFError('TYPE', `${param.toLowerCase()}() value must be int`, position, this.filePath);
  }

  if (!track.vocaloidParams) {
    track.vocaloidParams = [];
  }

  let minVal = 0, maxVal = 127;
  if (param === 'PIT') {
    minVal = -8192;
    maxVal = 8191;
  } else if (param === 'GEN') {
    minVal = -64;
    maxVal = 63;
  }

  if (value.value < minVal || value.value > maxVal) {
    throw new MFError('TYPE', `${param.toLowerCase()}() value out of range ${minVal}..${maxVal}`, position, this.filePath);
  }

  const event: VocaloidParamEvent = {
    type: 'vocaloidParam',
    param,
    tick: track.cursor,
    value: value.value,
  };
  track.vocaloidParams.push(event);
  return makeNull();
}

export function builtinVocaloidCurve(
  this: any,
  args: Expression[],
  position: any,
  param: VocaloidParamType
): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', `${param.toLowerCase()}Curve() only valid in vocal tracks`, position, this.filePath);
  }

  const startVal = this.evaluate(args[0]);
  const endVal = this.evaluate(args[1]);
  const dur = this.evaluate(args[2]);
  const steps = args.length >= 4 ? this.evaluate(args[3]) : makeInt(16);

  if (startVal.type !== 'int' || endVal.type !== 'int') {
    throw new MFError('TYPE', `${param.toLowerCase()}Curve() values must be int`, position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', `${param.toLowerCase()}Curve() duration must be Dur`, position, this.filePath);
  }

  if (!track.vocaloidParams) {
    track.vocaloidParams = [];
  }

  const durTicks = this.durToTicks(dur, position);
  const startTick = track.cursor;
  const numSteps = Math.max(2, (steps as any).value || 16);
  const tickStep = durTicks / (numSteps - 1);
  const valStep = (endVal.value - startVal.value) / (numSteps - 1);

  let minVal = 0, maxVal = 127;
  if (param === 'PIT') {
    minVal = -8192;
    maxVal = 8191;
  }

  for (let i = 0; i < numSteps; i++) {
    const tick = Math.round(startTick + tickStep * i);
    const value = Math.round(Math.min(maxVal, Math.max(minVal, startVal.value + valStep * i)));
    const event: VocaloidParamEvent = {
      type: 'vocaloidParam',
      param,
      tick,
      value,
    };
    track.vocaloidParams.push(event);
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinVibrato(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'vibrato() only valid in vocal tracks', position, this.filePath);
  }

  const depth = this.evaluate(args[0]);
  const rate = this.evaluate(args[1]);
  const dur = this.evaluate(args[2]);
  const delay = args.length >= 4 ? this.evaluate(args[3]) : makeInt(0);

  if (depth.type !== 'int' || rate.type !== 'int') {
    throw new MFError('TYPE', 'vibrato() depth and rate must be int', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'vibrato() duration must be Dur', position, this.filePath);
  }

  track.meta.vibratoDepth = Math.min(127, Math.max(0, depth.value));
  track.meta.vibratoRate = Math.min(127, Math.max(0, rate.value));
  track.meta.vibratoDelay = Math.min(100, Math.max(0, (delay as any).value || 0));

  return makeNull();
}

export function builtinPortamento(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'portamento() only valid in vocal tracks', position, this.filePath);
  }

  const dur = this.evaluate(args[0]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'portamento() duration must be Dur', position, this.filePath);
  }
  const durTicks = this.durToTicks(dur, position);

  if (!track.vocaloidParams) {
    track.vocaloidParams = [];
  }

  track.vocaloidParams.push({
    type: 'vocaloidParam',
    param: 'POR',
    tick: track.cursor,
    value: Math.min(127, Math.floor(durTicks / 10)),
  });

  return makeNull();
}

export function builtinGrowl(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'growl() only valid in vocal tracks', position, this.filePath);
  }

  const intensity = toNumber(this.evaluate(args[0]));
  if (intensity < 0 || intensity > 127) {
    throw new MFError('RANGE', 'growl() intensity must be 0-127', position, this.filePath);
  }

  if (!track.vocaloidParams) {
    track.vocaloidParams = [];
  }

  track.vocaloidParams.push({
    type: 'vocaloidParam',
    param: 'BRE',
    tick: track.cursor,
    value: intensity,
  });

  return makeNull();
}

export function builtinXSynth(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;
  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'xsynth() only valid in vocal tracks', position, this.filePath);
  }

  const voice1 = this.evaluate(args[0]);
  const voice2 = this.evaluate(args[1]);
  const balance = toNumber(this.evaluate(args[2]));

  if (voice1.type !== 'string' || voice2.type !== 'string') {
    throw new MFError('TYPE', 'xsynth() voices must be strings', position, this.filePath);
  }
  if (balance < 0 || balance > 127) {
    throw new MFError('RANGE', 'xsynth() balance must be 0-127', position, this.filePath);
  }

  track.meta.xsynth_voice1 = voice1.value;
  track.meta.xsynth_voice2 = voice2.value;
  track.meta.xsynth_balance = balance;

  return makeNull();
}
