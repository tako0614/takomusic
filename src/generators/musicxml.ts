// MusicXML generator for vocal tracks

import type { SongIR, VocalTrack, NoteEvent, TempoEvent, TimeSigEvent } from '../types/ir.js';

const NOTE_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

export function generateMusicXML(ir: SongIR): string {
  const vocalTracks = ir.tracks.filter((t): t is VocalTrack => t.kind === 'vocal');

  if (vocalTracks.length === 0) {
    return generateEmptyMusicXML(ir);
  }

  // Use first vocal track
  const track = vocalTracks[0];
  const notes = track.events.filter((e): e is NoteEvent => e.type === 'note');

  // Get divisions (ticks per quarter note = ppq)
  const divisions = ir.ppq;

  // Get time signature
  const timeSig = ir.timeSigs[0] ?? { numerator: 4, denominator: 4 };
  const ticksPerMeasure = (divisions * 4 * timeSig.numerator) / timeSig.denominator;

  // Get tempo
  const tempo = ir.tempos[0]?.bpm ?? 120;

  // Group notes by measure
  const measures: NoteEvent[][] = [];
  for (const note of notes) {
    const measureIndex = Math.floor(note.tick / ticksPerMeasure);
    while (measures.length <= measureIndex) {
      measures.push([]);
    }
    measures[measureIndex].push(note);
  }

  // Ensure at least one measure
  if (measures.length === 0) {
    measures.push([]);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(ir.title ?? 'Untitled')}</work-title>
  </work>
  <identification>
    <encoding>
      <software>TakoMusic v1.0.0-alpha</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>${escapeXml(track.name)}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  for (let i = 0; i < measures.length; i++) {
    xml += `    <measure number="${i + 1}">\n`;

    // First measure: add attributes and direction
    if (i === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>${timeSig.numerator}</beats>
          <beat-type>${timeSig.denominator}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${tempo}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${tempo}"/>
      </direction>
`;
    }

    // Add notes for this measure
    const measureNotes = measures[i];
    const measureStartTick = i * ticksPerMeasure;

    let currentTick = measureStartTick;

    for (const note of measureNotes) {
      // Add rest if there's a gap
      if (note.tick > currentTick) {
        const restDur = note.tick - currentTick;
        xml += generateRest(restDur, divisions);
      }

      // Add note
      xml += generateNote(note, divisions);
      currentTick = note.tick + note.dur;
    }

    // Fill remaining space with rest
    const measureEndTick = (i + 1) * ticksPerMeasure;
    if (currentTick < measureEndTick) {
      const restDur = measureEndTick - currentTick;
      xml += generateRest(restDur, divisions);
    }

    xml += `    </measure>\n`;
  }

  xml += `  </part>
</score-partwise>
`;

  return xml;
}

function generateNote(note: NoteEvent, divisions: number): string {
  const octave = Math.floor(note.key / 12) - 1;
  const pitchClass = note.key % 12;
  const step = NOTE_NAMES[pitchClass];
  const alter = NOTE_ALTERS[pitchClass];

  let xml = `      <note>
        <pitch>
          <step>${step}</step>
`;
  if (alter !== 0) {
    xml += `          <alter>${alter}</alter>\n`;
  }
  xml += `          <octave>${octave}</octave>
        </pitch>
        <duration>${note.dur}</duration>
        <type>${getDurationType(note.dur, divisions)}</type>
`;

  if (note.lyric) {
    xml += `        <lyric>
          <syllabic>single</syllabic>
          <text>${escapeXml(note.lyric)}</text>
        </lyric>
`;
  }

  xml += `      </note>\n`;
  return xml;
}

function generateRest(duration: number, divisions: number): string {
  return `      <note>
        <rest/>
        <duration>${duration}</duration>
        <type>${getDurationType(duration, divisions)}</type>
      </note>
`;
}

function getDurationType(ticks: number, divisions: number): string {
  const quarters = ticks / divisions;

  if (quarters >= 4) return 'whole';
  if (quarters >= 2) return 'half';
  if (quarters >= 1) return 'quarter';
  if (quarters >= 0.5) return 'eighth';
  if (quarters >= 0.25) return '16th';
  if (quarters >= 0.125) return '32nd';
  return '64th';
}

function generateEmptyMusicXML(ir: SongIR): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(ir.title ?? 'Untitled')}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Vocal</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${ir.ppq}</divisions>
      </attributes>
      <note>
        <rest measure="yes"/>
        <duration>${ir.ppq * 4}</duration>
      </note>
    </measure>
  </part>
</score-partwise>
`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
