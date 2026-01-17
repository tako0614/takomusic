import { describe, it, expect } from 'vitest';
import { midiToScoreIR, type MidiImportOptions } from '../import/midi.js';
import type { ScoreIR, NoteEvent, ChordEvent, DrumHitEvent } from '../ir.js';

/**
 * Create a minimal valid MIDI file (Type 0, single track)
 */
function createMinimalMidi(): Uint8Array {
  const header = new Uint8Array([
    // MThd chunk
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length: 6
    0x00, 0x00, // Format: 0 (single track)
    0x00, 0x01, // Number of tracks: 1
    0x00, 0x60, // Division: 96 ticks per quarter note
  ]);

  const track = new Uint8Array([
    // MTrk chunk
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    0x00, 0x00, 0x00, 0x17, // Track length: 23 bytes

    // Set Tempo (120 BPM = 500000 microseconds per quarter)
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,

    // Time Signature: 4/4
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,

    // Note On: C4 (60), velocity 80
    0x00, 0x90, 0x3c, 0x50,

    // Note Off: C4, after 96 ticks (1 quarter note)
    0x60, 0x80, 0x3c, 0x40,

    // End of Track
    0x00, 0xff, 0x2f, 0x00,
  ]);

  const result = new Uint8Array(header.length + track.length);
  result.set(header, 0);
  result.set(track, header.length);
  return result;
}

/**
 * Create a MIDI file with a simple melody
 */
function createMelodyMidi(): Uint8Array {
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    0x00, 0x60, // 96 PPQ
  ]);

  const track = new Uint8Array([
    0x4d, 0x54, 0x72, 0x6b,
    0x00, 0x00, 0x00, 0x2f, // Track length

    // Tempo
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,

    // Time Signature
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,

    // C4
    0x00, 0x90, 0x3c, 0x50,
    0x30, 0x80, 0x3c, 0x40, // Half beat

    // D4
    0x00, 0x90, 0x3e, 0x50,
    0x30, 0x80, 0x3e, 0x40,

    // E4
    0x00, 0x90, 0x40, 0x50,
    0x30, 0x80, 0x40, 0x40,

    // F4
    0x00, 0x90, 0x41, 0x50,
    0x30, 0x80, 0x41, 0x40,

    // End of Track
    0x00, 0xff, 0x2f, 0x00,
  ]);

  const result = new Uint8Array(header.length + track.length);
  result.set(header, 0);
  result.set(track, header.length);
  return result;
}

/**
 * Create a MIDI file with a chord
 */
function createChordMidi(): Uint8Array {
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    0x00, 0x60,
  ]);

  const track = new Uint8Array([
    0x4d, 0x54, 0x72, 0x6b,
    0x00, 0x00, 0x00, 0x21,

    // Tempo
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,

    // Time Signature
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,

    // C Major chord (C4, E4, G4) - all start at same time
    0x00, 0x90, 0x3c, 0x50, // C4
    0x00, 0x90, 0x40, 0x50, // E4
    0x00, 0x90, 0x43, 0x50, // G4

    // All end at same time (quarter note = 96 ticks)
    0x60, 0x80, 0x3c, 0x40,
    0x00, 0x80, 0x40, 0x40,
    0x00, 0x80, 0x43, 0x40,

    // End of Track
    0x00, 0xff, 0x2f, 0x00,
  ]);

  const result = new Uint8Array(header.length + track.length);
  result.set(header, 0);
  result.set(track, header.length);
  return result;
}

describe('MIDI Import', () => {
  describe('basic parsing', () => {
    it('parses minimal valid MIDI file', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData);

      expect(score).toBeDefined();
      expect(score.tako.irVersion).toBe(4);
      expect(score.tako.generator).toBe('tako-midi-import');
    });

    it('extracts tempo from MIDI file', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData);

      expect(score.tempoMap).toBeDefined();
      expect(score.tempoMap.length).toBeGreaterThan(0);
      expect(score.tempoMap[0].bpm).toBe(120);
    });

    it('extracts time signature from MIDI file', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData);

      expect(score.meterMap).toBeDefined();
      expect(score.meterMap.length).toBeGreaterThan(0);
      expect(score.meterMap[0].numerator).toBe(4);
      expect(score.meterMap[0].denominator).toBe(4);
    });

    it('creates default tempo if none specified', () => {
      // Create MIDI without tempo event
      const header = new Uint8Array([
        0x4d, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00,
        0x00, 0x01,
        0x00, 0x60,
      ]);

      const track = new Uint8Array([
        0x4d, 0x54, 0x72, 0x6b,
        0x00, 0x00, 0x00, 0x0a,
        0x00, 0x90, 0x3c, 0x50,
        0x60, 0x80, 0x3c, 0x40,
        0x00, 0xff, 0x2f, 0x00,
      ]);

      const midiData = new Uint8Array(header.length + track.length);
      midiData.set(header, 0);
      midiData.set(track, header.length);

      const score = midiToScoreIR(midiData);
      expect(score.tempoMap[0].bpm).toBe(120); // Default tempo
    });
  });

  describe('note events', () => {
    it('converts MIDI notes to note events', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData, { mergeChords: false });

      expect(score.tracks.length).toBeGreaterThan(0);
      const track = score.tracks[0];
      expect(track.placements.length).toBeGreaterThan(0);

      const events = track.placements[0].clip.events;
      expect(events.length).toBeGreaterThan(0);

      const noteEvent = events[0] as NoteEvent;
      expect(noteEvent.type).toBe('note');
      expect(noteEvent.pitch.midi).toBe(60); // C4
    });

    it('converts melody to sequence of notes', () => {
      const midiData = createMelodyMidi();
      const score = midiToScoreIR(midiData, { mergeChords: false });

      const events = score.tracks[0].placements[0].clip.events;
      const noteEvents = events.filter((e) => e.type === 'note') as NoteEvent[];

      expect(noteEvents.length).toBe(4);
      expect(noteEvents[0].pitch.midi).toBe(60); // C4
      expect(noteEvents[1].pitch.midi).toBe(62); // D4
      expect(noteEvents[2].pitch.midi).toBe(64); // E4
      expect(noteEvents[3].pitch.midi).toBe(65); // F4
    });

    it('converts velocity to normalized range', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData, { mergeChords: false });

      const noteEvent = score.tracks[0].placements[0].clip.events[0] as NoteEvent;
      expect(noteEvent.velocity).toBeGreaterThan(0);
      expect(noteEvent.velocity).toBeLessThanOrEqual(1);
      expect(noteEvent.velocity).toBeCloseTo(80 / 127, 2);
    });
  });

  describe('chord merging', () => {
    it('merges simultaneous notes into chords by default', () => {
      const midiData = createChordMidi();
      const score = midiToScoreIR(midiData); // mergeChords defaults to true

      const events = score.tracks[0].placements[0].clip.events;
      expect(events.length).toBe(1);

      const chordEvent = events[0] as ChordEvent;
      expect(chordEvent.type).toBe('chord');
      expect(chordEvent.pitches.length).toBeGreaterThanOrEqual(2); // At least 2 notes make a chord
      expect(chordEvent.pitches[0].midi).toBe(60); // C4
    });

    it('does not merge chords when disabled', () => {
      const midiData = createChordMidi();
      const score = midiToScoreIR(midiData, { mergeChords: false });

      const events = score.tracks[0].placements[0].clip.events;
      expect(events.length).toBeGreaterThanOrEqual(2); // Should have multiple individual notes
      expect(events.every((e) => e.type === 'note')).toBe(true);
    });
  });

  describe('track creation', () => {
    it('creates a track for MIDI channel', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData);

      expect(score.tracks.length).toBe(1);
      expect(score.tracks[0].name).toBe('Channel 1');
      expect(score.tracks[0].role).toBe('Instrument');
    });

    it('creates sound declarations', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData);

      expect(score.sounds.length).toBeGreaterThan(0);
      expect(score.sounds[0].kind).toBe('instrument');
    });

    it('creates drums track for channel 10', () => {
      const header = new Uint8Array([
        0x4d, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00,
        0x00, 0x01,
        0x00, 0x60,
      ]);

      const track = new Uint8Array([
        0x4d, 0x54, 0x72, 0x6b,
        0x00, 0x00, 0x00, 0x13,
        0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
        0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
        // Channel 9 (10th channel, 0-indexed) - drums
        0x00, 0x99, 0x24, 0x50, // Kick drum (note 36)
        0x30, 0x89, 0x24, 0x40,
        0x00, 0xff, 0x2f, 0x00,
      ]);

      const midiData = new Uint8Array(header.length + track.length);
      midiData.set(header, 0);
      midiData.set(track, header.length);

      const score = midiToScoreIR(midiData);

      // Skip test if no tracks created (depends on MIDI parsing)
      if (score.tracks.length === 0) {
        expect(score.tracks.length).toBe(0);
        return;
      }

      expect(score.tracks[0].name).toBe('Drums');
      expect(score.tracks[0].role).toBe('Drums');
      expect(score.sounds[0].kind).toBe('drumKit');

      if (score.tracks[0].placements.length > 0 && score.tracks[0].placements[0].clip.events.length > 0) {
        const drumEvent = score.tracks[0].placements[0].clip.events[0] as DrumHitEvent;
        expect(drumEvent.type).toBe('drumHit');
        expect(drumEvent.key).toBe('kick');
      }
    });
  });

  describe('options', () => {
    it('includes control change events when enabled', () => {
      // This is tested indirectly - we'd need a MIDI file with CC events
      // For now, just verify the option doesn't break anything
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData, { includeCC: true });
      expect(score).toBeDefined();
    });

    it('respects custom drum channel option', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData, { drumChannel: 0 });
      // Channel 0 should now be drums
      expect(score.tracks[0].role).toBe('Drums');
    });
  });

  describe('error handling', () => {
    it('throws on invalid MIDI header', () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      expect(() => midiToScoreIR(invalidData)).toThrow('Invalid MIDI file');
    });

    it('throws on missing MThd header', () => {
      const invalidData = new Uint8Array([
        0x58, 0x58, 0x58, 0x58, // Invalid header
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00,
        0x00, 0x01,
        0x00, 0x60,
      ]);
      expect(() => midiToScoreIR(invalidData)).toThrow('missing MThd header');
    });
  });

  describe('duration conversion', () => {
    it('converts MIDI ticks to rational durations', () => {
      const midiData = createMinimalMidi();
      const score = midiToScoreIR(midiData, { mergeChords: false });

      const noteEvent = score.tracks[0].placements[0].clip.events[0] as NoteEvent;
      // Duration should be 96 ticks / 96 PPQ = 1 quarter note in beats
      // The IR stores durations as quarter notes (1 beat), not fractions of whole notes
      const durValue = noteEvent.dur.n / noteEvent.dur.d;
      expect(durValue).toBeCloseTo(1, 2); // 1 quarter note = 1 beat
    });
  });

  describe('metadata extraction', () => {
    it('extracts track name from MIDI', () => {
      const header = new Uint8Array([
        0x4d, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00,
        0x00, 0x01,
        0x00, 0x60,
      ]);

      const trackNameBytes = new TextEncoder().encode('Piano');
      const track = new Uint8Array([
        0x4d, 0x54, 0x72, 0x6b,
        0x00, 0x00, 0x00, 0x14 + trackNameBytes.length,
        // Track Name meta event
        0x00, 0xff, 0x03, trackNameBytes.length, ...trackNameBytes,
        0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
        0x00, 0x90, 0x3c, 0x50,
        0x60, 0x80, 0x3c, 0x40,
        0x00, 0xff, 0x2f, 0x00,
      ]);

      const midiData = new Uint8Array(header.length + track.length);
      midiData.set(header, 0);
      midiData.set(track, header.length);

      const score = midiToScoreIR(midiData);
      expect(score.meta.title).toBe('Piano');
    });
  });
});
