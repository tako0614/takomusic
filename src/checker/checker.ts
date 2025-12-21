// Static checker for TakoScore v2.0 source

import * as fs from 'fs';
import * as path from 'path';
import type { Score, Statement, Expression, ProcDeclaration, GlobalStatement, PartDeclaration, PhraseBlock } from '../types/ast.js';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import type { Position } from '../types/token.js';
import { findSimilarSymbols } from '../errors.js';
import { isStdlibImport, resolveStdlibPath } from '../utils/stdlib.js';

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
  filePath?: string;
  suggestion?: string;
}

export class Checker {
  private diagnostics: Diagnostic[] = [];
  private baseDir: string;
  private definedSymbols: Set<string> = new Set();
  private constSymbols: Set<string> = new Set(); // Track const-only symbols
  private procs: Map<string, ProcDeclaration> = new Map();
  private callGraph: Map<string, Set<string>> = new Map();
  private currentProc: string | null = null;
  private hasGlobalCalls: boolean = false;
  private trackStarted: boolean = false;
  private tempoEventCount: number = 0;
  private inVocalTrack: boolean = false;
  private currentTrackKind: 'vocal' | 'midi' | null = null;
  private importChain: Set<string> = new Set(); // Track import chain for circular detection

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  check(score: Score, filePath: string): Diagnostic[] {
    this.diagnostics = [];
    this.definedSymbols.clear();
    this.constSymbols.clear();
    this.procs.clear();
    this.callGraph.clear();
    this.tempoEventCount = 0;

    // First pass: collect all proc declarations from globals
    this.collectDeclarations(score);

    // Second pass: check global statements
    for (const stmt of score.globals) {
      this.checkGlobalStatement(stmt, filePath);
    }

    // Third pass: check parts
    for (const part of score.parts) {
      this.checkPart(part, filePath);
    }

    // Check for recursion
    this.checkRecursion();

    // W200: Too many tempo events
    if (this.tempoEventCount > 128) {
      this.addWarning('W200', `Too many tempo events (${this.tempoEventCount} > 128)`, undefined, filePath);
    }

    return this.diagnostics;
  }

  private collectDeclarations(score: Score): void {
    for (const stmt of score.globals) {
      if (stmt.kind === 'ProcDeclaration') {
        this.procs.set(stmt.name, stmt);
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
      } else if (stmt.kind === 'ConstDeclaration') {
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
      } else if (stmt.kind === 'ImportStatement') {
        if (stmt.namespace) {
          this.definedSymbols.add(stmt.namespace);
          this.constSymbols.add(stmt.namespace);
        } else {
          // Named imports: import { a, b } from "path"
          for (const name of stmt.imports) {
            this.definedSymbols.add(name);
            this.constSymbols.add(name); // imports are constant
          }
        }
      }
    }
  }

  private checkGlobalStatement(stmt: GlobalStatement, filePath: string): void {
    switch (stmt.kind) {
      case 'ImportStatement':
        this.checkImport(stmt, filePath);
        break;
      case 'ProcDeclaration':
        this.checkProc(stmt, filePath);
        break;
      case 'ConstDeclaration':
        this.checkExpression(stmt.value, filePath);
        break;
      case 'TempoStatement':
        this.tempoEventCount++;
        this.checkExpression(stmt.bpm, filePath);
        break;
      case 'TimeSignatureStatement':
        this.checkExpression(stmt.numerator, filePath);
        this.checkExpression(stmt.denominator, filePath);
        break;
      case 'KeySignatureStatement':
        this.checkExpression(stmt.root, filePath);
        break;
      case 'PpqStatement':
        this.checkExpression(stmt.value, filePath);
        break;
    }
  }

  private checkPart(part: PartDeclaration, filePath: string): void {
    this.currentTrackKind = part.partKind;
    this.inVocalTrack = part.partKind === 'vocal';

    for (const item of part.body) {
      if (item.kind === 'PhraseBlock') {
        this.checkPhraseBlock(item, filePath);
      } else if (item.kind === 'RestStatement') {
        this.checkExpression(item.duration, filePath);
      } else if (item.kind === 'MidiBar') {
        for (const midiItem of item.items) {
          if (midiItem.kind === 'MidiNote') {
            this.checkExpression(midiItem.pitch, filePath);
            this.checkExpression(midiItem.duration, filePath);
          } else if (midiItem.kind === 'MidiChord') {
            for (const pitch of midiItem.pitches) {
              this.checkExpression(pitch, filePath);
            }
            this.checkExpression(midiItem.duration, filePath);
          } else if (midiItem.kind === 'MidiDrum') {
            this.checkExpression(midiItem.duration, filePath);
          }
        }
      } else {
        this.checkStatement(item as Statement, filePath);
      }
    }

    this.currentTrackKind = null;
    this.inVocalTrack = false;
  }

  private checkPhraseBlock(phrase: PhraseBlock, filePath: string): void {
    // Check notes section
    if (phrase.notesSection) {
      for (const bar of phrase.notesSection.bars) {
        for (const note of bar.notes) {
          this.checkExpression(note.pitch, filePath);
          this.checkExpression(note.duration, filePath);

          // Check pitch range for vocal
          if (note.pitch.kind === 'PitchLiteral') {
            const midi = note.pitch.midi;
            if (midi < 0 || midi > 127) {
              this.addError('E110', `Pitch out of range: ${midi}`, note.pitch.position, filePath);
            }
            // Warn for extreme vocal ranges
            if (midi < 40 || midi > 84) {
              this.addWarning('W110', `Note ${midi} may be outside comfortable vocal range`, note.pitch.position, filePath);
            }
          }
        }
      }
    }

    // Check lyrics section
    if (phrase.lyricsSection) {
      const onsetCount = phrase.notesSection ?
        this.countOnsets(phrase) : 0;
      const lyricCount = phrase.lyricsSection.tokens.length;

      if (onsetCount !== lyricCount) {
        this.addError('E100',
          `Lyric count mismatch: ${onsetCount} onsets, ${lyricCount} lyrics`,
          phrase.lyricsSection.position, filePath);
      }

      // Check for kanji in lyrics
      for (const token of phrase.lyricsSection.tokens) {
        if (!token.isMelisma && this.containsKanji(token.value)) {
          this.addError('E211',
            `Kanji in lyrics: "${token.value}" - NEUTRINO requires hiragana/katakana`,
            token.position, filePath);
        }
      }
    }
  }

  private countOnsets(phrase: PhraseBlock): number {
    if (!phrase.notesSection) return 0;

    let count = 0;
    let prevTie = false;

    for (const bar of phrase.notesSection.bars) {
      for (const note of bar.notes) {
        // If previous note had tie and this is same pitch, don't count
        if (!prevTie) {
          count++;
        }
        prevTie = note.tieStart || false;
      }
    }

    return count;
  }

  private containsKanji(text: string): boolean {
    // CJK Unified Ideographs range
    return /[\u4E00-\u9FFF]/.test(text);
  }

  private checkStatement(stmt: Statement, filePath: string): void {
    switch (stmt.kind) {
      case 'ImportStatement':
        this.checkImport(stmt, filePath);
        break;

      case 'ProcDeclaration':
        this.checkProc(stmt, filePath);
        break;

      case 'ExportStatement':
        if (stmt.declaration.kind === 'ProcDeclaration') {
          this.checkProc(stmt.declaration, filePath);
        } else {
          this.checkExpression(stmt.declaration.value, filePath);
        }
        break;

      case 'ConstDeclaration':
        this.definedSymbols.add(stmt.name);
        this.constSymbols.add(stmt.name);
        this.checkExpression(stmt.value, filePath);
        break;

      case 'LetDeclaration':
        this.definedSymbols.add(stmt.name);
        // NOT added to constSymbols - let is mutable
        this.checkExpression(stmt.value, filePath);
        break;

      case 'AssignmentStatement':
        this.checkExpression(stmt.value, filePath);
        break;

      case 'IfStatement':
        this.checkExpression(stmt.condition, filePath);
        for (const s of stmt.consequent) {
          this.checkStatement(s, filePath);
        }
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            // else: alternate is Statement[]
            for (const s of stmt.alternate) {
              this.checkStatement(s, filePath);
            }
          } else {
            // else if: alternate is a single IfStatement
            this.checkStatement(stmt.alternate, filePath);
          }
        }
        break;

      case 'ForStatement':
        this.checkExpression(stmt.range.start, filePath);
        this.checkExpression(stmt.range.end, filePath);
        // Check if range bounds are compile-time constants
        if (!this.isConstant(stmt.range.start) || !this.isConstant(stmt.range.end)) {
          // Relaxed: now a warning instead of error
          this.addWarning('W401', 'For range bounds are not compile-time constants - runtime iteration limit (100000) will be enforced', stmt.position, filePath);
        }
        // Add loop variable to scope for body checking
        this.definedSymbols.add(stmt.variable);
        this.constSymbols.add(stmt.variable); // Loop variable is treated as const
        for (const s of stmt.body) {
          this.checkStatement(s, filePath);
        }
        break;

      case 'ForEachStatement':
        this.checkExpression(stmt.iterable, filePath);
        this.definedSymbols.add(stmt.variable);
        this.constSymbols.add(stmt.variable);
        for (const s of stmt.body) {
          this.checkStatement(s, filePath);
        }
        break;

      case 'WhileStatement':
        this.checkExpression(stmt.condition, filePath);
        for (const s of stmt.body) {
          this.checkStatement(s, filePath);
        }
        break;

      case 'MatchStatement':
        this.checkExpression(stmt.expression, filePath);
        for (const c of stmt.cases) {
          if (c.pattern) {
            this.checkExpression(c.pattern, filePath);
          }
          for (const s of c.body) {
            this.checkStatement(s, filePath);
          }
        }
        break;

      case 'ReturnStatement':
        if (stmt.value) {
          this.checkExpression(stmt.value, filePath);
        }
        break;

      case 'BreakStatement':
      case 'ContinueStatement':
        // No expression to check
        break;

      case 'IndexAssignmentStatement':
        this.checkExpression(stmt.object, filePath);
        this.checkExpression(stmt.index, filePath);
        this.checkExpression(stmt.value, filePath);
        break;

      case 'PropertyAssignmentStatement':
        this.checkExpression(stmt.object, filePath);
        this.checkExpression(stmt.value, filePath);
        break;

      case 'DestructuringDeclaration':
        this.checkExpression(stmt.value, filePath);
        // Add destructured variables to scope
        this.addPatternVariables(stmt.pattern, stmt.mutable);
        break;

      case 'ExpressionStatement':
        this.checkExpression(stmt.expression, filePath);
        break;
    }
  }

  private checkImport(stmt: Statement & { kind: 'ImportStatement' }, filePath: string): void {
    // Resolve import path (handle std: imports)
    const importPath = isStdlibImport(stmt.path)
      ? resolveStdlibPath(stmt.path)
      : path.resolve(path.dirname(filePath), stmt.path);

    if (!fs.existsSync(importPath)) {
      this.addError('E400', `Import not found: ${stmt.path}`, stmt.position, filePath);
      return;
    }

    // Check for circular imports
    const normalizedPath = path.normalize(importPath);
    if (this.importChain.has(normalizedPath)) {
      this.addError('E302', `Circular import detected: ${stmt.path}`, stmt.position, filePath);
      return;
    }

    // Add to import chain before processing
    this.importChain.add(normalizedPath);

    // Check imported module
    try {
      const source = fs.readFileSync(importPath, 'utf-8');
      const lexer = new Lexer(source, importPath);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, importPath);
      const score = parser.parse();

      // Check nested imports
      for (const s of score.globals) {
        if (s.kind === 'ImportStatement') {
          this.checkImport(s, importPath);
        }
      }
    } catch (err) {
      this.addError('E400', `Error reading import: ${stmt.path}`, stmt.position, filePath);
    }

    // Remove from import chain after processing
    this.importChain.delete(normalizedPath);
  }

  private checkProc(proc: ProcDeclaration, filePath: string): void {
    const oldProc = this.currentProc;
    this.currentProc = proc.name;
    this.callGraph.set(proc.name, new Set());

    // Save current symbols to restore after proc scope
    const savedSymbols = new Set(this.definedSymbols);
    const savedConstSymbols = new Set(this.constSymbols);

    // Add proc parameters to scope
    for (const param of proc.params) {
      this.definedSymbols.add(param.name);
      // Parameters are treated as const within the proc
      this.constSymbols.add(param.name);
    }

    for (const stmt of proc.body) {
      this.checkStatement(stmt, filePath);
    }

    // Restore symbols (simple scoping)
    this.definedSymbols = savedSymbols;
    this.constSymbols = savedConstSymbols;
    this.currentProc = oldProc;
  }

  private checkExpression(expr: Expression, filePath: string): void {
    switch (expr.kind) {
      case 'Identifier':
        if (!this.definedSymbols.has(expr.name)) {
          // Check if it's a built-in drum name or intrinsic
          const builtins = ['kick', 'snare', 'hhc', 'hho', 'tom1', 'crash', 'ride',
            'note', 'rest', 'chord', 'drum', 'at', 'atTick', 'advance', 'advanceTick',
            'track', 'title', 'ppq', 'tempo', 'timeSig',
            'len', 'push', 'pop', 'concat', 'slice', 'reverse', 'fill', 'copy',
            'map', 'filter', 'reduce', 'find', 'findIndex', 'some', 'every', 'includes',
            'flat', 'flatMap', 'forEach', 'sort',
            'split', 'join', 'substr', 'indexOf', 'replace', 'trim', 'upper', 'lower',
            'startsWith', 'endsWith', 'contains', 'repeat', 'charAt', 'charCodeAt', 'fromCharCode',
            'padStart', 'padEnd',
            'floor', 'ceil', 'abs', 'min', 'max', 'random',
            'transpose', 'midiPitch', 'pitchMidi', 'durToTicks',
            'int', 'float', 'string', 'bool', 'range'];
          if (!builtins.includes(expr.name)) {
            // Find similar symbols for suggestion
            const allSymbols = [...this.definedSymbols, ...builtins];
            const similar = findSimilarSymbols(expr.name, allSymbols);
            let suggestion: string | undefined;
            if (similar.length > 0) {
              suggestion = `Did you mean: ${similar.join(', ')}?`;
            }
            this.addError('E400', `Undefined symbol: ${expr.name}`, expr.position, filePath, suggestion);
          }
        }
        break;

      case 'CallExpression': {
        // Get callee name if it's an identifier
        const calleeName = expr.callee.kind === 'Identifier' ? expr.callee.name : null;

        // Track call in call graph
        if (this.currentProc && calleeName && this.procs.has(calleeName)) {
          this.callGraph.get(this.currentProc)?.add(calleeName);
        }

        // Check callee expression
        this.checkExpression(expr.callee, filePath);

        // Check arguments
        for (const arg of expr.arguments) {
          if (arg.kind === 'SpreadElement') {
            this.checkExpression(arg.argument, filePath);
          } else {
            this.checkExpression(arg, filePath);
          }
        }

        // Count tempo events for W200
        if (calleeName === 'tempo') {
          this.tempoEventCount++;
        }

        // W100: Check for extremely short notes
        if ((calleeName === 'note' || calleeName === 'drum' || calleeName === 'rest') && expr.arguments.length >= 2) {
          const durArg = expr.arguments[calleeName === 'note' ? 1 : (calleeName === 'drum' ? 1 : 0)];
          if (durArg.kind === 'DurLiteral') {
            // Check if duration is less than 1/64 (very short)
            // Using 1/64 as threshold since ppq/16 with ppq=480 would be 30 ticks = 1/64
            // Only check fraction-based durations (not tick-based)
            if (durArg.numerator !== undefined && durArg.denominator !== undefined &&
                durArg.numerator === 1 && durArg.denominator > 64) {
              this.addWarning('W100', `Extremely short note duration: ${durArg.numerator}/${durArg.denominator}`, expr.position, filePath);
            }
          }
        }

        // E210: Vocal lyric validation
        if (calleeName === 'note' && this.inVocalTrack) {
          // Vocal note() requires 3 arguments: pitch, duration, lyric
          if (expr.arguments.length < 3) {
            this.addError('E210', 'Vocal note() requires a lyric (3rd argument)', expr.position, filePath);
          } else {
            const lyricArg = expr.arguments[2];
            if (lyricArg.kind === 'StringLiteral') {
              if (lyricArg.value.trim() === '') {
                this.addError('E210', 'Vocal note() lyric cannot be empty', expr.position, filePath);
              }
              // E211: Check for kanji in lyrics (NEUTRINO only supports hiragana/katakana)
              if (/[\u4E00-\u9FFF]/.test(lyricArg.value)) {
                this.addError('E211', `Lyric contains kanji: "${lyricArg.value}" - NEUTRINO only supports hiragana/katakana`, expr.position, filePath,
                  'Convert kanji to hiragana for vocal synthesis');
              }
              // E212: Check syllable count (NEUTRINO works best with 1-2 syllables per note)
              const syllableCount = countSyllables(lyricArg.value);
              if (syllableCount > 2) {
                this.addError('E212', `Lyric "${lyricArg.value}" has ${syllableCount} syllables - NEUTRINO requires 1-2 syllables per note`, expr.position, filePath,
                  'Split into multiple notes with 1-2 syllables each');
              }
            }
          }
        }

        // E220: drum() should not be used in vocal track
        if (calleeName === 'drum' && this.inVocalTrack) {
          this.addError('E220', 'drum() cannot be used in vocal track', expr.position, filePath);
        }

        // E221: chord() should not be used in vocal track
        if (calleeName === 'chord' && this.inVocalTrack) {
          this.addError('E221', 'chord() cannot be used in vocal track', expr.position, filePath);
        }

        // Check if it's a global function called after track
        if (this.trackStarted && calleeName) {
          const globalFuncs = ['title', 'ppq', 'tempo', 'timeSig'];
          if (globalFuncs.includes(calleeName)) {
            this.addError('E050', `${calleeName}() called after track started`, expr.position, filePath);
          }
        }
        break;
      }

      case 'BinaryExpression':
        this.checkExpression(expr.left, filePath);
        this.checkExpression(expr.right, filePath);
        break;

      case 'UnaryExpression':
        this.checkExpression(expr.operand, filePath);
        break;

      case 'ArrayLiteral':
        for (const elem of expr.elements) {
          if (elem.kind === 'SpreadElement') {
            this.checkExpression(elem.argument, filePath);
          } else {
            this.checkExpression(elem, filePath);
          }
        }
        break;

      case 'ObjectLiteral':
        for (const prop of expr.properties) {
          if (prop.kind === 'spread') {
            this.checkExpression(prop.argument, filePath);
          } else {
            this.checkExpression(prop.value, filePath);
          }
        }
        break;

      case 'MemberExpression':
        this.checkExpression(expr.object, filePath);
        break;

      case 'ArrowFunction':
        if (Array.isArray(expr.body)) {
          for (const stmt of expr.body) {
            this.checkStatement(stmt, filePath);
          }
        } else {
          this.checkExpression(expr.body, filePath);
        }
        break;

      case 'SpreadElement':
        this.checkExpression(expr.argument, filePath);
        break;

      case 'PitchLiteral':
        if (expr.midi < 0 || expr.midi > 127) {
          this.addError('E110', `Pitch out of range: ${expr.midi}`, expr.position, filePath);
        }
        // Vocal range warning
        if (expr.midi < 48 || expr.midi > 84) {
          this.addWarning('W110', `Pitch ${expr.midi} may be outside typical vocal range`, expr.position, filePath);
        }
        break;
    }
  }

  private addPatternVariables(pattern: import('../types/ast.js').DestructuringPattern, mutable: boolean): void {
    if (pattern.kind === 'ArrayPattern') {
      for (const elem of pattern.elements) {
        if (elem === null) continue;
        if (typeof elem === 'string') {
          this.definedSymbols.add(elem);
          if (!mutable) this.constSymbols.add(elem);
        } else {
          this.addPatternVariables(elem, mutable);
        }
      }
      if (pattern.rest) {
        this.definedSymbols.add(pattern.rest);
        if (!mutable) this.constSymbols.add(pattern.rest);
      }
    } else if (pattern.kind === 'ObjectPattern') {
      for (const prop of pattern.properties) {
        if (typeof prop.value === 'string') {
          this.definedSymbols.add(prop.value);
          if (!mutable) this.constSymbols.add(prop.value);
        } else {
          this.addPatternVariables(prop.value, mutable);
        }
      }
      if (pattern.rest) {
        this.definedSymbols.add(pattern.rest);
        if (!mutable) this.constSymbols.add(pattern.rest);
      }
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
        // Only const declarations are compile-time constants
        // let declarations are NOT compile-time constants
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
    // DFS to detect cycles in call graph
    // Relaxed: now a warning instead of error, runtime depth limit (1000) will be enforced
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (proc: string, path: string[]): boolean => {
      if (stack.has(proc)) {
        this.addWarning('W310', `Recursion detected: ${[...path, proc].join(' -> ')} - runtime depth limit (1000) will be enforced`);
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

  private addError(code: string, message: string, position?: Position, filePath?: string, suggestion?: string): void {
    this.diagnostics.push({
      code,
      severity: 'error',
      message,
      position,
      filePath,
      suggestion,
    });
  }

  private addWarning(code: string, message: string, position?: Position, filePath?: string, suggestion?: string): void {
    this.diagnostics.push({
      code,
      severity: 'warning',
      message,
      position,
      filePath,
      suggestion,
    });
  }

  // Format diagnostic for display
  static formatDiagnostic(d: Diagnostic): string {
    const loc = d.position
      ? `${d.filePath || 'unknown'}:${d.position.line}:${d.position.column}`
      : '';
    const severity = d.severity === 'error' ? 'error' : 'warning';
    let result = `  ${severity}[${d.code}]: ${d.message}`;
    if (loc) {
      result += `\n    --> ${loc}`;
    }
    if (d.suggestion) {
      result += `\n    help: ${d.suggestion}`;
    }
    return result;
  }
}
