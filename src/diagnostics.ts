import type { Position } from './token.js';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Source span representing a range in source code
 */
export interface SourceSpan {
  start: Position;
  end?: Position;
}

/**
 * A labeled span for additional context (e.g., "defined here")
 */
export interface LabeledSpan {
  span: SourceSpan;
  label?: string;
  filePath?: string;
}

/**
 * Diagnostic message with full context for rich formatting
 */
export interface Diagnostic {
  /** Severity level: error, warning, info, or hint */
  severity: DiagnosticSeverity;
  /** Error code (e.g., E500, W100) */
  code?: string;
  /** Primary error message */
  message: string;
  /** Start position of the error */
  position?: Position;
  /** End position for span highlighting */
  endPosition?: Position;
  /** Source file path */
  filePath?: string;
  /** Help suggestion shown as "= help: ..." */
  suggestion?: string;
  /** Additional notes shown as "= note: ..." */
  notes?: string[];
  /** Label shown under the error caret (e.g., "MIDI pitch 132 exceeds 127") */
  label?: string;
  /** Additional labeled spans for related locations */
  relatedSpans?: LabeledSpan[];
}

/**
 * Create a diagnostic with all fields
 */
export function createDiagnostic(
  severity: DiagnosticSeverity,
  message: string,
  options: {
    code?: string;
    position?: Position;
    endPosition?: Position;
    filePath?: string;
    suggestion?: string;
    notes?: string[];
    label?: string;
    relatedSpans?: LabeledSpan[];
  } = {}
): Diagnostic {
  return {
    severity,
    message,
    ...options,
  };
}

/**
 * Create an error diagnostic
 */
export function createErrorDiagnostic(
  code: string,
  message: string,
  options: Omit<Parameters<typeof createDiagnostic>[2], never> = {}
): Diagnostic {
  return createDiagnostic('error', message, { code, ...options });
}

/**
 * Create a warning diagnostic
 */
export function createWarningDiagnostic(
  code: string,
  message: string,
  options: Omit<Parameters<typeof createDiagnostic>[2], never> = {}
): Diagnostic {
  return createDiagnostic('warning', message, { code, ...options });
}

/**
 * Simple format for non-CLI uses (e.g., tests, LSP)
 * Produces a compact one-line format
 */
export function formatDiagnostic(diag: Diagnostic): string {
  const loc = diag.position
    ? `${diag.filePath ?? 'unknown'}:${diag.position.line}:${diag.position.column}`
    : diag.filePath ?? '';
  const prefix = diag.severity === 'error' ? 'error' : diag.severity;
  const codeStr = diag.code ? `[${diag.code}]` : '';
  const main = `${prefix}${codeStr}: ${diag.message}`;

  const lines = [main];
  if (loc) {
    lines.push(`  --> ${loc}`);
  }
  if (diag.suggestion) {
    lines.push(`  = help: ${diag.suggestion}`);
  }
  if (diag.notes) {
    for (const note of diag.notes) {
      lines.push(`  = note: ${note}`);
    }
  }
  return lines.join('\n');
}

/**
 * Get the error code category description
 */
export function getErrorCategory(code: string): string {
  if (!code) return 'Unknown';
  const prefix = code.charAt(0);
  const num = parseInt(code.slice(1, 2), 10);

  if (prefix === 'E') {
    switch (num) {
      case 0: return 'Configuration';
      case 1: return 'Syntax';
      case 2: return 'Type';
      case 3: return 'Evaluation';
      case 4: return 'Module';
      case 5: return 'MIDI';
      case 6: return 'Notation';
      default: return 'Error';
    }
  } else if (prefix === 'W') {
    return 'Warning';
  }
  return 'Unknown';
}
