/**
 * Tests for CLI error handler
 * Verifies error handling, formatting, and exit codes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleCliError,
  handleDiagnostics,
  configureColors,
  withErrorHandling,
} from '../cli/errorHandler.js';
import { MFError, ExitCodes } from '../errors.js';
import { setColorEnabled } from '../cli/colors.js';
import type { Diagnostic } from '../diagnostics.js';

describe('errorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalDebug: string | undefined;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalDebug = process.env.DEBUG;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug;
    } else {
      delete process.env.DEBUG;
    }
  });

  describe('configureColors', () => {
    it('disables colors when noColor is true', () => {
      configureColors({ noColor: true });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      // Color state is internal, but we can verify behavior in other tests
    });

    it('enables colors when color is true', () => {
      configureColors({ color: true });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('disables colors when color is false', () => {
      configureColors({ color: false });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('uses auto-detection when neither option is set', () => {
      configureColors({});
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('prioritizes noColor over color', () => {
      configureColors({ noColor: true, color: true });
      // noColor should take precedence
    });
  });

  describe('handleCliError', () => {
    beforeEach(() => {
      setColorEnabled(false); // Disable colors for predictable output
    });

    it('handles MFError with full context', () => {
      const err = new MFError(
        'E500',
        'Pitch out of range 0..127',
        { line: 10, column: 5, offset: 100 },
        'test.mf',
        'Valid MIDI pitch range is 0-127'
      );

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('error[E500]');
      expect(output).toContain('Pitch out of range 0..127');
    });

    it('handles MFError without position', () => {
      const err = new MFError('E001', 'ppq not set', undefined, undefined);

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('error[E001]');
      expect(output).toContain('ppq not set');
    });

    it('handles MFError without file path', () => {
      const err = new MFError(
        'E100',
        'Unexpected token',
        { line: 1, column: 1, offset: 0 }
      );

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles generic Error', () => {
      const err = new Error('Something went wrong');

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('error');
      expect(output).toContain('Something went wrong');
    });

    it('prints stack trace in debug mode for generic errors', () => {
      process.env.DEBUG = '1';
      const err = new Error('Debug test error');
      Error.captureStackTrace(err);

      handleCliError(err);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      const stackOutput = consoleErrorSpy.mock.calls[1][0] as string;
      expect(stackOutput).toBeTruthy();
    });

    it('does not print stack trace without debug mode', () => {
      delete process.env.DEBUG;
      const err = new Error('Regular error');

      handleCliError(err);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('handles unknown error types', () => {
      const err = 'string error';

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('error');
      expect(output).toContain('Unknown error occurred');
    });

    it('handles null error', () => {
      const exitCode = handleCliError(null);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles undefined error', () => {
      const exitCode = handleCliError(undefined);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles error with colored output enabled', () => {
      setColorEnabled(true);
      const err = new Error('Colored error');

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Output may contain ANSI codes
    });
  });

  describe('handleDiagnostics', () => {
    beforeEach(() => {
      setColorEnabled(false);
    });

    it('returns success for empty diagnostics', () => {
      const exitCode = handleDiagnostics([]);

      expect(exitCode).toBe(ExitCodes.SUCCESS);
      // handleDiagnostics only calls console.error when diagnostics.length > 0
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns error exit code when diagnostics contain errors', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Pitch out of range',
          position: { line: 5, column: 10, offset: 50 },
          filePath: 'test.mf',
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns success when diagnostics contain only warnings', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'warning',
          code: 'W100',
          message: 'Note duration extremely short',
          position: { line: 3, column: 5, offset: 30 },
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error when mixed errors and warnings', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'warning',
          code: 'W100',
          message: 'Note duration extremely short',
        },
        {
          severity: 'error',
          code: 'E500',
          message: 'Pitch out of range',
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles diagnostics with all severity levels', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Error message',
        },
        {
          severity: 'warning',
          code: 'W100',
          message: 'Warning message',
        },
        {
          severity: 'info',
          message: 'Info message',
        },
        {
          severity: 'hint',
          message: 'Hint message',
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('formats multiple diagnostics with summary', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'First error',
          position: { line: 1, column: 1, offset: 0 },
        },
        {
          severity: 'error',
          code: 'E501',
          message: 'Second error',
          position: { line: 2, column: 1, offset: 10 },
        },
        {
          severity: 'warning',
          code: 'W100',
          message: 'First warning',
          position: { line: 3, column: 1, offset: 20 },
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('2 errors');
      expect(output).toContain('1 warning');
    });

    it('uses singular form for single error/warning', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Single error',
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('1 error');
      expect(output).not.toContain('errors');
    });
  });

  describe('withErrorHandling', () => {
    it('returns result when function succeeds', async () => {
      const fn = async () => 42;

      const result = await withErrorHandling(fn);

      expect(result).toBe(42);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('handles MFError with default handler', async () => {
      const fn = async () => {
        throw new MFError('E100', 'Test error');
      };

      const result = await withErrorHandling(fn);

      expect(result).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles generic Error with default handler', async () => {
      const fn = async () => {
        throw new Error('Generic error');
      };

      const result = await withErrorHandling(fn);

      expect(result).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('uses custom error handler when provided', async () => {
      const fn = async () => {
        throw new Error('Custom handled');
      };
      const customHandler = vi.fn(() => 99);

      const result = await withErrorHandling(fn, customHandler);

      expect(result).toBe(99);
      expect(customHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('passes error to custom handler', async () => {
      const testError = new MFError('E200', 'Type mismatch');
      const fn = async () => {
        throw testError;
      };
      const customHandler = vi.fn(() => ExitCodes.STATIC_ERROR);

      await withErrorHandling(fn, customHandler);

      expect(customHandler).toHaveBeenCalledWith(testError);
    });

    it('preserves return type for successful execution', async () => {
      const fn = async (): Promise<string> => 'success';

      const result = await withErrorHandling(fn);

      expect(result).toBe('success');
      expect(typeof result).toBe('string');
    });

    it('handles synchronous errors in async function', async () => {
      const fn = async () => {
        throw new Error('Sync throw in async');
      };

      const result = await withErrorHandling(fn);

      expect(result).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles rejection in promise', async () => {
      const fn = async () => {
        return Promise.reject(new Error('Promise rejection'));
      };

      const result = await withErrorHandling(fn);

      expect(result).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles void return functions', async () => {
      let sideEffect = false;
      const fn = async (): Promise<void> => {
        sideEffect = true;
      };

      const result = await withErrorHandling(fn);

      expect(sideEffect).toBe(true);
      expect(result).toBeUndefined();
    });

    it('custom handler can return different exit codes', async () => {
      const fn = async () => {
        throw new Error('IO error');
      };
      const customHandler = () => ExitCodes.IO_ERROR;

      const result = await withErrorHandling(fn, customHandler);

      expect(result).toBe(ExitCodes.IO_ERROR);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      setColorEnabled(false);
    });

    it('handles complete error flow with MFError', async () => {
      const fn = async () => {
        throw new MFError(
          'E500',
          'Pitch 132 exceeds 127',
          { line: 15, column: 12, offset: 200 },
          'src/main.mf',
          'Valid MIDI pitch range is 0-127'
        );
      };

      const result = await withErrorHandling(fn);

      expect(result).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('error[E500]');
      expect(output).toContain('Pitch 132 exceeds 127');
      expect(output).toContain('src/main.mf:15:12');
    });

    it('processes multiple diagnostics in order', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'First error',
          position: { line: 5, column: 1, offset: 40 },
          filePath: 'test.mf',
        },
        {
          severity: 'warning',
          code: 'W100',
          message: 'First warning',
          position: { line: 10, column: 1, offset: 80 },
          filePath: 'test.mf',
        },
        {
          severity: 'error',
          code: 'E501',
          message: 'Second error',
          position: { line: 15, column: 1, offset: 120 },
          filePath: 'test.mf',
        },
      ];

      const exitCode = handleDiagnostics(diagnostics);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output.indexOf('First error')).toBeLessThan(output.indexOf('First warning'));
      expect(output.indexOf('First warning')).toBeLessThan(output.indexOf('Second error'));
    });

    it('handles error with all optional fields', () => {
      const err = new MFError(
        'E200',
        'Type mismatch: expected Int, got String',
        { line: 20, column: 8, offset: 300 },
        'src/lib/utils.mf',
        'Ensure the value matches the expected type'
      );
      err.span = {
        start: { line: 20, column: 8, offset: 300 },
        end: { line: 20, column: 15, offset: 307 },
      };

      const exitCode = handleCliError(err);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
