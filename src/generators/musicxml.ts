// MusicXML generator for TakoScore v2.0 - Underlay model support

import type {
  SongIR,
  VocalTrack,
  NoteEvent,
  Phrase,
  PhraseNote,
  Syllabic,
  DynamicMark,
  NoteEventExtended,
  NoteEventFull,
  Articulation,
  TupletInfo,
  GraceNoteEvent,
  FermataEvent,
  RepeatEvent,
  OttavaEvent,
} from '../types/ir.js';
import { containsKanji, kanjiToHiragana, countSyllables, splitLyricBySyllables } from '../utils/kanji.js';

const NOTE_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

export async function generateMusicXML(ir: SongIR): Promise<string> {
  const vocalTracks = ir.tracks.filter((t): t is VocalTrack => t.kind === 'vocal');

  if (vocalTracks.length === 0) {
    return generateEmptyMusicXML(ir);
  }

  // Use first vocal track
  const track = vocalTracks[0];

  // v2.0: Use phrase-based notes if available
  let notes: (NoteEvent | PhraseNote)[] = [];

  if (track.phrases && track.phrases.length > 0) {
    // Flatten phrases into notes with underlay info preserved
    for (const phrase of track.phrases) {
      for (const pn of phrase.notes) {
        notes.push(pn);
      }
    }
  } else {
    // Fallback to legacy events
    notes = track.events.filter((e): e is NoteEvent => e.type === 'note');
  }

  // Check for kanji in lyrics and convert to hiragana with warning
  const kanjiConversions: { original: string; converted: string }[] = [];
  for (const note of notes) {
    if (note.lyric && containsKanji(note.lyric)) {
      const converted = await kanjiToHiragana(note.lyric);
      kanjiConversions.push({ original: note.lyric, converted });
      note.lyric = converted;
    }
  }
  if (kanjiConversions.length > 0) {
    console.warn(`Warning: Lyrics contain kanji which NEUTRINO cannot synthesize. Converting to hiragana:`);
    for (const { original, converted } of kanjiConversions) {
      console.warn(`  "${original}" -> "${converted}"`);
    }
  }

  // v2.0: Don't auto-split notes - the language enforces proper syllable counts
  // Only validate phoneme budget if configured
  const phonemeBudget = ir.backend?.phonemeBudgetPerOnset ?? 8;
  const budgetWarnings: string[] = [];

  for (const note of notes) {
    if (note.lyric) {
      const syllableCount = countSyllables(note.lyric);
      if (syllableCount > phonemeBudget) {
        budgetWarnings.push(`"${note.lyric}" (${syllableCount} syllables) at tick ${note.tick}`);
      }
    }
  }

  if (budgetWarnings.length > 0) {
    console.warn(`Warning: Some lyrics exceed phoneme budget (${phonemeBudget}):`);
    for (const w of budgetWarnings) {
      console.warn(`  ${w}`);
    }
  }

  // Get divisions (ticks per quarter note = ppq)
  const divisions = Math.max(1, ir.ppq || 480);

  // Get time signature with safe defaults
  const timeSig = ir.timeSigs.length > 0 ? ir.timeSigs[0] : { numerator: 4, denominator: 4, tick: 0 };
  const safeDenominator = Math.max(1, timeSig.denominator || 4);
  const ticksPerMeasure = (divisions * 4 * timeSig.numerator) / safeDenominator;

  // Get tempo
  const tempo = ir.tempos[0]?.bpm ?? 120;

  // Group notes by measure
  const measures: (NoteEvent | PhraseNote)[][] = [];
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

  const xmlParts: string[] = [];

  // Add UTF-8 BOM for Windows compatibility (especially NEUTRINO)
  xmlParts.push(`\uFEFF<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(ir.title ?? 'Untitled')}</work-title>
  </work>
  <identification>
    <encoding>
      <software>TakoMusic v2.0.0</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>${escapeXml(track.name)}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`);

  for (let i = 0; i < measures.length; i++) {
    xmlParts.push(`    <measure number="${i + 1}">\n`);

    // First measure: add attributes and direction
    if (i === 0) {
      xmlParts.push(`      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${getKeyFifths(ir.keySignature)}</fifths>
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
`);
    }

    // Add notes for this measure
    const measureNotes = measures[i];
    const measureStartTick = i * ticksPerMeasure;

    let currentTick = measureStartTick;

    for (const note of measureNotes) {
      // Add rest if there's a gap
      if (note.tick > currentTick) {
        const restDur = note.tick - currentTick;
        xmlParts.push(generateRest(restDur, divisions));
      }

      // Add note with underlay info
      xmlParts.push(generateNoteWithUnderlay(note, divisions));
      currentTick = note.tick + note.dur;
    }

    // Fill remaining space with rest
    const measureEndTick = (i + 1) * ticksPerMeasure;
    if (currentTick < measureEndTick) {
      const restDur = measureEndTick - currentTick;
      xmlParts.push(generateRest(restDur, divisions));
    }

    xmlParts.push(`    </measure>\n`);
  }

  xmlParts.push(`  </part>
</score-partwise>
`);

  return xmlParts.join('');
}

function getKeyFifths(keySignature?: { root: string; mode: 'major' | 'minor' }): number {
  if (!keySignature) return 0;

  // Circle of fifths: C=0, G=1, D=2, A=3, E=4, B=5, F#=6, F=-1, Bb=-2, etc.
  const majorFifths: Record<string, number> = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'Gb': -6,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Cb': -7
  };

  const minorFifths: Record<string, number> = {
    'A': 0, 'E': 1, 'B': 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6,
    'D': -1, 'G': -2, 'C': -3, 'F': -4, 'Bb': -5, 'Eb': -6
  };

  const lookup = keySignature.mode === 'major' ? majorFifths : minorFifths;
  return lookup[keySignature.root] ?? 0;
}

/**
 * Type guard to check if a note has phrase-level properties
 */
function isPhraseNote(note: NoteEvent | PhraseNote): note is PhraseNote {
  return 'isContinuation' in note || ('extend' in note && note.extend !== undefined);
}

/**
 * Type guard to check if a note has extended properties
 */
function isNoteEventFull(note: NoteEvent | PhraseNote): note is NoteEventFull {
  return 'dynamic' in note || 'graceNotes' in note || 'tieStart' in note ||
         'tieEnd' in note || 'slurStart' in note || 'slurEnd' in note ||
         'voice' in note || 'tuplet' in note || 'fermata' in note;
}

function generateNoteWithUnderlay(note: NoteEvent | PhraseNote, divisions: number): string {
  const extNote = isNoteEventFull(note) ? note : null;
  const phraseNote = isPhraseNote(note) ? note : null;
  const octave = Math.floor((note.key ?? 60) / 12) - 1;
  const pitchClass = (note.key ?? 60) % 12;
  const step = NOTE_NAMES[pitchClass];
  const alter = NOTE_ALTERS[pitchClass];

  let xml = '';

  // Add dynamic direction if present
  if (extNote?.dynamic) {
    xml += generateDynamic(extNote.dynamic);
  }

  // Generate grace notes if present
  if (extNote?.graceNotes && extNote.graceNotes.length > 0) {
    for (const grace of extNote.graceNotes) {
      xml += generateGraceNote(grace);
    }
  }

  xml += `      <note>
        <pitch>
          <step>${step}</step>
`;
  if (alter !== 0) {
    xml += `          <alter>${alter}</alter>\n`;
  }
  xml += `          <octave>${octave}</octave>
        </pitch>
        <duration>${note.dur}</duration>
`;

  // Add tie element (before type) - support both legacy and phrase-based
  const tieStart = extNote?.tieStart || phraseNote?.tieStart;
  const tieEnd = extNote?.tieEnd || phraseNote?.tieEnd;

  if (tieStart && tieEnd) {
    xml += `        <tie type="stop"/>
        <tie type="start"/>
`;
  } else if (tieStart) {
    xml += `        <tie type="start"/>
`;
  } else if (tieEnd) {
    xml += `        <tie type="stop"/>
`;
  }

  // Add voice if specified
  if (extNote?.voice) {
    xml += `        <voice>${extNote.voice}</voice>
`;
  }

  xml += `        <type>${getDurationType(note.dur, divisions)}</type>
`;

  // Add time modification for tuplets
  if (extNote?.tuplet) {
    xml += `        <time-modification>
          <actual-notes>${extNote.tuplet.actual}</actual-notes>
          <normal-notes>${extNote.tuplet.normal}</normal-notes>
        </time-modification>
`;
  }

  // Add notations element for slurs, ties, articulations, tuplets, fermata
  const hasNotations = extNote?.slurStart || extNote?.slurEnd ||
    tieStart || tieEnd ||
    (note as NoteEvent).articulation || extNote?.tuplet || extNote?.fermata;

  if (hasNotations) {
    xml += `        <notations>
`;
    // Tied notation
    if (tieStart && tieEnd) {
      xml += `          <tied type="stop"/>
          <tied type="start"/>
`;
    } else if (tieStart) {
      xml += `          <tied type="start"/>
`;
    } else if (tieEnd) {
      xml += `          <tied type="stop"/>
`;
    }

    // Slur notation
    if (extNote?.slurStart) {
      xml += `          <slur type="start" number="1"/>
`;
    }
    if (extNote?.slurEnd) {
      xml += `          <slur type="stop" number="1"/>
`;
    }

    // Tuplet notation
    if (extNote?.tuplet) {
      xml += `          <tuplet type="start"/>
`;
    }

    // Fermata notation
    if (extNote?.fermata) {
      xml += `          <fermata/>
`;
    }

    // Articulations
    if ((note as NoteEvent).articulation) {
      xml += generateArticulation((note as NoteEvent).articulation!);
    }

    xml += `        </notations>
`;
  }

  // v2.0: Enhanced lyric handling with syllabic and extend
  if (note.lyric || phraseNote?.extend) {
    xml += `        <lyric>
`;

    // Determine syllabic type
    const syllabic = (note as PhraseNote).syllabic || 'single';
    xml += `          <syllabic>${syllabic}</syllabic>
`;

    if (note.lyric) {
      xml += `          <text>${escapeXml(note.lyric)}</text>
`;
    }

    // Add extend element for melisma
    if (phraseNote?.extend) {
      xml += `          <extend type="start"/>
`;
    }

    xml += `        </lyric>
`;
  }

  xml += `      </note>\n`;
  return xml;
}

function generateGraceNote(grace: GraceNoteEvent): string {
  const octave = Math.floor(grace.key / 12) - 1;
  const pitchClass = grace.key % 12;
  const step = NOTE_NAMES[pitchClass];
  const alter = NOTE_ALTERS[pitchClass];

  let xml = `      <note>
        <grace${grace.slash ? ' slash="yes"' : ''}/>
        <pitch>
          <step>${step}</step>
`;
  if (alter !== 0) {
    xml += `          <alter>${alter}</alter>\n`;
  }
  xml += `          <octave>${octave}</octave>
        </pitch>
        <type>eighth</type>
`;
  if (grace.lyric) {
    xml += `        <lyric>
          <syllabic>single</syllabic>
          <text>${escapeXml(grace.lyric)}</text>
        </lyric>
`;
  }
  xml += `      </note>
`;
  return xml;
}

function generateDynamic(dynamic: DynamicMark): string {
  return `      <direction placement="below">
        <direction-type>
          <dynamics>
            <${dynamic}/>
          </dynamics>
        </direction-type>
      </direction>
`;
}

function generateArticulation(articulation: Articulation): string {
  const articulationMap: Record<Articulation, string> = {
    'staccato': 'staccato',
    'legato': 'tenuto',
    'accent': 'accent',
    'tenuto': 'tenuto',
    'marcato': 'strong-accent',
  };

  const xmlElement = articulationMap[articulation];
  return `          <articulations>
            <${xmlElement}/>
          </articulations>
`;
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
