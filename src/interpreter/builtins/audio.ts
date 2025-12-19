// Audio manipulation builtin functions: audioClip, timeStretch, pitchShift, sampleSlicer, granular, automationLane, automationPoint

import type { Expression } from '../../types/ast.js';
import type { AudioClipEvent, AutomationCurveType } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber, isTruthy } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinAudioClip(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const filePath = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);

  if (filePath.type !== 'string') {
    throw new MFError('TYPE', 'audioClip() path must be string', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'audioClip() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const gain = args.length > 2 ? toNumber(this.evaluate(args[2])) / 127 : 1.0;
  const pan = args.length > 3 ? (toNumber(this.evaluate(args[3])) - 64) / 64 : 0;

  if (!track.audioClips) {
    track.audioClips = [];
  }

  const event: AudioClipEvent = {
    type: 'audioClip',
    tick: track.cursor,
    filePath: filePath.value,
    duration: durTicks,
    gain,
    pan,
  };

  track.audioClips.push(event);
  track.cursor += durTicks;
  return makeNull();
}

export function builtinTimeStretch(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const clipId = this.evaluate(args[0]);
  const ratio = this.evaluate(args[1]);
  const preservePitch = args.length > 2 ? isTruthy(this.evaluate(args[2])) : true;
  const algorithm = args.length > 3 ? this.evaluate(args[3]) : { type: 'string', value: 'elastique' };

  if (clipId.type !== 'string') {
    throw new MFError('TYPE', 'timeStretch() clipId must be string', position, this.filePath);
  }

  if (!track.timeStretchEvents) {
    track.timeStretchEvents = [];
  }

  track.timeStretchEvents.push({
    type: 'timeStretch',
    tick: track.cursor,
    clipId: clipId.value,
    ratio: toNumber(ratio),
    preservePitch,
    algorithm: (algorithm as any).value || 'elastique',
  });

  return makeNull();
}

export function builtinPitchShift(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const clipId = this.evaluate(args[0]);
  const semitones = this.evaluate(args[1]);
  const cents = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
  const preserveFormants = args.length > 3 ? isTruthy(this.evaluate(args[3])) : true;

  if (clipId.type !== 'string') {
    throw new MFError('TYPE', 'pitchShift() clipId must be string', position, this.filePath);
  }

  if (!track.pitchShiftEvents) {
    track.pitchShiftEvents = [];
  }

  track.pitchShiftEvents.push({
    type: 'pitchShift',
    tick: track.cursor,
    clipId: clipId.value,
    semitones: toNumber(semitones),
    cents,
    preserveFormants,
  });

  return makeNull();
}

export function builtinSampleSlicer(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const clipId = this.evaluate(args[0]);
  const mode = this.evaluate(args[1]);
  const sensitivity = args.length > 2 ? toNumber(this.evaluate(args[2])) : 50;

  if (clipId.type !== 'string' || mode.type !== 'string') {
    throw new MFError('TYPE', 'sampleSlicer() requires string arguments', position, this.filePath);
  }

  if (!track.sampleSlicers) {
    track.sampleSlicers = [];
  }

  track.sampleSlicers.push({
    type: 'sampleSlicer',
    tick: track.cursor,
    clipId: clipId.value,
    slices: [],
    mode: mode.value as 'transient' | 'grid' | 'manual',
    sensitivity,
  });

  return makeNull();
}

export function builtinGranular(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const clipId = this.evaluate(args[0]);
  const grainSize = toNumber(this.evaluate(args[1]));
  const grainDensity = toNumber(this.evaluate(args[2]));
  const pos = args.length > 3 ? toNumber(this.evaluate(args[3])) : 0.5;

  if (clipId.type !== 'string') {
    throw new MFError('TYPE', 'granular() clipId must be string', position, this.filePath);
  }

  if (!track.granularSynths) {
    track.granularSynths = [];
  }

  track.granularSynths.push({
    type: 'granular',
    tick: track.cursor,
    clipId: clipId.value,
    grainSize,
    grainDensity,
    position: pos,
    positionRandom: 0,
    pitchRandom: 0,
    pan: 0,
    panRandom: 0,
  });

  return makeNull();
}

export function builtinAutomationLane(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const parameter = this.evaluate(args[0]);

  if (parameter.type !== 'string') {
    throw new MFError('TYPE', 'automationLane() parameter must be string', position, this.filePath);
  }

  if (!track.automationLanes) {
    track.automationLanes = [];
  }

  track.automationLanes.push({
    type: 'automationLane',
    parameter: parameter.value,
    points: [],
  });

  return makeNull();
}

export function builtinAutomationPoint(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const parameter = this.evaluate(args[0]);
  const value = toNumber(this.evaluate(args[1]));
  const curve = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'linear' };

  if (parameter.type !== 'string') {
    throw new MFError('TYPE', 'automationPoint() parameter must be string', position, this.filePath);
  }

  if (!track.automationLanes) {
    track.automationLanes = [];
  }

  let lane = track.automationLanes.find((l: any) => l.parameter === parameter.value);
  if (!lane) {
    lane = { type: 'automationLane', parameter: parameter.value, points: [] };
    track.automationLanes.push(lane);
  }

  lane.points.push({
    tick: track.cursor,
    value,
    curve: (curve as any).value as AutomationCurveType || 'linear',
  });

  return makeNull();
}
