import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Interpreter } from '../interpreter/index.js';
import { MFError } from '../errors.js';

describe('Interpreter', () => {
  function execute(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new Interpreter();
    return interpreter.execute(ast);
  }

  it('should execute basic song with vocal track', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(vocal, v1, { engine: "test" }) {
          at(1:1);
          note(C4, 1/4, "あ");
          note(D4, 1/4, "い");
        }
      }
    `;
    const ir = execute(source);

    expect(ir.ppq).toBe(480);
    expect(ir.tempos[0].bpm).toBe(120);
    expect(ir.timeSigs[0].numerator).toBe(4);
    expect(ir.tracks.length).toBe(1);
    expect(ir.tracks[0].kind).toBe('vocal');
    expect(ir.tracks[0].events.length).toBe(2);
  });

  it('should execute MIDI track with notes', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, drums, { ch: 10, vel: 100 }) {
          at(1:1);
          drum(kick, 1/4, 110);
          drum(snare, 1/4);
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks[0].kind).toBe('midi');
    const midiTrack = ir.tracks[0] as any;
    expect(midiTrack.channel).toBe(9); // 0-based
    expect(midiTrack.events.length).toBe(2);
    expect(midiTrack.events[0].key).toBe(36); // kick
    expect(midiTrack.events[1].key).toBe(38); // snare
  });

  it('should execute for loop', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, bass, { ch: 1 }) {
          at(1:1);
          for (i in 1..=4) {
            note(C3, 1/4);
          }
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks[0].events.length).toBe(4);
  });

  it('should execute proc calls', () => {
    const source = `
      proc PATTERN() {
        note(C4, 1/8);
        note(E4, 1/8);
      }

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
    `;
    const ir = execute(source);

    expect(ir.tracks[0].events.length).toBe(4);
  });

  it('should execute Pitch arithmetic', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, lead, { ch: 1 }) {
          at(1:1);
          const root = C4;
          note(root, 1/4);
          note(root + 4, 1/4);
          note(root + 7, 1/4);
        }
      }
    `;
    const ir = execute(source);

    const events = ir.tracks[0].events as any[];
    expect(events[0].key).toBe(60); // C4
    expect(events[1].key).toBe(64); // E4
    expect(events[2].key).toBe(67); // G4
  });

  it('should execute chord()', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, piano, { ch: 1 }) {
          at(1:1);
          chord([C4, E4, G4], 1/2);
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks[0].events.length).toBe(3);
    // All notes should have the same tick
    expect(ir.tracks[0].events[0].tick).toBe(ir.tracks[0].events[1].tick);
    expect(ir.tracks[0].events[1].tick).toBe(ir.tracks[0].events[2].tick);
  });

  it('should throw E001 when ppq not set', () => {
    const source = `
      export proc main() {
        timeSig(4, 4);
        tempo(120);
      }
    `;
    expect(() => execute(source)).toThrow();
  });

  it('should throw E010 when tempo at tick=0 not set', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
      }
    `;
    expect(() => execute(source)).toThrow();
  });

  it('should throw E050 when global function called after track', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) { }
        tempo(140); // ERROR: after track
      }
    `;
    expect(() => execute(source)).toThrow();
  });

  it('should throw E200 on vocal note overlap', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(vocal, v1, {}) {
          at(1:1);
          note(C4, 1/2, "あ");
          at(1:1);
          note(D4, 1/4, "い"); // overlaps
        }
      }
    `;
    expect(() => execute(source)).toThrow();
  });

  it('should throw on invalid Dur (zero)', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          note(C4, 0/4);
        }
      }
    `;
    expect(() => execute(source)).toThrow();
  });

  it('should preserve cursor across track re-entry', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          at(1:1);
          note(C4, 1/4);
        }

        track(midi, t1, { ch: 1 }) {
          // cursor should be at 1:2 now
          note(D4, 1/4);
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks[0].events.length).toBe(2);
    expect(ir.tracks[0].events[0].tick).toBe(0);
    expect(ir.tracks[0].events[1].tick).toBe(480); // continued from previous
  });

  it('should handle multiple time signatures', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        timeSig(3:1, 3, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          at(1:1);
          note(C4, 1/4);  // tick 0
          at(2:1);
          note(D4, 1/4);  // tick 1920 (4/4 bar = 1920 ticks)
          at(3:1);
          note(E4, 1/4);  // tick 3840 (after 2 bars of 4/4)
          at(4:1);
          note(F4, 1/4);  // tick 5280 (3840 + 3/4 bar = 3840 + 1440)
        }
      }
    `;
    const ir = execute(source);

    const events = ir.tracks[0].events as any[];
    expect(events[0].tick).toBe(0);     // 1:1
    expect(events[1].tick).toBe(1920);  // 2:1 (after one 4/4 bar)
    expect(events[2].tick).toBe(3840);  // 3:1 (after two 4/4 bars)
    expect(events[3].tick).toBe(5280);  // 4:1 (3840 + one 3/4 bar = 3840 + 1440)
  });

  it('should throw E110 on pitch out of range', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(midi, t1, { ch: 1 }) {
          at(1:1);
          const badPitch = C4 + 100;
          note(badPitch, 1/4);
        }
      }
    `;
    expect(() => execute(source)).toThrow(/Pitch.*out of range/);
  });

  it('should throw E210 on missing lyric for vocal', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(vocal, v1, {}) {
          at(1:1);
          note(C4, 1/4);
        }
      }
    `;
    expect(() => execute(source)).toThrow(/Vocal.*lyric/i);
  });

  it('should throw E210 on empty lyric for vocal', () => {
    const source = `
      export proc main() {
        ppq(480);
        timeSig(4, 4);
        tempo(120);

        track(vocal, v1, {}) {
          at(1:1);
          note(C4, 1/4, "");
        }
      }
    `;
    expect(() => execute(source)).toThrow(/Vocal.*lyric/i);
  });
});
