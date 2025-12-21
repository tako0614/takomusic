// Unified error handling for CLI commands

import { ExitCodes, MFError } from '../errors.js';

/**
 * Handle errors in CLI commands with consistent formatting
 * @param err The caught error
 * @returns Appropriate exit code
 */
export function handleCliError(err: unknown): number {
  if (err instanceof MFError) {
    console.error(err.toString());
    return ExitCodes.STATIC_ERROR;
  }

  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('Unknown error occurred');
  }

  return ExitCodes.STATIC_ERROR;
}

/**
 * Wrap an async function with error handling
 * Useful for command handlers
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (err: unknown) => number
): Promise<T | number> {
  try {
    return await fn();
  } catch (err) {
    return onError ? onError(err) : handleCliError(err);
  }
}
