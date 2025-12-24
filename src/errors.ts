// Error definitions for MFS language

import type { Position } from './token.js';

export class MFError extends Error {
  public suggestion?: string;

  constructor(
    public code: string,
    message: string,
    public position?: Position,
    public filePath?: string,
    suggestion?: string
  ) {
    super(message);
    this.name = 'MFError';
    this.suggestion = suggestion;
  }

  toString(): string {
    const loc = this.position
      ? `${this.filePath || 'unknown'}:${this.position.line}:${this.position.column}`
      : '';
    let result = `\n  error[${this.code}]: ${this.message}`;
    if (loc) {
      result += `\n    --> ${loc}`;
    }
    if (this.suggestion) {
      result += `\n    help: ${this.suggestion}`;
    }
    return result;
  }
}

// Error codes as per spec
export const ErrorCodes = {
  // General
  E001: 'ppq not set',
  E010: 'tempo at tick=0 not set',
  E011: 'timeSig at tick=0 not set',
  E020: 'timeSig must be at bar start',
  E050: 'Global function called after track started',

  // Time/Duration
  E101: 'Dur to tick does not divide evenly',
  E102: 'Time sub out of beat tick range',
  E110: 'Pitch out of range 0..127',

  // MIDI Control
  E120: 'CC controller out of range 0..127',
  E121: 'CC/control value out of range 0..127',
  E122: 'Pitch bend value out of range -8192..8191',
  E123: 'Tempo curve steps must be at least 2',

  // Notation
  E130: 'Invalid clef type',
  E131: 'Key signature fifths out of range -7..7',
  E132: 'Invalid articulation type',
  E133: 'Invalid barline style',
  E134: 'Invalid vocal style',

  // Vocal
  E200: 'Vocal note overlap',
  E210: 'Vocal lyric missing or empty',

  // Module
  E300: 'Top-level execution in imported module',
  E310: 'Proc recursion detected',

  // Symbol/Syntax
  E400: 'Undefined symbol',
  E401: 'For loop iteration limit exceeded',
} as const;

export const WarningCodes = {
  W100: 'Note duration extremely short',
  W110: 'Vocal pitch out of typical range',
  W200: 'Too many tempo events',
} as const;

// Exit codes as per spec
export const ExitCodes = {
  SUCCESS: 0,
  STATIC_ERROR: 2,
  IO_ERROR: 3,
  EXTERNAL_TOOL_ERROR: 4,
  DEPENDENCY_MISSING: 5,
} as const;

export function createError(
  code: keyof typeof ErrorCodes,
  details?: string,
  position?: Position,
  filePath?: string,
  suggestion?: string
): MFError {
  const message = details
    ? `${ErrorCodes[code]}: ${details}`
    : ErrorCodes[code];

  // Add default suggestions for common errors
  const defaultSuggestion = suggestion ?? getDefaultSuggestion(code, details);

  return new MFError(code, message, position, filePath, defaultSuggestion);
}

function getDefaultSuggestion(code: string, details?: string): string | undefined {
  switch (code) {
    case 'E001':
      return 'Ensure score has tempo and time signature';
    case 'E010':
      return 'Add tempo N at the start of score';
    case 'E011':
      return 'Add time N/M at the start of score';
    case 'E020':
      return 'Time signature changes must occur at the start of a bar';
    case 'E050':
      return 'Global settings (tempo, time, key) must come before parts';
    case 'E100':
      return 'Ensure lyric count matches onset count (ties don\'t increase onsets, use _ for melisma)';
    case 'E110':
      return 'Valid MIDI pitch range is 0-127 (C-1 to G9). Try using a different octave.';
    case 'E120':
      return 'MIDI CC controller numbers must be between 0 and 127';
    case 'E121':
      return 'MIDI CC/control values must be between 0 and 127';
    case 'E122':
      return 'Pitch bend values must be between -8192 (full down) and 8191 (full up). 0 is center.';
    case 'E123':
      return 'tempoCurve() needs at least 2 steps to interpolate between tempos';
    case 'E130':
      return 'Valid clefs: treble, bass, alto, tenor, percussion, tab, treble8va, treble8vb, bass8va, bass8vb';
    case 'E131':
      return 'Key signature fifths range from -7 (7 flats) to 7 (7 sharps). 0 = C major/A minor';
    case 'E132':
      return 'Valid articulations: staccato, legato, accent, tenuto, marcato, staccatissimo, fermata, breath, caesura';
    case 'E133':
      return 'Valid barline styles: single, double, final, repeat-start, repeat-end, repeat-both, dashed, tick, short, none';
    case 'E134':
      return 'Valid vocal styles: soft, normal, power, falsetto, whisper, breathy, belt, head, chest';
    case 'E200':
      return 'Vocal notes cannot overlap. Use rest or separate phrases.';
    case 'E210':
      return 'Use phrase { notes: ...; lyrics mora: ...; } for vocal parts';
    case 'E211':
      return 'NEUTRINO requires hiragana/katakana lyrics. Convert kanji to reading.';
    case 'E300':
      return 'Imported modules should only contain proc/const definitions, not executable code';
    case 'E310':
      return 'Procedures cannot call themselves directly or indirectly';
    case 'E400':
      return undefined; // Will use symbol suggestion instead
    case 'E401':
      return 'For loop range bounds must be const values, not let variables';
    default:
      return undefined;
  }
}

// Find similar symbol names using Levenshtein distance
export function findSimilarSymbols(name: string, available: string[], maxDistance = 3): string[] {
  const results: { name: string; distance: number }[] = [];

  for (const sym of available) {
    const dist = levenshteinDistance(name.toLowerCase(), sym.toLowerCase());
    if (dist <= maxDistance) {
      results.push({ name: sym, distance: dist });
    }
  }

  return results
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((r) => r.name);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
