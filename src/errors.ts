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

/**
 * Error code system organized by category:
 * - E0xx: General/Configuration errors
 * - E1xx: Syntax/Lexer/Parser errors
 * - E2xx: Type/Semantic errors
 * - E3xx: Evaluation/Runtime errors
 * - E4xx: Module/Import errors
 * - E5xx: MIDI/Audio errors
 * - E6xx: Notation/Vocal errors
 */
export const ErrorCodes = {
  // E0xx: General/Configuration errors
  E001: 'ppq not set',
  E010: 'tempo at tick=0 not set',
  E011: 'timeSig at tick=0 not set',
  E020: 'timeSig must be at bar start',
  E050: 'Global function called after track started',

  // E1xx: Syntax/Lexer/Parser errors
  E100: 'Unexpected token',
  E101: 'Unterminated string',
  E102: 'Invalid number literal',
  E103: 'Expected identifier',
  E104: 'Expected expression',
  E105: 'Mismatched brackets',
  E106: 'Invalid escape sequence',
  E107: 'Unexpected end of input',
  E108: 'Invalid pitch notation',
  E109: 'Invalid duration notation',
  E110: 'Reserved keyword used as identifier',

  // E2xx: Type/Semantic errors
  E200: 'Type mismatch',
  E201: 'Undefined symbol',
  E202: 'Cannot reassign const',
  E203: 'Invalid operator for type',
  E204: 'Missing required property',
  E205: 'Unknown property',
  E206: 'Invalid function arguments',
  E207: 'Wrong number of arguments',
  E208: 'Cannot call non-function',
  E209: 'Cannot index non-array',
  E210: 'Index out of bounds',

  // E3xx: Evaluation/Runtime errors
  E300: 'Division by zero',
  E301: 'Recursion limit exceeded',
  E302: 'For loop iteration limit exceeded',
  E303: 'Stack overflow',
  E304: 'Duration calculation error',
  E305: 'Time sub out of beat tick range',
  E306: 'Dur to tick does not divide evenly',

  // E4xx: Module/Import errors
  E400: 'Module not found',
  E401: 'Circular import detected',
  E402: 'Export not found',
  E403: 'Top-level execution in imported module',
  E404: 'Invalid module path',

  // E5xx: MIDI/Audio range errors
  E500: 'Pitch out of range 0..127',
  E501: 'Velocity out of range 0..127',
  E502: 'CC controller out of range 0..127',
  E503: 'CC/control value out of range 0..127',
  E504: 'Pitch bend value out of range -8192..8191',
  E505: 'Channel out of range 0..15',
  E506: 'Tempo curve steps must be at least 2',

  // E6xx: Notation/Vocal errors
  E600: 'Invalid clef type',
  E601: 'Key signature fifths out of range -7..7',
  E602: 'Invalid articulation type',
  E603: 'Invalid barline style',
  E604: 'Invalid vocal style',
  E610: 'Vocal note overlap',
  E611: 'Vocal lyric missing or empty',
  E612: 'Lyric count mismatch',
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
    // E0xx: General/Configuration
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

    // E1xx: Syntax errors
    case 'E100':
      return 'Check syntax near this location';
    case 'E101':
      return 'Add closing quote to terminate the string';
    case 'E102':
      return 'Check number format (e.g., 42, 3.14, 0xFF)';
    case 'E103':
      return 'Expected a valid identifier name';
    case 'E104':
      return 'Expected an expression here';
    case 'E105':
      return 'Check that all brackets are properly matched';
    case 'E106':
      return 'Valid escapes: \\n, \\t, \\r, \\\\, \\", \\\'';
    case 'E107':
      return 'Unexpected end of file - check for missing closing brackets';
    case 'E108':
      return 'Valid pitches: C0-G9, with optional # or b (e.g., C#4, Bb3)';
    case 'E109':
      return 'Valid durations: w, h, q, e, s (with optional dots)';
    case 'E110':
      return 'This keyword is reserved and cannot be used as an identifier';

    // E2xx: Type/Semantic errors
    case 'E200':
      return 'Ensure the value matches the expected type';
    case 'E201':
      return undefined; // Will use symbol suggestion instead
    case 'E202':
      return 'Use let instead of const if you need to reassign';
    case 'E203':
      return 'Check that the operator is valid for this type';
    case 'E204':
      return 'Add the missing required property';
    case 'E205':
      return 'Check spelling or remove the unknown property';
    case 'E206':
      return 'Check the function signature for correct argument types';
    case 'E207':
      return 'Check the function signature for required arguments';
    case 'E208':
      return 'Only functions can be called with ()';
    case 'E209':
      return 'Use array indexing only on arrays';
    case 'E210':
      return 'Ensure index is within array bounds';

    // E3xx: Evaluation/Runtime errors
    case 'E300':
      return 'Check for division by zero';
    case 'E301':
      return 'Procedures cannot call themselves directly or indirectly';
    case 'E302':
      return 'For loop range bounds must be const values, not let variables';
    case 'E303':
      return 'Reduce nesting depth or use iterative approach';
    case 'E304':
      return 'Check duration calculations';
    case 'E305':
      return 'Time subdivision is out of beat tick range';
    case 'E306':
      return 'Duration does not divide evenly into ticks';

    // E4xx: Module/Import errors
    case 'E400':
      return 'Check the module path or install the package';
    case 'E401':
      return 'Remove circular dependencies between modules';
    case 'E402':
      return 'Check that the symbol is exported from the module';
    case 'E403':
      return 'Imported modules should only contain fn/const definitions, not executable code';
    case 'E404':
      return 'Check the module path format';

    // E5xx: MIDI/Audio range errors
    case 'E500':
      return 'Valid MIDI pitch range is 0-127 (C-1 to G9). Try using a different octave.';
    case 'E501':
      return 'Velocity must be between 0 (silent) and 127 (max)';
    case 'E502':
      return 'MIDI CC controller numbers must be between 0 and 127';
    case 'E503':
      return 'MIDI CC/control values must be between 0 and 127';
    case 'E504':
      return 'Pitch bend values must be between -8192 (full down) and 8191 (full up). 0 is center.';
    case 'E505':
      return 'MIDI channels are numbered 0-15 (or 1-16 in UI)';
    case 'E506':
      return 'tempoCurve() needs at least 2 steps to interpolate between tempos';

    // E6xx: Notation/Vocal errors
    case 'E600':
      return 'Valid clefs: treble, bass, alto, tenor, percussion, tab, treble8va, treble8vb, bass8va, bass8vb';
    case 'E601':
      return 'Key signature fifths range from -7 (7 flats) to 7 (7 sharps). 0 = C major/A minor';
    case 'E602':
      return 'Valid articulations: staccato, legato, accent, tenuto, marcato, staccatissimo, fermata, breath, caesura';
    case 'E603':
      return 'Valid barline styles: single, double, final, repeat-start, repeat-end, repeat-both, dashed, tick, short, none';
    case 'E604':
      return 'Valid vocal styles: soft, normal, power, falsetto, whisper, breathy, belt, head, chest';
    case 'E610':
      return 'Vocal notes cannot overlap. Use rest or separate phrases.';
    case 'E611':
      return 'Use phrase { notes: ...; lyrics mora: ...; } for vocal parts';
    case 'E612':
      return 'Ensure lyric count matches onset count (ties don\'t increase onsets, use _ for melisma)';

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
