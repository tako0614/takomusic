import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Compiler } from '../compiler/compiler.js';
import { isStdlibImport, resolveStdlibPath, STDLIB_MODULES } from '../utils/stdlib.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Compiler v2.0', () => {
  const tmpDir = path.join(os.tmpdir(), 'mf-compiler-test');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function writeFile(name: string, content: string): string {
    const filePath = path.join(tmpDir, name);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  it('should compile simple score', () => {
    const mainPath = writeFile('simple.mf', `
      score "Test" {
        tempo 120
        time 4/4

        part Piano {
          midi ch:1 program:0
          | C4 q  D4 q  E4 q  F4 q |
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.ppq).toBe(480);
    expect(ir.tempos[0].bpm).toBe(120);
    expect(ir.tracks.length).toBe(1);
  });

  it('should compile vocal score with phrases', () => {
    const mainPath = writeFile('vocal.mf', `
      score "Vocal Test" {
        backend neutrino {
          singer "KIRITAN"
          lang ja
        }
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 q  D4 q  E4 q  F4 q |;
            lyrics mora:
              は じ め ま;
          }
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.title).toBe('Vocal Test');
    expect(ir.backend?.name).toBe('neutrino');
    expect(ir.tracks.length).toBe(1);
    expect(ir.tracks[0].kind).toBe('vocal');
    expect(ir.tracks[0].events.length).toBe(4);
  });

  it('should resolve std: imports', () => {
    // Test isStdlibImport
    expect(isStdlibImport('std:theory')).toBe(true);
    expect(isStdlibImport('std:patterns')).toBe(true);
    expect(isStdlibImport('./local.mf')).toBe(false);
    expect(isStdlibImport('../lib/utils.mf')).toBe(false);

    // Test resolveStdlibPath
    const theoryPath = resolveStdlibPath('std:theory');
    expect(theoryPath).toContain('lib');
    expect(theoryPath).toContain('theory.mf');
    expect(fs.existsSync(theoryPath)).toBe(true);

    // Test all stdlib modules exist
    for (const mod of STDLIB_MODULES) {
      const modPath = resolveStdlibPath(`std:${mod}`);
      expect(fs.existsSync(modPath)).toBe(true);
    }
  });

  it('should compile score with multiple parts', () => {
    const mainPath = writeFile('multi.mf', `
      score "Multi Part" {
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

        part Bass {
          midi ch:2 program:32
          | C2 h  F2 h |
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.tracks.length).toBe(3);
    expect(ir.tracks[0].kind).toBe('vocal');
    expect(ir.tracks[1].kind).toBe('midi');
    expect(ir.tracks[2].kind).toBe('midi');
  });

  it('should handle tied notes and melisma', () => {
    const mainPath = writeFile('tied.mf', `
      score "Tied Notes" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 h~ C4 h |
              | D4 q  E4 q  F4 q  G4 q |;
            lyrics mora:
              あ い _ う え;
          }
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.tracks[0].events.length).toBe(6); // 2 tied + 4 regular
  });
});
