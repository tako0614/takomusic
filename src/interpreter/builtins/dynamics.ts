// Dynamics builtin functions: dynamic, crescendo, decrescendo, articulations

import type { Expression } from '../../types/ast.js';
import type { DynamicEvent, CrescendoEvent, DynamicMark, Articulation } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

export function builtinDynamic(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const markExpr = args[0];
  let markStr: string;

  if (markExpr.kind === 'Identifier') {
    markStr = markExpr.name;
  } else {
    const mark = this.evaluate(args[0]);
    if (mark.type !== 'string') {
      throw new MFError('TYPE', 'dynamic() mark must be string or identifier', position, this.filePath);
    }
    markStr = mark.value;
  }

  const validMarks = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fp'];
  if (!validMarks.includes(markStr)) {
    throw new MFError('TYPE', `Unknown dynamic mark: ${markStr}. Valid: ${validMarks.join(', ')}`, position, this.filePath);
  }

  if (!track.notation) {
    track.notation = { dynamics: [], slurs: [], crescendos: [], ties: [], hairpins: [], articulations: [] };
  }

  const event: DynamicEvent = {
    type: 'dynamic',
    tick: track.cursor,
    mark: markStr as DynamicMark,
  };
  track.notation.dynamics.push(event);
  return makeNull();
}

export function builtinCrescendo(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const dur = this.evaluate(args[0]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'crescendo() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);

  if (!track.notation) {
    track.notation = { dynamics: [], slurs: [], crescendos: [], ties: [], hairpins: [], articulations: [] };
  }

  const event: CrescendoEvent = {
    type: 'crescendo',
    tick: track.cursor,
    endTick: track.cursor + durTicks,
  };
  track.notation.crescendos.push(event);
  return makeNull();
}

export function builtinDecrescendo(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const dur = this.evaluate(args[0]);
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'decrescendo() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);

  if (!track.notation) {
    track.notation = { dynamics: [], slurs: [], crescendos: [], ties: [], hairpins: [], articulations: [] };
  }

  const event: CrescendoEvent = {
    type: 'decrescendo',
    tick: track.cursor,
    endTick: track.cursor + durTicks,
  };
  track.notation.crescendos.push(event);
  return makeNull();
}

export function builtinArticulatedNote(
  this: any,
  args: Expression[],
  position: any,
  articulation: Articulation
): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  // Set articulation for next note
  if (!track.notation) {
    track.notation = { dynamics: [], slurs: [], crescendos: [], ties: [], hairpins: [], articulations: [] };
  }

  track.notation.articulations.push({
    type: 'articulation',
    tick: track.cursor,
    kind: articulation,
  });

  return makeNull();
}
