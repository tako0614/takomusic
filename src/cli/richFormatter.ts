/**
 * Rich diagnostic formatter for CLI output
 * Produces Rust-style colored error messages with source context
 */

import { colors } from './colors.js';
import {
  formatSourceSnippet,
  formatLocation,
  formatHelp,
  formatNote,
  wrapText,
  type SourceSpan,
} from './sourceSnippet.js';
import type { Diagnostic, DiagnosticSeverity } from '../diagnostics.js';

/**
 * Get terminal width for text wrapping
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
 * Get the color function for a severity level
 */
function getSeverityColor(severity: DiagnosticSeverity): (text: string) => string {
  switch (severity) {
    case 'error':
      return colors.error;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    case 'hint':
      return colors.hint;
    default:
      return colors.error;
  }
}

/**
 * Format a diagnostic with rich colors and source context
 *
 * Example output:
 * ```
 * error[E500]: Pitch out of range 0..127
 *   --> src/main.mf:15:12
 *    |
 * 15 |     note(Z9, q);
 *    |          ^^ MIDI pitch 132 exceeds 127
 *    |
 *    = help: Valid MIDI pitch range is 0-127 (C-1 to G9). Try using a different octave.
 * ```
 */
export function formatRichDiagnostic(diag: Diagnostic): string {
  const lines: string[] = [];
  const severityColor = getSeverityColor(diag.severity);
  const termWidth = getTerminalWidth();

  // Header: error[E500]: message
  const severityLabel = severityColor(diag.severity);
  const codeStr = diag.code ? severityColor(`[${diag.code}]`) : '';
  const headerPrefix = `${severityLabel}${codeStr}: `;
  const headerPrefixLen = diag.severity.length + (diag.code ? diag.code.length + 2 : 0) + 2;

  // Wrap long messages
  const wrappedMessage = wrapText(diag.message, termWidth, headerPrefixLen);
  lines.push(`${headerPrefix}${colors.bold(wrappedMessage)}`);

  // Location: --> src/main.mf:15:12
  if (diag.position || diag.filePath) {
    lines.push(formatLocation(diag.filePath, diag.position));
  }

  // Source snippet with underline and label
  if (diag.filePath && diag.position) {
    const span: SourceSpan = {
      start: diag.position,
      end: diag.endPosition,
    };
    const snippet = formatSourceSnippet(diag.filePath, span, {
      isWarning: diag.severity === 'warning',
      isInfo: diag.severity === 'info' || diag.severity === 'hint',
      label: diag.label,
    });
    if (snippet) {
      lines.push(snippet);
    }
  }

  // Related spans (for "defined here" style annotations)
  if (diag.relatedSpans) {
    for (const related of diag.relatedSpans) {
      const relatedFile = related.filePath ?? diag.filePath;
      if (relatedFile && related.span.start) {
        lines.push(formatLocation(relatedFile, related.span.start));
        const snippet = formatSourceSnippet(relatedFile, related.span, {
          isInfo: true,
          label: related.label,
        });
        if (snippet) {
          lines.push(snippet);
        }
      }
    }
  }

  // Notes (with wrapping)
  if (diag.notes) {
    for (const note of diag.notes) {
      const wrappedNote = wrapText(note, termWidth - 10, 10);
      lines.push(formatNote(wrappedNote));
    }
  }

  // Help suggestion (with wrapping)
  if (diag.suggestion) {
    const wrappedHelp = wrapText(diag.suggestion, termWidth - 10, 10);
    lines.push(formatHelp(wrappedHelp));
  }

  return lines.join('\n');
}

/**
 * Format multiple diagnostics with summary
 */
export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return colors.success('No issues found.');
  }

  const lines: string[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const diag of diagnostics) {
    lines.push(formatRichDiagnostic(diag));
    lines.push(''); // Blank line between diagnostics

    if (diag.severity === 'error') {
      errorCount++;
    } else {
      warningCount++;
    }
  }

  // Summary
  const parts: string[] = [];
  if (errorCount > 0) {
    const label = errorCount === 1 ? 'error' : 'errors';
    parts.push(colors.error(`${errorCount} ${label}`));
  }
  if (warningCount > 0) {
    const label = warningCount === 1 ? 'warning' : 'warnings';
    parts.push(colors.warning(`${warningCount} ${label}`));
  }

  if (parts.length > 0) {
    const summaryText = errorCount > 0
      ? colors.boldRed(`aborting due to ${parts.join(' and ')}`)
      : `generated ${parts.join(' and ')}`;
    lines.push(summaryText);
  }

  return lines.join('\n');
}

/**
 * Print diagnostics to stderr
 */
export function printDiagnostics(diagnostics: Diagnostic[]): void {
  console.error(formatDiagnostics(diagnostics));
}
