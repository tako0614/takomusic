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

  const errorLine = span.start.line;
  const errorColumn = span.start.column;
  const errorEndColumn = span.end?.column ?? errorColumn + 1;
  const spanLength = span.end?.line === span.start.line
    ? Math.max(1, errorEndColumn - errorColumn)
    : 1;

  // Calculate line range
  const startLine = Math.max(1, errorLine - linesBefore);
  const endLine = Math.min(lines.length, errorLine + linesAfter);

  // Calculate width for line numbers
  const width = lineNumberWidth(endLine);

  const output: string[] = [];

  // Add blank line prefix
  const blankPrefix = ' '.repeat(width) + ' ' + colors.pipe('|');
  output.push(blankPrefix);

  // Add source lines
  for (let i = startLine; i <= endLine; i++) {
    const lineContent = lines[i - 1] ?? '';
    output.push(formatSourceLine(i, lineContent, width, i === errorLine));

    // Add underline after the error line
    if (i === errorLine) {
      output.push(generateUnderline(errorColumn, spanLength, label, isWarning, width, isInfo));
    }
  }

  return output.join('\n');
}

/**
 * Format source snippet from source content string (for LSP/tests without file access)
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
  const errorLine = span.start.line;
  const errorColumn = span.start.column;
  const errorEndColumn = span.end?.column ?? errorColumn + 1;
  const spanLength = span.end?.line === span.start.line
    ? Math.max(1, errorEndColumn - errorColumn)
    : 1;

  // Calculate line range
  const startLine = Math.max(1, errorLine - linesBefore);
  const endLine = Math.min(lines.length, errorLine + linesAfter);

  // Calculate width for line numbers
  const width = lineNumberWidth(endLine);

  const output: string[] = [];

  // Add blank line prefix
  const blankPrefix = ' '.repeat(width) + ' ' + colors.pipe('|');
  output.push(blankPrefix);

  // Add source lines
  for (let i = startLine; i <= endLine; i++) {
    const lineContent = lines[i - 1] ?? '';
    output.push(formatSourceLine(i, lineContent, width, i === errorLine));

    // Add underline after the error line
    if (i === errorLine) {
      output.push(generateUnderline(errorColumn, spanLength, label, isWarning, width, isInfo));
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
