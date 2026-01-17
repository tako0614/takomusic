import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserCompiler, compile, check, parse, tokenize } from '../browser/index.js';
import { VirtualFileSystem, STDLIB_MODULES } from '../browser/virtualFs.js';
import { TokenType } from '../token.js';

describe('BrowserCompiler', () => {
  let compiler: BrowserCompiler;
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    compiler = new BrowserCompiler(vfs);
  });

  describe('compile()', () => {
    it('compiles a minimal score', () => {
      const source = `
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
      `;

      const result = compiler.compile(source, '/main.mf');

      expect(result.success).toBe(true);
      expect(result.ir).toBeDefined();
      expect(result.ir?.tako.irVersion).toBe(4);
      expect(result.ir?.tako.generator).toBe('takomusic-browser');
      expect(result.ir?.tracks.length).toBe(1);
      expect(result.ir?.sounds[0].id).toBe('piano');
      expect(result.diagnostics).toHaveLength(0);
    });

    it('compiles score with multiple tracks', () => {
      const source = `
        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }

            sound "piano" kind instrument { label "Piano"; }
            sound "bass" kind instrument { label "Bass"; }

            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }

            track "Bass" role Instrument sound "bass" {
              place 1:1 clip { note(C2, h); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.tracks).toHaveLength(2);
      expect(result.ir?.sounds).toHaveLength(2);
    });

    it('compiles score with tempo changes', () => {
      const source = `
        export fn main() -> Score {
          return score {
            tempo {
              1:1 -> 120bpm;
              3:1 -> 140bpm;
            }
            meter { 1:1 -> 4/4; }

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.tempoMap).toHaveLength(2);
    });

    it('compiles score with meter changes', () => {
      const source = `
        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter {
              1:1 -> 4/4;
              5:1 -> 3/4;
            }

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.meterMap).toHaveLength(2);
    });

    it('compiles score with metadata', () => {
      const source = `
        export fn main() -> Score {
          return score {
            meta {
              title "Test Song";
              artist "Test Artist";
              album "Test Album";
            }
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.meta.title).toBe('Test Song');
      expect(result.ir?.meta.artist).toBe('Test Artist');
      expect(result.ir?.meta.album).toBe('Test Album');
    });

    it('compiles score with markers', () => {
      const source = `
        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            marker(1:1, "section", "Intro");
            marker(5:1, "section", "Verse");

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.markers).toHaveLength(2);
      expect(result.ir?.markers?.[0].kind).toBe('section');
      expect(result.ir?.markers?.[0].label).toBe('Intro');
      expect(result.ir?.markers?.[1].label).toBe('Verse');
    });

    it('compiles with helper functions', () => {
      const source = `
        fn motif() -> Clip {
          return clip {
            note(C4, q);
            note(D4, q);
            note(E4, q);
          };
        }

        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 motif();
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.tracks[0].placements[0].clip.events).toHaveLength(3);
    });

    it('compiles with constants', () => {
      const source = `
        const TEMPO = 120;

        export fn main() -> Score {
          return score {
            tempo { 1:1 -> TEMPO bpm; }
            meter { 1:1 -> 4/4; }

            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 clip { note(C4, q); };
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.tempoMap[0].bpm).toBe(120);
    });

    it('returns error when main function is missing', () => {
      const source = `
        fn helper() -> Clip {
          return clip { note(C4, q); };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.message.includes('main() not found'))).toBe(true);
    });

    it('returns error when main has wrong type', () => {
      const source = `
        export fn main() -> Int {
          return 42;
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.severity === 'error')).toBe(true);
    });

    it('returns error for syntax errors', () => {
      const source = `
        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            // missing closing brace
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].severity).toBe('error');
    });

    it('returns error for type errors', () => {
      const source = `
        export fn main() -> Score {
          const x: Int = "not an int";
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

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.severity === 'error')).toBe(true);
    });

    it('generates source hash', () => {
      const source = `
        export fn main() -> Score {
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

      const result1 = compiler.compile(source, '/test1.mf');
      const result2 = compiler.compile(source, '/test2.mf');

      expect(result1.ir?.tako.sourceHash).toBeDefined();
      expect(result2.ir?.tako.sourceHash).toBeDefined();
      // Same source in different files should produce different hashes
      expect(result1.ir?.tako.sourceHash).not.toBe(result2.ir?.tako.sourceHash);
    });

    it('validates IR schema', () => {
      const source = `
        export fn main() -> Score {
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

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      // If schema validation fails, diagnostics would include errors
      expect(result.diagnostics.some(d => d.message.includes('schema validation'))).toBe(false);
    });
  });

  describe('check()', () => {
    it('parses and type-checks valid code', () => {
      const source = `
        const x: Int = 42;

        fn helper() -> Clip {
          return clip { note(C4, q); };
        }

        export fn main() -> Score {
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

      const result = compiler.check(source);

      expect(result.success).toBe(true);
      expect(result.program).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.ast).toBeDefined();
      expect(result.ir).toBeUndefined(); // check() doesn't evaluate
    });

    it('detects type errors without evaluating', () => {
      const source = `
        const x: Int = "wrong type";
      `;

      const result = compiler.check(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.severity === 'error')).toBe(true);
    });

    it('detects syntax errors', () => {
      const source = `
        fn broken() {
          return
        }
      `;

      const result = compiler.check(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
    });

    it('includes position information in diagnostics', () => {
      const source = `
        const x: Int = "bad";
      `;

      const result = compiler.check(source);

      expect(result.diagnostics[0].position).toBeDefined();
      expect(result.diagnostics[0].position?.line).toBeGreaterThan(0);
    });
  });

  describe('Module System', () => {
    it('resolves stdlib imports (std:core)', () => {
      const source = `
        import { repeat } from "std:core";

        fn motif() -> Clip {
          return clip { note(C4, q); };
        }

        export fn main() -> Score {
          const part = repeat(motif(), 3);
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 part;
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
      expect(result.ir?.tracks[0].placements[0].clip.events.length).toBeGreaterThan(1);
    });

    it('resolves namespace stdlib imports', () => {
      const source = `
        import * as core from "std:core";

        export fn main() -> Score {
          const part = core.repeat(clip { note(C4, q); }, 2);
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 part;
            }
          };
        }
      `;

      const result = compiler.compile(source);

      expect(result.success).toBe(true);
    });

    it('reports error for unknown stdlib module', () => {
      const source = `
        import { something } from "std:unknown";

        export fn main() -> Score {
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

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.message.includes('Unknown stdlib module'))).toBe(true);
    });

    it('reports error for missing export', () => {
      const source = `
        import { nonexistent } from "std:core";

        export fn main() -> Score {
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

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.message.includes('not exported'))).toBe(true);
    });

    it('resolves relative imports', () => {
      vfs.writeFile('/lib/helpers.mf', `
        export fn motif() -> Clip {
          return clip {
            note(C4, q);
            note(D4, q);
          };
        }
      `);

      const source = `
        import { motif } from "./lib/helpers.mf";

        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 motif();
            }
          };
        }
      `;

      const result = compiler.compile(source, '/main.mf');

      expect(result.success).toBe(true);
      expect(result.ir?.tracks[0].placements[0].clip.events).toHaveLength(2);
    });

    it('resolves parent directory imports', () => {
      vfs.writeFile('/helpers.mf', `
        export fn motif() -> Clip {
          return clip { note(C4, q); };
        }
      `);

      const source = `
        import { motif } from "../helpers.mf";

        export fn main() -> Score {
          return score {
            tempo { 1:1 -> 120bpm; }
            meter { 1:1 -> 4/4; }
            sound "piano" kind instrument { label "Piano"; }
            track "Piano" role Instrument sound "piano" {
              place 1:1 motif();
            }
          };
        }
      `;

      const result = compiler.compile(source, '/src/main.mf');

      expect(result.success).toBe(true);
    });

    it('reports error when module not found', () => {
      const source = `
        import { something } from "./missing.mf";

        export fn main() -> Score {
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

      const result = compiler.compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.message.includes('Module not found'))).toBe(true);
    });

    it('caches loaded modules', () => {
      vfs.writeFile('/shared.mf', `
        export const VALUE = 42;
      `);

      vfs.writeFile('/a.mf', `
        import { VALUE } from "./shared.mf";
        export const A = VALUE;
      `);

      vfs.writeFile('/b.mf', `
        import { VALUE } from "./shared.mf";
        export const B = VALUE;
      `);

      const source = `
        import { A } from "./a.mf";
        import { B } from "./b.mf";

        export fn main() -> Score {
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

      const result = compiler.compile(source, '/main.mf');

      expect(result.success).toBe(true);
      // Should not error despite shared.mf being imported twice
    });
  });

  describe('Virtual File System', () => {
    it('reads and writes files', () => {
      vfs.writeFile('/test.mf', 'content');
      expect(vfs.readFile('/test.mf')).toBe('content');
    });

    it('returns null for non-existent files', () => {
      expect(vfs.readFile('/missing.mf')).toBeNull();
    });

    it('overwrites existing files', () => {
      vfs.writeFile('/test.mf', 'first');
      vfs.writeFile('/test.mf', 'second');
      expect(vfs.readFile('/test.mf')).toBe('second');
    });

    it('provides stdlib source', () => {
      for (const moduleName of Object.keys(STDLIB_MODULES)) {
        const source = vfs.getStdlibSource(moduleName);
        expect(source).toBeDefined();
        expect(typeof source).toBe('string');
        expect(source!.length).toBeGreaterThan(0);
      }
    });

    it('returns null for unknown stdlib module', () => {
      expect(vfs.getStdlibSource('nonexistent')).toBeNull();
    });
  });
});

describe('Convenience Functions', () => {
  describe('compile()', () => {
    it('compiles source code', () => {
      const source = `
        export fn main() -> Score {
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

      const result = compile(source);

      expect(result.success).toBe(true);
      expect(result.ir).toBeDefined();
    });
  });

  describe('check()', () => {
    it('checks source code without evaluation', () => {
      const source = `
        const x: Int = 42;
        export fn main() -> Score {
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

      const result = check(source);

      expect(result.success).toBe(true);
      expect(result.program).toBeDefined();
      expect(result.ir).toBeUndefined();
    });
  });

  describe('parse()', () => {
    it('parses valid source', () => {
      const source = `
        fn test() -> Int {
          return 42;
        }
      `;

      const result = parse(source);

      expect(result.program).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('returns error for invalid syntax', () => {
      const source = `
        fn broken() {
          return
        }
      `;

      const result = parse(source);

      expect(result.program).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('tokenize()', () => {
    it('tokenizes valid source', () => {
      const source = 'const x = 42;';
      const result = tokenize(source);

      expect(result.tokens).toBeDefined();
      expect(result.tokens!.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('tokenizes and includes all token types', () => {
      const source = 'const myVar = 42;';
      const result = tokenize(source);

      expect(result.tokens).toBeDefined();
      const types = result.tokens!.map(t => t.type);
      expect(types).toContain(TokenType.CONST);
      expect(types).toContain(TokenType.IDENT);
      expect(types).toContain(TokenType.EQ);
      expect(types).toContain(TokenType.NUMBER);
      expect(types).toContain(TokenType.SEMI);
      expect(types).toContain(TokenType.EOF);
    });

    it('returns error for invalid tokens', () => {
      const source = 'const x = `invalid template without close';
      const result = tokenize(source);

      expect(result.tokens).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});

describe('Browser Environment', () => {
  it('does not use Node.js fs module', () => {
    // This test ensures browser compatibility
    const source = `
      export fn main() -> Score {
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

    const compiler = new BrowserCompiler();
    const result = compiler.compile(source);

    // Should work without any file system access
    expect(result.success).toBe(true);
  });

  it('uses virtual file system for stdlib', () => {
    const source = `
      import { repeat } from "std:core";

      export fn main() -> Score {
        return score {
          tempo { 1:1 -> 120bpm; }
          meter { 1:1 -> 4/4; }
          sound "piano" kind instrument { label "Piano"; }
          track "Piano" role Instrument sound "piano" {
            place 1:1 repeat(clip { note(C4, q); }, 2);
          }
        };
      }
    `;

    const compiler = new BrowserCompiler();
    const result = compiler.compile(source);

    // Should resolve stdlib without file system
    expect(result.success).toBe(true);
  });

  it('generates simple hash without crypto module', () => {
    const source = `
      export fn main() -> Score {
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

    const compiler = new BrowserCompiler();
    const result = compiler.compile(source);

    expect(result.ir?.tako.sourceHash).toBeDefined();
    expect(typeof result.ir?.tako.sourceHash).toBe('string');
    expect(result.ir?.tako.sourceHash.length).toBeGreaterThan(0);
  });
});
