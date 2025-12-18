// Builtin function types and context

import type { Expression } from '../../types/ast.js';
import type {
  SongIR,
  TrackEvent,
  NoteEvent,
  Articulation,
  VocaloidParamType,
  DynamicMark,
} from '../../types/ir.js';
import type { RuntimeValue } from '../runtime.js';
import type { TrackState } from '../trackState.js';

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface BuiltinContext {
  // Current state
  currentTrack: TrackState | null;
  ir: SongIR;
  filePath?: string;

  // Methods from Interpreter
  evaluate: (expr: Expression) => RuntimeValue;
  checkGlobalPhase: (position: Position) => void;
  checkTrackPhase: (position: Position) => void;
  timeToTick: (time: RuntimeValue, position: Position) => number;
  durToTicks: (dur: RuntimeValue, position: Position) => number;
  checkVocalOverlap: (track: TrackState, tick: number, dur: number, position: Position) => void;

  // State modification
  setCurrentTrackCursor: (tick: number) => void;
  addCurrentTrackCursor: (ticks: number) => void;
  addTrackEvent: (event: TrackEvent) => void;
}

export type BuiltinFunction = (
  ctx: BuiltinContext,
  args: Expression[],
  position: Position
) => RuntimeValue;

export type BuiltinFunctionWithCallee = (
  ctx: BuiltinContext,
  callee: string,
  args: Expression[],
  position: Position
) => RuntimeValue;

// Re-export commonly used types
export type { Articulation, VocaloidParamType, DynamicMark };
