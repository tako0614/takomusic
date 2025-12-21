// Common validation functions for builtin functions

import type { Position } from '../types/token.js';
import { createError } from '../errors.js';

/** Valid time signature denominators (powers of 2) */
export const VALID_DENOMINATORS = [1, 2, 4, 8, 16, 32, 64] as const;

/**
 * Validate that a denominator is a valid power of 2
 */
export function validateDenominator(value: number, position?: Position, filePath?: string): void {
  if (!VALID_DENOMINATORS.includes(value as typeof VALID_DENOMINATORS[number])) {
    throw createError(
      'E020',
      `Invalid time signature denominator: ${value}. Must be a power of 2 (1, 2, 4, 8, 16, 32, 64).`,
      position,
      filePath
    );
  }
}

/**
 * Validate that a numerator is positive
 */
export function validateNumerator(value: number, position?: Position, filePath?: string): void {
  if (value <= 0) {
    throw createError(
      'E020',
      `Invalid time signature numerator: ${value}. Must be positive.`,
      position,
      filePath
    );
  }
}

/**
 * Validate MIDI value range (0-127)
 */
export function validateMidiValue(
  value: number,
  name: string,
  position?: Position,
  filePath?: string
): void {
  if (value < 0 || value > 127) {
    throw createError(
      'E121',
      `${name} ${value} out of range 0..127`,
      position,
      filePath
    );
  }
}

/**
 * Validate MIDI pitch range (0-127)
 */
export function validatePitch(value: number, position?: Position, filePath?: string): void {
  if (value < 0 || value > 127) {
    throw createError(
      'E110',
      `Pitch ${value} out of range 0..127`,
      position,
      filePath
    );
  }
}

/**
 * Validate pitch bend range (-8192 to 8191)
 */
export function validatePitchBend(value: number, position?: Position, filePath?: string): void {
  if (value < -8192 || value > 8191) {
    throw createError(
      'E122',
      `pitchBend value ${value} out of range -8192..8191`,
      position,
      filePath
    );
  }
}

/**
 * Validate CC controller number (0-127)
 */
export function validateCCController(value: number, position?: Position, filePath?: string): void {
  if (value < 0 || value > 127) {
    throw createError(
      'E120',
      `CC controller ${value} out of range 0..127`,
      position,
      filePath
    );
  }
}

/**
 * Validate PPQ value
 */
export function validatePPQ(value: number, position?: Position, filePath?: string): void {
  if (value <= 0) {
    throw createError(
      'E020',
      `Invalid PPQ value: ${value}. Must be positive.`,
      position,
      filePath
    );
  }
  if (value > 960) {
    throw createError(
      'E020',
      `PPQ value ${value} is unusually high. Common values are 96, 120, 240, 480, 960.`,
      position,
      filePath
    );
  }
}
