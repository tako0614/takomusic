// Static checker for TakoMusic source (VS Code version - no file system access)

import type { Program, Statement, Expression, ProcDeclaration } from './types/ast';
import type { Position } from './types/token';
import { findSimilarSymbols } from './errors';

// Count Japanese syllables (morae) for NEUTRINO compatibility
// Small kana (ゃゅょぁぃぅぇぉっ) don't count as separate syllables
function countSyllables(lyric: string): number {
  // Small hiragana and katakana that combine with previous character
  const smallKana = /[ゃゅょぁぃぅぇぉっャュョァィゥェォッ]/g;
  // Remove small kana (they don't count as separate syllables)
  const withoutSmall = lyric.replace(smallKana, '');
  // Count remaining kana characters
  const kanaOnly = withoutSmall.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
  return kanaOnly.length;
}

export interface Diagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  position?: Position;
  suggestion?: string;
}

export class Checker {
  private diagnostics: Diagnostic[] = [];
  private definedSymbols: Set<string> = new Set();
  private constSymbols: Set<string> = new Set();
  private procs: Map<string, ProcDeclaration> = new Map();
  private callGraph: Map<string, Set<string>> = new Map();
  private currentProc: string | null = null;
  private trackStarted: boolean = false;
  private tempoEventCount: number = 0;
  private inVocalTrack: boolean = false;

  check(program: Program): Diagnostic[] {
    this.diagnostics = [];
    this.definedSymbols.clear();
    this.constSymbols.clear();
    this.procs.clear();
    this.callGraph.clear();
    this.tempoEventCount = 0;

    // First pass: collect all proc declarations
    this.collectDeclarations(program);

    // Second pass: check each statement
    for (const stmt of program.statements) {
      this.checkStatement(stmt);
    }

    // Check for main procedure only if file appears to be an entry point (not a module)
    // A module typically only has declarations (proc, const, import, export) without main
    const hasTopLevelExecution = program.statements.some(
      stmt => stmt.kind === 'TrackBlock' || stmt.kind === 'ExpressionStatement'
    );
    const isLikelyModule = !hasTopLevelExecution && program.statements.some(
      stmt => stmt.kind === 'ExportStatement' || stmt.kind === 'ImportStatement'
    );

    if (!this.procs.has('main') && !isLikelyModule) {
      this.addError('E400', 'No main() procedure found', undefined, 'Add "export proc main() { ... }" to define the entry point');
    }

    // Note: Recursion is allowed in the language, so we don't check for it

    // W200: Too many tempo events
    if (this.tempoEventCount > 128) {
      this.addWarning('W200', `Too many tempo events (${this.tempoEventCount} > 128)`);
    }

    return this.diagnostics;
  }

  private collectDeclarations(program: Program): void {
    for (const stmt of program.statements) {
      if (stmt.kind === 'ProcDeclaration') {
        this.procs.set(stmt.name, stmt);
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
      } else if (stmt.kind === 'ExportStatement') {
        if (stmt.declaration.kind === 'ProcDeclaration') {
          this.procs.set(stmt.declaration.name, stmt.declaration);
          this.definedSymbols.add(stmt.declaration.name);
          this.constSymbols.add(stmt.declaration.name);
        } else {
          this.definedSymbols.add(stmt.declaration.name);
          this.constSymbols.add(stmt.declaration.name);
        }
      } else if (stmt.kind === 'ConstDeclaration') {
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
      } else if (stmt.kind === 'LetDeclaration') {
        this.definedSymbols.add(stmt.name);
      } else if (stmt.kind === 'ImportStatement') {
        for (const name of stmt.imports) {
          this.definedSymbols.add(name);
          this.constSymbols.add(name);
        }
      }
    }
  }

  private checkStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'ImportStatement':
        // Import checking skipped in VS Code extension (no file system access)
        break;

      case 'ProcDeclaration':
        this.checkProc(stmt);
        break;

      case 'ExportStatement':
        if (stmt.declaration.kind === 'ProcDeclaration') {
          this.checkProc(stmt.declaration);
        } else {
          this.checkExpression(stmt.declaration.value);
        }
        break;

      case 'ConstDeclaration':
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
        this.checkExpression(stmt.value);
        break;

      case 'LetDeclaration':
        this.definedSymbols.add(stmt.name);
        this.checkExpression(stmt.value);
        break;

      case 'AssignmentStatement':
        this.checkExpression(stmt.value);
        break;

      case 'IfStatement':
        this.checkExpression(stmt.condition);
        for (const s of stmt.consequent) {
          this.checkStatement(s);
        }
        if (stmt.alternate) {
          for (const s of stmt.alternate) {
            this.checkStatement(s);
          }
        }
        break;

      case 'ForStatement':
        this.checkExpression(stmt.range.start);
        this.checkExpression(stmt.range.end);
        // Note: Dynamic range bounds are allowed (e.g., from parameters)
        // Add loop variable to scope for body checking
        this.definedSymbols.add(stmt.variable);
        this.constSymbols.add(stmt.variable);
        for (const s of stmt.body) {
          this.checkStatement(s);
        }
        break;

      case 'TrackBlock':
        this.trackStarted = true;
        this.inVocalTrack = stmt.trackKind === 'vocal';
        for (const s of stmt.body) {
          this.checkStatement(s);
        }
        this.inVocalTrack = false;
        break;

      case 'ExpressionStatement':
        this.checkExpression(stmt.expression);
        break;
    }
  }

  private checkProc(proc: ProcDeclaration): void {
    const oldProc = this.currentProc;
    this.currentProc = proc.name;
    this.callGraph.set(proc.name, new Set());

    // Add parameters to scope
    for (const param of proc.params) {
      this.definedSymbols.add(param);
    }

    for (const stmt of proc.body) {
      this.checkStatement(stmt);
    }

    this.currentProc = oldProc;
  }

  private checkExpression(expr: Expression): void {
    switch (expr.kind) {
      case 'Identifier':
        if (!this.definedSymbols.has(expr.name)) {
          const builtins = ['kick', 'snare', 'hhc', 'hho', 'tom1', 'crash', 'ride',
            'note', 'rest', 'chord', 'drum', 'at', 'atTick', 'advance', 'advanceTick',
            'track', 'title', 'ppq', 'tempo', 'timeSig'];
          if (!builtins.includes(expr.name)) {
            const allSymbols = [...this.definedSymbols, ...builtins];
            const similar = findSimilarSymbols(expr.name, allSymbols);
            let suggestion: string | undefined;
            if (similar.length > 0) {
              suggestion = `Did you mean: ${similar.join(', ')}?`;
            }
            this.addError('E400', `Undefined symbol: ${expr.name}`, expr.position, suggestion);
          }
        }
        break;

      case 'CallExpression':
        // Track call in call graph
        if (this.currentProc && this.procs.has(expr.callee)) {
          this.callGraph.get(this.currentProc)?.add(expr.callee);
        }

        // Check arguments
        for (const arg of expr.arguments) {
          this.checkExpression(arg);
        }

        // Count tempo events for W200
        if (expr.callee === 'tempo') {
          this.tempoEventCount++;
        }

        // W100: Check for extremely short notes
        if ((expr.callee === 'note' || expr.callee === 'drum' || expr.callee === 'rest') && expr.arguments.length >= 2) {
          const durArg = expr.arguments[expr.callee === 'note' ? 1 : (expr.callee === 'drum' ? 1 : 0)];
          if (durArg.kind === 'DurLiteral') {
            if (durArg.numerator === 1 && durArg.denominator > 64) {
              this.addWarning('W100', `Extremely short note duration: ${durArg.numerator}/${durArg.denominator}`, expr.position);
            }
          }
        }

        // E210: Vocal lyric validation
        if (expr.callee === 'note' && this.inVocalTrack) {
          if (expr.arguments.length < 3) {
            this.addError('E210', 'Vocal note() requires a lyric (3rd argument)', expr.position,
              'Vocal note() requires 3 arguments: note(C4, 1/4, "あ")');
          } else {
            const lyricArg = expr.arguments[2];
            if (lyricArg.kind === 'StringLiteral') {
              if (lyricArg.value.trim() === '') {
                this.addError('E210', 'Vocal note() lyric cannot be empty', expr.position);
              }
              // E211: Check for kanji in lyrics (NEUTRINO only supports hiragana/katakana)
              if (/[\u4E00-\u9FFF]/.test(lyricArg.value)) {
                this.addError('E211', `Lyric contains kanji: "${lyricArg.value}" - NEUTRINO only supports hiragana/katakana`, expr.position,
                  'Convert kanji to hiragana for vocal synthesis');
              }
              // E212: Check syllable count (NEUTRINO works best with 1-2 syllables per note)
              const syllableCount = countSyllables(lyricArg.value);
              if (syllableCount > 2) {
                this.addError('E212', `Lyric "${lyricArg.value}" has ${syllableCount} syllables - NEUTRINO requires 1-2 syllables per note`, expr.position,
                  'Split into multiple notes with 1-2 syllables each');
              }
            }
          }
        }

        // E220: drum() should not be used in vocal track
        if (expr.callee === 'drum' && this.inVocalTrack) {
          this.addError('E220', 'drum() cannot be used in vocal track', expr.position);
        }

        // E221: chord() should not be used in vocal track
        if (expr.callee === 'chord' && this.inVocalTrack) {
          this.addError('E221', 'chord() cannot be used in vocal track', expr.position);
        }

        // Check if it's a global function called after track
        if (this.trackStarted) {
          const globalFuncs = ['title', 'ppq', 'tempo', 'timeSig'];
          if (globalFuncs.includes(expr.callee)) {
            this.addError('E050', `${expr.callee}() called after track started`, expr.position,
              'Move global functions (ppq, tempo, timeSig, title) before any track() blocks');
          }
        }
        break;

      case 'BinaryExpression':
        this.checkExpression(expr.left);
        this.checkExpression(expr.right);
        break;

      case 'UnaryExpression':
        this.checkExpression(expr.operand);
        break;

      case 'ArrayLiteral':
        for (const elem of expr.elements) {
          this.checkExpression(elem);
        }
        break;

      case 'ObjectLiteral':
        for (const prop of expr.properties) {
          this.checkExpression(prop.value);
        }
        break;

      case 'PitchLiteral':
        if (expr.midi < 0 || expr.midi > 127) {
          this.addError('E110', `Pitch out of range: ${expr.midi}`, expr.position,
            'Valid MIDI pitch range is 0-127 (C-1 to G9)');
        }
        break;
    }
  }

  private isConstant(expr: Expression): boolean {
    switch (expr.kind) {
      case 'IntLiteral':
      case 'FloatLiteral':
      case 'StringLiteral':
      case 'BoolLiteral':
        return true;

      case 'Identifier':
        return this.constSymbols.has(expr.name);

      case 'BinaryExpression':
        return this.isConstant(expr.left) && this.isConstant(expr.right);

      case 'UnaryExpression':
        return this.isConstant(expr.operand);

      default:
        return false;
    }
  }

  private checkRecursion(): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (proc: string, path: string[]): boolean => {
      if (stack.has(proc)) {
        this.addError('E310', `Recursion detected: ${[...path, proc].join(' -> ')}`);
        return true;
      }

      if (visited.has(proc)) {
        return false;
      }

      visited.add(proc);
      stack.add(proc);

      const calls = this.callGraph.get(proc) || new Set();
      for (const callee of calls) {
        if (dfs(callee, [...path, proc])) {
          return true;
        }
      }

      stack.delete(proc);
      return false;
    };

    for (const proc of this.procs.keys()) {
      dfs(proc, []);
    }
  }

  private addError(code: string, message: string, position?: Position, suggestion?: string): void {
    this.diagnostics.push({
      code,
      severity: 'error',
      message,
      position,
      suggestion,
    });
  }

  private addWarning(code: string, message: string, position?: Position, suggestion?: string): void {
    this.diagnostics.push({
      code,
      severity: 'warning',
      message,
      position,
      suggestion,
    });
  }
}
