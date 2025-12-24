import type { Position } from './token.js';

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  position?: Position;
  filePath?: string;
}

export function formatDiagnostic(diag: Diagnostic): string {
  const loc = diag.position
    ? `${diag.filePath ?? 'unknown'}:${diag.position.line}:${diag.position.column}`
    : diag.filePath ?? '';
  const prefix = diag.severity === 'error' ? 'error' : 'warning';
  return loc ? `${prefix}: ${diag.message}\n  --> ${loc}` : `${prefix}: ${diag.message}`;
}
