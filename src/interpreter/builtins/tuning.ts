// Tuning builtin functions: tuning, cents, quarterTone, pitchCorrection

import type { Expression } from '../../types/ast.js';
import type { TuningEvent, TuningSystem } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinTuning(this: any, args: Expression[], position: any): RuntimeValue {
  const system = this.evaluate(args[0]);
  if (system.type !== 'string') {
    throw new MFError('TYPE', 'tuning() expects string', position, this.filePath);
  }

  const baseFreq = args.length > 1 ? toNumber(this.evaluate(args[1])) : 440;

  const tuning: TuningEvent = {
    type: 'tuning',
    tick: this.currentTrack?.cursor ?? 0,
    system: system.value as TuningSystem,
    baseFreq,
  };

  if (this.currentTrack) {
    this.currentTrack.tuning = tuning;
  }

  return makeNull();
}

export function builtinCents(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const cents = toNumber(this.evaluate(args[0]));
  if (cents < -100 || cents > 100) {
    throw new MFError('RANGE', 'cents() value must be between -100 and 100', position, this.filePath);
  }
  this.currentTrack!.centsDeviation = cents;
  return makeNull();
}

export function builtinQuarterTone(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const direction = this.evaluate(args[0]);
  if (direction.type !== 'string' || (direction.value !== 'sharp' && direction.value !== 'flat')) {
    throw new MFError('TYPE', 'quarterTone() expects "sharp" or "flat"', position, this.filePath);
  }
  // Set cents deviation for quarter tone
  this.currentTrack!.centsDeviation = direction.value === 'sharp' ? 50 : -50;
  return makeNull();
}

export function builtinPitchCorrection(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const amount = toNumber(this.evaluate(args[0]));
  const dur = this.evaluate(args[1]);
  const speed = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'pitchCorrection() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  // Store as a special event in track events
  return makeNull();
}
