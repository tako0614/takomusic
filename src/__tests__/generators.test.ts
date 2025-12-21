import { describe, it, expect } from 'vitest';
import { generateMidi } from '../generators/midi.js';
import { generateMusicXML } from '../generators/musicxml.js';
import { generateVsqx } from '../generators/vsqx.js';
import { generateTempoMidi } from '../generators/tempo-midi.js';
import type { SongIR, VocalTrack, MidiTrack } from '../types/ir.js';

describe('MIDI Generator', () => {
  it('should generate valid MIDI header', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const midi = generateMidi(ir);

    // Check MThd header
    expect(midi.subarray(0, 4).toString()).toBe('MThd');
    // Check format (should be 1 for multi-track)
    expect(midi.readUInt16BE(8)).toBe(1);
    // Check PPQ
    expect(midi.readUInt16BE(12)).toBe(480);
  });

  it('should include tempo and time signature events', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const midi = generateMidi(ir);

    // Should have MTrk for tempo track
    const midiStr = midi.toString('binary');
    expect(midiStr.includes('MTrk')).toBe(true);
  });

  it('should generate notes for MIDI tracks', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 't1',
          kind: 'midi',
          name: 't1',
          channel: 0,
          program: 0,
          defaultVel: 96,
          events: [
            { type: 'note', tick: 0, dur: 480, key: 60, vel: 100 },
            { type: 'note', tick: 480, dur: 480, key: 62, vel: 100 },
          ],
        } as MidiTrack,
      ],
    };

    const midi = generateMidi(ir);

    // Should have 2 MTrk chunks (tempo + notes)
    const midiStr = midi.toString('binary');
    const mtkCount = (midiStr.match(/MTrk/g) || []).length;
    expect(mtkCount).toBe(2);
  });

  it('should handle multiple MIDI tracks', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 't1',
          kind: 'midi',
          name: 't1',
          channel: 0,
          program: 0,
          defaultVel: 96,
          events: [{ type: 'note', tick: 0, dur: 480, key: 60, vel: 100 }],
        } as MidiTrack,
        {
          id: 't2',
          kind: 'midi',
          name: 't2',
          channel: 1,
          program: 1,
          defaultVel: 96,
          events: [{ type: 'note', tick: 0, dur: 480, key: 64, vel: 100 }],
        } as MidiTrack,
      ],
    };

    const midi = generateMidi(ir);

    // Should have 3 MTrk chunks (tempo + 2 note tracks)
    const midiStr = midi.toString('binary');
    const mtkCount = (midiStr.match(/MTrk/g) || []).length;
    expect(mtkCount).toBe(3);

    // Header should show 3 tracks
    expect(midi.readUInt16BE(10)).toBe(3);
  });
});

describe('MusicXML Generator', () => {
  it('should generate valid MusicXML structure', async () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test Song',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const xml = await generateMusicXML(ir);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('score-partwise');
    expect(xml).toContain('<work-title>Test Song</work-title>');
  });

  it('should include vocal notes with lyrics', async () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 'v1',
          kind: 'vocal',
          name: 'Vocal',
          meta: {},
          events: [
            { type: 'note', tick: 0, dur: 480, key: 60, lyric: 'あ' },
            { type: 'note', tick: 480, dur: 480, key: 62, lyric: 'い' },
          ],
        } as VocalTrack,
      ],
    };

    const xml = await generateMusicXML(ir);

    expect(xml).toContain('<lyric>');
    expect(xml).toContain('<text>あ</text>');
    expect(xml).toContain('<text>い</text>');
    expect(xml).toContain('<step>C</step>');
    expect(xml).toContain('<step>D</step>');
  });

  it('should include tempo marking', async () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 140 }],
      timeSigs: [{ tick: 0, numerator: 3, denominator: 4 }],
      tracks: [
        {
          id: 'v1',
          kind: 'vocal',
          name: 'Vocal',
          meta: {},
          events: [{ type: 'note', tick: 0, dur: 480, key: 60, lyric: 'あ' }],
        } as VocalTrack,
      ],
    };

    const xml = await generateMusicXML(ir);

    expect(xml).toContain('<per-minute>140</per-minute>');
    expect(xml).toContain('<beats>3</beats>');
    expect(xml).toContain('<beat-type>4</beat-type>');
  });

  it('should escape XML special characters', async () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test & <Special>',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const xml = await generateMusicXML(ir);

    expect(xml).toContain('Test &amp; &lt;Special&gt;');
  });

  it('should convert kanji lyrics to hiragana', async () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 'v1',
          kind: 'vocal',
          name: 'Vocal',
          meta: {},
          events: [
            { type: 'note', tick: 0, dur: 480, key: 60, lyric: '愛' },
          ],
        } as VocalTrack,
      ],
    };

    const xml = await generateMusicXML(ir);

    // Should contain hiragana instead of kanji
    expect(xml).toContain('<text>あい</text>');
    expect(xml).not.toContain('<text>愛</text>');
  });
});

describe('VSQX Generator', () => {
  it('should generate valid VSQX structure', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test Song',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const vsqx = generateVsqx(ir);

    expect(vsqx).toContain('<?xml version="1.0"');
    expect(vsqx).toContain('vsq4');
    expect(vsqx).toContain('<resolution>480</resolution>');
  });

  it('should include vocal notes', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 'v1',
          kind: 'vocal',
          name: 'Vocal',
          meta: { engine: 'piapro', voice: 'miku' },
          events: [
            { type: 'note', tick: 0, dur: 480, key: 60, lyric: 'あ' },
          ],
        } as VocalTrack,
      ],
    };

    const vsqx = generateVsqx(ir);

    expect(vsqx).toContain('<note>');
    expect(vsqx).toContain('<t>0</t>'); // tick
    expect(vsqx).toContain('<dur>480</dur>');
    expect(vsqx).toContain('<n>60</n>'); // note number
    expect(vsqx).toContain('<![CDATA[あ]]>'); // lyric in CDATA
  });

  it('should include tempo events', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [
        { tick: 0, bpm: 120 },
      ],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const vsqx = generateVsqx(ir);

    expect(vsqx).toContain('<tempo>');
    // 120 BPM = 12000 (bpm * 100)
    expect(vsqx).toContain('<v>12000</v>');
  });
});

describe('Tempo MIDI Generator', () => {
  it('should generate MIDI with only tempo track', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [
        {
          id: 't1',
          kind: 'midi',
          name: 't1',
          channel: 0,
          program: 0,
          defaultVel: 96,
          events: [{ type: 'note', tick: 0, dur: 480, key: 60, vel: 100 }],
        } as MidiTrack,
      ],
    };

    const tempoMidi = generateTempoMidi(ir);

    // Check header
    expect(tempoMidi.subarray(0, 4).toString()).toBe('MThd');

    // Should have only 1 track (tempo track)
    expect(tempoMidi.readUInt16BE(10)).toBe(1);
  });

  it('should include multiple tempo changes', () => {
    const ir: SongIR = {
      schemaVersion: '0.1',
      title: 'Test',
      ppq: 480,
      tempos: [
        { tick: 0, bpm: 120 },
        { tick: 1920, bpm: 140 },
        { tick: 3840, bpm: 100 },
      ],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
      tracks: [],
    };

    const tempoMidi = generateTempoMidi(ir);

    // Should contain tempo meta events (0xFF 0x51)
    const midiStr = tempoMidi.toString('binary');
    expect(midiStr.includes('MTrk')).toBe(true);
  });
});
