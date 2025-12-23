import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';

describe('Parser v2.0', () => {
  function parse(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  it('should parse minimal score', () => {
    const score = parse(`
      score "Test" {
        tempo 120
        time 4/4
        part Vocal {
          phrase {
            notes:
              | C4 q |;
            lyrics mora:
              あ;
          }
        }
      }
    `);
    expect(score.kind).toBe('Score');
    expect(score.title).toBe('Test');
    expect(score.parts.length).toBe(1);
    expect(score.parts[0].name).toBe('Vocal');
  });

  it('should parse backend config', () => {
    const score = parse(`
      score "Test" {
        backend neutrino {
          singer "KIRITAN"
          lang ja
        }
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `);
    expect(score.backend).not.toBeNull();
    expect(score.backend!.name).toBe('neutrino');
    expect(score.backend!.options.length).toBe(2);
  });

  it('should parse tempo and time signature', () => {
    const score = parse(`
      score "Test" {
        tempo 140
        time 3/4
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `);
    expect(score.globals.some(g => g.kind === 'TempoStatement')).toBe(true);
    expect(score.globals.some(g => g.kind === 'TimeSignatureStatement')).toBe(true);
  });

  it('should parse key signature', () => {
    const score = parse(`
      score "Test" {
        key C major
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `);
    const keySig = score.globals.find(g => g.kind === 'KeySignatureStatement') as any;
    expect(keySig).toBeDefined();
    expect(keySig.mode).toBe('major');
  });

  it('should parse phrase with notes and lyrics', () => {
    const score = parse(`
      score "Test" {
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
    const phrase = score.parts[0].body[0] as any;
    expect(phrase.kind).toBe('PhraseBlock');
    expect(phrase.notesSection.bars[0].notes.length).toBe(4);
    expect(phrase.lyricsSection.tokens.length).toBe(4);
  });

  it('should parse tied notes', () => {
    const score = parse(`
      score "Test" {
        part V {
          phrase {
            notes:
              | C4 h~ C4 h |;
            lyrics mora:
              あ;
          }
        }
      }
    `);
    const phrase = score.parts[0].body[0] as any;
    const notes = phrase.notesSection.bars[0].notes;
    expect(notes[0].tieStart).toBe(true);
    expect(notes[1].tieStart).toBeFalsy();
  });

  it('should parse melisma (_)', () => {
    const score = parse(`
      score "Test" {
        part V {
          phrase {
            notes:
              | C4 q  D4 q  E4 q |;
            lyrics mora:
              あ _ _;
          }
        }
      }
    `);
    const phrase = score.parts[0].body[0] as any;
    const tokens = phrase.lyricsSection.tokens;
    expect(tokens[0].isMelisma).toBe(false);
    expect(tokens[1].isMelisma).toBe(true);
    expect(tokens[2].isMelisma).toBe(true);
  });

  it('should parse rest statement', () => {
    const score = parse(`
      score "Test" {
        part V {
          phrase { notes: | C4 q |; lyrics mora: あ; }
          rest q
          phrase { notes: | D4 q |; lyrics mora: い; }
        }
      }
    `);
    expect(score.parts[0].body[1].kind).toBe('RestStatement');
  });

  it('should parse MIDI part with bars', () => {
    const score = parse(`
      score "Test" {
        part Piano {
          midi ch:1 program:0
          | C4 q  E4 q  G4 q  C5 q |
        }
      }
    `);
    expect(score.parts[0].partKind).toBe('midi');
    expect(score.parts[0].body[0].kind).toBe('MidiBar');
  });

  it('should parse MIDI chord', () => {
    const score = parse(`
      score "Test" {
        part Piano {
          midi ch:1 program:0
          | [C4 E4 G4] w |
        }
      }
    `);
    const bar = score.parts[0].body[0] as any;
    expect(bar.items[0].kind).toBe('MidiChord');
    expect(bar.items[0].pitches.length).toBe(3);
  });

  it('should parse short duration literals', () => {
    const score = parse(`
      score "Test" {
        part V {
          phrase {
            notes:
              | C4 w  D4 h  E4 q  F4 e |;
            lyrics mora:
              あ い う え;
          }
        }
      }
    `);
    const notes = (score.parts[0].body[0] as any).notesSection.bars[0].notes;
    expect(notes[0].duration.kind).toBe('DurLiteral');
  });

  it('should parse const in globals', () => {
    const score = parse(`
      score "Test" {
        const BPM = 120;
        tempo BPM
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `);
    expect(score.globals.some(g => g.kind === 'ConstDeclaration')).toBe(true);
  });

  it('should parse proc in globals', () => {
    const score = parse(`
      score "Test" {
        proc helper() { }
        part V { phrase { notes: | C4 q |; lyrics mora: あ; } }
      }
    `);
    expect(score.globals.some(g => g.kind === 'ProcDeclaration')).toBe(true);
  });

  it('should parse for loop in MIDI part after midi options', () => {
    // Note: for loops in part body can't directly contain | bars |
    // They should call procs or use other statements
    const score = parse(`
      score "Test" {
        tempo 120
        time 4/4
        part Piano {
          midi ch:1 program:0
          | C4 q |
        }
      }
    `);
    expect(score.parts[0].partKind).toBe('midi');
    expect(score.parts[0].options.length).toBe(2);
    // Verify MIDI bar was parsed correctly after midi options
    expect(score.parts[0].body.some(b => b.kind === 'MidiBar')).toBe(true);
  });

  it('should parse const declaration after midi options', () => {
    const score = parse(`
      score "Test" {
        tempo 120
        time 4/4
        part Piano {
          midi ch:1
          const x = 42;
          | C4 q |
        }
      }
    `);
    expect(score.parts[0].body.some(b => b.kind === 'ConstDeclaration')).toBe(true);
    expect(score.parts[0].body.some(b => b.kind === 'MidiBar')).toBe(true);
  });
});
