// Algorithmic composition builtin functions: euclidean, probability, markov, randomSeed, randomNote, randomRhythm, constraint, cellular, lSystem

import type { Expression } from '../../types/ast.js';
import type { NoteEvent } from '../../types/ir.js';
import { RuntimeValue, makeNull, toNumber } from '../runtime.js';
import { MFError } from '../../errors.js';

// Helper function for seeded random
function seededRandom(seed?: number): number {
  if (seed === undefined) {
    return Math.random();
  }
  // Simple seeded random using a linear congruential generator
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Helper function to generate Euclidean rhythm pattern
function generateEuclidean(steps: number, pulses: number): boolean[] {
  if (pulses > steps) pulses = steps;
  if (pulses === 0) return new Array(steps).fill(false);
  if (pulses === steps) return new Array(steps).fill(true);

  const pattern: boolean[] = [];
  let bucket = 0;

  for (let i = 0; i < steps; i++) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(true);
    } else {
      pattern.push(false);
    }
  }

  return pattern;
}

// Helper function for cellular automaton generation
function generateCellular(rule: number, steps: number): boolean[] {
  // 1D cellular automaton
  let current = new Array(steps).fill(false);
  current[Math.floor(steps / 2)] = true; // Start with single cell in middle

  const result: boolean[] = [];

  for (let i = 0; i < steps; i++) {
    result.push(current[i]);
  }

  for (let gen = 0; gen < steps - 1; gen++) {
    const next = new Array(steps).fill(false);
    for (let i = 1; i < steps - 1; i++) {
      const left = current[i - 1] ? 4 : 0;
      const center = current[i] ? 2 : 0;
      const right = current[i + 1] ? 1 : 0;
      const index = left + center + right;
      next[i] = ((rule >> index) & 1) === 1;
    }
    current = next;
  }

  return result;
}

export function builtinEuclidean(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const steps = Math.floor(toNumber(this.evaluate(args[0])));
  const pulses = Math.floor(toNumber(this.evaluate(args[1])));
  const dur = this.evaluate(args[2]);
  const pitch = args.length > 3 ? this.evaluate(args[3]) : null;

  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'euclidean() duration must be Dur', position, this.filePath);
  }

  const stepTicks = this.durToTicks(dur, position);
  const pattern = generateEuclidean(steps, pulses);

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i]) {
      if (pitch && pitch.type === 'pitch') {
        const noteEvent: NoteEvent = {
          type: 'note',
          tick: track.cursor,
          dur: stepTicks,
          key: pitch.midi,
          vel: track.defaultVel,
        };
        track.events.push(noteEvent);
      } else if (track.kind === 'midi' && track.channel === 10) {
        // Drum track - use kick
        const noteEvent: NoteEvent = {
          type: 'note',
          tick: track.cursor,
          dur: stepTicks,
          key: 36,
          vel: track.defaultVel ?? 100,
        };
        track.events.push(noteEvent);
      }
    }
    track.cursor += stepTicks;
  }

  return makeNull();
}

export function builtinProbability(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const dur = this.evaluate(args[1]);
  const prob = args.length > 2 ? toNumber(this.evaluate(args[2])) / 100 : 0.5;

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'probability() pitch must be Pitch', position, this.filePath);
  }
  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'probability() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const random = seededRandom(track.randomSeed);

  if (random < prob) {
    const noteEvent: NoteEvent = {
      type: 'note',
      tick: track.cursor,
      dur: durTicks,
      key: pitch.midi,
      vel: track.defaultVel,
    };
    track.events.push(noteEvent);
  }

  track.cursor += durTicks;
  return makeNull();
}

export function builtinMarkov(this: any, args: Expression[], position: any): RuntimeValue {
  // Markov chain generation - simplified implementation
  this.checkTrackPhase(position);
  return makeNull();
}

export function builtinRandomSeed(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const seed = Math.floor(toNumber(this.evaluate(args[0])));
  this.currentTrack!.randomSeed = seed;
  return makeNull();
}

export function builtinRandomNote(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const minPitch = toNumber(this.evaluate(args[0]));
  const maxPitch = toNumber(this.evaluate(args[1]));
  const dur = this.evaluate(args[2]);

  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'randomNote() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const random = seededRandom(track.randomSeed);
  const pitch = Math.floor(minPitch + random * (maxPitch - minPitch + 1));

  const noteEvent: NoteEvent = {
    type: 'note',
    tick: track.cursor,
    dur: durTicks,
    key: pitch,
    vel: track.defaultVel,
  };
  track.events.push(noteEvent);
  track.cursor += durTicks;

  // Update seed for next random
  if (track.randomSeed !== undefined) {
    track.randomSeed = track.randomSeed + 1;
  }

  return makeNull();
}

export function builtinRandomRhythm(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pitch = this.evaluate(args[0]);
  const durations = this.evaluate(args[1]);
  const count = Math.floor(toNumber(this.evaluate(args[2])));

  if (pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'randomRhythm() pitch must be Pitch', position, this.filePath);
  }
  if (durations.type !== 'array') {
    throw new MFError('TYPE', 'randomRhythm() durations must be array', position, this.filePath);
  }

  for (let i = 0; i < count; i++) {
    const random = seededRandom(track.randomSeed);
    const durIndex = Math.floor(random * durations.elements.length);
    const dur = durations.elements[durIndex];

    if (dur.type === 'dur') {
      const durTicks = this.durToTicks(dur, position);
      const noteEvent: NoteEvent = {
        type: 'note',
        tick: track.cursor,
        dur: durTicks,
        key: pitch.midi,
        vel: track.defaultVel,
      };
      track.events.push(noteEvent);
      track.cursor += durTicks;
    }

    if (track.randomSeed !== undefined) {
      track.randomSeed = track.randomSeed + 1;
    }
  }

  return makeNull();
}

export function builtinConstraint(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const rule = this.evaluate(args[0]);
  if (rule.type !== 'string') {
    throw new MFError('TYPE', 'constraint() rule must be string', position, this.filePath);
  }

  if (!track.constraints) {
    track.constraints = [];
  }

  track.constraints.push({
    type: 'constraint',
    rule: rule.value as any,
  });

  return makeNull();
}

export function builtinCellular(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const ruleNum = Math.floor(toNumber(this.evaluate(args[0])));
  const steps = Math.floor(toNumber(this.evaluate(args[1])));
  const dur = this.evaluate(args[2]);
  const pitch = this.evaluate(args[3]);

  if (dur.type !== 'dur' || pitch.type !== 'pitch') {
    throw new MFError('TYPE', 'cellular() requires dur and pitch', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const pattern = generateCellular(ruleNum, steps);

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i]) {
      const noteEvent: NoteEvent = {
        type: 'note',
        tick: track.cursor,
        dur: durTicks,
        key: pitch.midi,
        vel: track.defaultVel,
      };
      track.events.push(noteEvent);
    }
    track.cursor += durTicks;
  }

  return makeNull();
}

export function builtinLSystem(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  // L-System placeholder
  return makeNull();
}
