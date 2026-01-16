/**
 * Source code snippet extraction and formatting for error display
 * Produces Rust-style error output with line numbers, carets, and labels
 */

import * as fs from 'fs';
import { colors } from './colors.js';
import type { Position } from '../token.js';
import type { SourceSpan as DiagnosticSpan } from '../diagnostics.js';

// Re-export SourceSpan for compatibility
export type SourceSpan = DiagnosticSpan;

/**
 * Get terminal width, with fallback
 */
function getTerminalWidth(): number {
  try {
    if (process.stdout.columns) {
      return Math.max(40, process.stdout.columns);
    }
  } catch {
    // Ignore errors
  }
  return 80; // Default width
}

/**
 * Wrap text to fit within terminal width
 */
export function wrapText(text: string, maxWidth: number, indent: number = 0): string {
  if (text.length + indent <= maxWidth) {
    return text;
  }

  const effectiveWidth = maxWidth - indent;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= effectiveWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const indentStr = ' '.repeat(indent);
  return lines.map((line, i) => (i === 0 ? line : indentStr + line)).join('\n');
}

export interface SnippetOptions {
  /** Number of context lines before the error */
  linesBefore?: number;
  /** Number of context lines after the error */
  linesAfter?: number;
  /** The label to show under the carets */
  label?: string;
  /** Whether this is a warning (uses yellow instead of red) */
  isWarning?: boolean;
  /** Whether this is an info/hint (uses cyan instead of red) */
  isInfo?: boolean;
}

/**
 * Read source file and cache for repeated access
 */
const sourceCache = new Map<string, string[]>();

function getSourceLines(filePath: string): string[] | null {
  if (sourceCache.has(filePath)) {
    return sourceCache.get(filePath)!;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    sourceCache.set(filePath, lines);
    return lines;
  } catch {
    return null;
  }
}

/**
 * Clear the source cache
 */
export function clearSourceCache(): void {
  sourceCache.clear();
}

/**
 * Calculate the width needed for line numbers
 */
function lineNumberWidth(maxLine: number): number {
  return Math.max(String(maxLine).length, 2);
}

/**
 * Format a single source line with line number
 */
function formatSourceLine(
  lineNum: number,
  content: string,
  width: number,
  highlight: boolean = false
): string {
  const numStr = String(lineNum).padStart(width, ' ');
  const prefix = colors.lineNumber(numStr) + ' ' + colors.pipe('|') + ' ';
  return prefix + content;
}

/**
 * Get the underline color based on severity
 */
function getUnderlineColor(isWarning: boolean, isInfo: boolean): (text: string) => string {
  if (isInfo) return colors.hint;
  if (isWarning) return colors.underlineWarning;
  return colors.underlineError;
}

/**
 * Generate error underline (^^^) for a span
 */
function generateUnderline(
  column: number,
  length: number,
  label: string | undefined,
  isWarning: boolean,
  lineNumberWidth: number,
  isInfo: boolean = false
): string {
  const padding = ' '.repeat(lineNumberWidth) + ' ' + colors.pipe('|') + ' ';
  const leadingSpaces = ' '.repeat(Math.max(0, column - 1));
  const caretCount = Math.max(1, length);
  const carets = '^'.repeat(caretCount);

  const underlineColor = getUnderlineColor(isWarning, isInfo);
  let result = padding + leadingSpaces + underlineColor(carets);

  if (label) {
    result += ' ' + underlineColor(label);
  }

  return result;
}

/**
 * Format a source code snippet with error highlighting
 * Produces Rust-style error output
 * Supports both single-line and multi-line spans
 */
export function formatSourceSnippet(
  filePath: string,
  span: SourceSpan,
  options: SnippetOptions = {}
): string {
  const {
    linesBefore = 0,
    linesAfter = 0,
    label,
    isWarning = false,
    isInfo = false,
  } = options;

  const lines = getSourceLines(filePath);
  if (!lines) {
    return ''; // Cannot read source file
  }

  const startLine = span.start.line;
  const startColumn = span.start.column;
  const endLine = span.end?.line ?? startLine;
  const endColumn = span.end?.column ?? startColumn + 1;

  // Check if this is a multi-line span
  const isMultiLine = endLine > startLine;

  // Calculate display line range
  const displayStartLine = Math.max(1, startLine - linesBefore);
  const displayEndLine = Math.min(lines.length, endLine + linesAfter);

  // Calculate width for line numbers
  const width = lineNumberWidth(displayEndLine);

  const output: string[] = [];
  const underlineColor = getUnderlineColor(isWarning, isInfo);

  // Add blank line prefix
  const blankPrefix = ' '.repeat(width) + ' ' + colors.pipe('|');
  output.push(blankPrefix);

  if (isMultiLine) {
    // Multi-line span handling with vertical bar indicator
    for (let i = displayStartLine; i <= displayEndLine; i++) {
      const lineContent = lines[i - 1] ?? '';
      const isInSpan = i >= startLine && i <= endLine;
      const isSpanStart = i === startLine;
      const isSpanEnd = i === endLine;

      // Line number and pipe
      const numStr = String(i).padStart(width, ' ');

      if (isInSpan) {
        // Show vertical bar for span
        const barChar = isSpanStart ? '/' : isSpanEnd ? '\\' : '|';
        const prefix = colors.lineNumber(numStr) + ' ' + underlineColor(barChar) + ' ';
        output.push(prefix + lineContent);

        // Add underline on first line
        if (isSpanStart) {
          const leadingSpaces = ' '.repeat(Math.max(0, startColumn - 1));
          const underlineLen = lineContent.length - startColumn + 1;
          const carets = '_'.repeat(Math.max(1, underlineLen));
          const underline = ' '.repeat(width) + ' ' + underlineColor('|') + ' ' + leadingSpaces + underlineColor(carets);
          output.push(underline);
        }

        // Add underline and label on last line
        if (isSpanEnd) {
          const leadingSpaces = ' '.repeat(0);
          const carets = '^'.repeat(Math.max(1, endColumn - 1));
          let underline = ' '.repeat(width) + ' ' + underlineColor('|') + ' ' + leadingSpaces + underlineColor(carets);
          if (label) {
            underline += ' ' + underlineColor(label);
          }
          output.push(underline);
        }
      } else {
        output.push(formatSourceLine(i, lineContent, width));
      }
    }
  } else {
    // Single-line span (original behavior)
    const spanLength = Math.max(1, endColumn - startColumn);

    for (let i = displayStartLine; i <= displayEndLine; i++) {
      const lineContent = lines[i - 1] ?? '';
      output.push(formatSourceLine(i, lineContent, width, i === startLine));

      // Add underline after the error line
      if (i === startLine) {
        output.push(generateUnderline(startColumn, spanLength, label, isWarning, width, isInfo));
      }
    }
  }

  return output.join('\n');
}

/**
 * Format source snippet from source content string (for LSP/tests without file access)
 * Supports both single-line and multi-line spans
 */
export function formatSourceSnippetFromContent(
  sourceContent: string,
  span: SourceSpan,
  options: SnippetOptions = {}
): string {
  const {
    linesBefore = 0,
    linesAfter = 0,
    label,
    isWarning = false,
    isInfo = false,
  } = options;

  const lines = sourceContent.split(/\r?\n/);
  const startLine = span.start.line;
  const startColumn = span.start.column;
  const endLine = span.end?.line ?? startLine;
  const endColumn = span.end?.column ?? startColumn + 1;

  // Check if this is a multi-line span
  const isMultiLine = endLine > startLine;

  // Calculate display line range
  const displayStartLine = Math.max(1, startLine - linesBefore);
  const displayEndLine = Math.min(lines.length, endLine + linesAfter);

  // Calculate width for line numbers
  const width = lineNumberWidth(displayEndLine);

  const output: string[] = [];
  const underlineColor = getUnderlineColor(isWarning, isInfo);

  // Add blank line prefix
  const blankPrefix = ' '.repeat(width) + ' ' + colors.pipe('|');
  output.push(blankPrefix);

  if (isMultiLine) {
    // Multi-line span handling with vertical bar indicator
    for (let i = displayStartLine; i <= displayEndLine; i++) {
      const lineContent = lines[i - 1] ?? '';
      const isInSpan = i >= startLine && i <= endLine;
      const isSpanStart = i === startLine;
      const isSpanEnd = i === endLine;

      // Line number and pipe
      const numStr = String(i).padStart(width, ' ');

      if (isInSpan) {
        // Show vertical bar for span
        const barChar = isSpanStart ? '/' : isSpanEnd ? '\\' : '|';
        const prefix = colors.lineNumber(numStr) + ' ' + underlineColor(barChar) + ' ';
        output.push(prefix + lineContent);

        // Add underline on first line
        if (isSpanStart) {
          const leadingSpaces = ' '.repeat(Math.max(0, startColumn - 1));
          const underlineLen = lineContent.length - startColumn + 1;
          const carets = '_'.repeat(Math.max(1, underlineLen));
          const underline = ' '.repeat(width) + ' ' + underlineColor('|') + ' ' + leadingSpaces + underlineColor(carets);
          output.push(underline);
        }

        // Add underline and label on last line
        if (isSpanEnd) {
          const leadingSpaces = ' '.repeat(0);
          const carets = '^'.repeat(Math.max(1, endColumn - 1));
          let underline = ' '.repeat(width) + ' ' + underlineColor('|') + ' ' + leadingSpaces + underlineColor(carets);
          if (label) {
            underline += ' ' + underlineColor(label);
          }
          output.push(underline);
        }
      } else {
        output.push(formatSourceLine(i, lineContent, width));
      }
    }
  } else {
    // Single-line span (original behavior)
    const spanLength = Math.max(1, endColumn - startColumn);

    for (let i = displayStartLine; i <= displayEndLine; i++) {
      const lineContent = lines[i - 1] ?? '';
      output.push(formatSourceLine(i, lineContent, width, i === startLine));

      // Add underline after the error line
      if (i === startLine) {
        output.push(generateUnderline(startColumn, spanLength, label, isWarning, width, isInfo));
      }
    }
  }

  return output.join('\n');
}

/**
 * Format location string (e.g., "--> src/main.mf:15:12")
 */
export function formatLocation(filePath: string | undefined, position: Position | undefined): string {
  if (!position) {
    return filePath ? `  --> ${filePath}` : '';
  }

  const loc = filePath ?? 'unknown';
  return `  ${colors.location('-->')} ${loc}:${position.line}:${position.column}`;
}

/**
 * Format a help message
 */
export function formatHelp(message: string): string {
  const prefix = '  ' + colors.pipe('=') + ' ';
  return prefix + colors.note('help') + ': ' + message;
}

/**
 * Format a note message
 */
export function formatNote(message: string): string {
  const prefix = '  ' + colors.pipe('=') + ' ';
  return prefix + colors.note('note') + ': ' + message;
}
