import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';

describe('Parser', () => {
  function parse(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  it('should parse const declaration', () => {
    const ast = parse('const x = 42;');
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].kind).toBe('ConstDeclaration');
    const decl = ast.statements[0] as any;
    expect(decl.name).toBe('x');
    expect(decl.value.kind).toBe('IntLiteral');
    expect(decl.value.value).toBe(42);
  });

  it('should parse let declaration', () => {
    const ast = parse('let y = "hello";');
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].kind).toBe('LetDeclaration');
    const decl = ast.statements[0] as any;
    expect(decl.name).toBe('y');
    expect(decl.value.kind).toBe('StringLiteral');
    expect(decl.value.value).toBe('hello');
  });

  it('should parse pitch literals with correct MIDI values', () => {
    const ast = parse('const p = C4;');
    const decl = ast.statements[0] as any;
    expect(decl.value.kind).toBe('PitchLiteral');
    expect(decl.value.midi).toBe(60); // C4 = 60
  });

  it('should parse duration literals', () => {
    const ast = parse('const d = 1/4;');
    const decl = ast.statements[0] as any;
    expect(decl.value.kind).toBe('DurLiteral');
    expect(decl.value.numerator).toBe(1);
    expect(decl.value.denominator).toBe(4);
  });

  it('should parse time literals', () => {
    const ast = parse('const t = 2:3:100;');
    const decl = ast.statements[0] as any;
    expect(decl.value.kind).toBe('TimeLiteral');
    expect(decl.value.bar).toBe(2);
    expect(decl.value.beat).toBe(3);
    expect(decl.value.sub).toBe(100);
  });

  it('should parse proc declaration', () => {
    const ast = parse('proc foo(a, b) { const x = a; }');
    expect(ast.statements[0].kind).toBe('ProcDeclaration');
    const proc = ast.statements[0] as any;
    expect(proc.name).toBe('foo');
    expect(proc.params).toEqual(['a', 'b']);
    expect(proc.body.length).toBe(1);
  });

  it('should parse export proc', () => {
    const ast = parse('export proc main() { }');
    expect(ast.statements[0].kind).toBe('ExportStatement');
    const exp = ast.statements[0] as any;
    expect(exp.declaration.kind).toBe('ProcDeclaration');
    expect(exp.declaration.name).toBe('main');
  });

  it('should parse if statement', () => {
    const ast = parse('if (x == 1) { const y = 2; } else { const z = 3; }');
    expect(ast.statements[0].kind).toBe('IfStatement');
    const ifStmt = ast.statements[0] as any;
    expect(ifStmt.condition.kind).toBe('BinaryExpression');
    expect(ifStmt.consequent.length).toBe(1);
    expect(ifStmt.alternate.length).toBe(1);
  });

  it('should parse for statement', () => {
    const ast = parse('for (i in 1..=4) { const x = i; }');
    expect(ast.statements[0].kind).toBe('ForStatement');
    const forStmt = ast.statements[0] as any;
    expect(forStmt.variable).toBe('i');
    expect(forStmt.range.inclusive).toBe(true);
  });

  it('should parse track block', () => {
    const ast = parse('track(vocal, v1, { engine: "piapro" }) { }');
    expect(ast.statements[0].kind).toBe('TrackBlock');
    const track = ast.statements[0] as any;
    expect(track.trackKind).toBe('vocal');
    expect(track.id).toBe('v1');
    expect(track.options.properties[0].key).toBe('engine');
  });

  it('should parse import statement', () => {
    const ast = parse('import { CHORUS, VERSE } from "./lib.mf";');
    expect(ast.statements[0].kind).toBe('ImportStatement');
    const imp = ast.statements[0] as any;
    expect(imp.imports).toEqual(['CHORUS', 'VERSE']);
    expect(imp.path).toBe('./lib.mf');
  });

  it('should parse binary expressions', () => {
    const ast = parse('const x = C4 + 2;');
    const decl = ast.statements[0] as any;
    expect(decl.value.kind).toBe('BinaryExpression');
    expect(decl.value.operator).toBe('+');
  });

  it('should parse call expressions', () => {
    const ast = parse('note(C4, 1/4, "あ");');
    const stmt = ast.statements[0] as any;
    expect(stmt.expression.kind).toBe('CallExpression');
    expect(stmt.expression.callee).toBe('note');
    expect(stmt.expression.arguments.length).toBe(3);
  });

  it('should parse array literals', () => {
    const ast = parse('const arr = [C4, E4, G4];');
    const decl = ast.statements[0] as any;
    expect(decl.value.kind).toBe('ArrayLiteral');
    expect(decl.value.elements.length).toBe(3);
  });
});
