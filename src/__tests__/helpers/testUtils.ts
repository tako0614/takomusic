/**
 * Test utilities for TakoMusic compiler tests
 */

import { V4Lexer } from '../../lexer.js';
import { V4Parser } from '../../parser.js';
import { V4Compiler } from '../../compiler.js';
import { TokenType, type Token } from '../../token.js';
import type { Program, Expr, Statement } from '../../ast.js';
import type { ScoreIR } from '../../ir.js';
import type { Diagnostic } from '../../diagnostics.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Tokenize source code
 */
export function tokenize(source: string): Token[] {
  const lexer = new V4Lexer(source);
  return lexer.tokenize();
}

/**
 * Get tokens without EOF
 */
export function tokenizeWithoutEof(source: string): Token[] {
  return tokenize(source).filter(t => t.type !== TokenType.EOF);
}

/**
 * Parse source code to AST
 */
export function parse(source: string): Program {
  const lexer = new V4Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new V4Parser(tokens);
  return parser.parseProgram();
}

/**
 * Parse a single expression
 */
export function parseExpr(source: string): Expr {
  // Wrap in a function to make it a valid program
  const program = parse(`fn _test_() -> Int { return ${source}; }`);
  const fn = program.body[0];
  if (!fn || fn.kind !== 'FnDecl') throw new Error('Expected function declaration');
  const returnStmt = fn.body.statements[0];
  if (!returnStmt || returnStmt.kind !== 'ReturnStmt') throw new Error('Expected return statement');
  return returnStmt.value!;
}

/**
 * Parse a single statement
 */
export function parseStmt(source: string): Statement {
  const program = parse(`fn _test_() -> Int { ${source} return 0; }`);
  const fn = program.body[0];
  if (!fn || fn.kind !== 'FnDecl') throw new Error('Expected function declaration');
  return fn.body.statements[0];
}

/**
 * Create a temporary directory for test files
 */
export function createTempDir(): string {
  const tmpDir = path.join(os.tmpdir(), `mf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(tmpDir: string): void {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Write a test file in temp directory
 */
export function writeTestFile(tmpDir: string, name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Compile source to IR
 */
export function compileToIR(source: string): ScoreIR {
  const tmpDir = createTempDir();
  try {
    const filePath = writeTestFile(tmpDir, 'main.mf', source);
    const compiler = new V4Compiler(tmpDir);
    return compiler.compile(filePath);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

/**
 * Check source and return diagnostics
 */
export function checkSource(source: string): Diagnostic[] {
  const tmpDir = createTempDir();
  try {
    const filePath = writeTestFile(tmpDir, 'main.mf', source);
    const compiler = new V4Compiler(tmpDir);
    return compiler.check(filePath);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

/**
 * Assert that source produces a diagnostic with given message pattern
 */
export function expectDiagnostic(source: string, messagePattern: string | RegExp): void {
  const diagnostics = checkSource(source);
  const pattern = typeof messagePattern === 'string'
    ? new RegExp(messagePattern, 'i')
    : messagePattern;

  const found = diagnostics.some(d => pattern.test(d.message));
  if (!found) {
    const messages = diagnostics.map(d => d.message).join('\n  ');
    throw new Error(
      `Expected diagnostic matching ${pattern}, but got:\n  ${messages || '(no diagnostics)'}`
    );
  }
}

/**
 * Assert that source compiles without errors
 */
export function expectNoErrors(source: string): void {
  const diagnostics = checkSource(source);
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    const messages = errors.map(d => d.message).join('\n  ');
    throw new Error(`Expected no errors, but got:\n  ${messages}`);
  }
}

/**
 * Create a minimal valid score source
 */
export function minimalScore(trackContent: string = ''): string {
  return `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      ${trackContent}
    }
  };
}
`;
}

/**
 * Create a minimal valid clip source
 */
export function minimalClipFn(clipContent: string): string {
  return `
fn testClip() -> Clip {
  return clip {
    ${clipContent}
  };
}

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 testClip();
    }
  };
}
`;
}
