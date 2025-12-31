// Unified error handling for CLI commands
// Provides Rust-style rich error formatting with color support

import { ExitCodes, MFError } from '../errors.js';
import { formatRichDiagnostic, formatDiagnostics } from './richFormatter.js';
import { colors, setColorEnabled } from './colors.js';
import type { Diagnostic } from '../diagnostics.js';

/**
 * Configure color output based on CLI options
 * Call this early in CLI initialization
 */
export function configureColors(options: { noColor?: boolean; color?: boolean }): void {
  if (options.noColor) {
    setColorEnabled(false);
  } else if (options.color !== undefined) {
    setColorEnabled(options.color);
  }
  // Otherwise use auto-detection from environment
}

/**
 * Convert MFError to Diagnostic for rich formatting
 */
function errorToDiagnostic(err: MFError): Diagnostic {
  return {
    severity: 'error',
    code: err.code,
    message: err.message,
    position: err.position,
    filePath: err.filePath,
    suggestion: err.suggestion,
  };
}

/**
 * Handle errors in CLI commands with consistent formatting
 * Produces Rust-style error output with source context
 * @param err The caught error
 * @returns Appropriate exit code
 */
export function handleCliError(err: unknown): number {
  if (err instanceof MFError) {
    console.error(formatRichDiagnostic(errorToDiagnostic(err)));
    return ExitCodes.STATIC_ERROR;
  }

  if (err instanceof Error) {
    console.error(colors.error('error') + ': ' + colors.bold(err.message));
    // Print stack trace in debug mode
    if (process.env.DEBUG) {
      console.error(colors.dim(err.stack ?? ''));
    }
  } else {
    console.error(colors.error('error') + ': Unknown error occurred');
  }

  return ExitCodes.STATIC_ERROR;
}

/**
 * Handle multiple diagnostics with summary
 * @param diagnostics Array of diagnostics to display
 * @returns Appropriate exit code (error if any errors, success otherwise)
 */
export function handleDiagnostics(diagnostics: Diagnostic[]): number {
  if (diagnostics.length === 0) {
    return ExitCodes.SUCCESS;
  }

  console.error(formatDiagnostics(diagnostics));

  const hasErrors = diagnostics.some(d => d.severity === 'error');
  return hasErrors ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
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
