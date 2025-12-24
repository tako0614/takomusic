import * as fs from 'fs';
import * as path from 'path';
import { V3Lexer } from './lexer.js';
import { V3Parser } from './parser.js';
import { V3Evaluator } from './evaluator.js';
import { Scope } from './scope.js';
import { normalizeScore } from './normalize.js';
import { resolveStdlibPath } from './utils/stdlib.js';
import { applyIntrinsics } from './intrinsics.js';
import type { Program, ImportDecl, ImportSpec } from './ast.js';
import type { Diagnostic } from './diagnostics.js';
import type { ScoreIR } from './ir.js';
import type { RuntimeValue } from './runtime.js';
import { makeObject } from './runtime.js';

interface Module {
  path: string;
  program: Program;
  exports: Map<string, RuntimeValue>;
  scope: Scope;
  evaluated: boolean;
}

export class V3Compiler {
  private modules = new Map<string, Module>();
  private diagnostics: Diagnostic[] = [];
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  compile(entryPath: string): ScoreIR {
    this.diagnostics = [];
    const module = this.loadModule(entryPath);
    this.evaluateModule(module);

    const main = module.exports.get('main');
    if (!main || main.type !== 'function') {
      this.pushError(`export fn main() not found in ${entryPath}`);
    }

    const evaluator = new V3Evaluator(this.diagnostics, module.path);
    const result = evaluator.callFunction(main as any, [], new Map());
    if (!result || result.type !== 'score') {
      this.pushError('main() must return Score');
      throw new Error('main() must return Score');
    }

    const ir = normalizeScore(result.score, this.diagnostics);
    this.throwIfErrors();
    return ir;
  }

  check(entryPath: string): Diagnostic[] {
    this.diagnostics = [];
    try {
      this.compile(entryPath);
    } catch {
      // diagnostics already collected
    }
    return this.diagnostics;
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  private loadModule(modulePath: string): Module {
    const absolutePath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(this.baseDir, modulePath);

    const cached = this.modules.get(absolutePath);
    if (cached) return cached;

    const source = fs.readFileSync(absolutePath, 'utf-8');
    const lexer = new V3Lexer(source, absolutePath);
    const tokens = lexer.tokenize();
    const parser = new V3Parser(tokens, absolutePath);
    const program = parser.parseProgram();

    const module: Module = {
      path: absolutePath,
      program,
      exports: new Map(),
      scope: new Scope(),
      evaluated: false,
    };
    this.modules.set(absolutePath, module);
    return module;
  }

  private evaluateModule(module: Module): Module {
    if (module.evaluated) return module;

    const evaluator = new V3Evaluator(this.diagnostics, module.path);
    const scope = new Scope();
    applyIntrinsics(scope);
    const exports = new Map<string, RuntimeValue>();

    for (const importDecl of module.program.imports) {
      this.handleImport(importDecl, scope, module);
    }

    for (const decl of module.program.body) {
      if (decl.kind === 'FnDecl') {
        const fnValue = evaluator.createFunction(decl, scope);
        scope.define(decl.name, fnValue, false);
        if (decl.exported) {
          exports.set(decl.name, fnValue);
        }
      }
    }

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
      let stdPath: string;
      try {
        stdPath = resolveStdlibPath(from);
      } catch (err) {
        this.pushError((err as Error).message, importDecl.position, module.path);
        return;
      }
      const imported = this.loadModule(stdPath);
      this.evaluateModule(imported);
      this.bindImport(importDecl.spec, scope, imported.exports, from);
      return;
    }

    const importPath = path.resolve(path.dirname(module.path), from);
    if (!isPathSafe(importPath, this.baseDir)) {
      this.pushError(`Import path escapes project: ${from}`, importDecl.position, module.path);
    }
    const imported = this.loadModule(importPath);
    this.evaluateModule(imported);
    this.bindImport(importDecl.spec, scope, imported.exports, module.path);
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
        const value = source instanceof Map
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
    throw new Error(message);
  }

  private throwIfErrors(): void {
    const errors = this.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }
  }
}

function isPathSafe(resolvedPath: string, baseDir: string): boolean {
  let realPath: string;
  let realBase: string;

  try {
    realPath = fs.realpathSync(resolvedPath);
  } catch {
    realPath = path.resolve(resolvedPath);
  }

  try {
    realBase = fs.realpathSync(baseDir);
  } catch {
    realBase = path.resolve(baseDir);
  }

  const relative = path.relative(realBase, realPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
