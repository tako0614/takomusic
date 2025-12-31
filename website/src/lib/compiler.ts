/**
 * TakoMusic Compiler Integration for Web Playground
 *
 * This module integrates the browser-based TakoMusic compiler
 * for use in the web playground.
 */

import {
  compile as browserCompile,
  type CompileResult as BrowserCompileResult,
  type ScoreIR,
} from '../../../dist/browser/index.js';

export interface CompileResult {
  success: boolean;
  diagnostics: Diagnostic[];
  ast?: object;
  ir?: ScoreIR;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
}

/**
 * Compile TakoMusic source code using the real browser compiler
 */
export async function compile(source: string): Promise<CompileResult> {
  try {
    const result: BrowserCompileResult = browserCompile(source, '/main.mf');

    // Convert diagnostics to playground format
    const diagnostics: Diagnostic[] = result.diagnostics.map((d) => ({
      severity: (d.severity === 'error' ? 'error' : 'warning') as 'error' | 'warning',
      message: d.message,
      line: d.position?.line,
      column: d.position?.column,
    }));

    return {
      success: result.success,
      diagnostics,
      ast: result.ast,
      ir: result.ir,
    };
  } catch (err) {
    return {
      success: false,
      diagnostics: [
        {
          severity: 'error',
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
}

// Re-export ScoreIR type for use in other modules
export type { ScoreIR };
