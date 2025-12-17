import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { TokenType } from '../types/token.js';

describe('Lexer', () => {
  it('should tokenize basic identifiers and keywords', () => {
    const source = 'const let if else for in proc';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.CONST);
    expect(tokens[1].type).toBe(TokenType.LET);
    expect(tokens[2].type).toBe(TokenType.IF);
    expect(tokens[3].type).toBe(TokenType.ELSE);
    expect(tokens[4].type).toBe(TokenType.FOR);
    expect(tokens[5].type).toBe(TokenType.IN);
    expect(tokens[6].type).toBe(TokenType.PROC);
  });

  it('should tokenize pitch literals', () => {
    const source = 'C4 C#4 Db4 A3 Bb5';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PITCH);
    expect(tokens[0].value).toBe('C4');
    expect(tokens[1].type).toBe(TokenType.PITCH);
    expect(tokens[1].value).toBe('C#4');
    expect(tokens[2].type).toBe(TokenType.PITCH);
    expect(tokens[2].value).toBe('Db4');
  });

  it('should tokenize duration literals', () => {
    const source = '1/4 1/8 3/8 1/16';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.DUR);
    expect(tokens[0].value).toBe('1/4');
    expect(tokens[1].type).toBe(TokenType.DUR);
    expect(tokens[1].value).toBe('1/8');
  });

  it('should tokenize time literals', () => {
    const source = '1:1 2:3 1:1:0 4:2:120';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.TIME);
    expect(tokens[0].value).toBe('1:1');
    expect(tokens[1].type).toBe(TokenType.TIME);
    expect(tokens[1].value).toBe('2:3');
    expect(tokens[2].type).toBe(TokenType.TIME);
    expect(tokens[2].value).toBe('1:1:0');
  });

  it('should tokenize range operators', () => {
    const source = '1..4 1..=4';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.DOTDOT);
    expect(tokens[2].type).toBe(TokenType.INT);
    expect(tokens[3].type).toBe(TokenType.INT);
    expect(tokens[4].type).toBe(TokenType.DOTDOTEQ);
    expect(tokens[5].type).toBe(TokenType.INT);
  });

  it('should tokenize strings', () => {
    const source = '"hello" "world\\n"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello');
    expect(tokens[1].type).toBe(TokenType.STRING);
    expect(tokens[1].value).toBe('world\n');
  });

  it('should skip comments', () => {
    const source = `
      // line comment
      const x = 1; /* block
      comment */ const y = 2;
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENT);
    expect(identifiers.length).toBe(2);
    expect(identifiers[0].value).toBe('x');
    expect(identifiers[1].value).toBe('y');
  });

  it('should tokenize vocal and midi keywords', () => {
    const source = 'vocal midi';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.VOCAL);
    expect(tokens[1].type).toBe(TokenType.MIDI);
  });
});
