import { describe, it, expect, beforeEach } from 'vitest';
import { validateScoreIR, validateRenderProfile } from '../schema/validator.js';

describe('validator', () => {
  describe('validateScoreIR', () => {
    it('validates a valid minimal Score IR v4', () => {
      const validScore = {
        tako: {
          irVersion: 4,
          language: 'tako-v7',
          generator: 'test',
        },
        meta: {
          title: 'Test Score',
        },
        tempoMap: [
          {
            at: { n: 0, d: 1 },
            bpm: 120,
            unit: { n: 1, d: 4 },
          },
        ],
        meterMap: [
          {
            at: { n: 0, d: 1 },
            numerator: 4,
            denominator: 4,
          },
        ],
        sounds: [
          {
            id: 'piano',
            kind: 'instrument',
          },
        ],
        tracks: [
          {
            name: 'Piano Track',
            role: 'Instrument',
            sound: 'piano',
            placements: [],
          },
        ],
      };

      const errors = validateScoreIR(validScore);
      expect(errors).toEqual([]);
    });

    it('validates score with complete metadata', () => {
      const scoreWithMeta = {
        tako: {
          irVersion: 4,
          language: 'tako-v7',
          generator: 'test',
          sourceHash: 'abc123',
        },
        meta: {
          title: 'Complete Score',
          artist: 'Test Artist',
          album: 'Test Album',
          copyright: '2024 Test',
          anacrusis: { n: 1, d: 4 },
          ext: {
            customField: 'value',
          },
        },
        tempoMap: [
          {
            at: { n: 0, d: 1 },
            bpm: 140,
            unit: { n: 1, d: 4 },
          },
        ],
        meterMap: [
          {
            at: { n: 0, d: 1 },
            numerator: 3,
            denominator: 4,
          },
        ],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(scoreWithMeta);
      expect(errors).toEqual([]);
    });

    it('validates score with note events', () => {
      const scoreWithNotes = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [
          {
            name: 'Track 1',
            role: 'Instrument',
            sound: 'piano',
            placements: [
              {
                at: { n: 0, d: 1 },
                clip: {
                  events: [
                    {
                      type: 'note',
                      start: { n: 0, d: 1 },
                      dur: { n: 1, d: 4 },
                      pitch: {
                        midi: 60,
                        cents: 0,
                      },
                      velocity: 0.8,
                      voice: 1,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const errors = validateScoreIR(scoreWithNotes);
      expect(errors).toEqual([]);
    });

    it('validates score with chord events', () => {
      const scoreWithChords = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [
          {
            name: 'Chord Track',
            role: 'Instrument',
            sound: 'piano',
            placements: [
              {
                at: { n: 0, d: 1 },
                clip: {
                  events: [
                    {
                      type: 'chord',
                      start: { n: 0, d: 1 },
                      dur: { n: 1, d: 2 },
                      pitches: [
                        { midi: 60, cents: 0 },
                        { midi: 64, cents: 0 },
                        { midi: 67, cents: 0 },
                      ],
                      velocity: 0.9,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const errors = validateScoreIR(scoreWithChords);
      expect(errors).toEqual([]);
    });

    it('rejects score missing required irVersion', () => {
      const invalid = {
        tako: {
          // Missing irVersion
          language: 'tako-v7',
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('irVersion');
    });

    it('rejects score with wrong irVersion', () => {
      const invalid = {
        tako: {
          irVersion: 3, // Wrong version
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('irVersion') || e.includes('const'))).toBe(true);
    });

    it('rejects score missing required fields', () => {
      const invalid = {
        tako: {
          irVersion: 4,
        },
        // Missing meta, tempoMap, meterMap, sounds, tracks
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects score with invalid tempo map', () => {
      const invalid = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [
          {
            at: { n: 0, d: 1 },
            bpm: 'fast', // Invalid type
          },
        ],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('bpm'))).toBe(true);
    });

    it('rejects score with invalid rational', () => {
      const invalid = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [
          {
            at: { n: 0 }, // Missing 'd'
            bpm: 120,
          },
        ],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects score with invalid note event', () => {
      const invalid = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [
          {
            name: 'Track',
            role: 'Instrument',
            sound: 'piano',
            placements: [
              {
                at: { n: 0, d: 1 },
                clip: {
                  events: [
                    {
                      type: 'note',
                      start: { n: 0, d: 1 },
                      // Missing 'dur' and 'pitch'
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects non-object input', () => {
      const errors = validateScoreIR('invalid');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects null input', () => {
      const errors = validateScoreIR(null);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects array input', () => {
      const errors = validateScoreIR([]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('validates score with markers', () => {
      const scoreWithMarkers = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
        markers: [
          {
            type: 'marker',
            pos: { n: 4, d: 1 },
            kind: 'section',
            label: 'Verse',
          },
        ],
      };

      const errors = validateScoreIR(scoreWithMarkers);
      expect(errors).toEqual([]);
    });

    it('validates score with drum hits', () => {
      const scoreWithDrums = {
        tako: {
          irVersion: 4,
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [
          {
            name: 'Drums',
            role: 'Drums',
            sound: 'drumkit',
            placements: [
              {
                at: { n: 0, d: 1 },
                clip: {
                  events: [
                    {
                      type: 'drumHit',
                      start: { n: 0, d: 1 },
                      dur: { n: 1, d: 16 },
                      key: 'kick',
                      velocity: 1.0,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const errors = validateScoreIR(scoreWithDrums);
      expect(errors).toEqual([]);
    });
  });

  describe('validateRenderProfile', () => {
    it('validates a valid minimal render profile', () => {
      const validProfile = {
        tako: {
          profileVersion: 1,
        },
        profileName: 'Test Profile',
        renderer: 'test-renderer',
        output: {},
        bindings: [
          {
            selector: { sound: 'piano' },
            config: {},
          },
        ],
      };

      const errors = validateRenderProfile(validProfile);
      expect(errors).toEqual([]);
    });

    it('validates profile with full configuration', () => {
      const profileWithConfig = {
        tako: {
          profileVersion: 1,
        },
        profileName: 'Full Profile',
        renderer: 'advanced-renderer',
        output: {
          sampleRate: 44100,
          bitDepth: 16,
        },
        bindings: [
          {
            selector: { trackName: 'Piano' },
            config: {
              samplePath: '/samples/piano.wav',
            },
          },
          {
            selector: { role: 'Drums' },
            config: {
              engine: 'drumSynth',
            },
          },
        ],
        degradePolicy: 'Error',
      };

      const errors = validateRenderProfile(profileWithConfig);
      expect(errors).toEqual([]);
    });

    it('rejects profile with missing profileVersion', () => {
      const invalid = {
        tako: {
          // Missing profileVersion
        },
        profileName: 'Invalid',
        renderer: 'test',
        output: {},
        bindings: [{ selector: { sound: 'test' }, config: {} }],
      };

      const errors = validateRenderProfile(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('profileVersion'))).toBe(true);
    });

    it('rejects profile with wrong profileVersion', () => {
      const invalid = {
        tako: {
          profileVersion: 2, // Wrong version
        },
        profileName: 'Invalid',
        renderer: 'test',
        output: {},
        bindings: [{ selector: { sound: 'test' }, config: {} }],
      };

      const errors = validateRenderProfile(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects profile missing required fields', () => {
      const invalid = {
        tako: {
          profileVersion: 1,
        },
        // Missing profileName, renderer, output, bindings
      };

      const errors = validateRenderProfile(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects non-object input', () => {
      const errors = validateRenderProfile('invalid');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects null input', () => {
      const errors = validateRenderProfile(null);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects array input', () => {
      const errors = validateRenderProfile([]);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('error formatting', () => {
    it('provides helpful error messages', () => {
      const invalid = {
        tako: {
          irVersion: 'four', // Should be number
        },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/at/i);
    });

    it('reports multiple errors', () => {
      const invalid = {
        tako: {
          irVersion: 'invalid',
        },
        meta: 'invalid', // Should be object
        tempoMap: 'invalid', // Should be array
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors = validateScoreIR(invalid);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('caching behavior', () => {
    it('validates multiple times without error', () => {
      const valid = {
        tako: { irVersion: 4 },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const errors1 = validateScoreIR(valid);
      const errors2 = validateScoreIR(valid);
      const errors3 = validateScoreIR(valid);

      expect(errors1).toEqual([]);
      expect(errors2).toEqual([]);
      expect(errors3).toEqual([]);
    });

    it('validates different schemas independently', () => {
      const validScore = {
        tako: { irVersion: 4 },
        meta: {},
        tempoMap: [],
        meterMap: [],
        sounds: [],
        tracks: [],
      };

      const validProfile = {
        tako: { profileVersion: 1 },
        profileName: 'Test',
        renderer: 'test',
        output: {},
        bindings: [{ selector: { sound: 'test' }, config: {} }],
      };

      const scoreErrors = validateScoreIR(validScore);
      const profileErrors = validateRenderProfile(validProfile);

      expect(scoreErrors).toEqual([]);
      expect(profileErrors).toEqual([]);
    });
  });
});
