/**
 * Browser-compatible TakoMusic compiler with full evaluation support
 *
 * Provides complete compilation including parsing, type-checking, evaluation,
 * and IR generation without Node.js dependencies.
 */

import { V4Lexer } from '../lexer.js';
import { V4Parser } from '../parser.js';
import { V4Evaluator } from '../evaluator.js';
import { Scope } from '../scope.js';
import { typeCheckProgram } from '../typecheck.js';
import { normalizeScore } from '../normalize.js';
import { coerceScore } from '../value-codec.js';
import { VirtualFileSystem, STDLIB_MODULES } from './virtualFs.js';
import type { Token } from '../token.js';
import type { Program, ImportDecl, ImportSpec } from '../ast.js';
import type { Diagnostic } from '../diagnostics.js';
import type { ScoreIR } from '../ir.js';
import type { RuntimeValue } from '../runtime.js';
import { makeObject } from '../runtime.js';

export interface CompileResult {
  success: boolean;
  program?: Program;
  tokens?: Token[];
  diagnostics: Diagnostic[];
  ast?: object;
  ir?: ScoreIR;
}

interface Module {
  path: string;
  program: Program;
  exports: Map<string, RuntimeValue>;
  scope: Scope;
  evaluated: boolean;
  source: string;
}

/**
 * Browser-compatible compiler that uses virtual file system
 */
export class BrowserCompiler {
  private modules = new Map<string, Module>();
  private diagnostics: Diagnostic[] = [];
  private vfs: VirtualFileSystem;

  constructor(vfs?: VirtualFileSystem) {
    this.vfs = vfs ?? new VirtualFileSystem();
  }

  /**
   * Compile TakoMusic source code to IR
   */
  compile(source: string, entryPath: string = '/main.mf'): CompileResult {
    this.diagnostics = [];
    this.modules.clear();

    // Write source to virtual fs
    this.vfs.writeFile(entryPath, source);

    try {
      const module = this.loadModule(entryPath);
      this.evaluateModule(module);

      const main = module.exports.get('main');
      if (!main || main.type !== 'function') {
        this.pushError(`export fn main() not found in ${entryPath}`);
        return {
          success: false,
          diagnostics: this.diagnostics,
          ast: this.programToJson(module.program),
        };
      }

      const evaluator = new V4Evaluator(this.diagnostics, module.path);
      const result = evaluator.callFunction(main as any, [], new Map());

      let score;
      try {
        score = coerceScore(result);
      } catch (err) {
        this.pushError((err as Error).message);
        return {
          success: false,
          diagnostics: this.diagnostics,
          ast: this.programToJson(module.program),
        };
      }

      const ir = normalizeScore(score, this.diagnostics);
      ir.tako.generator = 'takomusic-browser';
      ir.tako.sourceHash = this.computeSourceHash();

      const hasErrors = this.diagnostics.some((d) => d.severity === 'error');

      return {
        success: !hasErrors,
        program: module.program,
        diagnostics: this.diagnostics,
        ast: this.programToJson(module.program),
        ir,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const posMatch = message.match(/at (?:line )?(\d+)(?::(\d+)|, column (\d+))?/);

      this.diagnostics.push({
        severity: 'error',
        message: message.replace(/at (?:line )?\d+(?::\d+|, column \d+)?/, '').trim(),
        position: posMatch
          ? {
              line: parseInt(posMatch[1], 10),
              column: parseInt(posMatch[2] ?? posMatch[3] ?? '1', 10),
              offset: 0,
            }
          : undefined,
        filePath: entryPath,
      });

      return {
        success: false,
        diagnostics: this.diagnostics,
      };
    }
  }

  /**
   * Parse and type-check without full evaluation
   */
  check(source: string, entryPath: string = '/main.mf'): CompileResult {
    this.diagnostics = [];

    try {
      const lexer = new V4Lexer(source, entryPath);
      const tokens = lexer.tokenize();

      const parser = new V4Parser(tokens, entryPath);
      const program = parser.parseProgram();

      typeCheckProgram(program, this.diagnostics, entryPath);

      const hasErrors = this.diagnostics.some((d) => d.severity === 'error');

      return {
        success: !hasErrors,
        program,
        tokens,
        diagnostics: this.diagnostics,
        ast: this.programToJson(program),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const posMatch = message.match(/at (?:line )?(\d+)(?::(\d+)|, column (\d+))?/);

      this.diagnostics.push({
        severity: 'error',
        message,
        position: posMatch
          ? {
              line: parseInt(posMatch[1], 10),
              column: parseInt(posMatch[2] ?? posMatch[3] ?? '1', 10),
              offset: 0,
            }
          : undefined,
        filePath: entryPath,
      });

      return {
        success: false,
        diagnostics: this.diagnostics,
      };
    }
  }

  private loadModule(modulePath: string): Module {
    const cached = this.modules.get(modulePath);
    if (cached) return cached;

    const source = this.vfs.readFile(modulePath);
    if (source === null) {
      throw new Error(`Module not found: ${modulePath}`);
    }

    const lexer = new V4Lexer(source, modulePath);
    const tokens = lexer.tokenize();
    const parser = new V4Parser(tokens, modulePath);
    const program = parser.parseProgram();
    typeCheckProgram(program, this.diagnostics, modulePath);

    const module: Module = {
      path: modulePath,
      program,
      exports: new Map(),
      scope: new Scope(),
      evaluated: false,
      source,
    };
    this.modules.set(modulePath, module);
    return module;
  }

  private evaluateModule(module: Module): Module {
    if (module.evaluated) return module;

    const evaluator = new V4Evaluator(this.diagnostics, module.path);
    const scope = new Scope();
    const exports = new Map<string, RuntimeValue>();

    for (const importDecl of module.program.imports) {
      this.handleImport(importDecl, scope, module);
    }

    // First pass: register functions and enums
    for (const decl of module.program.body) {
      if (decl.kind === 'FnDecl') {
        const fnValue = evaluator.createFunction(decl, scope);
        scope.define(decl.name, fnValue, false);
        if (decl.exported) {
          exports.set(decl.name, fnValue);
        }
      } else if (decl.kind === 'EnumDecl') {
        evaluator.evaluateEnum(decl, scope);
        if (decl.exported) {
          exports.set(decl.name, scope.get(decl.name));
        }
      }
    }

    // Second pass: evaluate constants
    for (const decl of module.program.body) {
      if (decl.kind === 'ConstDecl') {
        evaluator.evaluateConst(decl, scope);
        if (decl.exported) {
          exports.set(decl.name, scope.get(decl.name));
        }
      }
    }

    module.scope = scope;
    module.exports = exports;
    module.evaluated = true;
    return module;
  }

  private handleImport(importDecl: ImportDecl, scope: Scope, module: Module): void {
    const from = importDecl.from.value;

    if (from.startsWith('std:')) {
      const moduleName = from.slice(4);
      const stdlibSource = this.vfs.getStdlibSource(moduleName);

      if (!stdlibSource) {
        this.pushError(
          `Unknown stdlib module: ${moduleName}. Available: ${Object.keys(STDLIB_MODULES).join(', ')}`,
          importDecl.position,
          module.path
        );
        return;
      }

      const stdPath = `/stdlib/${moduleName}.mf`;
      this.vfs.writeFile(stdPath, stdlibSource);
      const imported = this.loadModule(stdPath);
      this.evaluateModule(imported);
      this.bindImport(importDecl.spec, scope, imported.exports, from);
      return;
    }

    // Resolve relative path
    const basePath = module.path.substring(0, module.path.lastIndexOf('/'));
    const importPath = this.resolvePath(basePath, from);

    const imported = this.loadModule(importPath);
    this.evaluateModule(imported);
    this.bindImport(importDecl.spec, scope, imported.exports, module.path);
  }

  private resolvePath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath;
    }

    const parts = basePath.split('/').filter(Boolean);
    const relParts = relativePath.split('/');

    for (const part of relParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }

    return '/' + parts.join('/');
  }

  private bindImport(
    spec: ImportSpec,
    scope: Scope,
    source: Map<string, RuntimeValue> | RuntimeValue,
    modulePath: string
  ): void {
    if (spec.kind === 'ImportAll') {
      if (source instanceof Map) {
        scope.define(spec.alias, makeObject(new Map(source)), false);
        return;
      }
      if (source.type === 'object') {
        scope.define(spec.alias, source, false);
        return;
      }
      this.pushError(`Cannot namespace-import from ${modulePath}`);
      return;
    }

    if (spec.kind === 'ImportNamed') {
      for (const name of spec.names) {
        const value =
          source instanceof Map
            ? source.get(name)
            : source.type === 'object'
              ? source.props.get(name)
              : undefined;
        if (!value) {
          this.pushError(`'${name}' is not exported from ${modulePath}`);
          continue;
        }
        scope.define(name, value, false);
      }
    }
  }

  private pushError(message: string, position?: any, filePath?: string): void {
    this.diagnostics.push({ severity: 'error', message, position, filePath });
  }

  private programToJson(program: Program): object {
    return JSON.parse(
      JSON.stringify(program, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      })
    );
  }

  private computeSourceHash(): string {
    // Simple hash for browser (no crypto module)
    const entries = Array.from(this.modules.values()).map((mod) => ({
      path: mod.path,
      source: mod.source,
    }));
    entries.sort((a, b) => a.path.localeCompare(b.path));

    let hash = 0;
    for (const entry of entries) {
      const str = entry.path + '\n' + entry.source + '\n';
      for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash + chr) | 0;
      }
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

/**
 * Compile TakoMusic source code (convenience function)
 */
export function compile(source: string, filePath: string = '/main.mf'): CompileResult {
  const compiler = new BrowserCompiler();
  return compiler.compile(source, filePath);
}

/**
 * Parse and type-check TakoMusic source code without evaluation
 */
export function check(source: string, filePath: string = '/main.mf'): CompileResult {
  const compiler = new BrowserCompiler();
  return compiler.check(source, filePath);
}

/**
 * Parse source code to AST without type checking
 */
export function parse(source: string): { program?: Program; error?: string } {
  try {
    const lexer = new V4Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new V4Parser(tokens);
    const program = parser.parseProgram();
    return { program };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Tokenize source code
 */
export function tokenize(source: string): { tokens?: Token[]; error?: string } {
  try {
    const lexer = new V4Lexer(source);
    const tokens = lexer.tokenize();
    return { tokens };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// Export types for external use
export type { Token, Program, Diagnostic, ScoreIR };
export { TokenType } from '../token.js';
export { VirtualFileSystem, STDLIB_MODULES } from './virtualFs.js';
