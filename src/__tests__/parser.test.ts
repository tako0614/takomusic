import { describe, it, expect } from 'vitest';
import { parse, parseExpr, parseStmt } from './helpers/testUtils.js';

describe('V4Parser', () => {
  describe('program structure', () => {
    it('parses empty program', () => {
      const program = parse('');
      expect(program.kind).toBe('Program');
      expect(program.imports).toHaveLength(0);
      expect(program.body).toHaveLength(0);
    });

    it('parses program with single function', () => {
      const program = parse('fn foo() -> Int { return 42; }');
      expect(program.body).toHaveLength(1);
      expect(program.body[0].kind).toBe('FnDecl');
    });
  });

  describe('imports', () => {
    it('parses named import', () => {
      const program = parse('import { foo } from "std:core";');
      expect(program.imports).toHaveLength(1);
      const imp = program.imports[0];
      expect(imp.kind).toBe('ImportDecl');
      expect(imp.spec.kind).toBe('ImportNamed');
      if (imp.spec.kind === 'ImportNamed') {
        expect(imp.spec.names).toEqual(['foo']);
      }
      expect(imp.from.value).toBe('std:core');
    });

    it('parses multiple named imports', () => {
      const program = parse('import { foo, bar, baz } from "std:core";');
      const imp = program.imports[0];
      if (imp.spec.kind === 'ImportNamed') {
        expect(imp.spec.names).toEqual(['foo', 'bar', 'baz']);
      }
    });

    it('parses all import', () => {
      const program = parse('import * as core from "std:core";');
      expect(program.imports).toHaveLength(1);
      const imp = program.imports[0];
      expect(imp.spec.kind).toBe('ImportAll');
      if (imp.spec.kind === 'ImportAll') {
        expect(imp.spec.alias).toBe('core');
      }
    });
  });

  describe('function declarations', () => {
    it('parses simple function', () => {
      const program = parse('fn foo() -> Int { return 42; }');
      const fn = program.body[0];
      expect(fn.kind).toBe('FnDecl');
      if (fn.kind === 'FnDecl') {
        expect(fn.name).toBe('foo');
        expect(fn.params).toHaveLength(0);
        expect(fn.returnType?.name).toBe('Int');
        expect(fn.exported).toBe(false);
      }
    });

    it('parses exported function', () => {
      const program = parse('export fn main() -> Score { return score {}; }');
      const fn = program.body[0];
      if (fn.kind === 'FnDecl') {
        expect(fn.exported).toBe(true);
        expect(fn.name).toBe('main');
      }
    });

    it('parses function with parameters', () => {
      const program = parse('fn add(a: Int, b: Int) -> Int { return a + b; }');
      const fn = program.body[0];
      if (fn.kind === 'FnDecl') {
        expect(fn.params).toHaveLength(2);
        expect(fn.params[0].name).toBe('a');
        expect(fn.params[0].type?.name).toBe('Int');
        expect(fn.params[1].name).toBe('b');
      }
    });

    it('parses function without return type', () => {
      const program = parse('fn foo() { return 1; }');
      const fn = program.body[0];
      if (fn.kind === 'FnDecl') {
        expect(fn.returnType).toBeUndefined();
      }
    });
  });

  describe('const declarations', () => {
    it('parses const with value', () => {
      const program = parse('const x = 42;');
      const decl = program.body[0];
      expect(decl.kind).toBe('ConstDecl');
      if (decl.kind === 'ConstDecl') {
        expect(decl.name).toBe('x');
        expect(decl.mutable).toBe(false);
        expect(decl.value.kind).toBe('NumberLiteral');
      }
    });

    it('parses let declaration', () => {
      const program = parse('let x = 42;');
      const decl = program.body[0];
      if (decl.kind === 'ConstDecl') {
        expect(decl.mutable).toBe(true);
      }
    });

    it('parses exported const', () => {
      const program = parse('export const PI = 3.14;');
      const decl = program.body[0];
      if (decl.kind === 'ConstDecl') {
        expect(decl.exported).toBe(true);
      }
    });

    it('parses const with type annotation', () => {
      const program = parse('const x: Int = 42;');
      const decl = program.body[0];
      if (decl.kind === 'ConstDecl') {
        expect(decl.type?.name).toBe('Int');
      }
    });
  });

  describe('literals', () => {
    it('parses number literal', () => {
      const expr = parseExpr('42');
      expect(expr.kind).toBe('NumberLiteral');
      if (expr.kind === 'NumberLiteral') {
        expect(expr.value).toBe(42);
      }
    });

    it('parses float literal', () => {
      const expr = parseExpr('3.14');
      if (expr.kind === 'NumberLiteral') {
        expect(expr.value).toBe(3.14);
      }
    });

    it('parses string literal', () => {
      const expr = parseExpr('"hello"');
      expect(expr.kind).toBe('StringLiteral');
      if (expr.kind === 'StringLiteral') {
        expect(expr.value).toBe('hello');
      }
    });

    it('parses true literal', () => {
      const expr = parseExpr('true');
      expect(expr.kind).toBe('BoolLiteral');
      if (expr.kind === 'BoolLiteral') {
        expect(expr.value).toBe(true);
      }
    });

    it('parses false literal', () => {
      const expr = parseExpr('false');
      if (expr.kind === 'BoolLiteral') {
        expect(expr.value).toBe(false);
      }
    });

    it('parses null literal', () => {
      const expr = parseExpr('null');
      expect(expr.kind).toBe('NullLiteral');
    });

    it('parses pitch literal', () => {
      const expr = parseExpr('C4');
      expect(expr.kind).toBe('PitchLiteral');
      if (expr.kind === 'PitchLiteral') {
        expect(expr.value).toBe('C4');
      }
    });

    it('parses duration literal', () => {
      const expr = parseExpr('q');
      expect(expr.kind).toBe('DurLiteral');
      if (expr.kind === 'DurLiteral') {
        expect(expr.value).toBe('q');
      }
    });

    it('parses posref literal', () => {
      const expr = parseExpr('1:1');
      expect(expr.kind).toBe('PosRefLiteral');
      if (expr.kind === 'PosRefLiteral') {
        expect(expr.bar).toBe(1);
        expect(expr.beat).toBe(1);
      }
    });
  });

  describe('array literals', () => {
    it('parses empty array', () => {
      const expr = parseExpr('[]');
      expect(expr.kind).toBe('ArrayLiteral');
      if (expr.kind === 'ArrayLiteral') {
        expect(expr.elements).toHaveLength(0);
      }
    });

    it('parses array with elements', () => {
      const expr = parseExpr('[1, 2, 3]');
      if (expr.kind === 'ArrayLiteral') {
        expect(expr.elements).toHaveLength(3);
      }
    });
  });

  describe('object literals', () => {
    it('parses empty object', () => {
      const expr = parseExpr('{}');
      expect(expr.kind).toBe('ObjectLiteral');
      if (expr.kind === 'ObjectLiteral') {
        expect(expr.properties).toHaveLength(0);
      }
    });

    it('parses object with properties', () => {
      const expr = parseExpr('{ a: 1, b: 2 }');
      if (expr.kind === 'ObjectLiteral') {
        expect(expr.properties).toHaveLength(2);
        const p0 = expr.properties[0];
        const p1 = expr.properties[1];
        if (p0.kind === 'ObjectProperty' && p1.kind === 'ObjectProperty') {
          expect(p0.key).toBe('a');
          expect(p1.key).toBe('b');
        }
      }
    });
  });

  describe('binary expressions', () => {
    it('parses addition', () => {
      const expr = parseExpr('1 + 2');
      expect(expr.kind).toBe('BinaryExpr');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('+');
      }
    });

    it('parses subtraction', () => {
      const expr = parseExpr('5 - 3');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('-');
      }
    });

    it('parses multiplication', () => {
      const expr = parseExpr('2 * 3');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('*');
      }
    });

    it('parses division', () => {
      const expr = parseExpr('6 / 2');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('/');
      }
    });

    it('parses modulo', () => {
      const expr = parseExpr('7 % 3');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('%');
      }
    });

    it('parses comparison operators', () => {
      const ops = ['==', '!=', '<', '<=', '>', '>='];
      for (const op of ops) {
        const expr = parseExpr(`1 ${op} 2`);
        if (expr.kind === 'BinaryExpr') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    it('parses logical operators', () => {
      const expr = parseExpr('true && false');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('&&');
      }
    });

    it('parses nullish coalescing', () => {
      const expr = parseExpr('x ?? 0');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('??');
      }
    });

    it('respects operator precedence', () => {
      const expr = parseExpr('1 + 2 * 3');
      expect(expr.kind).toBe('BinaryExpr');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('+');
        expect(expr.right.kind).toBe('BinaryExpr');
        if (expr.right.kind === 'BinaryExpr') {
          expect(expr.right.operator).toBe('*');
        }
      }
    });
  });

  describe('unary expressions', () => {
    it('parses negation', () => {
      const expr = parseExpr('-5');
      expect(expr.kind).toBe('UnaryExpr');
      if (expr.kind === 'UnaryExpr') {
        expect(expr.operator).toBe('-');
      }
    });

    it('parses logical not', () => {
      const expr = parseExpr('!true');
      if (expr.kind === 'UnaryExpr') {
        expect(expr.operator).toBe('!');
      }
    });
  });

  describe('call expressions', () => {
    it('parses function call', () => {
      const expr = parseExpr('foo()');
      expect(expr.kind).toBe('CallExpr');
      if (expr.kind === 'CallExpr') {
        expect(expr.callee.kind).toBe('Identifier');
        expect(expr.args).toHaveLength(0);
      }
    });

    it('parses call with positional arguments', () => {
      const expr = parseExpr('foo(1, 2, 3)');
      if (expr.kind === 'CallExpr') {
        expect(expr.args).toHaveLength(3);
        expect(expr.args[0].name).toBeUndefined();
      }
    });

    it('parses call with named arguments', () => {
      const expr = parseExpr('note(C4, q, vel: 0.8)');
      if (expr.kind === 'CallExpr') {
        expect(expr.args).toHaveLength(3);
        expect(expr.args[2].name).toBe('vel');
      }
    });
  });

  describe('member expressions', () => {
    it('parses member access', () => {
      const expr = parseExpr('obj.prop');
      expect(expr.kind).toBe('MemberExpr');
      if (expr.kind === 'MemberExpr') {
        expect(expr.property).toBe('prop');
      }
    });

    it('parses chained member access', () => {
      const expr = parseExpr('a.b.c');
      expect(expr.kind).toBe('MemberExpr');
      if (expr.kind === 'MemberExpr') {
        expect(expr.property).toBe('c');
        expect(expr.object.kind).toBe('MemberExpr');
      }
    });
  });

  describe('index expressions', () => {
    it('parses index access', () => {
      const expr = parseExpr('arr[0]');
      expect(expr.kind).toBe('IndexExpr');
      if (expr.kind === 'IndexExpr') {
        expect(expr.object.kind).toBe('Identifier');
        expect(expr.index.kind).toBe('NumberLiteral');
      }
    });
  });

  describe('match expressions', () => {
    it('parses match expression', () => {
      const expr = parseExpr('match (x) { 1 -> "one"; else -> "other"; }');
      expect(expr.kind).toBe('MatchExpr');
      if (expr.kind === 'MatchExpr') {
        expect(expr.arms).toHaveLength(2);
        expect(expr.arms[0].isDefault).toBe(false);
        expect(expr.arms[1].isDefault).toBe(true);
      }
    });

    it('parses match with multiple arms', () => {
      const expr = parseExpr('match (n) { 1 -> "a"; 2 -> "b"; 3 -> "c"; else -> "d"; }');
      if (expr.kind === 'MatchExpr') {
        expect(expr.arms).toHaveLength(4);
      }
    });
  });

  describe('statements', () => {
    it('parses if statement', () => {
      const stmt = parseStmt('if (x > 0) { return 1; }');
      expect(stmt.kind).toBe('IfStmt');
      if (stmt.kind === 'IfStmt') {
        expect(stmt.test.kind).toBe('BinaryExpr');
        expect(stmt.alternate).toBeUndefined();
      }
    });

    it('parses if-else statement', () => {
      const stmt = parseStmt('if (x > 0) { return 1; } else { return 0; }');
      if (stmt.kind === 'IfStmt') {
        expect(stmt.alternate).toBeDefined();
        expect(stmt.alternate?.kind).toBe('Block');
      }
    });

    it('parses if-else-if chain', () => {
      const stmt = parseStmt('if (x > 0) { return 1; } else if (x < 0) { return -1; } else { return 0; }');
      if (stmt.kind === 'IfStmt') {
        expect(stmt.alternate?.kind).toBe('IfStmt');
      }
    });

    it('parses for loop', () => {
      const stmt = parseStmt('for (i in [1, 2, 3]) { const x = i; }');
      expect(stmt.kind).toBe('ForStmt');
      if (stmt.kind === 'ForStmt') {
        expect(stmt.iterator).toBe('i');
        expect(stmt.iterable.kind).toBe('ArrayLiteral');
      }
    });

    it('parses let with reassignment', () => {
      // Assignment uses same statement, not a separate expression
      const program = parse('fn foo() -> Int { let x = 1; return x; }');
      const fn = program.body[0];
      if (fn.kind === 'FnDecl') {
        expect(fn.body.statements[0].kind).toBe('ConstDecl');
        if (fn.body.statements[0].kind === 'ConstDecl') {
          expect(fn.body.statements[0].mutable).toBe(true);
        }
      }
    });
  });

  describe('score expressions', () => {
    it('parses empty score', () => {
      const expr = parseExpr('score {}');
      expect(expr.kind).toBe('ScoreExpr');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items).toHaveLength(0);
      }
    });

    it('parses score with meta block', () => {
      const expr = parseExpr('score { meta { title "Test"; } }');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items).toHaveLength(1);
        expect(expr.items[0].kind).toBe('MetaBlock');
      }
    });

    it('parses score with tempo block', () => {
      const expr = parseExpr('score { tempo { 1:1 -> 120bpm; } }');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items[0].kind).toBe('TempoBlock');
        if (expr.items[0].kind === 'TempoBlock') {
          expect(expr.items[0].items).toHaveLength(1);
        }
      }
    });

    it('parses score with meter block', () => {
      const expr = parseExpr('score { meter { 1:1 -> 4/4; } }');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items[0].kind).toBe('MeterBlock');
      }
    });

    it('parses sound declaration', () => {
      const expr = parseExpr('score { sound "piano" kind instrument { label "Piano"; } }');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items[0].kind).toBe('SoundDecl');
        if (expr.items[0].kind === 'SoundDecl') {
          expect(expr.items[0].id).toBe('piano');
          expect(expr.items[0].soundKind).toBe('instrument');
        }
      }
    });

    it('parses drum kit sound', () => {
      const expr = parseExpr('score { sound "kit" kind drumKit { drumKeys { kick; snare; hhc; } } }');
      if (expr.kind === 'ScoreExpr' && expr.items[0].kind === 'SoundDecl') {
        expect(expr.items[0].soundKind).toBe('drumKit');
        const drumKeysBlock = expr.items[0].body.find(b => b.kind === 'DrumKeysBlock');
        expect(drumKeysBlock).toBeDefined();
        if (drumKeysBlock?.kind === 'DrumKeysBlock') {
          expect(drumKeysBlock.keys).toEqual(['kick', 'snare', 'hhc']);
        }
      }
    });

    it('parses vocal sound', () => {
      const expr = parseExpr('score { sound "vocal" kind vocal { vocal { lang "en-US"; range C3..C5; } } }');
      if (expr.kind === 'ScoreExpr' && expr.items[0].kind === 'SoundDecl') {
        expect(expr.items[0].soundKind).toBe('vocal');
      }
    });

    it('parses track declaration', () => {
      const expr = parseExpr('score { sound "p" kind instrument {} track "Piano" role Instrument sound "p" { } }');
      if (expr.kind === 'ScoreExpr') {
        const track = expr.items.find(i => i.kind === 'TrackDecl');
        expect(track).toBeDefined();
        if (track?.kind === 'TrackDecl') {
          expect(track.name).toBe('Piano');
          expect(track.role).toBe('Instrument');
          expect(track.sound).toBe('p');
        }
      }
    });

    it('parses score marker', () => {
      const expr = parseExpr('score { marker(1:1, "section", "Intro"); }');
      if (expr.kind === 'ScoreExpr') {
        expect(expr.items[0].kind).toBe('ScoreMarker');
      }
    });
  });

  describe('clip expressions', () => {
    it('parses empty clip', () => {
      const expr = parseExpr('clip {}');
      expect(expr.kind).toBe('ClipExpr');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body).toHaveLength(0);
      }
    });

    it('parses clip with note', () => {
      const expr = parseExpr('clip { note(C4, q); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body).toHaveLength(1);
        expect(expr.body[0].kind).toBe('NoteStmt');
      }
    });

    it('parses clip with note options', () => {
      const expr = parseExpr('clip { note(C4, q, vel: 0.8); }');
      if (expr.kind === 'ClipExpr' && expr.body[0].kind === 'NoteStmt') {
        expect(expr.body[0].opts).toHaveLength(1);
        expect(expr.body[0].opts[0].name).toBe('vel');
      }
    });

    it('parses clip with chord', () => {
      const expr = parseExpr('clip { chord([C4, E4, G4], w); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('ChordStmt');
      }
    });

    it('parses clip with hit', () => {
      const expr = parseExpr('clip { hit(kick, q); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('HitStmt');
      }
    });

    it('parses clip with rest', () => {
      const expr = parseExpr('clip { rest(q); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('RestStmt');
      }
    });

    it('parses clip with breath', () => {
      const expr = parseExpr('clip { breath(e); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('BreathStmt');
      }
    });

    it('parses clip with at statement', () => {
      const expr = parseExpr('clip { at(q); note(C4, q); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('AtStmt');
      }
    });

    it('parses clip with cc', () => {
      const expr = parseExpr('clip { cc(1, 64); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('CCStmt');
      }
    });

    it('parses clip with automation', () => {
      const expr = parseExpr('clip { automation("volume", 0, 1, linear); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('AutomationStmt');
      }
    });

    it('parses clip with marker', () => {
      const expr = parseExpr('clip { marker("cue", "Point A"); }');
      if (expr.kind === 'ClipExpr') {
        expect(expr.body[0].kind).toBe('MarkerStmt');
      }
    });
  });

  describe('range expressions', () => {
    it('parses pitch range', () => {
      const expr = parseExpr('A0..C8');
      expect(expr.kind).toBe('BinaryExpr');
      if (expr.kind === 'BinaryExpr') {
        expect(expr.operator).toBe('..');
        expect(expr.left.kind).toBe('PitchLiteral');
        expect(expr.right.kind).toBe('PitchLiteral');
      }
    });
  });

  describe('position tracking', () => {
    it('tracks position of function declaration', () => {
      const program = parse('fn foo() -> Int { return 42; }');
      const fn = program.body[0];
      expect(fn.position.line).toBe(1);
      expect(fn.position.column).toBe(1);
    });

    it('tracks position across lines', () => {
      const program = parse(`
fn a() -> Int { return 1; }
fn b() -> Int { return 2; }
`);
      expect(program.body[0].position.line).toBe(2);
      expect(program.body[1].position.line).toBe(3);
    });
  });
});
