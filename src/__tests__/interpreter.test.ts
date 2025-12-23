import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Interpreter } from '../interpreter/index.js';
import { MFError } from '../errors.js';

describe('Interpreter v2.0', () => {
  function execute(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const score = parser.parse();
    const interpreter = new Interpreter();
    return interpreter.execute(score);
  }

  it('should execute basic score with vocal part', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 q  D4 q |;
            lyrics mora:
              あ い;
          }
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

  it('should execute MIDI part with notes', () => {
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
    const ir = execute(source);

    expect(ir.tracks[0].kind).toBe('midi');
    const midiTrack = ir.tracks[0] as any;
    expect(midiTrack.channel).toBe(0);
    expect(midiTrack.events.length).toBe(4);
  });

  it('should handle tied notes correctly', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 h~ C4 h |;
            lyrics mora:
              あ;
          }
        }
      }
    `;
    const ir = execute(source);

    // Two note events (tied), but lyrics only advance once
    expect(ir.tracks[0].events.length).toBe(2);
    const events = ir.tracks[0].events as any[];
    expect(events[0].lyric).toBe('あ');
    // Second note is continuation, no new lyric
  });

  it('should handle melisma correctly', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 q  D4 q  E4 q |;
            lyrics mora:
              あ _ _;
          }
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks[0].events.length).toBe(3);
    const events = ir.tracks[0].events as any[];
    expect(events[0].lyric).toBe('あ');
    expect(events[1].extend).toBe(true);
    expect(events[2].extend).toBe(true);
  });

  it('should handle rest between phrases', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes: | C4 q |;
            lyrics mora: あ;
          }
          rest q
          phrase {
            notes: | D4 q |;
            lyrics mora: い;
          }
        }
      }
    `;
    const ir = execute(source);

    // Should have 2 note events and 1 rest
    expect(ir.tracks[0].events.length).toBe(3);
  });

  it('should execute MIDI chord', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Piano {
          midi ch:1 program:0
          | [C4 E4 G4] w |
        }
      }
    `;
    const ir = execute(source);

    // Chord should produce 3 note events at same tick
    expect(ir.tracks[0].events.length).toBe(3);
    const events = ir.tracks[0].events as any[];
    expect(events[0].tick).toBe(events[1].tick);
    expect(events[1].tick).toBe(events[2].tick);
  });

  it('should set title from score', () => {
    const source = `
      score "My Song Title" {
        tempo 120
        time 4/4
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `;
    const ir = execute(source);
    expect(ir.title).toBe('My Song Title');
  });

  it('should handle backend configuration', () => {
    const source = `
      score "Test" {
        backend neutrino {
          singer "KIRITAN"
          lang ja
        }
        tempo 120
        time 4/4
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `;
    const ir = execute(source);
    expect(ir.backend?.name).toBe('neutrino');
    expect(ir.backend?.singer).toBe('KIRITAN');
  });

  it('should handle per-note voice parameters', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          phrase {
            notes:
              | C4 q [dyn:100 bre:30]  D4 q [dyn:80] |;
            lyrics mora:
              あ い;
          }
        }
      }
    `;
    const ir = execute(source);

    // Should have 2 note events + voice parameter events
    const events = ir.tracks[0].events as any[];
    const noteEvents = events.filter((e) => e.type === 'note');
    const paramEvents = events.filter((e) => e.type === 'vocaloidParam');

    expect(noteEvents.length).toBe(2);
    expect(paramEvents.length).toBe(3); // 2 for first note (dyn, bre), 1 for second (dyn)

    // Check first note's parameters (dyn:100, bre:30)
    const firstNoteParams = paramEvents.filter((e) => e.tick === 0);
    expect(firstNoteParams.length).toBe(2);
    expect(firstNoteParams.find((e) => e.param === 'DYN')?.value).toBe(100);
    expect(firstNoteParams.find((e) => e.param === 'BRE')?.value).toBe(30);

    // Check second note's parameters (dyn:80) - at tick 480 (quarter note)
    const secondNoteParams = paramEvents.filter((e) => e.tick === 480);
    expect(secondNoteParams.length).toBe(1);
    expect(secondNoteParams[0].param).toBe('DYN');
    expect(secondNoteParams[0].value).toBe(80);
  });

  it('should handle automation statements', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        part Vocal {
          dyn 1:0 100, 2:0 80, 3:0 120
          phrase {
            notes: | C4 w |;
            lyrics mora: あ;
          }
        }
      }
    `;
    const ir = execute(source);

    const events = ir.tracks[0].events as any[];
    const paramEvents = events.filter((e) => e.type === 'vocaloidParam');

    expect(paramEvents.length).toBe(3);
    expect(paramEvents[0].param).toBe('DYN');
    expect(paramEvents[0].tick).toBe(0);      // 1:0 = bar 1, beat 0 = tick 0
    expect(paramEvents[0].value).toBe(100);

    expect(paramEvents[1].tick).toBe(1920);   // 2:0 = bar 2, beat 0 = tick 1920
    expect(paramEvents[1].value).toBe(80);

    expect(paramEvents[2].tick).toBe(3840);   // 3:0 = bar 3, beat 0 = tick 3840
    expect(paramEvents[2].value).toBe(120);
  });

  it('should execute procedures with phrase blocks', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        proc myVerse() {
          phrase {
            notes: | C4 q  D4 q |;
            lyrics mora: あ い;
          }
        }

        part Vocal {
          myVerse();
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks.length).toBe(1);
    expect(ir.tracks[0].events.length).toBe(2);
  });

  it('should execute procedures with parameters', () => {
    const source = `
      score "Test" {
        tempo 120
        time 4/4

        const ROOT = C4;

        proc makeNote(pitch) {
          phrase {
            notes: | C4 q |;
            lyrics mora: あ;
          }
        }

        part Vocal {
          makeNote(ROOT);
        }
      }
    `;
    const ir = execute(source);

    expect(ir.tracks.length).toBe(1);
    expect(ir.tracks[0].events.length).toBe(1);
    const event = ir.tracks[0].events[0] as any;
    expect(event.key).toBe(60); // C4
  });
});
