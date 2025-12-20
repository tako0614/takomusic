// Compiler - orchestrates lexing, parsing, and interpretation with module resolution

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Interpreter } from '../interpreter/index.js';
import type { Program, ProcDeclaration, ConstDeclaration, Statement } from '../types/ast.js';
import type { SongIR } from '../types/ir.js';
import { MFError, createError } from '../errors.js';
import { makeInt, makeFloat, makeString, makeBool, makePitch, makeDur, makeTime } from '../interpreter/runtime.js';
import { isStdlibImport, resolveStdlibPath } from '../utils/stdlib.js';

interface Module {
  path: string;
  program: Program;
  exports: Map<string, ProcDeclaration | ConstDeclaration>;
}

export class Compiler {
  private modules: Map<string, Module> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  compile(entryPath: string): SongIR {
    const absoluteEntryPath = path.isAbsolute(entryPath)
      ? entryPath
      : path.resolve(this.baseDir, entryPath);

    // Load entry module and all its dependencies
    const entryModule = this.loadModule(absoluteEntryPath);

    // Create interpreter
    const interpreter = new Interpreter(absoluteEntryPath);

    // Resolve all imports and register procs/consts
    this.resolveAndRegister(entryModule, interpreter, new Set());

    // Execute
    return interpreter.execute(entryModule.program);
  }

  private loadModule(modulePath: string): Module {
    const absolutePath = path.resolve(modulePath);

    // Check cache
    if (this.modules.has(absolutePath)) {
      return this.modules.get(absolutePath)!;
    }

    // Read file
    let source: string;
    try {
      source = fs.readFileSync(absolutePath, 'utf-8');
    } catch (err) {
      throw new MFError('IO', `Cannot read file: ${absolutePath}`);
    }

    // Lex and parse
    const lexer = new Lexer(source, absolutePath);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, absolutePath);
    const program = parser.parse();

    // Extract exports
    const exports = new Map<string, ProcDeclaration | ConstDeclaration>();
    for (const stmt of program.statements) {
      if (stmt.kind === 'ExportStatement') {
        exports.set(stmt.declaration.name, stmt.declaration);
      } else if (stmt.kind === 'ProcDeclaration' && stmt.exported) {
        exports.set(stmt.name, stmt);
      } else if (stmt.kind === 'ConstDeclaration' && stmt.exported) {
        exports.set(stmt.name, stmt);
      }
    }

    const module: Module = {
      path: absolutePath,
      program,
      exports,
    };

    this.modules.set(absolutePath, module);

    // Validate imported module (no top-level execution)
    if (this.modules.size > 1) {
      this.validateImportedModule(program, absolutePath);
    }

    return module;
  }

  private validateImportedModule(program: Program, filePath: string): void {
    for (const stmt of program.statements) {
      if (stmt.kind === 'ExpressionStatement') {
        const expr = stmt.expression;
        if (expr.kind === 'CallExpression') {
          const forbidden = ['track', 'note', 'rest', 'chord', 'drum', 'at', 'advance', 'title', 'ppq', 'tempo', 'timeSig'];
          const calleeName = expr.callee.kind === 'Identifier' ? expr.callee.name : null;
          if (calleeName && forbidden.includes(calleeName)) {
            throw createError('E300', `Top-level execution in imported module: ${calleeName}()`, stmt.position, filePath);
          }
        }
      } else if (stmt.kind === 'TrackBlock') {
        throw createError('E300', 'Top-level track block in imported module', stmt.position, filePath);
      }
    }
  }

  private resolveAndRegister(module: Module, interpreter: Interpreter, visited: Set<string>): void {
    if (visited.has(module.path)) {
      return;
    }
    visited.add(module.path);

    const moduleDir = path.dirname(module.path);

    // Process imports first (depth-first)
    for (const stmt of module.program.statements) {
      if (stmt.kind === 'ImportStatement') {
        // Resolve import path (handle std: imports)
        const importPath = isStdlibImport(stmt.path)
          ? resolveStdlibPath(stmt.path)
          : path.resolve(moduleDir, stmt.path);
        const importedModule = this.loadModule(importPath);

        // Recursively resolve imports
        this.resolveAndRegister(importedModule, interpreter, visited);

        // Register imported symbols
        for (const name of stmt.imports) {
          const exported = importedModule.exports.get(name);
          if (!exported) {
            throw createError('E400', `'${name}' is not exported from '${stmt.path}'`, stmt.position, module.path);
          }

          if (exported.kind === 'ProcDeclaration') {
            interpreter.registerProc(exported);
          } else {
            // ConstDeclaration - evaluate and register
            const value = this.evaluateConstExpr(exported.value, importedModule);
            interpreter.registerConst(name, value);
          }
        }
      }
    }
  }

  private evaluateConstExpr(expr: any, module: Module): any {
    // Simple constant expression evaluation for imports
    switch (expr.kind) {
      case 'IntLiteral':
        return makeInt(expr.value);
      case 'FloatLiteral':
        return makeFloat(expr.value);
      case 'StringLiteral':
        return makeString(expr.value);
      case 'BoolLiteral':
        return makeBool(expr.value);
      case 'PitchLiteral':
        return makePitch(expr.midi);
      case 'DurLiteral':
        return makeDur(expr.numerator, expr.denominator);
      case 'TimeLiteral':
        return makeTime(expr.bar, expr.beat, expr.sub);
      default:
        throw new MFError('E400', `Cannot evaluate constant expression of kind: ${expr.kind}`, expr.position, module.path);
    }
  }
}
