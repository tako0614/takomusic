/**
 * Rat (Rational Number) to MIDI Ticks Conversion
 *
 * Converts TakoMusic's rational number representation to MIDI ticks.
 * In TakoMusic, Rat represents position in whole notes.
 */

/**
 * Rational number type (from TakoMusic IR)
 */
export interface Rat {
  n: number; // numerator
  d: number; // denominator
}

/**
 * Convert Rat (position in whole notes) to MIDI ticks
 *
 * @param rat Position as a rational number in whole notes
 * @param ppq Pulses (ticks) per quarter note
 * @returns MIDI ticks
 *
 * @example
 * // At 480 PPQ:
 * // 1 whole note = 4 quarter notes = 4 * 480 = 1920 ticks
 * ratToTicks({ n: 1, d: 1 }, 480) // => 1920
 * ratToTicks({ n: 1, d: 4 }, 480) // => 480 (one quarter note)
 * ratToTicks({ n: 1, d: 8 }, 480) // => 240 (one eighth note)
 */
export function ratToTicks(rat: Rat, ppq: number): number {
  // rat represents position in whole notes
  // ppq is ticks per quarter note
  // 1 whole note = 4 quarter notes = 4 * ppq ticks
  return Math.round((rat.n / rat.d) * ppq * 4);
}

/**
 * Convert MIDI ticks back to Rat
 *
 * @param ticks MIDI ticks
 * @param ppq Pulses (ticks) per quarter note
 * @returns Rat representing position in whole notes
 */
export function ticksToRat(ticks: number, ppq: number): Rat {
  const wholeNotes = ticks / (ppq * 4);
  // Simple conversion - could be improved with GCD for nicer fractions
  return { n: ticks, d: ppq * 4 };
}

/**
 * Add two Rat values
 */
export function addRat(a: Rat, b: Rat): Rat {
  const n = a.n * b.d + b.n * a.d;
  const d = a.d * b.d;
  return simplifyRat({ n, d });
}

/**
 * Simplify a Rat by dividing by GCD
 */
export function simplifyRat(rat: Rat): Rat {
  const g = gcd(Math.abs(rat.n), Math.abs(rat.d));
  return { n: rat.n / g, d: rat.d / g };
}

/**
 * Greatest common divisor using Euclidean algorithm
 */
function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

/**
 * Compare two Rat values
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareRat(a: Rat, b: Rat): number {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * Convert Rat to floating point number
 */
export function ratToNumber(rat: Rat): number {
  return rat.n / rat.d;
}

/**
 * Create Rat from integer
 */
export function ratFromInt(n: number): Rat {
  return { n, d: 1 };
}

/**
 * Zero Rat constant
 */
export const RAT_ZERO: Rat = { n: 0, d: 1 };

/**
 * One whole note Rat constant
 */
export const RAT_WHOLE: Rat = { n: 1, d: 1 };

/**
 * One quarter note Rat constant
 */
export const RAT_QUARTER: Rat = { n: 1, d: 4 };

/**
 * One eighth note Rat constant
 */
export const RAT_EIGHTH: Rat = { n: 1, d: 8 };
