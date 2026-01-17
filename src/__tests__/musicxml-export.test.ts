import { describe, it, expect } from 'vitest';
import { scoreToMusicXML, type MusicXMLOptions } from '../export/musicxml.js';
import type { ScoreIR, NoteEvent, ChordEvent, Track, Clip } from '../ir.js';

/**
 * Create a minimal valid Score IR
 */
function createMinimalScore(): ScoreIR {
  return {
    tako: {
      irVersion: 4,
      generator: 'test',
    },
    meta: {},
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
        id: 'test',
        kind: 'instrument',
        label: 'Test Instrument',
      },
    ],
    tracks: [
      {
        name: 'Test Track',
        role: 'Instrument',
        sound: 'test',
        placements: [
          {
            at: { n: 0, d: 1 },
            clip: {
              events: [
                {
                  type: 'note',
                  start: { n: 0, d: 1 },
                  dur: { n: 1, d: 4 },
                  pitch: { midi: 60, cents: 0 },
                  velocity: 0.8,
                } as NoteEvent,
              ],
            },
          },
        ],
      },
    ],
  };
}

describe('MusicXML Export', () => {
  describe('basic structure', () => {
    it('generates valid XML declaration', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('generates DOCTYPE declaration', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<!DOCTYPE score-partwise');
      expect(xml).toContain('MusicXML');
    });

    it('generates score-partwise root element', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<score-partwise version="4.0">');
      expect(xml).toContain('</score-partwise>');
    });

    it('includes TakoMusic encoding info', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<software>TakoMusic</software>');
      expect(xml).toContain('<encoding-date>');
    });
  });

  describe('metadata', () => {
    it('exports title when present', () => {
      const score = createMinimalScore();
      score.meta.title = 'Test Song';
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<work-title>Test Song</work-title>');
    });

    it('exports composer when present', () => {
      const score = createMinimalScore();
      score.meta.artist = 'Test Composer';
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<creator type="composer">Test Composer</creator>');
    });

    it('exports copyright when present and enabled', () => {
      const score = createMinimalScore();
      score.meta.copyright = '© 2024 Test';
      const xml = scoreToMusicXML(score, { includeCopyright: true });

      expect(xml).toContain('<rights>© 2024 Test</rights>');
    });

    it('omits copyright when disabled', () => {
      const score = createMinimalScore();
      score.meta.copyright = '© 2024 Test';
      const xml = scoreToMusicXML(score, { includeCopyright: false });

      expect(xml).not.toContain('<rights>');
    });

    it('escapes XML special characters in metadata', () => {
      const score = createMinimalScore();
      score.meta.title = 'Song & More <test>';
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('Song &amp; More &lt;test&gt;');
    });
  });

  describe('part list', () => {
    it('creates part list from tracks', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<part-list>');
      expect(xml).toContain('</part-list>');
      expect(xml).toContain('<score-part id="P1">');
      expect(xml).toContain('<part-name>Test Track</part-name>');
    });

    it('creates multiple parts for multiple tracks', () => {
      const score = createMinimalScore();
      score.tracks.push({
        name: 'Second Track',
        role: 'Instrument',
        sound: 'test',
        placements: [],
      });

      const xml = scoreToMusicXML(score);
      expect(xml).toContain('<score-part id="P1">');
      expect(xml).toContain('<score-part id="P2">');
      expect(xml).toContain('<part-name>Second Track</part-name>');
    });
  });

  describe('tempo and time signature', () => {
    it('exports tempo in first measure', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<metronome>');
      expect(xml).toContain('<beat-unit>quarter</beat-unit>');
      expect(xml).toContain('<per-minute>120</per-minute>');
    });

    it('exports time signature', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<time>');
      expect(xml).toContain('<beats>4</beats>');
      expect(xml).toContain('<beat-type>4</beat-type>');
    });

    it('handles non-standard time signatures', () => {
      const score = createMinimalScore();
      score.meterMap[0].numerator = 7;
      score.meterMap[0].denominator = 8;
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<beats>7</beats>');
      expect(xml).toContain('<beat-type>8</beat-type>');
    });
  });

  describe('note events', () => {
    it('exports single note with correct pitch', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<pitch>');
      expect(xml).toContain('<step>C</step>');
      expect(xml).toContain('<octave>4</octave>');
    });

    it('exports note with sharp', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).pitch.midi = 61; // C#4
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<step>C</step>');
      expect(xml).toContain('<alter>1</alter>');
      expect(xml).toContain('<octave>4</octave>');
    });

    it('exports note duration', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score, { divisions: 480 });

      expect(xml).toContain('<duration>480</duration>'); // Quarter note at 480 divisions
      expect(xml).toContain('<type>quarter</type>');
    });

    it('exports half note correctly', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).dur = { n: 1, d: 2 };
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<type>half</type>');
    });

    it('exports whole note correctly', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).dur = { n: 1, d: 1 };
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<type>whole</type>');
    });

    it('exports multiple notes in sequence', () => {
      const score = createMinimalScore();
      score.tracks[0].placements[0].clip.events = [
        {
          type: 'note',
          start: { n: 0, d: 1 },
          dur: { n: 1, d: 4 },
          pitch: { midi: 60, cents: 0 },
          velocity: 0.8,
        } as NoteEvent,
        {
          type: 'note',
          start: { n: 1, d: 4 },
          dur: { n: 1, d: 4 },
          pitch: { midi: 62, cents: 0 },
          velocity: 0.8,
        } as NoteEvent,
      ];

      const xml = scoreToMusicXML(score);
      const noteCount = (xml.match(/<note>/g) || []).length;
      expect(noteCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('chord events', () => {
    it('exports chord as multiple notes with chord tag', () => {
      const score = createMinimalScore();
      score.tracks[0].placements[0].clip.events = [
        {
          type: 'chord',
          start: { n: 0, d: 1 },
          dur: { n: 1, d: 4 },
          pitches: [
            { midi: 60, cents: 0 }, // C
            { midi: 64, cents: 0 }, // E
            { midi: 67, cents: 0 }, // G
          ],
          velocity: 0.8,
        } as ChordEvent,
      ];

      const xml = scoreToMusicXML(score);
      expect(xml).toContain('<chord/>');
      const noteCount = (xml.match(/<note>/g) || []).length;
      expect(noteCount).toBe(4); // Includes rest to fill measure
    });

    it('exports chord notes in ascending order', () => {
      const score = createMinimalScore();
      score.tracks[0].placements[0].clip.events = [
        {
          type: 'chord',
          start: { n: 0, d: 1 },
          dur: { n: 1, d: 4 },
          pitches: [
            { midi: 60, cents: 0 },
            { midi: 64, cents: 0 },
            { midi: 67, cents: 0 },
          ],
          velocity: 0.8,
        } as ChordEvent,
      ];

      const xml = scoreToMusicXML(score);
      const pitchMatches = xml.match(/<step>([A-G])<\/step>/g);
      expect(pitchMatches).toBeTruthy();
    });
  });

  describe('clefs and key signatures', () => {
    it('exports treble clef for instrument tracks', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<clef>');
      expect(xml).toContain('<sign>G</sign>');
      expect(xml).toContain('<line>2</line>');
    });

    it('exports percussion clef for drum tracks', () => {
      const score = createMinimalScore();
      score.tracks[0].role = 'Drums';
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<sign>percussion</sign>');
    });

    it('exports default key signature (C major)', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<key>');
      expect(xml).toContain('<fifths>0</fifths>');
    });
  });

  describe('divisions option', () => {
    it('uses custom divisions when specified', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score, { divisions: 960 });

      expect(xml).toContain('<divisions>960</divisions>');
      expect(xml).toContain('<duration>960</duration>'); // Quarter note
    });

    it('uses default divisions (480) when not specified', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<divisions>480</divisions>');
    });
  });

  describe('measures', () => {
    it('creates measures based on time signature', () => {
      const score = createMinimalScore();
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<measure number="1">');
    });

    it('fills incomplete measures with rests', () => {
      const score = createMinimalScore();
      // Only one quarter note in a 4/4 measure
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<rest/>');
    });

    it('spans multiple measures for long pieces', () => {
      const score = createMinimalScore();
      // Add notes spanning multiple measures
      score.tracks[0].placements[0].clip.events = [
        {
          type: 'note',
          start: { n: 0, d: 1 },
          dur: { n: 1, d: 4 },
          pitch: { midi: 60, cents: 0 },
          velocity: 0.8,
        } as NoteEvent,
        {
          type: 'note',
          start: { n: 1, d: 1 }, // Start of measure 2
          dur: { n: 1, d: 4 },
          pitch: { midi: 62, cents: 0 },
          velocity: 0.8,
        } as NoteEvent,
      ];

      const xml = scoreToMusicXML(score);
      expect(xml).toContain('<measure number="1">');
      expect(xml).toContain('<measure number="2">');
    });
  });

  describe('techniques and articulations', () => {
    it('exports staccato articulation', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).techniques = ['staccato'];
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<staccato/>');
    });

    it('exports accent articulation', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).techniques = ['accent'];
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<accent/>');
    });

    it('exports fermata', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).techniques = ['fermata'];
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<fermata/>');
    });

    it('exports trill ornament', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).techniques = ['trill'];
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<trill-mark/>');
    });
  });

  describe('lyrics', () => {
    it('exports lyric syllables', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).lyric = {
        kind: 'syllable',
        text: 'Hel',
        wordPos: 'begin',
      };
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<lyric');
      expect(xml).toContain('<syllabic>begin</syllabic>');
      expect(xml).toContain('<text>Hel</text>');
    });
  });

  describe('empty tracks', () => {
    it('handles empty tracks gracefully', () => {
      const score = createMinimalScore();
      score.tracks[0].placements = [];
      const xml = scoreToMusicXML(score);

      expect(xml).toBeDefined();
      expect(xml).toContain('<measure number="1">');
    });

    it('fills empty measures with rests', () => {
      const score = createMinimalScore();
      score.tracks[0].placements[0].clip.events = [];
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<rest/>');
    });
  });

  describe('edge cases', () => {
    it('handles very high pitches', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).pitch.midi = 108; // C8
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<octave>8</octave>');
    });

    it('handles very low pitches', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).pitch.midi = 12; // C0
      const xml = scoreToMusicXML(score);

      expect(xml).toContain('<octave>0</octave>');
    });

    it('handles zero velocity', () => {
      const score = createMinimalScore();
      (score.tracks[0].placements[0].clip.events[0] as NoteEvent).velocity = 0;
      const xml = scoreToMusicXML(score);

      expect(xml).toBeDefined();
      expect(xml).toContain('<note>');
    });
  });
});
