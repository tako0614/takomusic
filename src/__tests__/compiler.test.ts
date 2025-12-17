import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Compiler } from '../compiler/compiler.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Compiler', () => {
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

  it('should compile simple program without imports', () => {
    const mainPath = writeFile('simple.mf', `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          at(1:1);
          note(C4, 1/4);
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.ppq).toBe(480);
    expect(ir.tempos[0].bpm).toBe(120);
    expect(ir.tracks.length).toBe(1);
  });

  it('should resolve imports and execute imported procs', () => {
    writeFile('phrases/pattern.mf', `
      export proc PATTERN() {
        note(C4, 1/8);
        note(E4, 1/8);
        note(G4, 1/8);
      }
    `);

    const mainPath = writeFile('main_import.mf', `
      import { PATTERN } from "./phrases/pattern.mf";

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, lead, { ch: 1 }) {
          at(1:1);
          PATTERN();
          PATTERN();
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.tracks.length).toBe(1);
    expect(ir.tracks[0].events.length).toBe(6); // 3 notes * 2 calls
  });

  it('should resolve imported constants', () => {
    writeFile('constants.mf', `
      export const ROOT = C4;
      export const BPM = 140;
    `);

    const mainPath = writeFile('main_const.mf', `
      import { ROOT, BPM } from "./constants.mf";

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(BPM);

        track(midi, lead, { ch: 1 }) {
          at(1:1);
          note(ROOT, 1/4);
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.tempos[0].bpm).toBe(140);
    expect((ir.tracks[0].events[0] as any).key).toBe(60); // C4
  });

  it('should handle nested imports', () => {
    writeFile('lib/utils.mf', `
      export proc SINGLE_NOTE(pitch) {
        note(pitch, 1/4);
      }
    `);

    writeFile('lib/patterns.mf', `
      import { SINGLE_NOTE } from "./utils.mf";

      export proc CHORD_PATTERN(root) {
        SINGLE_NOTE(root);
        SINGLE_NOTE(root + 4);
        SINGLE_NOTE(root + 7);
      }
    `);

    const mainPath = writeFile('main_nested.mf', `
      import { CHORD_PATTERN } from "./lib/patterns.mf";

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, lead, { ch: 1 }) {
          at(1:1);
          CHORD_PATTERN(C4);
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    const events = ir.tracks[0].events as any[];
    expect(events.length).toBe(3);
    expect(events[0].key).toBe(60); // C4
    expect(events[1].key).toBe(64); // E4
    expect(events[2].key).toBe(67); // G4
  });

  it('should throw E300 for top-level execution in import', () => {
    writeFile('bad_lib.mf', `
      ppq(480);
      export proc FOO() { }
    `);

    const mainPath = writeFile('main_bad.mf', `
      import { FOO } from "./bad_lib.mf";

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
      }
    `);

    const compiler = new Compiler(tmpDir);
    expect(() => compiler.compile(mainPath)).toThrow(/Top-level execution/);
  });

  it('should throw E400 for non-exported symbol', () => {
    writeFile('private_lib.mf', `
      proc PRIVATE() { }
      export proc PUBLIC() { }
    `);

    const mainPath = writeFile('main_private.mf', `
      import { PRIVATE } from "./private_lib.mf";

      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);
      }
    `);

    const compiler = new Compiler(tmpDir);
    expect(() => compiler.compile(mainPath)).toThrow(/not exported/);
  });

  it('should compile the full sample from PLAN.md', () => {
    writeFile('phrases/chorus.mf', `
      export proc CHORUS(root) {
        note(root,   1/8, "ら");
        note(root+2, 1/8, "ら");
        note(root+4, 1/8, "ら");
        note(root+7, 1/8, "ら");
      }
    `);

    writeFile('phrases/drums.mf', `
      export proc ROCK_1BAR() {
        drum(kick,  1/8, 110);
        drum(hhc,   1/8);
        drum(snare, 1/8, 110);
        drum(hhc,   1/8);
        drum(kick,  1/8, 110);
        drum(hhc,   1/8);
        drum(snare, 1/8, 110);
        drum(hhc,   1/8);
      }
    `);

    const mainPath = writeFile('full_sample.mf', `
      import { CHORUS } from "./phrases/chorus.mf";
      import { ROCK_1BAR } from "./phrases/drums.mf";

      export proc main() {
        title("hello");
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(vocal, vocal1, { engine: "piapro", voice: "miku" }) {
          at(1:1);
          note(C4, 1/4, "は");
          note(D4, 1/4, "じ");
          note(E4, 1/4, "め");
          note(F4, 1/4, "て");
          advance(1/4);
          CHORUS(C4);
        }

        track(midi, drums, { ch: 10, vel: 100, program: 0 }) {
          at(1:1);

          for (bar in 1..=4) {
            ROCK_1BAR();

            if (bar == 4) {
              drum(crash, 1/4, 120);
            }
          }
        }
      }
    `);

    const compiler = new Compiler(tmpDir);
    const ir = compiler.compile(mainPath);

    expect(ir.title).toBe('hello');
    expect(ir.ppq).toBe(480);
    expect(ir.tempos[0].bpm).toBe(120);
    expect(ir.timeSigs[0].numerator).toBe(4);
    expect(ir.tracks.length).toBe(2);

    // Vocal track
    const vocalTrack = ir.tracks.find(t => t.kind === 'vocal');
    expect(vocalTrack).toBeDefined();
    expect(vocalTrack!.events.length).toBe(8); // 4 notes + CHORUS(4 notes)

    // Drums track
    const drumsTrack = ir.tracks.find(t => t.kind === 'midi');
    expect(drumsTrack).toBeDefined();
    // 4 bars * 8 hits + 1 crash = 33 events
    expect(drumsTrack!.events.length).toBe(33);
  });
});
