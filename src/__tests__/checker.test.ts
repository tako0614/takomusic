import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Checker } from '../checker/checker.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Checker v2.0', () => {
  function check(source: string, filePath = 'test.mf') {
    const lexer = new Lexer(source, filePath);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filePath);
    const score = parser.parse();
    const checker = new Checker(path.dirname(filePath));
    return checker.check(score, filePath);
  }

  it('should pass valid score', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q |;
            lyrics mora: あ;
          }
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should detect E100 (lyric count mismatch)', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q  D4 q  E4 q  F4 q |;
            lyrics mora: あ い;
          }
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E100')).toBe(true);
  });

  it('should detect E211 (kanji in lyrics)', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q |;
            lyrics mora: 音;
          }
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E211')).toBe(true);
  });

  it('should warn W110 (vocal pitch out of range)', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C2 q |;
            lyrics mora: あ;
          }
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'W110')).toBe(true);
  });

  it('should allow tied notes with fewer lyrics', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 h~ C4 h |;
            lyrics mora: あ;
          }
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should allow melisma', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q  D4 q  E4 q |;
            lyrics mora: あ _ _;
          }
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should pass valid MIDI part', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Piano {
          midi ch:1 program:0
          | C4 q  E4 q  G4 q  C5 q |
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should pass score with multiple parts', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q  D4 q |;
            lyrics mora: あ い;
          }
        }

        part Piano {
          midi ch:1 program:0
          | [C3 E3 G3] h  [F3 A3 C4] h |
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
