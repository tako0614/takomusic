import type { Rat } from './rat.js';

export interface Pitch {
  midi: number;
  cents: number;
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function parsePitchLiteral(text: string): Pitch {
  const match = /^([A-G])([#b]?)(-?\d+)([+-]\d+c)?$/.exec(text);
  if (!match) {
    throw new Error(`Invalid pitch literal: ${text}`);
  }
  const letter = match[1];
  const accidental = match[2];
  const octave = parseInt(match[3], 10);
  const centsPart = match[4];
  let semitone = NOTE_TO_SEMITONE[letter];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  const midi = (octave + 1) * 12 + semitone;
  const cents = centsPart ? parseInt(centsPart.slice(0, -1), 10) : 0;
  return { midi, cents };
}

export function transposePitch(pitch: Pitch, semitones: number): Pitch {
  return { midi: pitch.midi + semitones, cents: pitch.cents };
}

export function pitchEquals(a: Pitch, b: Pitch): boolean {
  return a.midi === b.midi && a.cents === b.cents;
}

export function pitchFromMidi(midi: number): Pitch {
  return { midi, cents: 0 };
}

export function pitchToRat(pitch: Pitch): Rat {
  return { n: pitch.midi, d: 1 };
}
