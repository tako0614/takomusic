import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import { Interpreter } from '../interpreter/index.js';

/**
 * Tests to verify LANGUAGE.md examples match implementation
 */
describe('LANGUAGE.md Specification Tests', () => {
  function parse(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  function execute(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const score = parser.parse();
    const interpreter = new Interpreter();
    return interpreter.execute(score);
  }

  describe('Score Structure', () => {
    it('should parse basic score structure with backend, tempo, time, key', () => {
      const source = `
        score "Song Title" {
          backend neutrino {
            singer "KIRITAN"
            lang ja
          }

          tempo 120
          time 4/4
          key C major

          part Vocal {
            phrase {
              notes: | C4 q |;
              lyrics mora: あ;
            }
          }

          part Piano {
            midi ch:1
            | C4 q |
          }
        }
      `;
      const score = parse(source);
      expect(score.title).toBe('Song Title');
      expect(score.backend?.name).toBe('neutrino');
      expect(score.parts.length).toBe(2);
    });
  });

  describe('Backend Configuration', () => {
    it('should parse backend with all options', () => {
      const source = `
        score "Test" {
          backend neutrino {
            singer "KIRITAN"
            lang ja
            phonemeBudgetPerOnset 8
            maxPhraseSeconds 10
          }
          tempo 120
          time 4/4
          part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
        }
      `;
      const score = parse(source);
      expect(score.backend?.options.length).toBe(4);
    });
  });

  describe('Parts and Phrases', () => {
    it('should parse vocal part with multiple phrases and rest', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4

          part Vocal {
            phrase {
              notes:
                | C4 q  D4 q  E4 q  F4 q |
                | G4 h         A4 h     |;

              lyrics mora:
                き ず だ ら け の;
            }

            rest q

            phrase {
              notes:
                | B4 q  C5 q  D5 q  E5 q |;

              lyrics mora:
                ま ま で い;
            }
          }
        }
      `;
      const ir = execute(source);
      expect(ir.tracks.length).toBe(1);
      // 6 notes in first phrase + 1 rest + 5 notes in second phrase = 12 events
      // But the second phrase has 5 lyrics for 4 notes - mismatch
    });
  });

  describe('Underlay Rules', () => {
    it('should handle basic underlay (one lyric per onset)', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Vocal {
            phrase {
              notes: | C4 q  D4 q  E4 q  F4 q |;
              lyrics mora: き ず だ ら;
            }
          }
        }
      `;
      const ir = execute(source);
      const events = ir.tracks[0].events as any[];
      expect(events[0].lyric).toBe('き');
      expect(events[1].lyric).toBe('ず');
      expect(events[2].lyric).toBe('だ');
      expect(events[3].lyric).toBe('ら');
    });

    it('should handle melisma with underscore', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Vocal {
            phrase {
              notes: | G4 q  A4 q  B4 q  C5 q |;
              lyrics mora: ま _ _ ま;
            }
          }
        }
      `;
      const ir = execute(source);
      const events = ir.tracks[0].events as any[];
      expect(events[0].lyric).toBe('ま');
      expect(events[1].extend).toBe(true);
      expect(events[2].extend).toBe(true);
      expect(events[3].lyric).toBe('ま');
    });
  });

  describe('Ties', () => {
    it('should handle tied notes (second note is not an onset)', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Vocal {
            phrase {
              notes: | C4 h~  C4 h   D4 q  E4 q |;
              lyrics mora: こ ん に;
            }
          }
        }
      `;
      const ir = execute(source);
      // 4 note events, but only 3 lyrics (tied C4 doesn't consume lyric)
      const events = ir.tracks[0].events as any[];
      expect(events.length).toBe(4);
      expect(events[0].lyric).toBe('こ');
      // Second C4 is continuation, no lyric
      expect(events[2].lyric).toBe('ん');
      expect(events[3].lyric).toBe('に');
    });
  });

  describe('Voice Tuning', () => {
    it('should handle per-note voice parameters', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Vocal {
            phrase {
              notes:
                | C4 q [dyn:100 bre:30]  D4 q [dyn:80]  E4 h |;
              lyrics mora:
                あ い う;
            }
          }
        }
      `;
      const ir = execute(source);
      const events = ir.tracks[0].events as any[];
      const paramEvents = events.filter((e: any) => e.type === 'vocaloidParam');
      expect(paramEvents.length).toBe(3); // dyn:100, bre:30, dyn:80
    });

    it('should handle automation curves', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4

          part Vocal {
            dyn 1:0 100, 2:0 80, 3:0 120
            bre 1:0 0, 2:0 50, 3:0 0

            phrase {
              notes: | C4 w  D4 w  E4 w |;
              lyrics mora: あ い う;
            }
          }
        }
      `;
      const ir = execute(source);
      const events = ir.tracks[0].events as any[];
      const paramEvents = events.filter((e: any) => e.type === 'vocaloidParam');
      // 3 dyn + 3 bre = 6 param events
      expect(paramEvents.length).toBe(6);
    });
  });

  describe('MIDI Tracks', () => {
    it('should parse MIDI part with options and chords', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Piano {
            midi ch:1 program:0

            | C4 q  E4 q  G4 q  C5 q |
            | [C4 E4 G4] h            |
          }
        }
      `;
      const ir = execute(source);
      expect(ir.tracks[0].kind).toBe('midi');
      const midiTrack = ir.tracks[0] as any;
      expect(midiTrack.channel).toBe(0); // 0-indexed
    });

    it('should parse drum names', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Drums {
            midi ch:10

            | kick q  snare q  kick q  snare q |
          }
        }
      `;
      const ir = execute(source);
      expect(ir.tracks[0].kind).toBe('midi');
    });
  });

  describe('Control Structures', () => {
    it('should handle const declarations', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          const root = C4;
          part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
        }
      `;
      const ir = execute(source);
      expect(ir.tracks.length).toBe(1);
    });

    it('should handle let in procedures', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          proc example() {
            let count = 0;
            count = count + 1;
          }
          part V {
            example();
            phrase { notes: | C4 q |; lyrics mora: あ; }
          }
        }
      `;
      const ir = execute(source);
      expect(ir.tracks.length).toBe(1);
    });

    it('should handle for loops', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          proc myPattern() {
            phrase { notes: | C4 q |; lyrics mora: あ; }
          }
          part Vocal {
            for (i in 0..4) {
              myPattern();
            }
          }
        }
      `;
      const ir = execute(source);
      // 4 iterations of myPattern, each with 1 note
      expect(ir.tracks[0].events.length).toBe(4);
    });
  });

  describe('Procedures', () => {
    it('should define and call procedures with phrase blocks', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4

          proc myVerse() {
            phrase {
              notes:
                | C4 q  D4 q  E4 q  F4 q |;

              lyrics mora:
                ら ら ら ら;
            }
          }

          part Vocal {
            myVerse();
            rest q
            myVerse();
          }
        }
      `;
      const ir = execute(source);
      // 2 calls to myVerse (4 notes each) + 1 rest = 9 events
      expect(ir.tracks[0].events.length).toBe(9);
    });
  });

  describe('Rests and Breaths', () => {
    it('should handle rest between phrases', () => {
      const source = `
        score "Test" {
          tempo 120
          time 4/4
          part Vocal {
            phrase {
              notes: | C4 q  D4 q |;
              lyrics mora: き ず;
            }
            rest q
            phrase {
              notes: | E4 q  F4 q |;
              lyrics mora: だ ら;
            }
          }
        }
      `;
      const ir = execute(source);
      // 2 notes + 1 rest + 2 notes = 5 events
      expect(ir.tracks[0].events.length).toBe(5);
    });
  });

  describe('Complete Example', () => {
    it('should parse and execute the complete example from docs', () => {
      const source = `
        score "はじめまして" {
          backend neutrino {
            singer "KIRITAN"
            lang ja
          }

          tempo 120
          time 4/4

          part Vocal {
            phrase {
              notes:
                | C4 q  D4 q  E4 q  F4 q |
                | G4 h         A4 h     |;

              lyrics mora:
                は じ め ま し て;
            }

            rest q

            phrase {
              notes:
                | G4 q  A4 q  B4 q  C5 q |;

              lyrics mora:
                よ ろ し く;
            }
          }

          part Piano {
            midi ch:1 program:0

            | [C4 E4 G4] w |
            | [F4 A4 C5] w |
          }
        }
      `;
      const ir = execute(source);
      expect(ir.title).toBe('はじめまして');
      expect(ir.tracks.length).toBe(2);
      expect(ir.tracks[0].kind).toBe('vocal');
      expect(ir.tracks[1].kind).toBe('midi');
    });
  });
});
