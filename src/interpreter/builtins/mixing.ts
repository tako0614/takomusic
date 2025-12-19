// Mixing builtin functions: bus, send, stereoWidth

import type { Expression } from '../../types/ast.js';
import { RuntimeValue, makeNull, toNumber, isTruthy } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinBus(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const name = this.evaluate(args[0]);
  const busType = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'bus' };

  if (name.type !== 'string') {
    throw new MFError('TYPE', 'bus() name must be string', position, this.filePath);
  }

  if (!track.buses) {
    track.buses = [];
  }

  track.buses.push({
    id: name.value,
    name: name.value,
    type: (busType as any).value || 'bus',
    inputTracks: [],
    effects: [],
    volume: 1,
    pan: 0,
  });

  return makeNull();
}

export function builtinSend(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const toBus = this.evaluate(args[0]);
  const amount = toNumber(this.evaluate(args[1]));
  const preFader = args.length > 2 ? isTruthy(this.evaluate(args[2])) : false;

  if (toBus.type !== 'string') {
    throw new MFError('TYPE', 'send() toBus must be string', position, this.filePath);
  }

  if (!track.sends) {
    track.sends = [];
  }

  track.sends.push({
    type: 'send',
    tick: track.cursor,
    fromTrack: track.id,
    toBus: toBus.value,
    amount,
    preFader,
  });

  return makeNull();
}

export function builtinStereoWidth(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const width = toNumber(this.evaluate(args[0]));

  if (!track.stereoWidthEvents) {
    track.stereoWidthEvents = [];
  }

  track.stereoWidthEvents.push({
    type: 'stereoWidth',
    tick: track.cursor,
    width,
  });

  return makeNull();
}
