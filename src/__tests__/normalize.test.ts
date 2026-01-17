import { describe, it, expect } from 'vitest';
import { normalizeScore } from '../normalize.js';
import { makeRat, ratFromInt, compareRat } from '../rat.js';
import type { Diagnostic } from '../diagnostics.js';
import type { ScoreValueData, MeterEventValue, TempoEventValue, PosValue } from '../runtime.js';

// Helper to create a PosValue from a rational number
function posFromRat(n: number, d: number): PosValue {
  return { type: 'pos', value: makeRat(n, d) };
}

// Helper to create a PosValue from a bar:beat reference
function posFromRef(bar: number, beat: number): PosValue {
  return { type: 'pos', value: { kind: 'posref', bar, beat } };
}

// Helper to create a PosValue from a bar:beat + offset
function posFromExpr(bar: number, beat: number, offsetN: number, offsetD: number): PosValue {
  return {
    type: 'pos',
    value: {
      kind: 'posExpr',
      base: { kind: 'posref', bar, beat },
      offset: makeRat(offsetN, offsetD)
    }
  };
}

// Helper to create a minimal valid score
function createMinimalScore(overrides: Partial<ScoreValueData> = {}): ScoreValueData {
  return {
    meta: {},
    tempoMap: [
      { at: posFromRat(0, 1), bpm: 120, unit: makeRat(1, 4) }
    ],
    meterMap: [
      { at: posFromRat(0, 1), numerator: 4, denominator: 4 }
    ],
    sounds: [],
    tracks: [],
    markers: [],
    ...overrides
  };
}

describe('normalizeScore', () => {
  describe('meter map normalization', () => {
    it('normalizes a simple meter map with one event', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore();
      const ir = normalizeScore(score, diagnostics);

      expect(ir.meterMap).toHaveLength(1);
      expect(ir.meterMap[0].numerator).toBe(4);
      expect(ir.meterMap[0].denominator).toBe(4);
      expect(ir.meterMap[0].at.n).toBe(0);
      expect(ir.meterMap[0].at.d).toBe(1);
      expect(diagnostics).toHaveLength(0);
    });

    it('sorts meter events by position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(8, 1), numerator: 3, denominator: 4 },
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 },
          { at: posFromRat(4, 1), numerator: 6, denominator: 8 }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.meterMap).toHaveLength(3);
      expect(ir.meterMap[0].at.n).toBe(0);
      expect(ir.meterMap[1].at.n).toBe(4);
      expect(ir.meterMap[2].at.n).toBe(8);
    });

    it('handles multiple meter changes', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 },
          { at: posFromRat(4, 1), numerator: 3, denominator: 4 },
          { at: posFromRat(7, 1), numerator: 5, denominator: 4 }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.meterMap).toHaveLength(3);
      expect(ir.meterMap[0].numerator).toBe(4);
      expect(ir.meterMap[1].numerator).toBe(3);
      expect(ir.meterMap[2].numerator).toBe(5);
    });

    it('warns when meter map is empty', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({ meterMap: [] });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('No meter events'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('warns when meter map does not start at position 0', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(4, 1), numerator: 4, denominator: 4 }
        ]
      });
      normalizeScore(score, diagnostics);

      const warning = diagnostics.find(d => d.message.includes('should start at position 0'));
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('detects duplicate meter positions', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 },
          { at: posFromRat(0, 1), numerator: 3, denominator: 4 }
        ]
      });
      normalizeScore(score, diagnostics);

      const warning = diagnostics.find(d => d.message.includes('Duplicate meter event'));
      expect(warning).toBeDefined();
    });

    it('validates negative meter numerator', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: -4, denominator: 4 }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('Invalid meter numerator'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('validates negative meter denominator', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: -4 }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('Invalid meter denominator'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });
  });

  describe('tempo map normalization', () => {
    it('normalizes a simple tempo map with one event', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore();
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tempoMap).toHaveLength(1);
      expect(ir.tempoMap[0].bpm).toBe(120);
      expect(ir.tempoMap[0].at.n).toBe(0);
    });

    it('sorts tempo events by position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRat(8, 1), bpm: 140, unit: makeRat(1, 4) },
          { at: posFromRat(0, 1), bpm: 120, unit: makeRat(1, 4) },
          { at: posFromRat(4, 1), bpm: 100, unit: makeRat(1, 4) }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tempoMap).toHaveLength(3);
      expect(ir.tempoMap[0].bpm).toBe(120);
      expect(ir.tempoMap[1].bpm).toBe(100);
      expect(ir.tempoMap[2].bpm).toBe(140);
    });

    it('warns when tempo map is empty', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({ tempoMap: [] });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('No tempo events'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('warns when tempo map does not start at position 0', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRat(4, 1), bpm: 120, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const warning = diagnostics.find(d => d.message.includes('should start at position 0'));
      expect(warning).toBeDefined();
    });

    it('detects duplicate tempo positions', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRat(0, 1), bpm: 120, unit: makeRat(1, 4) },
          { at: posFromRat(0, 1), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const warning = diagnostics.find(d => d.message.includes('Duplicate tempo event'));
      expect(warning).toBeDefined();
    });

    it('validates negative BPM', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRat(0, 1), bpm: -120, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('Invalid BPM'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('validates zero BPM', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRat(0, 1), bpm: 0, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('Invalid BPM'));
      expect(error).toBeDefined();
    });
  });

  describe('position reference resolution', () => {
    it('resolves bar:beat reference at 1:1', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.meterMap[0].at.n).toBe(0);
      expect(ir.meterMap[0].at.d).toBe(1);
    });

    it('resolves bar:beat reference at 2:1 in 4/4', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 }
        ],
        tempoMap: [
          { at: posFromRef(2, 1), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      // Bar 2 in 4/4 starts at position 4/4 = 1
      expect(ir.tempoMap[0].at.n).toBe(1);
      expect(ir.tempoMap[0].at.d).toBe(1);
    });

    it('resolves bar:beat reference at 1:3 in 4/4', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 }
        ],
        tempoMap: [
          { at: posFromRef(1, 3), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      // Beat 3 is 2 beats after bar start, each beat is 1/4
      expect(ir.tempoMap[0].at.n).toBe(1);
      expect(ir.tempoMap[0].at.d).toBe(2);
    });

    it('resolves bar:beat reference across meter changes', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 },
          { at: posFromRat(1, 1), numerator: 3, denominator: 4 }
        ],
        tempoMap: [
          { at: posFromRef(3, 2), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      // Bar 1: 4/4 (position 0-1)
      // Bar 2: 3/4 (position 1-7/4)
      // Bar 3, beat 2: position 7/4 + 1/4 = 2
      expect(ir.tempoMap[0].at.n).toBe(2);
      expect(ir.tempoMap[0].at.d).toBe(1);
    });

    it('resolves position expression with offset', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromExpr(1, 1, 1, 8), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      // 1:1 is position 0, plus 1/8 offset
      expect(ir.tempoMap[0].at.n).toBe(1);
      expect(ir.tempoMap[0].at.d).toBe(8);
    });

    it('errors on beat out of range', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [
          { at: posFromRat(0, 1), numerator: 4, denominator: 4 }
        ],
        tempoMap: [
          { at: posFromRef(1, 5), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('out of range'));
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('errors on zero beat', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        tempoMap: [
          { at: posFromRef(1, 0), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('out of range'));
      expect(error).toBeDefined();
    });

    it('errors when referencing position with empty meter map', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meterMap: [],
        tempoMap: [
          { at: posFromRef(2, 1), bpm: 140, unit: makeRat(1, 4) }
        ]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('meterMap is empty'));
      expect(error).toBeDefined();
    });
  });

  describe('track normalization', () => {
    it('normalizes track with no placements', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: []
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tracks).toHaveLength(1);
      expect(ir.tracks[0].name).toBe('Piano');
      expect(ir.tracks[0].sound).toBe('piano');
      expect(ir.tracks[0].placements).toHaveLength(0);
    });

    it('normalizes track with placements', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [
            {
              at: posFromRat(0, 1),
              clip: { events: [], length: undefined }
            }
          ]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tracks[0].placements).toHaveLength(1);
      expect(ir.tracks[0].placements[0].at.n).toBe(0);
    });

    it('preserves track mix settings', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          mix: { gain: 0.8, pan: 0.5 },
          placements: []
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tracks[0].mix).toBeDefined();
      expect(ir.tracks[0].mix?.gain).toBe(0.8);
      expect(ir.tracks[0].mix?.pan).toBe(0.5);
    });
  });

  describe('clip normalization', () => {
    it('normalizes empty clip', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: { events: [], length: undefined }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const clip = ir.tracks[0].placements[0].clip;
      expect(clip.events).toHaveLength(0);
      expect(clip.length).toBeUndefined();
    });

    it('sorts events by position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(1, 2), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} },
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'D', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} },
                { type: 'note', start: posFromRat(1, 4), pitch: { kind: 'pitch', name: 'E', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const events = ir.tracks[0].placements[0].clip.events;
      expect(events).toHaveLength(3);
      expect((events[0] as any).pitch.name).toBe('D'); // 0/1
      expect((events[1] as any).pitch.name).toBe('E'); // 1/4
      expect((events[2] as any).pitch.name).toBe('C'); // 1/2
    });

    it('maintains stable sort for events at same position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} },
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'E', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} },
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'G', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const events = ir.tracks[0].placements[0].clip.events;
      expect((events[0] as any).pitch.name).toBe('C');
      expect((events[1] as any).pitch.name).toBe('E');
      expect((events[2] as any).pitch.name).toBe('G');
    });

    it('derives clip length from note events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(1, 2), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const clip = ir.tracks[0].placements[0].clip;
      expect(clip.length).toBeDefined();
      expect(clip.length?.n).toBe(1);
      expect(clip.length?.d).toBe(2);
    });

    it('uses explicit clip length when provided', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(1, 2), opts: {} }
              ],
              length: makeRat(2, 1)
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const clip = ir.tracks[0].placements[0].clip;
      expect(clip.length?.n).toBe(2);
      expect(clip.length?.d).toBe(1);
    });

    it('errors on negative duration', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(-1, 4), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      normalizeScore(score, diagnostics);

      const error = diagnostics.find(d => d.message.includes('Negative duration'));
      expect(error).toBeDefined();
    });
  });

  describe('event normalization', () => {
    it('normalizes note events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'note', start: posFromRat(0, 1), pitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 }, dur: makeRat(1, 4), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('note');
      expect((event as any).start.n).toBe(0);
    });

    it('normalizes chord events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                {
                  type: 'chord',
                  start: posFromRat(0, 1),
                  pitches: [
                    { kind: 'pitch', name: 'C', octave: 4, alter: 0 },
                    { kind: 'pitch', name: 'E', octave: 4, alter: 0 }
                  ],
                  dur: makeRat(1, 4),
                  opts: {}
                }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('chord');
      expect((event as any).pitches).toHaveLength(2);
    });

    it('normalizes drum hit events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'drums', kind: 'drumKit', label: 'Drums' }],
        tracks: [{
          name: 'Drums',
          role: 'Drums',
          sound: 'drums',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'drumHit', start: posFromRat(0, 1), key: 'kick', dur: makeRat(1, 16), opts: {} }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('drumHit');
      expect((event as any).key).toBe('kick');
    });

    it('normalizes breath events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'vocal', kind: 'vocal', label: 'Vocal' }],
        tracks: [{
          name: 'Vocal',
          role: 'Vocal',
          sound: 'vocal',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'breath', start: posFromRat(0, 1), dur: makeRat(1, 8), intensity: 0.5 }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('breath');
      expect((event as any).intensity).toBe(0.5);
    });

    it('normalizes control events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'control', start: posFromRat(0, 1), num: 64, value: 127 }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('control');
      expect((event as any).num).toBe(64);
    });

    it('normalizes automation events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Automation',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                {
                  type: 'automation',
                  start: posFromRat(0, 1),
                  end: posFromRat(1, 1),
                  param: 'volume',
                  startValue: 0.5,
                  endValue: 1.0,
                  curve: { kind: 'linear' }
                }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('automation');
      expect((event as any).param).toBe('volume');
    });

    it('normalizes pedal events with end position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'pedal', start: posFromRat(0, 1), end: posFromRat(1, 1), kind: 'sustain' }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('pedal');
      expect((event as any).end).toBeDefined();
    });

    it('normalizes pedal events without end position', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'pedal', start: posFromRat(0, 1), end: undefined, kind: 'sustain' }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('pedal');
      expect((event as any).end).toBeUndefined();
    });

    it('normalizes grace note events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                {
                  type: 'graceNote',
                  start: posFromRat(0, 1),
                  pitch: { kind: 'pitch', name: 'D', octave: 4, alter: 0 },
                  mainDur: makeRat(1, 16),
                  graceDur: makeRat(1, 32),
                  opts: {}
                }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('graceNote');
      expect((event as any).graceDur.n).toBe(1);
      expect((event as any).graceDur.d).toBe(32);
    });

    it('normalizes glissando events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                {
                  type: 'glissando',
                  start: posFromRat(0, 1),
                  end: posFromRat(1, 2),
                  fromPitch: { kind: 'pitch', name: 'C', octave: 4, alter: 0 },
                  toPitch: { kind: 'pitch', name: 'C', octave: 5, alter: 0 },
                  opts: {}
                }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('glissando');
      expect((event as any).fromPitch.octave).toBe(4);
      expect((event as any).toPitch.octave).toBe(5);
    });

    it('normalizes marker events', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [{ id: 'piano', kind: 'instrument', label: 'Piano' }],
        tracks: [{
          name: 'Piano',
          role: 'Instrument',
          sound: 'piano',
          placements: [{
            at: posFromRat(0, 1),
            clip: {
              events: [
                { type: 'marker', pos: posFromRat(0, 1), kind: 'section', label: 'Verse' }
              ],
              length: undefined
            }
          }]
        }]
      });
      const ir = normalizeScore(score, diagnostics);

      const event = ir.tracks[0].placements[0].clip.events[0];
      expect(event.type).toBe('marker');
      expect((event as any).label).toBe('Verse');
    });
  });

  describe('score-level markers', () => {
    it('normalizes score markers', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        markers: [
          { type: 'marker', pos: posFromRat(0, 1), kind: 'section', label: 'Intro' },
          { type: 'marker', pos: posFromRat(4, 1), kind: 'section', label: 'Verse' }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.markers).toHaveLength(2);
      expect(ir.markers?.[0].label).toBe('Intro');
      expect(ir.markers?.[1].label).toBe('Verse');
    });
  });

  describe('IR structure', () => {
    it('sets correct IR version', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore();
      const ir = normalizeScore(score, diagnostics);

      expect(ir.tako.irVersion).toBe(4);
      expect(ir.tako.generator).toBe('takomusic');
    });

    it('preserves metadata', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        meta: {
          title: 'Test Song',
          artist: 'Test Artist',
          album: 'Test Album'
        }
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.meta.title).toBe('Test Song');
      expect(ir.meta.artist).toBe('Test Artist');
      expect(ir.meta.album).toBe('Test Album');
    });

    it('preserves sound declarations', () => {
      const diagnostics: Diagnostic[] = [];
      const score = createMinimalScore({
        sounds: [
          { id: 'piano', kind: 'instrument', label: 'Piano', family: 'keyboard' },
          { id: 'drums', kind: 'drumKit', label: 'Drums' }
        ]
      });
      const ir = normalizeScore(score, diagnostics);

      expect(ir.sounds).toHaveLength(2);
      expect(ir.sounds[0].id).toBe('piano');
      expect(ir.sounds[1].id).toBe('drums');
    });
  });
});
