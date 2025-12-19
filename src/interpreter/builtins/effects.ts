// Effects builtin functions: reverb, delay, eq, compressor, phaser, flanger, chorus, distortion, filter, sidechain, limiter, maximizer, eqBand

import type { Expression } from '../../types/ast.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinReverb(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const roomSize = args.length > 0 ? toNumber(this.evaluate(args[0])) / 127 : 0.5;
  const damping = args.length > 1 ? toNumber(this.evaluate(args[1])) / 127 : 0.5;
  const wetDry = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 0.3;

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'reverb',
    params: { roomSize, damping, wetDry },
  });

  return makeNull();
}

export function builtinDelay(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const time = args.length > 0 ? toNumber(this.evaluate(args[0])) : 250; // ms
  const feedback = args.length > 1 ? toNumber(this.evaluate(args[1])) / 127 : 0.4;
  const wetDry = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 0.3;

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'delay',
    params: { time, feedback, wetDry },
  });

  return makeNull();
}

export function builtinEQ(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const lowGain = args.length > 0 ? toNumber(this.evaluate(args[0])) - 64 : 0;
  const midGain = args.length > 1 ? toNumber(this.evaluate(args[1])) - 64 : 0;
  const highGain = args.length > 2 ? toNumber(this.evaluate(args[2])) - 64 : 0;

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'eq',
    params: { lowGain, midGain, highGain },
  });

  return makeNull();
}

export function builtinCompressor(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const threshold = args.length > 0 ? toNumber(this.evaluate(args[0])) : -20; // dB
  const ratio = args.length > 1 ? toNumber(this.evaluate(args[1])) : 4;
  const attack = args.length > 2 ? toNumber(this.evaluate(args[2])) : 10; // ms
  const release = args.length > 3 ? toNumber(this.evaluate(args[3])) : 100; // ms

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'compressor',
    params: { threshold, ratio, attack, release },
  });

  return makeNull();
}

export function builtinPhaser(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 0.5;
  const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
  const feedback = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
  const stages = args.length > 3 ? Math.floor(toNumber(this.evaluate(args[3]))) : 4;

  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'phaser',
    params: { rate, depth, feedback, stages },
  });

  return makeNull();
}

export function builtinFlanger(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 0.25;
  const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
  const feedback = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;
  const mix = args.length > 3 ? toNumber(this.evaluate(args[3])) : 50;

  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'flanger',
    params: { rate, depth, feedback, mix },
  });

  return makeNull();
}

export function builtinChorus(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const rate = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1.0;
  const depth = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
  const voices = args.length > 2 ? Math.floor(toNumber(this.evaluate(args[2]))) : 3;
  const mix = args.length > 3 ? toNumber(this.evaluate(args[3])) : 50;

  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'chorus',
    params: { rate, depth, voices, mix },
  });

  return makeNull();
}

export function builtinDistortion(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const drive = args.length > 0 ? toNumber(this.evaluate(args[0])) : 50;
  const tone = args.length > 1 ? toNumber(this.evaluate(args[1])) : 50;
  const mix = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'distortion',
    params: { drive, tone, mix },
  });

  return makeNull();
}

export function builtinFilter(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const filterType = this.evaluate(args[0]);
  const cutoff = args.length > 1 ? toNumber(this.evaluate(args[1])) : 1000;
  const resonance = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

  if (filterType.type !== 'string') {
    throw new MFError('TYPE', 'filter() type must be string', position, this.filePath);
  }

  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'filter',
    params: { filterType: filterType.value as any, cutoff, resonance },
  });

  return makeNull();
}

export function builtinSidechain(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const sourceTrack = this.evaluate(args[0]);
  const threshold = args.length > 1 ? toNumber(this.evaluate(args[1])) : -20;
  const ratio = args.length > 2 ? toNumber(this.evaluate(args[2])) : 4;
  const attack = args.length > 3 ? toNumber(this.evaluate(args[3])) : 10;
  const release = args.length > 4 ? toNumber(this.evaluate(args[4])) : 100;

  if (sourceTrack.type !== 'string') {
    throw new MFError('TYPE', 'sidechain() source must be string', position, this.filePath);
  }

  // Store as effect with sidechain params
  if (!track.effects) track.effects = [];
  track.effects.push({
    type: 'effect',
    effectType: 'compressor',
    params: { threshold, ratio, attack, release, sidechain: sourceTrack.value as any },
  });

  return makeNull();
}

export function builtinLimiter(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const threshold = toNumber(this.evaluate(args[0]));
  const ceiling = toNumber(this.evaluate(args[1]));
  const release = args.length > 2 ? toNumber(this.evaluate(args[2])) : 100;

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'limiter',
    params: { threshold, ceiling, release },
  });

  return makeNull();
}

export function builtinMaximizer(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const threshold = toNumber(this.evaluate(args[0]));
  const ceiling = toNumber(this.evaluate(args[1]));

  if (!track.effects) {
    track.effects = [];
  }

  track.effects.push({
    type: 'effect',
    effectType: 'limiter',
    params: { threshold, ceiling, release: 50, isMaximizer: 1 },
  });

  return makeNull();
}

export function builtinEQBand(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const freq = toNumber(this.evaluate(args[0]));
  const gain = toNumber(this.evaluate(args[1]));
  const q = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
  const bandType = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'peak' };

  if (track.linearPhaseEQs && track.linearPhaseEQs.length > 0) {
    const eq = track.linearPhaseEQs[track.linearPhaseEQs.length - 1];
    eq.bands.push({
      frequency: freq,
      gain,
      q,
      type: (bandType as any).value || 'peak',
    });
  }

  return makeNull();
}
