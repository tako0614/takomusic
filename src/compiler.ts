import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { V4Lexer } from './lexer.js';
import { V4Parser } from './parser.js';
import { V4Evaluator } from './evaluator.js';
import { Scope } from './scope.js';
import { normalizeScore } from './normalize.js';
import { resolveStdlibPath } from './utils/stdlib.js';
import { coerceScore } from './value-codec.js';
import { typeCheckProgram } from './typecheck.js';
import { validateScoreIR } from './schema/validator.js';
import type { Program, ImportDecl, ImportSpec } from './ast.js';
import type { Diagnostic } from './diagnostics.js';
import type { ScoreIR } from './ir.js';
import type { RuntimeValue, ScoreValueData, FunctionValue, ArrayValue, NativeContext } from './runtime.js';
import { makeObject, makeNativeFunction, makeArray, makeNumber, makeBool } from './runtime.js';

interface Module {
  path: string;
  program: Program;
  exports: Map<string, RuntimeValue>;
  scope: Scope;
  evaluated: boolean;
  source: string;
}

export class V4Compiler {
  private modules = new Map<string, Module>();
  private diagnostics: Diagnostic[] = [];
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  compile(entryPath: string): ScoreIR {
    this.diagnostics = [];
    this.modules.clear();
    const module = this.loadModule(entryPath);
    this.evaluateModule(module);

    const main = module.exports.get('main');
    if (!main || main.type !== 'function') {
      this.pushError(`export fn main() not found in ${entryPath}`);
    }

    const evaluator = new V4Evaluator(this.diagnostics, module.path);
    const result = evaluator.callFunction(main as any, [], new Map());
    let score: ScoreValueData;
    try {
      score = coerceScore(result);
    } catch (err) {
      this.pushError((err as Error).message);
      throw err;
    }
    const ir = normalizeScore(score, this.diagnostics);
    ir.tako.sourceHash = this.computeSourceHash();
    try {
      const schemaErrors = validateScoreIR(ir);
      for (const message of schemaErrors) {
        this.diagnostics.push({ severity: 'error', message, filePath: module.path });
      }
    } catch (err) {
      this.diagnostics.push({
        severity: 'error',
        message: `IR schema validation failed: ${(err as Error).message}`,
        filePath: module.path,
      });
    }
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
    const lexer = new V4Lexer(source, absolutePath);
    const tokens = lexer.tokenize();
    const parser = new V4Parser(tokens, absolutePath);
    const program = parser.parseProgram();
    typeCheckProgram(program, this.diagnostics, absolutePath);

    const module: Module = {
      path: absolutePath,
      program,
      exports: new Map(),
      scope: new Scope(),
      evaluated: false,
      source,
    };
    this.modules.set(absolutePath, module);
    return module;
  }

  private evaluateModule(module: Module): Module {
    if (module.evaluated) return module;

    const evaluator = new V4Evaluator(this.diagnostics, module.path);
    const scope = new Scope();
    registerBuiltins(scope);
    const exports = new Map<string, RuntimeValue>();

    for (const importDecl of module.program.imports) {
      this.handleImport(importDecl, scope, module);
    }

    // First pass: register functions and enums (they can be referenced before definition)
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

    // Second pass: evaluate constants (they may reference functions and enums)
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

  private computeSourceHash(): string {
    const entries = Array.from(this.modules.values()).map((mod) => ({
      path: mod.path,
      source: mod.source,
    }));
    entries.sort((a, b) => a.path.localeCompare(b.path));
    const hash = createHash('sha256');
    for (const entry of entries) {
      hash.update(entry.path);
      hash.update('\n');
      hash.update(entry.source);
      hash.update('\n');
    }
    return hash.digest('hex');
  }
}

/**
 * Register built-in native functions into a scope.
 * These functions are implemented in native JavaScript for performance.
 */
function registerBuiltins(scope: Scope): void {
  // sort(array, keyFn?) - O(n log n) native sort
  // keyFn is optional; if provided, sorts by keyFn(element)
  // Returns a new sorted array
  const sortFn = makeNativeFunction('sort', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 1) {
      throw new Error('sort() requires at least 1 argument (array)');
    }
    const arr = args[0];
    if (arr.type !== 'array') {
      throw new Error('sort() first argument must be an array');
    }
    const keyFn = args.length > 1 ? args[1] : null;

    // Clone the array elements
    const elements = [...(arr as ArrayValue).elements];

    // Sort using native JavaScript sort (O(n log n))
    if (keyFn && keyFn.type === 'function') {
      const fn = keyFn as FunctionValue;
      elements.sort((a, b) => {
        const keyA = ctx.callFunction(fn, [a], new Map());
        const keyB = ctx.callFunction(fn, [b], new Map());
        return compareValues(keyA, keyB);
      });
    } else {
      elements.sort(compareValues);
    }

    return makeArray(elements);
  });
  scope.define('sort', sortFn, false);

  // sortBy(array, key) - sorts by a specific property name
  const sortByFn = makeNativeFunction('sortBy', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 2) {
      throw new Error('sortBy() requires 2 arguments (array, propertyName)');
    }
    const arr = args[0];
    const keyName = args[1];
    if (arr.type !== 'array') {
      throw new Error('sortBy() first argument must be an array');
    }
    if (keyName.type !== 'string') {
      throw new Error('sortBy() second argument must be a string (property name)');
    }

    const elements = [...(arr as ArrayValue).elements];
    const key = keyName.value;

    elements.sort((a, b) => {
      const keyA = getProperty(a, key);
      const keyB = getProperty(b, key);
      return compareValues(keyA, keyB);
    });

    return makeArray(elements);
  });
  scope.define('sortBy', sortByFn, false);

  // reverse(array) - returns a new reversed array (O(n))
  const reverseFn = makeNativeFunction('reverse', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 1) {
      throw new Error('reverse() requires 1 argument (array)');
    }
    const arr = args[0];
    if (arr.type !== 'array') {
      throw new Error('reverse() argument must be an array');
    }
    return makeArray([...(arr as ArrayValue).elements].reverse());
  });
  scope.define('reverseArr', reverseFn, false);
}

/**
 * Compare two runtime values for sorting.
 */
function compareValues(a: RuntimeValue, b: RuntimeValue): number {
  // Handle nulls
  if (a.type === 'null' && b.type === 'null') return 0;
  if (a.type === 'null') return -1;
  if (b.type === 'null') return 1;

  // Compare numbers
  if (a.type === 'number' && b.type === 'number') {
    return a.value - b.value;
  }

  // Compare rationals
  if (a.type === 'rat' && b.type === 'rat') {
    const aVal = a.value.n / a.value.d;
    const bVal = b.value.n / b.value.d;
    return aVal - bVal;
  }

  // Compare number with rational
  if (a.type === 'number' && b.type === 'rat') {
    return a.value - (b.value.n / b.value.d);
  }
  if (a.type === 'rat' && b.type === 'number') {
    return (a.value.n / a.value.d) - b.value;
  }

  // Compare strings
  if (a.type === 'string' && b.type === 'string') {
    return a.value.localeCompare(b.value);
  }

  // Compare booleans
  if (a.type === 'bool' && b.type === 'bool') {
    return (a.value ? 1 : 0) - (b.value ? 1 : 0);
  }

  // Compare pitches by MIDI number
  if (a.type === 'pitch' && b.type === 'pitch') {
    const diff = a.value.midi - b.value.midi;
    if (diff !== 0) return diff;
    return (a.value.cents || 0) - (b.value.cents || 0);
  }

  // Fallback: compare by type name for consistent ordering
  return a.type.localeCompare(b.type);
}

/**
 * Get a property from a runtime value.
 */
function getProperty(value: RuntimeValue, key: string): RuntimeValue {
  if (value.type === 'object') {
    const prop = value.props.get(key);
    return prop ?? { type: 'null' };
  }
  // Common event properties
  if (value.type === 'null') return value;

  // For other values, return null (property not found)
  return { type: 'null' };
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
