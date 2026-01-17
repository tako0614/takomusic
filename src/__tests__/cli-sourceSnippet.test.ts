/**
 * Tests for CLI source snippet formatter
 * Verifies source context display with line numbers, carets, and labels
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  formatSourceSnippet,
  formatSourceSnippetFromContent,
  formatLocation,
  formatHelp,
  formatNote,
  wrapText,
  clearSourceCache,
} from '../cli/sourceSnippet.js';
import { setColorEnabled } from '../cli/colors.js';
import type { SourceSpan } from '../diagnostics.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('sourceSnippet', () => {
  let tempDir: string;

  beforeEach(() => {
    setColorEnabled(false); // Disable colors for predictable output
    clearSourceCache();
    tempDir = path.join(os.tmpdir(), `mf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    clearSourceCache();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTestFile(content: string, name = 'test.mf'): string {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe('wrapText', () => {
    it('returns text as-is when within max width', () => {
      const text = 'Short text';
      const result = wrapText(text, 80, 0);

      expect(result).toBe('Short text');
    });

    it('wraps long text to multiple lines', () => {
      const text = 'This is a very long text that should be wrapped when it exceeds the maximum width';
      const result = wrapText(text, 40, 0);

      expect(result).toContain('\n');
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(40);
      });
    });

    it('handles text exactly at max width', () => {
      const text = '12345678901234567890'; // 20 chars
      const result = wrapText(text, 20, 0);

      expect(result).toBe(text);
    });

    it('respects indent on wrapped lines', () => {
      const text = 'This is a long text that will be wrapped';
      const result = wrapText(text, 30, 4);

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      // First line should not be indented
      expect(lines[0]).not.toMatch(/^\s/);
      // Second line should be indented
      if (lines.length > 1) {
        expect(lines[1]).toMatch(/^\s{4}/);
      }
    });

    it('handles empty text', () => {
      const result = wrapText('', 80, 0);

      expect(result).toBe('');
    });

    it('handles single word longer than width', () => {
      const text = 'supercalifragilisticexpialidocious';
      const result = wrapText(text, 20, 0);

      // Single long word should remain as-is
      expect(result).toBe(text);
    });

    it('wraps at word boundaries', () => {
      const text = 'one two three four five';
      const result = wrapText(text, 15, 0);

      const lines = result.split('\n');
      lines.forEach(line => {
        expect(line.trim()).not.toBe('');
        expect(line.length).toBeLessThanOrEqual(15);
      });
    });

    it('handles multiple spaces', () => {
      const text = 'word1    word2    word3';
      const result = wrapText(text, 80, 0);

      expect(result).toContain('word1');
      expect(result).toContain('word2');
      expect(result).toContain('word3');
    });

    it('applies indent correctly with multiple wraps', () => {
      const text = 'This is a very long text that will definitely need to be wrapped multiple times to fit';
      const result = wrapText(text, 25, 5);

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(2);
      expect(lines[0]).not.toMatch(/^\s/);
      lines.slice(1).forEach(line => {
        expect(line).toMatch(/^\s{5}/);
      });
    });
  });

  describe('formatSourceSnippet', () => {
    it('formats single-line snippet with error', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 6, offset: 5 },
        end: { line: 1, column: 8, offset: 7 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('1 |');
      expect(output).toContain('note(C4, q)');
      expect(output).toContain('^^');
    });

    it('includes label under carets', () => {
      const source = 'note(Z9, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 6, offset: 5 },
        end: { line: 1, column: 8, offset: 7 },
      };

      const output = formatSourceSnippet(filePath, span, {
        label: 'invalid pitch',
      });

      expect(output).toContain('^^');
      expect(output).toContain('invalid pitch');
    });

    it('shows context lines before error', () => {
      const source = `line 1
line 2
error here
line 4`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 3, column: 1, offset: 14 },
        end: { line: 3, column: 5, offset: 18 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesBefore: 2,
      });

      expect(output).toContain('1 |');
      expect(output).toContain('line 1');
      expect(output).toContain('2 |');
      expect(output).toContain('line 2');
      expect(output).toContain('3 |');
      expect(output).toContain('error here');
    });

    it('shows context lines after error', () => {
      const source = `line 1
error here
line 3
line 4`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 2, column: 1, offset: 7 },
        end: { line: 2, column: 5, offset: 11 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesAfter: 2,
      });

      expect(output).toContain('2 |');
      expect(output).toContain('error here');
      expect(output).toContain('3 |');
      expect(output).toContain('line 3');
      expect(output).toContain('4 |');
      expect(output).toContain('line 4');
    });

    it('formats multi-line span', () => {
      const source = `fn test() {
  return 42;
}`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 3, column: 1, offset: 28 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('fn test()');
      expect(output).toContain('return 42');
      expect(output).toContain('/'); // Start indicator
      expect(output).toContain('\\'); // End indicator
    });

    it('uses warning style when isWarning is true', () => {
      const source = 'note(C4, s/32);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 14, offset: 13 },
      };

      const output = formatSourceSnippet(filePath, span, {
        isWarning: true,
      });

      expect(output).toContain('note(C4, s/32)');
      expect(output).toContain('^');
    });

    it('uses info style when isInfo is true', () => {
      const source = 'let x = 5;';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 5, offset: 4 },
        end: { line: 1, column: 6, offset: 5 },
      };

      const output = formatSourceSnippet(filePath, span, {
        isInfo: true,
      });

      expect(output).toContain('let x = 5');
      expect(output).toContain('^');
    });

    it('returns empty string for non-existent file', () => {
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
      };

      const output = formatSourceSnippet('/nonexistent/file.mf', span);

      expect(output).toBe('');
    });

    it('handles missing end position', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 6, offset: 5 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('note(C4, q)');
      expect(output).toContain('^'); // Single caret
    });

    it('handles line at start of file', () => {
      const source = `error on first line
second line`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 5, offset: 4 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesBefore: 5,
      });

      expect(output).toContain('1 |');
      expect(output).toContain('error on first line');
      expect(output).not.toContain('0 |');
    });

    it('handles line at end of file', () => {
      const source = `first line
error on last line`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 2, column: 1, offset: 11 },
        end: { line: 2, column: 5, offset: 15 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesAfter: 5,
      });

      expect(output).toContain('2 |');
      expect(output).toContain('error on last line');
      expect(output).not.toContain('3 |');
    });

    it('pads line numbers correctly', () => {
      const lines = Array(100).fill('line').map((l, i) => `${l} ${i + 1}`);
      const source = lines.join('\n');
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 99, column: 1, offset: 500 },
        end: { line: 99, column: 4, offset: 503 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesBefore: 1,
        linesAfter: 1,
      });

      // Line numbers should be padded to same width
      expect(output).toContain('98 |');
      expect(output).toContain('99 |');
      expect(output).toContain('100 |');
    });

    it('handles empty lines in source', () => {
      const source = `line 1

error here

line 5`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 3, column: 1, offset: 8 },
        end: { line: 3, column: 5, offset: 12 },
      };

      const output = formatSourceSnippet(filePath, span, {
        linesBefore: 1,
        linesAfter: 1,
      });

      expect(output).toContain('2 |');
      expect(output).toContain('3 |');
      expect(output).toContain('4 |');
    });

    it('caches source file reads', () => {
      const source = 'test line';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
      };

      // First call
      formatSourceSnippet(filePath, span);

      // Delete the file
      fs.unlinkSync(filePath);

      // Second call should use cache
      const output = formatSourceSnippet(filePath, span);
      expect(output).toContain('test line');
    });

    it('handles Windows line endings', () => {
      const source = 'line 1\r\nline 2\r\nerror\r\nline 4';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 3, column: 1, offset: 16 },
        end: { line: 3, column: 5, offset: 20 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('3 |');
      expect(output).toContain('error');
    });

    it('handles tabs in source', () => {
      const source = '\tnote(C4, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 7, offset: 6 },
        end: { line: 1, column: 9, offset: 8 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('note(C4, q)');
    });

    it('generates correct caret length for span', () => {
      const source = 'note(C4, quarter);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 17, offset: 16 }, // "quarter" = 7 chars
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('note(C4, quarter)');
      // Should have 7 carets
      expect(output).toMatch(/\^{7}/);
    });

    it('handles zero-length span', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      };

      const output = formatSourceSnippet(filePath, span);

      // Should still show at least one caret
      expect(output).toContain('^');
    });

    it('includes blank line prefix', () => {
      const source = 'note(C4, q);';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('|');
      const lines = output.split('\n');
      // First line should be blank prefix
      expect(lines[0]).toMatch(/^\s+\|$/);
    });
  });

  describe('formatSourceSnippetFromContent', () => {
    it('formats snippet from content string', () => {
      const source = 'note(C4, q);';
      const span: SourceSpan = {
        start: { line: 1, column: 6, offset: 5 },
        end: { line: 1, column: 8, offset: 7 },
      };

      const output = formatSourceSnippetFromContent(source, span);

      expect(output).toContain('1 |');
      expect(output).toContain('note(C4, q)');
      expect(output).toContain('^^');
    });

    it('works without file system access', () => {
      const source = `line 1
line 2
error here
line 4`;
      const span: SourceSpan = {
        start: { line: 3, column: 1, offset: 14 },
        end: { line: 3, column: 5, offset: 18 },
      };

      const output = formatSourceSnippetFromContent(source, span, {
        linesBefore: 1,
        linesAfter: 1,
      });

      expect(output).toContain('2 |');
      expect(output).toContain('line 2');
      expect(output).toContain('3 |');
      expect(output).toContain('error here');
      expect(output).toContain('4 |');
      expect(output).toContain('line 4');
    });

    it('handles multi-line spans', () => {
      const source = `fn test() {
  return 42;
}`;
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 3, column: 1, offset: 28 },
      };

      const output = formatSourceSnippetFromContent(source, span);

      expect(output).toContain('fn test()');
      expect(output).toContain('return 42');
      expect(output).toContain('/');
      expect(output).toContain('\\');
    });

    it('supports all options like file-based version', () => {
      const source = 'warning(W100);';
      const span: SourceSpan = {
        start: { line: 1, column: 9, offset: 8 },
        end: { line: 1, column: 13, offset: 12 },
      };

      const output = formatSourceSnippetFromContent(source, span, {
        label: 'deprecated code',
        isWarning: true,
      });

      expect(output).toContain('W100');
      expect(output).toContain('deprecated code');
    });
  });

  describe('formatLocation', () => {
    it('formats location with file and position', () => {
      const output = formatLocation('src/main.mf', {
        line: 15,
        column: 12,
        offset: 200,
      });

      expect(output).toContain('-->');
      expect(output).toContain('src/main.mf:15:12');
    });

    it('formats location with only file path', () => {
      const output = formatLocation('src/main.mf', undefined);

      expect(output).toContain('-->');
      expect(output).toContain('src/main.mf');
      expect(output).not.toContain(':');
    });

    it('formats location with only position', () => {
      const output = formatLocation(undefined, {
        line: 10,
        column: 5,
        offset: 100,
      });

      expect(output).toContain('-->');
      expect(output).toContain('unknown:10:5');
    });

    it('handles no file or position', () => {
      const output = formatLocation(undefined, undefined);

      expect(output).toBe('');
    });

    it('handles absolute paths', () => {
      const output = formatLocation('/home/user/project/src/main.mf', {
        line: 1,
        column: 1,
        offset: 0,
      });

      expect(output).toContain('/home/user/project/src/main.mf:1:1');
    });

    it('handles Windows paths', () => {
      const output = formatLocation('C:\\Users\\dev\\project\\main.mf', {
        line: 5,
        column: 10,
        offset: 50,
      });

      expect(output).toContain('C:\\Users\\dev\\project\\main.mf:5:10');
    });
  });

  describe('formatHelp', () => {
    it('formats help message', () => {
      const output = formatHelp('Valid MIDI pitch range is 0-127');

      expect(output).toContain('=');
      expect(output).toContain('help:');
      expect(output).toContain('Valid MIDI pitch range is 0-127');
    });

    it('includes proper indentation', () => {
      const output = formatHelp('Suggestion text');

      expect(output).toMatch(/^\s+=/);
    });

    it('handles empty help message', () => {
      const output = formatHelp('');

      expect(output).toContain('help:');
    });

    it('handles long help message', () => {
      const long = 'This is a very long help message that might span multiple lines';
      const output = formatHelp(long);

      expect(output).toContain('help:');
      expect(output).toContain('This is a very long help message');
    });
  });

  describe('formatNote', () => {
    it('formats note message', () => {
      const output = formatNote('This variable is defined here');

      expect(output).toContain('=');
      expect(output).toContain('note:');
      expect(output).toContain('This variable is defined here');
    });

    it('includes proper indentation', () => {
      const output = formatNote('Note text');

      expect(output).toMatch(/^\s+=/);
    });

    it('handles empty note message', () => {
      const output = formatNote('');

      expect(output).toContain('note:');
    });

    it('handles long note message', () => {
      const long = 'This is a very long note that might need wrapping';
      const output = formatNote(long);

      expect(output).toContain('note:');
      expect(output).toContain('This is a very long note');
    });
  });

  describe('clearSourceCache', () => {
    it('clears the cache', () => {
      const source = 'test content';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
      };

      // Cache the file
      formatSourceSnippet(filePath, span);

      // Clear cache
      clearSourceCache();

      // Delete file
      fs.unlinkSync(filePath);

      // Should return empty string since cache is cleared and file doesn't exist
      const output = formatSourceSnippet(filePath, span);
      expect(output).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles very long lines', () => {
      const longLine = 'a'.repeat(1000);
      const source = longLine;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 500, offset: 499 },
        end: { line: 1, column: 510, offset: 509 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('1 |');
      expect(output).toContain('^');
    });

    it('handles column 0 edge case', () => {
      const source = 'test';
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 0, offset: 0 },
      };

      const output = formatSourceSnippet(filePath, span);

      // Should handle gracefully without negative indices
      expect(output).toContain('test');
    });

    it('handles very large line numbers', () => {
      const lines = Array(10000).fill('x');
      const source = lines.join('\n');
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 9999, column: 1, offset: 19998 },
      };

      const output = formatSourceSnippet(filePath, span);

      expect(output).toContain('9999 |');
    });

    it('handles multi-line span with label', () => {
      const source = `fn test() {
  return 42;
}`;
      const filePath = createTestFile(source);
      const span: SourceSpan = {
        start: { line: 1, column: 4, offset: 3 },
        end: { line: 3, column: 1, offset: 28 },
      };

      const output = formatSourceSnippetFromContent(source, span, {
        label: 'function definition',
      });

      expect(output).toContain('function definition');
      expect(output).toContain('^');
    });
  });
});
