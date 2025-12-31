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
  type SourceSpan,
} from './sourceSnippet.js';
import type { Diagnostic, DiagnosticSeverity } from '../diagnostics.js';

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

  // Header: error[E500]: message
  const severityLabel = severityColor(diag.severity);
  const codeStr = diag.code ? severityColor(`[${diag.code}]`) : '';
  lines.push(`${severityLabel}${codeStr}: ${colors.bold(diag.message)}`);

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

  // Notes
  if (diag.notes) {
    for (const note of diag.notes) {
      lines.push(formatNote(note));
    }
  }

  // Help suggestion
  if (diag.suggestion) {
    lines.push(formatHelp(diag.suggestion));
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
