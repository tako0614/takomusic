// Error definitions for MFS language

import type { Position } from './types/token.js';

export class MFError extends Error {
  constructor(
    public code: string,
    message: string,
    public position?: Position,
    public filePath?: string
  ) {
    super(message);
    this.name = 'MFError';
  }

  toString(): string {
    const loc = this.position
      ? ` at ${this.filePath || ''}:${this.position.line}:${this.position.column}`
      : '';
    return `[${this.code}]${loc}: ${this.message}`;
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
  filePath?: string
): MFError {
  const message = details
    ? `${ErrorCodes[code]}: ${details}`
    : ErrorCodes[code];
  return new MFError(code, message, position, filePath);
}
