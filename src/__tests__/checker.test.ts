import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Checker } from '../checker/checker.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Checker', () => {
  function check(source: string, filePath = 'test.mf') {
    const lexer = new Lexer(source, filePath);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filePath);
    const program = parser.parse();
    const checker = new Checker(path.dirname(filePath));
    return checker.check(program, filePath);
  }

  it('should pass valid program', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          at(1:1);
          note(C4, 1/4);
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should detect E400 (no main)', () => {
    const source = `
      proc foo() {
        ppq(480);
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E400' && d.message.includes('main'))).toBe(true);
  });

  it('should detect E400 (undefined symbol)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        const x = undefinedVar;
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E400' && d.message.includes('undefinedVar'))).toBe(true);
  });

  it('should detect E050 (global after track)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) { }
        tempo(140);
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E050')).toBe(true);
  });

  it('should detect E310 (direct recursion)', () => {
    const source = `
      proc foo() {
        foo();
      }

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        foo();
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E310')).toBe(true);
  });

  it('should detect E310 (indirect recursion)', () => {
    const source = `
      proc foo() {
        bar();
      }

      proc bar() {
        foo();
      }

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        foo();
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E310')).toBe(true);
  });

  it('should detect E401 (for range not constant with let)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        let n = 4;
        for (i in 1..=n) {
          const x = i;
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E401')).toBe(true);
  });

  it('should allow for range with const', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        const n = 4;
        for (i in 1..=n) {
          const x = i;
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should detect E110 (pitch out of range)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        track(midi, t1, { ch: 1 }) {
          note(C10, 1/4);
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'E110')).toBe(true);
  });

  it('should warn W110 (vocal pitch out of typical range)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        track(vocal, v1, {}) {
          note(C2, 1/4, "あ");
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'W110')).toBe(true);
  });

  it('should warn W100 (extremely short note)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        track(midi, t1, { ch: 1 }) {
          note(C4, 1/128);
        }
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'W100')).toBe(true);
  });

  it('should warn W200 (too many tempo events)', () => {
    let tempoLines = '';
    for (let i = 0; i < 130; i++) {
      tempoLines += `tempo(${120 + i});\n`;
    }
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        ${tempoLines}
      }
    `;
    const diagnostics = check(source);
    expect(diagnostics.some(d => d.code === 'W200')).toBe(true);
  });

  it('should detect E300 (top-level execution in import)', () => {
    // Create a temp file for the import
    const tmpDir = os.tmpdir();
    const libPath = path.join(tmpDir, 'test_lib.mf');
    const mainPath = path.join(tmpDir, 'test_main.mf');

    fs.writeFileSync(libPath, `
      note(C4, 1/4, "あ");
      export proc FOO() { }
    `);

    const mainSource = `
      import { FOO } from "./test_lib.mf";
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        FOO();
      }
    `;
    fs.writeFileSync(mainPath, mainSource);

    const lexer = new Lexer(mainSource, mainPath);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, mainPath);
    const program = parser.parse();
    const checker = new Checker(tmpDir);
    const diagnostics = checker.check(program, mainPath);

    // Cleanup
    fs.unlinkSync(libPath);
    fs.unlinkSync(mainPath);

    expect(diagnostics.some(d => d.code === 'E300')).toBe(true);
  });

  it('should allow drum names without E400', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
        track(midi, drums, { ch: 10 }) {
          drum(kick, 1/4);
          drum(snare, 1/4);
          drum(hhc, 1/4);
        }
      }
    `;
    const diagnostics = check(source);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
