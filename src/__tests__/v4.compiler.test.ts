import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { V4Compiler } from '../compiler.js';
import { isStdlibImport, resolveStdlibPath, STDLIB_MODULES } from '../utils/stdlib.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('V4 compiler', () => {
  const tmpDir = path.join(os.tmpdir(), 'mf-v4-test');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
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

  it('compiles a minimal score', () => {
    const mainPath = writeFile('main.mf', `
      export fn main() -> Score {
        return score {
          tempo {
            1:1 -> 120bpm;
          }
          meter {
            1:1 -> 4/4;
          }

          sound "piano" kind instrument {
            label "Piano";
          }

          track "Piano" role Instrument sound "piano" {
            place 1:1 clip {
              note(C4, q);
            };
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

      expect(ir.tako.irVersion).toBe(4);
    expect(ir.tracks.length).toBe(1);
    expect(ir.sounds[0].id).toBe('piano');
  });

  it('resolves stdlib imports', () => {
    const mainPath = writeFile('with-stdlib.mf', `
      import { repeat } from "std:core";

      fn motif() -> Clip {
        return clip {
          note(C4, q);
          note(D4, q);
        };
      }

      export fn main() -> Score {
        const part = repeat(motif(), 2);
        return score {
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }
          sound "piano" kind instrument { label "Piano"; }
          track "Piano" role Instrument sound "piano" {
            place 1:1 part;
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.tracks[0].placements.length).toBe(1);
    expect(ir.tracks[0].placements[0].clip.events.length).toBe(4);
  });

  it('supports score markers', () => {
    const mainPath = writeFile('with-marker.mf', `
      export fn main() -> Score {
        return score {
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }
          marker(1:1, "section", "Intro");

          sound "piano" kind instrument { label "Piano"; }
          track "Piano" role Instrument sound "piano" {
            place 1:1 clip { note(C4, q); };
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.markers?.length ?? 0).toBe(1);
    expect(ir.markers?.[0].kind).toBe('section');
    expect(ir.markers?.[0].label).toBe('Intro');
  });

  it('emits vocal vibrato depth and rate automation', () => {
    const mainPath = writeFile('with-vibrato.mf', `
      import * as vocal from "std:vocal";

      fn part() -> Clip {
        let c = clip {
          note(C4, q);
        };
        return vocal.vibrato(c, depth: 0.25, rate: 5.5);
      }

      export fn main() -> Score {
        return score {
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }
          sound "lead_vocal" kind vocal { vocal { lang "en-US"; range A3..E5; } }
          track "Vocal" role Vocal sound "lead_vocal" {
            place 1:1 part();
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    const events = ir.tracks[0].placements[0].clip.events;
    const params = events
      .filter((ev) => ev.type === 'automation')
      .map((ev) => (ev as any).param);

    expect(params).toContain('vocal:vibratoDepth');
    expect(params).toContain('vocal:vibratoRate');
  });

  it('evaluates match expressions', () => {
    const mainPath = writeFile('with-match.mf', `
      export fn main() -> Score {
        const label = match (2) {
          1 -> "One";
          2 -> "Two";
          else -> "Other";
        };
        return score {
          meta { title label; }
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }
          sound "piano" kind instrument { label "Piano"; }
          track "Piano" role Instrument sound "piano" {
            place 1:1 clip { note(C4, q); };
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.meta.title).toBe('Two');
  });

  it('reports Pos/Dur mismatches', () => {
    const mainPath = writeFile('bad-pos-dur.mf', `
      export fn main() -> Score {
        return score {
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }

          sound "piano" kind instrument { label "Piano"; }
          track "Piano" role Instrument sound "piano" {
            place 1:1 clip {
              rest(1:1);
            };
          }
        };
      }
    `);

    const compiler = new V4Compiler(tmpDir);
    const diagnostics = compiler.check(mainPath);
    const messages = diagnostics.map((d) => d.message);
    expect(messages.some((m) => m.includes('Expected duration'))).toBe(true);
  });
});

describe('stdlib registry', () => {
  it('resolves std: imports', () => {
    expect(isStdlibImport('std:core')).toBe(true);
    expect(isStdlibImport('./local.mf')).toBe(false);

    for (const mod of STDLIB_MODULES) {
      const modPath = resolveStdlibPath(`std:${mod}`);
      expect(fs.existsSync(modPath)).toBe(true);
    }
  });
});
