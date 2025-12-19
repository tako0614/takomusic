// Live performance builtin functions: midiMap, scene, launchScene, liveLoop, punchIn, punchOut, loopRecord, cuePoint

import type { Expression } from '../../types/ast.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinMidiMap(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const ccNumber = Math.floor(toNumber(this.evaluate(args[0])));
  const target = this.evaluate(args[1]);
  const min = args.length > 2 ? toNumber(this.evaluate(args[2])) : 0;
  const max = args.length > 3 ? toNumber(this.evaluate(args[3])) : 127;

  if (target.type !== 'string') {
    throw new MFError('TYPE', 'midiMap() target must be string', position, this.filePath);
  }

  if (!track.midiMappings) {
    track.midiMappings = [];
  }

  track.midiMappings.push({
    type: 'midiMapping',
    ccNumber,
    target: target.value,
    min,
    max,
  });

  return makeNull();
}

export function builtinScene(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const sceneId = this.evaluate(args[0]);
  const sceneName = args.length > 1 ? this.evaluate(args[1]) : sceneId;

  if (sceneId.type !== 'string') {
    throw new MFError('TYPE', 'scene() id must be string', position, this.filePath);
  }

  if (!track.scenes) {
    track.scenes = [];
  }

  track.scenes.push({
    id: sceneId.value,
    name: sceneName.type === 'string' ? sceneName.value : sceneId.value,
    clips: [],
  });

  return makeNull();
}

export function builtinLaunchScene(this: any, args: Expression[], position: any): RuntimeValue {
  // Scene launching is a runtime/playback feature
  return makeNull();
}

export function builtinLiveLoop(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const loopId = this.evaluate(args[0]);
  const length = this.evaluate(args[1]);

  if (loopId.type !== 'string' || length.type !== 'dur') {
    throw new MFError('TYPE', 'liveLoop() requires string id and dur length', position, this.filePath);
  }

  const lengthTicks = this.durToTicks(length, position);
  // Live loop is a runtime feature
  return makeNull();
}

export function builtinPunchIn(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const preroll = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1;

  if (!track.punchPoints) {
    track.punchPoints = [];
  }

  track.punchPoints.push({
    type: 'punch',
    mode: 'in',
    tick: track.cursor,
    preroll,
    postroll: 0,
  });

  return makeNull();
}

export function builtinPunchOut(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const postroll = args.length > 0 ? toNumber(this.evaluate(args[0])) : 1;

  if (!track.punchPoints) {
    track.punchPoints = [];
  }

  track.punchPoints.push({
    type: 'punch',
    mode: 'out',
    tick: track.cursor,
    preroll: 0,
    postroll,
  });

  return makeNull();
}

export function builtinLoopRecord(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const dur = this.evaluate(args[0]);
  const mode = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'takes' };
  const countIn = args.length > 2 ? toNumber(this.evaluate(args[2])) : 1;
  const maxTakes = args.length > 3 ? toNumber(this.evaluate(args[3])) : undefined;

  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'loopRecord() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);

  if (!track.loopRecordings) {
    track.loopRecordings = [];
  }

  track.loopRecordings.push({
    type: 'loopRecording',
    startTick: track.cursor,
    endTick: track.cursor + durTicks,
    mode: (mode as any).value || 'takes',
    countIn,
    maxTakes,
  });

  return makeNull();
}

export function builtinCuePoint(this: any, args: Expression[], position: any): RuntimeValue {
  const name = this.evaluate(args[0]);
  if (name.type !== 'string') {
    throw new MFError('TYPE', 'cuePoint() name must be string', position, this.filePath);
  }

  const action = args.length > 1 ? this.evaluate(args[1]) : undefined;

  // Store cue point - would need song-level storage
  return makeNull();
}
