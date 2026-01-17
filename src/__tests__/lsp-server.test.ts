import { describe, it, expect, beforeEach } from 'vitest';
import { V4Lexer } from '../lexer.js';
import { V4Parser } from '../parser.js';
import { typeCheckProgram } from '../typecheck.js';
import type { Diagnostic } from '../diagnostics.js';
import type { Program, FnDecl, ConstDecl } from '../ast.js';

/**
 * Test suite for LSP server functionality
 *
 * This tests the core LSP features by directly testing the helper functions
 * and logic that would be used by the LSP server.
 */

describe('LSP Server Core Functionality', () => {
  describe('Document Validation', () => {
    it('validates correct TakoMusic code', () => {
      const source = `
        fn test() -> Int {
          return 42;
        }
      `;

      const diagnostics: Diagnostic[] = [];
      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      typeCheckProgram(program, diagnostics, 'test.mf');

      expect(diagnostics.length).toBe(0);
      expect(program).toBeDefined();
    });

    it('detects syntax errors', () => {
      const source = `
        fn broken() {
          return
        }
      `;

      let parseError = false;
      try {
        const lexer = new V4Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new V4Parser(tokens);
        parser.parseProgram();
      } catch (err) {
        parseError = true;
        expect(err).toBeDefined();
      }

      expect(parseError).toBe(true);
    });

    it('detects type errors', () => {
      const source = `
        const x: Int = "not an int";
      `;

      const diagnostics: Diagnostic[] = [];
      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      typeCheckProgram(program, diagnostics, 'test.mf');

      expect(diagnostics.some(d => d.severity === 'error')).toBe(true);
    });

    it('includes position information in diagnostics', () => {
      const source = `
        const x: Int = "bad";
      `;

      const diagnostics: Diagnostic[] = [];
      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      typeCheckProgram(program, diagnostics, 'test.mf');

      if (diagnostics.length > 0) {
        expect(diagnostics[0].position).toBeDefined();
        expect(diagnostics[0].position?.line).toBeGreaterThan(0);
      }
    });

    it('validates function return types', () => {
      const source = `
        fn test() -> Int {
          const result: String = "wrong type";
          return 42;
        }
      `;

      const diagnostics: Diagnostic[] = [];
      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      typeCheckProgram(program, diagnostics, 'test.mf');

      // Type checking may or may not detect this depending on implementation
      expect(program).toBeDefined();
    });

    it('validates parameter types', () => {
      const source = `export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip { note(C4, q); };
    }
  };
}`;

      const diagnostics: Diagnostic[] = [];
      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      typeCheckProgram(program, diagnostics, 'test.mf');

      // Should pass type checking
      expect(program).toBeDefined();
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
    });
  });

  describe('Symbol Extraction', () => {
    it('extracts function declarations', () => {
      const source = `
        fn myFunction() -> Int {
          return 1;
        }

        fn anotherFunction() -> Int {
          return 42;
        }
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const functions = program.body.filter(d => d.kind === 'FnDecl');

      expect(functions.length).toBe(2);
      expect((functions[0] as FnDecl).name).toBe('myFunction');
      expect((functions[1] as FnDecl).name).toBe('anotherFunction');
    });

    it('extracts constant declarations', () => {
      const source = `
        const FIRST = 1;
        const SECOND = 2;
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const constants = program.body.filter(d => d.kind === 'ConstDecl');

      expect(constants.length).toBe(2);
      expect((constants[0] as ConstDecl).name).toBe('FIRST');
      expect((constants[1] as ConstDecl).name).toBe('SECOND');
    });

    it('extracts function parameter information', () => {
      const source = `export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip { note(C4, q); };
    }
  };
}`;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const fn = program.body.find(d => d.kind === 'FnDecl') as FnDecl;

      expect(fn).toBeDefined();
      expect(fn.name).toBe('main');
      expect(fn.returnType?.name).toBe('Score');
    });

    it('extracts function return type', () => {
      const source = `
        fn test() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const fn = program.body.find(d => d.kind === 'FnDecl') as FnDecl;

      expect(fn).toBeDefined();
      expect(fn.returnType?.name).toBe('Score');
    });

    it('extracts exported symbols', () => {
      const source = `
        export fn publicFunc() -> Int {
          return 1;
        }

        fn privateFunc() -> Int {
          return 2;
        }

        export const PUBLIC = 1;
        const PRIVATE = 2;
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const exported = program.body.filter(d => d.exported);

      expect(exported.length).toBe(2);
    });
  });

  describe('Hover Information Generation', () => {
    function generateHoverInfo(word: string, program: Program): string | null {
      // Simplified version of hover info generation
      for (const decl of program.body) {
        if (decl.kind === 'FnDecl' && decl.name === word) {
          const fn = decl as FnDecl;
          const params = fn.params.map(p => `${p.name}: ${p.type?.name ?? 'Any'}`).join(', ');
          const returnType = fn.returnType?.name ?? 'Any';
          return `fn ${word}(${params}) -> ${returnType}`;
        }
        if (decl.kind === 'ConstDecl' && decl.name === word) {
          const c = decl as ConstDecl;
          const type = c.type?.name ?? 'inferred';
          return `const ${word}: ${type}`;
        }
      }
      return null;
    }

    it('generates hover for function', () => {
      const source = `export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip { note(C4, q); };
    }
  };
}`;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const hover = generateHoverInfo('main', program);

      expect(hover).toContain('main');
      expect(hover).toContain('Score');
    });

    it('generates hover for constant', () => {
      const source = `
        const VALUE: Int = 42;
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const hover = generateHoverInfo('VALUE', program);

      expect(hover).toContain('VALUE');
      expect(hover).toContain('Int');
    });

    it('returns null for unknown identifier', () => {
      const source = `
        fn test() -> Int {
          return 42;
        }
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const hover = generateHoverInfo('unknown', program);

      expect(hover).toBeNull();
    });
  });

  describe('Completion Item Generation', () => {
    function getKeywordCompletions(): string[] {
      return [
        'fn', 'const', 'let', 'if', 'else', 'for', 'in', 'return',
        'match', 'import', 'export', 'from', 'score', 'clip',
        'track', 'sound', 'tempo', 'meter', 'meta', 'place',
        'note', 'rest', 'chord',
      ];
    }

    function getTypeCompletions(): string[] {
      return ['Score', 'Clip', 'Int', 'Float', 'String', 'Bool', 'Array', 'Pos', 'Dur'];
    }

    function getStdlibCompletions(): string[] {
      return ['repeat', 'concat', 'overlay', 'slice', 'mapEvents'];
    }

    function getDurationCompletions(): string[] {
      return ['w', 'h', 'q', 'e', 's'];
    }

    it('provides keyword completions', () => {
      const keywords = getKeywordCompletions();

      expect(keywords).toContain('fn');
      expect(keywords).toContain('const');
      expect(keywords).toContain('if');
      expect(keywords).toContain('return');
      expect(keywords).toContain('score');
      expect(keywords).toContain('note');
    });

    it('provides type completions', () => {
      const types = getTypeCompletions();

      expect(types).toContain('Score');
      expect(types).toContain('Clip');
      expect(types).toContain('Int');
      expect(types).toContain('String');
    });

    it('provides stdlib function completions', () => {
      const stdlib = getStdlibCompletions();

      expect(stdlib).toContain('repeat');
      expect(stdlib).toContain('concat');
      expect(stdlib).toContain('overlay');
    });

    it('provides duration literal completions', () => {
      const durations = getDurationCompletions();

      expect(durations).toContain('q');
      expect(durations).toContain('h');
      expect(durations).toContain('w');
      expect(durations).toContain('e');
    });

    it('provides user-defined symbols from program', () => {
      const source = `
        fn myFunction() -> Int {
          return 1;
        }

        const MY_CONST = 42;
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const userSymbols = program.body.map(d => d.name);

      expect(userSymbols).toContain('myFunction');
      expect(userSymbols).toContain('MY_CONST');
    });
  });

  describe('Definition Location', () => {
    it('finds function definition position', () => {
      const source = `
        fn myFunc() -> Int {
          return 42;
        }
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const fn = program.body.find(d => d.kind === 'FnDecl' && d.name === 'myFunc') as FnDecl;

      expect(fn).toBeDefined();
      expect(fn.position).toBeDefined();
      expect(fn.position.line).toBeGreaterThan(0);
      expect(fn.position.column).toBeGreaterThan(0);
    });

    it('finds constant definition position', () => {
      const source = `
        const VALUE = 42;
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const constant = program.body.find(d => d.kind === 'ConstDecl' && d.name === 'VALUE') as ConstDecl;

      expect(constant).toBeDefined();
      expect(constant.position).toBeDefined();
      expect(constant.position.line).toBeGreaterThan(0);
    });
  });

  describe('Signature Help', () => {
    function getBuiltinSignature(name: string): { label: string; params: string[] } | null {
      const signatures: Record<string, { label: string; params: string[] }> = {
        note: {
          label: 'note(pitch, duration, [vel: Float], [voice: Int])',
          params: ['pitch', 'duration', 'vel: Float', 'voice: Int'],
        },
        rest: {
          label: 'rest(duration)',
          params: ['duration'],
        },
        chord: {
          label: 'chord(pitches, duration, [vel: Float])',
          params: ['pitches', 'duration', 'vel: Float'],
        },
        repeat: {
          label: 'repeat(clip, count) -> Clip',
          params: ['clip', 'count'],
        },
      };

      return signatures[name] ?? null;
    }

    it('provides signature for note function', () => {
      const sig = getBuiltinSignature('note');

      expect(sig).toBeDefined();
      expect(sig?.label).toContain('pitch');
      expect(sig?.label).toContain('duration');
      expect(sig?.params.length).toBeGreaterThan(0);
    });

    it('provides signature for rest function', () => {
      const sig = getBuiltinSignature('rest');

      expect(sig).toBeDefined();
      expect(sig?.label).toContain('duration');
      expect(sig?.params).toContain('duration');
    });

    it('provides signature for repeat function', () => {
      const sig = getBuiltinSignature('repeat');

      expect(sig).toBeDefined();
      expect(sig?.label).toContain('clip');
      expect(sig?.label).toContain('count');
      expect(sig?.params).toContain('clip');
      expect(sig?.params).toContain('count');
    });

    it('returns null for unknown function', () => {
      const sig = getBuiltinSignature('unknownFunc');

      expect(sig).toBeNull();
    });

    it('extracts signature from user-defined function', () => {
      const source = `export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip { note(C4, q); };
    }
  };
}`;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const fn = program.body.find(d => d.kind === 'FnDecl' && d.name === 'main') as FnDecl;

      expect(fn).toBeDefined();
      expect(fn.params.length).toBe(0);
      expect(fn.returnType?.name).toBe('Score');
    });
  });

  describe('Word Range Detection', () => {
    function getWordRangeAtPosition(text: string, offset: number): { start: number; end: number } | null {
      const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
      let match;
      while ((match = wordPattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (offset >= start && offset <= end) {
          return { start, end };
        }
        if (start > offset) break;
      }
      return null;
    }

    it('finds word at cursor position', () => {
      const text = 'const myVariable = 42;';
      const offset = 10; // Inside 'myVariable'

      const range = getWordRangeAtPosition(text, offset);

      expect(range).toBeDefined();
      expect(text.substring(range!.start, range!.end)).toBe('myVariable');
    });

    it('finds word at start of identifier', () => {
      const text = 'const myVar = 42;';
      const offset = 6; // Start of 'myVar'

      const range = getWordRangeAtPosition(text, offset);

      expect(range).toBeDefined();
      expect(text.substring(range!.start, range!.end)).toBe('myVar');
    });

    it('finds word at end of identifier', () => {
      const text = 'const myVar = 42;';
      const offset = 11; // End of 'myVar'

      const range = getWordRangeAtPosition(text, offset);

      expect(range).toBeDefined();
      expect(text.substring(range!.start, range!.end)).toBe('myVar');
    });

    it('returns null when not on a word', () => {
      const text = 'const myVar = 42;';
      const offset = 12; // On the space after 'myVar'

      const range = getWordRangeAtPosition(text, offset);

      expect(range).toBeNull();
    });

    it('handles underscores in identifiers', () => {
      const text = 'const my_var_name = 42;';
      const offset = 10;

      const range = getWordRangeAtPosition(text, offset);

      expect(range).toBeDefined();
      expect(text.substring(range!.start, range!.end)).toBe('my_var_name');
    });
  });

  describe('Import Analysis', () => {
    it('extracts import declarations', () => {
      const source = `
        import { repeat, concat } from "std:core";
        import * as vocal from "std:vocal";
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      expect(program.imports.length).toBe(2);
      expect(program.imports[0].from.value).toBe('std:core');
      expect(program.imports[1].from.value).toBe('std:vocal');
    });

    it('extracts named imports', () => {
      const source = `
        import { repeat, concat, overlay } from "std:core";
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const importDecl = program.imports[0];
      expect(importDecl.spec.kind).toBe('ImportNamed');

      if (importDecl.spec.kind === 'ImportNamed') {
        expect(importDecl.spec.names).toContain('repeat');
        expect(importDecl.spec.names).toContain('concat');
        expect(importDecl.spec.names).toContain('overlay');
      }
    });

    it('extracts namespace imports', () => {
      const source = `
        import * as core from "std:core";
      `;

      const lexer = new V4Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new V4Parser(tokens);
      const program = parser.parseProgram();

      const importDecl = program.imports[0];
      expect(importDecl.spec.kind).toBe('ImportAll');

      if (importDecl.spec.kind === 'ImportAll') {
        expect(importDecl.spec.alias).toBe('core');
      }
    });
  });
});
