import { describe, it, expect } from 'vitest';
import { V4Lexer } from '../lexer.js';
import { TokenType } from '../token.js';
import { tokenize, tokenizeWithoutEof } from './helpers/testUtils.js';

describe('V4Lexer', () => {
  describe('basic tokens', () => {
    it('tokenizes empty source', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('tokenizes whitespace only', () => {
      const tokens = tokenize('   \n\t  \r\n  ');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });
  });

  describe('number literals', () => {
    it('tokenizes integers', () => {
      const tokens = tokenizeWithoutEof('42');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(42);
    });

    it('tokenizes floats', () => {
      const tokens = tokenizeWithoutEof('3.14');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(3.14);
    });

    it('tokenizes zero', () => {
      const tokens = tokenizeWithoutEof('0');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(0);
    });

    it('tokenizes multiple numbers', () => {
      const tokens = tokenizeWithoutEof('1 2 3');
      expect(tokens).toHaveLength(3);
      expect(tokens.map(t => t.value)).toEqual([1, 2, 3]);
    });
  });

  describe('string literals', () => {
    it('tokenizes simple strings', () => {
      const tokens = tokenizeWithoutEof('"hello"');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('hello');
    });

    it('tokenizes empty strings', () => {
      const tokens = tokenizeWithoutEof('""');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('');
    });

    it('tokenizes strings with escape sequences', () => {
      const tokens = tokenizeWithoutEof('"hello\\nworld"');
      expect(tokens[0].value).toBe('hello\nworld');
    });

    it('tokenizes strings with tab escape', () => {
      const tokens = tokenizeWithoutEof('"a\\tb"');
      expect(tokens[0].value).toBe('a\tb');
    });

    it('tokenizes strings with escaped quotes', () => {
      const tokens = tokenizeWithoutEof('"say \\"hi\\""');
      expect(tokens[0].value).toBe('say "hi"');
    });

    it('tokenizes strings with escaped backslash', () => {
      const tokens = tokenizeWithoutEof('"path\\\\to\\\\file"');
      expect(tokens[0].value).toBe('path\\to\\file');
    });

    it('throws on unterminated string', () => {
      expect(() => tokenize('"hello')).toThrow('Unterminated string literal');
    });
  });

  describe('position references', () => {
    it('tokenizes simple posref', () => {
      const tokens = tokenizeWithoutEof('1:1');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.POSREF);
      expect(tokens[0].value).toBe('1:1');
    });

    it('tokenizes larger posrefs', () => {
      const tokens = tokenizeWithoutEof('5:2');
      expect(tokens[0].type).toBe(TokenType.POSREF);
      expect(tokens[0].value).toBe('5:2');
    });

    it('tokenizes multiple posrefs', () => {
      const tokens = tokenizeWithoutEof('1:1 2:3 10:4');
      expect(tokens).toHaveLength(3);
      expect(tokens.map(t => t.value)).toEqual(['1:1', '2:3', '10:4']);
    });
  });

  describe('BPM literals', () => {
    it('tokenizes integer bpm', () => {
      const tokens = tokenizeWithoutEof('120bpm');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BPM);
      expect(tokens[0].value).toBe(120);
    });

    it('tokenizes float bpm', () => {
      const tokens = tokenizeWithoutEof('98.5bpm');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BPM);
      expect(tokens[0].value).toBe(98.5);
    });
  });

  describe('pitch literals', () => {
    it('tokenizes simple pitches', () => {
      const tokens = tokenizeWithoutEof('C4');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PITCH);
      expect(tokens[0].value).toBe('C4');
    });

    it('tokenizes sharp pitches', () => {
      const tokens = tokenizeWithoutEof('F#5');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PITCH);
      expect(tokens[0].value).toBe('F#5');
    });

    it('tokenizes flat pitches', () => {
      const tokens = tokenizeWithoutEof('Bb3');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PITCH);
      expect(tokens[0].value).toBe('Bb3');
    });

    it('tokenizes negative octave pitches', () => {
      const tokens = tokenizeWithoutEof('C-1');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PITCH);
      expect(tokens[0].value).toBe('C-1');
    });

    it('tokenizes multiple pitches', () => {
      const tokens = tokenizeWithoutEof('C4 D4 E4');
      expect(tokens).toHaveLength(3);
      expect(tokens.map(t => t.value)).toEqual(['C4', 'D4', 'E4']);
    });
  });

  describe('duration literals', () => {
    it('tokenizes whole note', () => {
      const tokens = tokenizeWithoutEof('w');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DUR);
      expect(tokens[0].value).toBe('w');
    });

    it('tokenizes all basic durations', () => {
      const durations = ['w', 'h', 'q', 'e', 's', 't', 'x'];
      for (const dur of durations) {
        const tokens = tokenizeWithoutEof(dur);
        expect(tokens[0].type).toBe(TokenType.DUR);
        expect(tokens[0].value).toBe(dur);
      }
    });

    it('tokenizes dotted durations', () => {
      const tokens = tokenizeWithoutEof('q.');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DUR);
      expect(tokens[0].value).toBe('q.');
    });

    it('tokenizes multiple durations', () => {
      const tokens = tokenizeWithoutEof('w h q');
      expect(tokens).toHaveLength(3);
      expect(tokens.map(t => t.value)).toEqual(['w', 'h', 'q']);
    });
  });

  describe('keywords', () => {
    it('tokenizes fn keyword', () => {
      const tokens = tokenizeWithoutEof('fn');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.FN);
    });

    it('tokenizes all keywords', () => {
      const keywords = [
        ['import', TokenType.IMPORT],
        ['export', TokenType.EXPORT],
        ['from', TokenType.FROM],
        ['fn', TokenType.FN],
        ['const', TokenType.CONST],
        ['let', TokenType.LET],
        ['return', TokenType.RETURN],
        ['if', TokenType.IF],
        ['else', TokenType.ELSE],
        ['for', TokenType.FOR],
        ['in', TokenType.IN],
        ['match', TokenType.MATCH],
        ['true', TokenType.TRUE],
        ['false', TokenType.FALSE],
        ['null', TokenType.NULL],
        ['score', TokenType.SCORE],
        ['clip', TokenType.CLIP],
        ['track', TokenType.TRACK],
        ['sound', TokenType.SOUND],
        ['meta', TokenType.META],
        ['tempo', TokenType.TEMPO],
        ['meter', TokenType.METER],
        ['place', TokenType.PLACE],
        ['role', TokenType.ROLE],
        ['kind', TokenType.KIND],
        ['as', TokenType.AS],
      ] as const;

      for (const [keyword, expected] of keywords) {
        const tokens = tokenizeWithoutEof(keyword);
        expect(tokens[0].type).toBe(expected);
      }
    });
  });

  describe('identifiers', () => {
    it('tokenizes simple identifier', () => {
      const tokens = tokenizeWithoutEof('foo');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.IDENT);
      expect(tokens[0].value).toBe('foo');
    });

    it('tokenizes identifier with underscore', () => {
      const tokens = tokenizeWithoutEof('my_var');
      expect(tokens[0].type).toBe(TokenType.IDENT);
      expect(tokens[0].value).toBe('my_var');
    });

    it('tokenizes identifier starting with underscore', () => {
      const tokens = tokenizeWithoutEof('_private');
      expect(tokens[0].type).toBe(TokenType.IDENT);
      expect(tokens[0].value).toBe('_private');
    });

    it('tokenizes identifier with numbers', () => {
      const tokens = tokenizeWithoutEof('var123');
      expect(tokens[0].type).toBe(TokenType.IDENT);
      expect(tokens[0].value).toBe('var123');
    });

    it('distinguishes keywords from identifiers', () => {
      const tokens = tokenizeWithoutEof('if_then');
      expect(tokens[0].type).toBe(TokenType.IDENT);
      expect(tokens[0].value).toBe('if_then');
    });
  });

  describe('operators', () => {
    it('tokenizes arithmetic operators', () => {
      const tokens = tokenizeWithoutEof('+ - * / %');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.PLUS,
        TokenType.MINUS,
        TokenType.STAR,
        TokenType.SLASH,
        TokenType.PERCENT,
      ]);
    });

    it('tokenizes comparison operators', () => {
      const tokens = tokenizeWithoutEof('== != < <= > >=');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.EQEQ,
        TokenType.NEQ,
        TokenType.LT,
        TokenType.LTE,
        TokenType.GT,
        TokenType.GTE,
      ]);
    });

    it('tokenizes logical operators', () => {
      const tokens = tokenizeWithoutEof('&& || !');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.AND,
        TokenType.OR,
        TokenType.NOT,
      ]);
    });

    it('tokenizes arrow operator', () => {
      const tokens = tokenizeWithoutEof('->');
      expect(tokens[0].type).toBe(TokenType.ARROW);
    });

    it('tokenizes range operator', () => {
      const tokens = tokenizeWithoutEof('..');
      expect(tokens[0].type).toBe(TokenType.DOTDOT);
    });

    it('tokenizes dot operator', () => {
      const tokens = tokenizeWithoutEof('.');
      expect(tokens[0].type).toBe(TokenType.DOT);
    });

    it('tokenizes nullish coalescing operator', () => {
      const tokens = tokenizeWithoutEof('??');
      expect(tokens[0].type).toBe(TokenType.NULLISH);
    });

    it('tokenizes assignment', () => {
      const tokens = tokenizeWithoutEof('=');
      expect(tokens[0].type).toBe(TokenType.EQ);
    });
  });

  describe('delimiters', () => {
    it('tokenizes parentheses', () => {
      const tokens = tokenizeWithoutEof('()');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.LPAREN,
        TokenType.RPAREN,
      ]);
    });

    it('tokenizes braces', () => {
      const tokens = tokenizeWithoutEof('{}');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.LBRACE,
        TokenType.RBRACE,
      ]);
    });

    it('tokenizes brackets', () => {
      const tokens = tokenizeWithoutEof('[]');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.LBRACKET,
        TokenType.RBRACKET,
      ]);
    });

    it('tokenizes punctuation', () => {
      const tokens = tokenizeWithoutEof(', ; :');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.COMMA,
        TokenType.SEMI,
        TokenType.COLON,
      ]);
    });

    it('tokenizes at sign', () => {
      const tokens = tokenizeWithoutEof('@');
      expect(tokens[0].type).toBe(TokenType.AT);
    });
  });

  describe('comments', () => {
    it('skips line comments', () => {
      const tokens = tokenizeWithoutEof('42 // this is a comment\n43');
      expect(tokens).toHaveLength(2);
      expect(tokens.map(t => t.value)).toEqual([42, 43]);
    });

    it('skips block comments', () => {
      const tokens = tokenizeWithoutEof('42 /* comment */ 43');
      expect(tokens).toHaveLength(2);
      expect(tokens.map(t => t.value)).toEqual([42, 43]);
    });

    it('skips multi-line block comments', () => {
      const tokens = tokenizeWithoutEof('1 /* line1\nline2\nline3 */ 2');
      expect(tokens).toHaveLength(2);
      expect(tokens.map(t => t.value)).toEqual([1, 2]);
    });

    it('handles comment at end of file', () => {
      const tokens = tokenize('42 // end comment');
      expect(tokens).toHaveLength(2); // NUMBER + EOF
      expect(tokens[0].value).toBe(42);
    });
  });

  describe('position tracking', () => {
    it('tracks line and column for tokens', () => {
      const tokens = tokenizeWithoutEof('foo bar');
      expect(tokens[0].position).toEqual({ line: 1, column: 1, offset: 0 });
      expect(tokens[1].position).toEqual({ line: 1, column: 5, offset: 4 });
    });

    it('tracks position across lines', () => {
      const tokens = tokenizeWithoutEof('a\nb\nc');
      expect(tokens[0].position.line).toBe(1);
      expect(tokens[1].position.line).toBe(2);
      expect(tokens[2].position.line).toBe(3);
    });

    it('resets column on new line', () => {
      const tokens = tokenizeWithoutEof('foo\nbar');
      expect(tokens[0].position).toEqual({ line: 1, column: 1, offset: 0 });
      expect(tokens[1].position).toEqual({ line: 2, column: 1, offset: 4 });
    });
  });

  describe('complex expressions', () => {
    it('tokenizes function definition', () => {
      const tokens = tokenizeWithoutEof('fn foo() -> Int { return 42; }');
      const types = tokens.map(t => t.type);
      expect(types).toContain(TokenType.FN);
      expect(types).toContain(TokenType.IDENT);
      expect(types).toContain(TokenType.ARROW);
      expect(types).toContain(TokenType.RETURN);
      expect(types).toContain(TokenType.NUMBER);
    });

    it('tokenizes note call', () => {
      const tokens = tokenizeWithoutEof('note(C4, q, vel: 0.8)');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.IDENT,    // note
        TokenType.LPAREN,
        TokenType.PITCH,    // C4
        TokenType.COMMA,
        TokenType.DUR,      // q
        TokenType.COMMA,
        TokenType.IDENT,    // vel
        TokenType.COLON,
        TokenType.NUMBER,   // 0.8
        TokenType.RPAREN,
      ]);
    });

    it('tokenizes tempo declaration', () => {
      const tokens = tokenizeWithoutEof('tempo { 1:1 -> 120bpm; }');
      expect(tokens.map(t => t.type)).toContain(TokenType.TEMPO);
      expect(tokens.map(t => t.type)).toContain(TokenType.POSREF);
      expect(tokens.map(t => t.type)).toContain(TokenType.ARROW);
      expect(tokens.map(t => t.type)).toContain(TokenType.BPM);
    });

    it('tokenizes pitch range', () => {
      const tokens = tokenizeWithoutEof('range A0..C8');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.IDENT,    // range
        TokenType.PITCH,    // A0
        TokenType.DOTDOT,
        TokenType.PITCH,    // C8
      ]);
    });
  });

  describe('error cases', () => {
    it('throws on unexpected character', () => {
      expect(() => tokenize('$')).toThrow('Unexpected character');
    });

    it('throws on incomplete && operator', () => {
      expect(() => tokenize('& x')).toThrow('Unexpected character');
    });

    it('throws on incomplete || operator', () => {
      expect(() => tokenize('| x')).toThrow('Unexpected character');
    });
  });
});
