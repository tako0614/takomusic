/**
 * Tests for CLI rich diagnostic formatter
 * Verifies Rust-style error output with colors and source context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatRichDiagnostic,
  formatDiagnostics,
  printDiagnostics,
} from '../cli/richFormatter.js';
import { setColorEnabled } from '../cli/colors.js';
import type { Diagnostic } from '../diagnostics.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('richFormatter', () => {
  let tempDir: string;

  beforeEach(() => {
    setColorEnabled(false); // Disable colors for predictable output
    tempDir = path.join(os.tmpdir(), `mf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTestFile(content: string, name = 'test.mf'): string {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe('formatRichDiagnostic', () => {
    it('formats error with code and message', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch out of range 0..127',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('error[E500]');
      expect(output).toContain('Pitch out of range 0..127');
    });

    it('formats error without code', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        message: 'Something went wrong',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('error:');
      expect(output).toContain('Something went wrong');
      expect(output).not.toContain('[');
    });

    it('formats warning with different styling', () => {
      const diagnostic: Diagnostic = {
        severity: 'warning',
        code: 'W100',
        message: 'Note duration extremely short',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('warning[W100]');
      expect(output).toContain('Note duration extremely short');
    });

    it('formats info diagnostic', () => {
      const diagnostic: Diagnostic = {
        severity: 'info',
        message: 'This is informational',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('info:');
      expect(output).toContain('This is informational');
    });

    it('formats hint diagnostic', () => {
      const diagnostic: Diagnostic = {
        severity: 'hint',
        message: 'Consider using a constant',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('hint:');
      expect(output).toContain('Consider using a constant');
    });

    it('includes file location when provided', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch error',
        filePath: 'src/main.mf',
        position: { line: 15, column: 12, offset: 200 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('-->');
      expect(output).toContain('src/main.mf:15:12');
    });

    it('includes suggestion when provided', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch out of range',
        suggestion: 'Valid MIDI pitch range is 0-127',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('help:');
      expect(output).toContain('Valid MIDI pitch range is 0-127');
    });

    it('includes notes when provided', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E200',
        message: 'Type mismatch',
        notes: ['Expected Int type', 'Got String type'],
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('note:');
      expect(output).toContain('Expected Int type');
      expect(output).toContain('Got String type');
    });

    it('includes multiple notes in order', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        message: 'Complex error',
        notes: ['First note', 'Second note', 'Third note'],
      };

      const output = formatRichDiagnostic(diagnostic);

      const firstIndex = output.indexOf('First note');
      const secondIndex = output.indexOf('Second note');
      const thirdIndex = output.indexOf('Third note');

      expect(firstIndex).toBeGreaterThan(-1);
      expect(secondIndex).toBeGreaterThan(firstIndex);
      expect(thirdIndex).toBeGreaterThan(secondIndex);
    });

    it('wraps long messages', () => {
      const longMessage = 'This is a very long error message that should be wrapped when it exceeds the terminal width to ensure readability in the console output';
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E100',
        message: longMessage,
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('error[E100]');
      // Message should be present but may be split across lines
      expect(output).toContain('This is a very long error message');
    });

    it('wraps long suggestions', () => {
      const longSuggestion = 'This is a very long help suggestion that should be wrapped when it exceeds the available width to maintain readable output in the terminal';
      const diagnostic: Diagnostic = {
        severity: 'error',
        message: 'Error',
        suggestion: longSuggestion,
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('help:');
      expect(output).toContain('This is a very long help suggestion');
    });

    it('includes source snippet when file and position provided', () => {
      const source = `tempo 120bpm;
time 4/4;
note(C4, q);
note(Z9, q);
note(E4, q);`;

      const filePath = createTestFile(source);
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch out of range',
        filePath,
        position: { line: 4, column: 6, offset: 30 },
        endPosition: { line: 4, column: 8, offset: 32 },
        label: 'invalid pitch',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('note(Z9, q)');
      expect(output).toContain('^^');
      expect(output).toContain('invalid pitch');
    });

    it('handles missing source file gracefully', () => {
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch error',
        filePath: '/nonexistent/file.mf',
        position: { line: 5, column: 10, offset: 50 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('error[E500]');
      expect(output).toContain('/nonexistent/file.mf:5:10');
      // Should not crash, just skip source snippet
    });

    it('includes label in source snippet', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Invalid note',
        filePath,
        position: { line: 1, column: 6, offset: 5 },
        endPosition: { line: 1, column: 8, offset: 7 },
        label: 'MIDI pitch 132 exceeds 127',
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('^^');
      expect(output).toContain('MIDI pitch 132 exceeds 127');
    });

    it('formats related spans', () => {
      const source = `const x = 5;
let y = x + "hello";`;
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E200',
        message: 'Type mismatch',
        filePath,
        position: { line: 2, column: 9, offset: 20 },
        relatedSpans: [
          {
            filePath,
            span: {
              start: { line: 1, column: 7, offset: 6 },
              end: { line: 1, column: 8, offset: 7 },
            },
            label: 'x defined here as Int',
          },
        ],
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('Type mismatch');
      expect(output).toContain('x defined here as Int');
    });

    it('handles multi-line spans', () => {
      const source = `fn test() {
  return 42;
}`;
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E200',
        message: 'Invalid function',
        filePath,
        position: { line: 1, column: 1, offset: 0 },
        endPosition: { line: 3, column: 1, offset: 28 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('fn test()');
      expect(output).toContain('return 42');
    });

    it('handles position without end position', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'error',
        message: 'Error',
        filePath,
        position: { line: 1, column: 6, offset: 5 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('note(C4, q)');
      expect(output).toContain('^');
    });

    it('uses warning colors for warning severity', () => {
      const source = 'note(C4, s/32);';
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'warning',
        code: 'W100',
        message: 'Note duration extremely short',
        filePath,
        position: { line: 1, column: 10, offset: 9 },
        endPosition: { line: 1, column: 14, offset: 13 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('warning[W100]');
      // When colors are enabled, would have yellow highlighting
    });

    it('uses info colors for info severity', () => {
      const source = 'let x = 5;';
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'info',
        message: 'Variable declared here',
        filePath,
        position: { line: 1, column: 5, offset: 4 },
        endPosition: { line: 1, column: 6, offset: 5 },
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('info:');
    });

    it('formats diagnostic with all features', () => {
      const source = `tempo 120bpm;
note(Z9, q);`;
      const filePath = createTestFile(source);

      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Pitch out of range 0..127',
        filePath,
        position: { line: 2, column: 6, offset: 20 },
        endPosition: { line: 2, column: 8, offset: 22 },
        label: 'MIDI pitch 132 exceeds 127',
        suggestion: 'Valid MIDI pitch range is 0-127 (C-1 to G9). Try using a different octave.',
        notes: ['This note will not play correctly'],
      };

      const output = formatRichDiagnostic(diagnostic);

      expect(output).toContain('error[E500]');
      expect(output).toContain('Pitch out of range 0..127');
      expect(output).toContain('-->');
      expect(output).toContain(':2:6');
      expect(output).toContain('note(Z9, q)');
      expect(output).toContain('^^');
      expect(output).toContain('MIDI pitch 132 exceeds 127');
      expect(output).toContain('note:');
      expect(output).toContain('This note will not play correctly');
      expect(output).toContain('help:');
      expect(output).toContain('Valid MIDI pitch range is 0-127');
    });
  });

  describe('formatDiagnostics', () => {
    it('formats empty diagnostics', () => {
      const output = formatDiagnostics([]);

      expect(output).toContain('No issues found');
    });

    it('formats single error', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Pitch error',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('error[E500]');
      expect(output).toContain('1 error');
    });

    it('formats single warning', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'warning',
          code: 'W100',
          message: 'Warning message',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('warning[W100]');
      expect(output).toContain('1 warning');
      expect(output).not.toContain('aborting');
    });

    it('formats multiple errors with summary', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'First error',
        },
        {
          severity: 'error',
          code: 'E501',
          message: 'Second error',
        },
        {
          severity: 'error',
          code: 'E502',
          message: 'Third error',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('3 errors');
      expect(output).toContain('aborting');
    });

    it('formats mixed errors and warnings', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Error 1',
        },
        {
          severity: 'warning',
          code: 'W100',
          message: 'Warning 1',
        },
        {
          severity: 'error',
          code: 'E501',
          message: 'Error 2',
        },
        {
          severity: 'warning',
          code: 'W101',
          message: 'Warning 2',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('2 errors');
      expect(output).toContain('2 warnings');
      expect(output).toContain('aborting');
    });

    it('uses singular form for 1 error', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          message: 'Single error',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('1 error');
      expect(output).not.toContain('errors');
    });

    it('uses singular form for 1 warning', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'warning',
          message: 'Single warning',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      expect(output).toContain('1 warning');
      expect(output).not.toContain('warnings');
    });

    it('separates diagnostics with blank lines', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          message: 'First',
        },
        {
          severity: 'error',
          message: 'Second',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      // Should have blank lines between diagnostics
      expect(output).toContain('\n\n');
    });

    it('formats info and hint as warnings in count', () => {
      const diagnostics: Diagnostic[] = [
        {
          severity: 'info',
          message: 'Info',
        },
        {
          severity: 'hint',
          message: 'Hint',
        },
      ];

      const output = formatDiagnostics(diagnostics);

      // Info and hint are counted as warnings
      expect(output).toContain('2 warnings');
    });

    it('shows aborting message only for errors', () => {
      const withErrors: Diagnostic[] = [
        {
          severity: 'error',
          message: 'Error',
        },
      ];

      const withoutErrors: Diagnostic[] = [
        {
          severity: 'warning',
          message: 'Warning',
        },
      ];

      const errorOutput = formatDiagnostics(withErrors);
      const warningOutput = formatDiagnostics(withoutErrors);

      expect(errorOutput).toContain('aborting');
      expect(warningOutput).not.toContain('aborting');
    });
  });

  describe('printDiagnostics', () => {
    it('prints to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          code: 'E500',
          message: 'Test error',
        },
      ];

      printDiagnostics(diagnostics);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('error[E500]');

      consoleSpy.mockRestore();
    });

    it('prints empty diagnostics', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      printDiagnostics([]);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('No issues found');

      consoleSpy.mockRestore();
    });
  });

  describe('color support', () => {
    it('respects color disabled setting', () => {
      setColorEnabled(false);
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Test',
      };

      const output = formatRichDiagnostic(diagnostic);

      // Should not contain ANSI escape codes
      expect(output).not.toContain('\x1b[');
    });

    it('includes colors when enabled', () => {
      setColorEnabled(true);
      const diagnostic: Diagnostic = {
        severity: 'error',
        code: 'E500',
        message: 'Test',
      };

      const output = formatRichDiagnostic(diagnostic);

      // Should contain ANSI escape codes
      expect(output).toContain('\x1b[');

      setColorEnabled(false); // Reset
    });
  });
});
