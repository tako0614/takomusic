// MusicXML importer - converts MusicXML to MFS format

import * as fs from 'fs';
import * as path from 'path';

interface MusicXMLNote {
  pitch?: { step: string; octave: number; alter?: number };
  duration: number;
  type?: string;
  rest?: boolean;
  chord?: boolean;
  voice?: number;
  lyrics?: string;
  tie?: 'start' | 'stop';
  slur?: 'start' | 'stop';
  staccato?: boolean;
  accent?: boolean;
  fermata?: boolean;
  grace?: boolean;
  dynamics?: string;
}

interface MusicXMLMeasure {
  number: number;
  notes: MusicXMLNote[];
  attributes?: {
    divisions?: number;
    time?: { beats: number; beatType: number };
    key?: { fifths: number };
    clef?: { sign: string; line: number };
  };
  direction?: {
    tempo?: number;
    dynamics?: string;
  };
}

interface MusicXMLPart {
  id: string;
  name: string;
  measures: MusicXMLMeasure[];
}

interface MusicXMLScore {
  title?: string;
  composer?: string;
  parts: MusicXMLPart[];
}

// Note type to duration mapping (in divisions)
const TYPE_DURATIONS: Record<string, number> = {
  'whole': 4,
  'half': 2,
  'quarter': 1,
  'eighth': 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
};

// Step to pitch class mapping
const STEP_TO_PITCH: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

// Pitch class to step and accidental
const PITCH_TO_NOTE: string[] = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

/**
 * Safely parse an integer from a string, returning a default value if invalid
 */
function safeParseInt(value: string, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a float from a string, returning a default value if invalid
 */
function safeParseFloat(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function importMusicXML(xmlContent: string): string {
  const score = parseMusicXML(xmlContent);
  return generateMFS(score);
}

export function importMusicXMLFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return importMusicXML(content);
}

function parseMusicXML(xml: string): MusicXMLScore {
  const score: MusicXMLScore = { parts: [] };

  // Extract title
  const titleMatch = xml.match(/<work-title>([^<]+)<\/work-title>/);
  if (titleMatch) {
    score.title = titleMatch[1];
  }

  // Extract composer
  const composerMatch = xml.match(/<creator[^>]*type="composer"[^>]*>([^<]+)<\/creator>/);
  if (composerMatch) {
    score.composer = composerMatch[1];
  }

  // Extract part names from part-list
  const partNames: Record<string, string> = {};
  const partListMatch = xml.match(/<part-list>([\s\S]*?)<\/part-list>/);
  if (partListMatch) {
    const scorePartRegex = /<score-part\s+id="([^"]+)"[\s\S]*?<part-name>([^<]+)<\/part-name>/g;
    let partMatch;
    while ((partMatch = scorePartRegex.exec(partListMatch[1])) !== null) {
      partNames[partMatch[1]] = partMatch[2];
    }
  }

  // Extract parts
  const partRegex = /<part\s+id="([^"]+)">([\s\S]*?)<\/part>/g;
  let partMatch;
  while ((partMatch = partRegex.exec(xml)) !== null) {
    const partId = partMatch[1];
    const partContent = partMatch[2];
    const part: MusicXMLPart = {
      id: partId,
      name: partNames[partId] || partId,
      measures: [],
    };

    // Extract measures
    const measureRegex = /<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
    let measureMatch;
    while ((measureMatch = measureRegex.exec(partContent)) !== null) {
      const measureNum = safeParseInt(measureMatch[1], part.measures.length + 1);
      const measureContent = measureMatch[2];
      const measure = parseMeasure(measureNum, measureContent);
      part.measures.push(measure);
    }

    score.parts.push(part);
  }

  return score;
}

function parseMeasure(number: number, content: string): MusicXMLMeasure {
  const measure: MusicXMLMeasure = {
    number,
    notes: [],
  };

  // Extract attributes
  const attributesMatch = content.match(/<attributes>([\s\S]*?)<\/attributes>/);
  if (attributesMatch) {
    measure.attributes = {};
    const attrContent = attributesMatch[1];

    const divisionsMatch = attrContent.match(/<divisions>(\d+)<\/divisions>/);
    if (divisionsMatch) {
      const divisions = safeParseInt(divisionsMatch[1], 1);
      // Ensure divisions is at least 1 to prevent division by zero
      measure.attributes.divisions = Math.max(1, divisions);
    }

    const timeMatch = attrContent.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/);
    if (timeMatch) {
      measure.attributes.time = {
        beats: safeParseInt(timeMatch[1], 4),
        beatType: safeParseInt(timeMatch[2], 4),
      };
    }

    const keyMatch = attrContent.match(/<key>[\s\S]*?<fifths>(-?\d+)<\/fifths>/);
    if (keyMatch) {
      measure.attributes.key = { fifths: safeParseInt(keyMatch[1], 0) };
    }
  }

  // Extract direction (tempo, dynamics)
  const directionMatch = content.match(/<direction>([\s\S]*?)<\/direction>/);
  if (directionMatch) {
    measure.direction = {};
    const dirContent = directionMatch[1];

    const tempoMatch = dirContent.match(/<sound[^>]*tempo="([\d.]+)"/);
    if (tempoMatch) {
      measure.direction.tempo = safeParseFloat(tempoMatch[1], 120);
    }

    const dynamicsMatch = dirContent.match(/<dynamics>[\s\S]*?<(\w+)\s*\/>/);
    if (dynamicsMatch) {
      measure.direction.dynamics = dynamicsMatch[1];
    }
  }

  // Extract notes
  const noteRegex = /<note>([\s\S]*?)<\/note>/g;
  let noteMatch;
  while ((noteMatch = noteRegex.exec(content)) !== null) {
    const note = parseNote(noteMatch[1]);
    measure.notes.push(note);
  }

  return measure;
}

function parseNote(content: string): MusicXMLNote {
  const note: MusicXMLNote = {
    duration: 0,
  };

  // Check if rest
  if (content.includes('<rest')) {
    note.rest = true;
  }

  // Check if chord
  if (content.includes('<chord')) {
    note.chord = true;
  }

  // Check if grace note
  if (content.includes('<grace')) {
    note.grace = true;
  }

  // Extract pitch
  const pitchMatch = content.match(/<pitch>[\s\S]*?<step>([A-G])<\/step>[\s\S]*?<octave>(\d+)<\/octave>/);
  if (pitchMatch) {
    note.pitch = {
      step: pitchMatch[1],
      octave: safeParseInt(pitchMatch[2], 4),
    };

    const alterMatch = content.match(/<alter>(-?\d+)<\/alter>/);
    if (alterMatch) {
      note.pitch.alter = safeParseInt(alterMatch[1], 0);
    }
  }

  // Extract duration
  const durationMatch = content.match(/<duration>(\d+)<\/duration>/);
  if (durationMatch) {
    note.duration = safeParseInt(durationMatch[1], 1);
  }

  // Extract type
  const typeMatch = content.match(/<type>([^<]+)<\/type>/);
  if (typeMatch) {
    note.type = typeMatch[1];
  }

  // Extract voice
  const voiceMatch = content.match(/<voice>(\d+)<\/voice>/);
  if (voiceMatch) {
    note.voice = safeParseInt(voiceMatch[1], 1);
  }

  // Extract lyrics
  const lyricMatch = content.match(/<lyric[^>]*>[\s\S]*?<text>([^<]+)<\/text>/);
  if (lyricMatch) {
    note.lyrics = lyricMatch[1];
  }

  // Extract tie
  if (content.includes('<tie type="start"')) {
    note.tie = 'start';
  } else if (content.includes('<tie type="stop"')) {
    note.tie = 'stop';
  }

  // Extract slur
  if (content.includes('<slur type="start"')) {
    note.slur = 'start';
  } else if (content.includes('<slur type="stop"')) {
    note.slur = 'stop';
  }

  // Extract articulations
  if (content.includes('<staccato')) {
    note.staccato = true;
  }
  if (content.includes('<accent')) {
    note.accent = true;
  }
  if (content.includes('<fermata')) {
    note.fermata = true;
  }

  // Extract dynamics
  const dynamicsMatch = content.match(/<dynamics>[\s\S]*?<(\w+)\s*\/>/);
  if (dynamicsMatch) {
    note.dynamics = dynamicsMatch[1];
  }

  return note;
}

function generateMFS(score: MusicXMLScore): string {
  const lines: string[] = [];

  // Header comment
  lines.push('// Generated from MusicXML');
  if (score.composer) {
    lines.push(`// Composer: ${score.composer}`);
  }
  lines.push('');

  // Score block
  const title = score.title || 'Imported';
  lines.push(`score "${title}" {`);

  // Default settings
  let currentDivisions = 1;
  let currentTempo = 120;
  let currentTimeNum = 4;
  let currentTimeDen = 4;

  // Collect global settings from first measure
  if (score.parts.length > 0 && score.parts[0].measures.length > 0) {
    const firstMeasure = score.parts[0].measures[0];
    if (firstMeasure.attributes?.time) {
      currentTimeNum = firstMeasure.attributes.time.beats;
      currentTimeDen = firstMeasure.attributes.time.beatType;
    }
    if (firstMeasure.direction?.tempo) {
      currentTempo = firstMeasure.direction.tempo;
    }
  }

  lines.push(`  tempo ${currentTempo}`);
  lines.push(`  time ${currentTimeNum}/${currentTimeDen}`);
  lines.push('');

  // Generate parts
  for (const part of score.parts) {
    const partName = sanitizeTrackName(part.name) || 'Part';
    const hasLyrics = part.measures.some(m => m.notes.some(n => n.lyrics));

    if (hasLyrics) {
      // Vocal part with phrases
      lines.push(`  part ${partName} {`);
      generateVocalPart(lines, part, currentDivisions);
      lines.push('  }');
    } else {
      // MIDI part with bars
      lines.push(`  part ${partName} {`);
      lines.push('    midi ch:1 program:0');
      generateMidiPart(lines, part, currentDivisions);
      lines.push('  }');
    }
    lines.push('');
  }

  lines.push('}');

  return lines.join('\n');
}

function generateVocalPart(lines: string[], part: MusicXMLPart, divisions: number): void {
  // Group notes into phrases (separated by rests)
  let phraseNotes: { pitch: string; dur: string; lyric?: string; tie?: string }[] = [];
  let phraseLyrics: string[] = [];

  for (const measure of part.measures) {
    if (measure.attributes?.divisions) {
      divisions = measure.attributes.divisions;
    }

    for (const note of measure.notes) {
      if (note.chord) continue; // Skip chord notes for vocal

      if (note.rest) {
        // Flush current phrase
        if (phraseNotes.length > 0) {
          outputPhrase(lines, phraseNotes, phraseLyrics);
          phraseNotes = [];
          phraseLyrics = [];
        }
        // Add rest
        const durStr = durationToMFSv2(note.duration, divisions);
        lines.push(`    rest ${durStr}`);
      } else if (note.pitch) {
        const pitchStr = pitchToMFSv2(note.pitch);
        const durStr = durationToMFSv2(note.duration, divisions);
        const tieStr = note.tie === 'start' ? '~' : '';

        phraseNotes.push({ pitch: pitchStr, dur: durStr + tieStr, lyric: note.lyrics, tie: note.tie });

        if (note.lyrics && note.tie !== 'stop') {
          phraseLyrics.push(note.lyrics);
        } else if (note.tie === 'stop') {
          // Continuation of tied note - don't add lyric
        } else {
          phraseLyrics.push('_'); // Melisma if no lyric
        }
      }
    }
  }

  // Flush remaining phrase
  if (phraseNotes.length > 0) {
    outputPhrase(lines, phraseNotes, phraseLyrics);
  }
}

function outputPhrase(
  lines: string[],
  notes: { pitch: string; dur: string; lyric?: string; tie?: string }[],
  lyrics: string[]
): void {
  if (notes.length === 0) return;

  lines.push('    phrase {');
  lines.push('      notes:');

  // Build bar line
  let barLine = '        |';
  for (const n of notes) {
    barLine += ` ${n.pitch} ${n.dur} `;
  }
  barLine += '|;';
  lines.push(barLine);

  lines.push('      lyrics mora:');
  // Clean up lyrics
  const cleanLyrics = lyrics.map(l => l || '_').join(' ');
  lines.push(`        ${cleanLyrics};`);

  lines.push('    }');
}

function generateMidiPart(lines: string[], part: MusicXMLPart, divisions: number): void {
  for (const measure of part.measures) {
    if (measure.attributes?.divisions) {
      divisions = measure.attributes.divisions;
    }

    let barLine = '    |';
    const chordNotes: MusicXMLNote[] = [];

    for (const note of measure.notes) {
      if (note.chord) {
        chordNotes.push(note);
        continue;
      }

      // Flush chord
      if (chordNotes.length > 0) {
        const lastNote = chordNotes[chordNotes.length - 1];
        const pitches = chordNotes.filter(n => n.pitch).map(n => pitchToMFSv2(n.pitch!));
        if (pitches.length > 0 && lastNote.pitch) {
          pitches.unshift(pitchToMFSv2(lastNote.pitch));
        }
        const durStr = durationToMFSv2(chordNotes[0].duration || lastNote.duration, divisions);
        barLine += ` [${pitches.join(' ')}] ${durStr} `;
        chordNotes.length = 0;
      }

      if (note.rest) {
        const durStr = durationToMFSv2(note.duration, divisions);
        barLine += ` r${durStr} `;
      } else if (note.pitch) {
        const pitchStr = pitchToMFSv2(note.pitch);
        const durStr = durationToMFSv2(note.duration, divisions);
        const tieStr = note.tie === 'start' ? '~' : '';
        barLine += ` ${pitchStr} ${durStr}${tieStr} `;
        chordNotes.push(note); // Track for potential chord
      }
    }

    barLine += '|';
    lines.push(barLine);
  }
}

function pitchToMFSv2(pitch: { step: string; octave: number; alter?: number }): string {
  let accidental = '';
  if (pitch.alter === 1) {
    accidental = '#';
  } else if (pitch.alter === -1) {
    accidental = 'b';
  }
  return `${pitch.step}${accidental}${pitch.octave}`;
}

// Helper for floating-point comparison with relative epsilon
function approxEquals(a: number, b: number): boolean {
  const epsilon = Math.max(Math.abs(a), Math.abs(b)) * 1e-9;
  return Math.abs(a - b) <= Math.max(epsilon, 1e-12);
}

function durationToMFSv2(duration: number, divisions: number): string {
  // Ensure divisions is positive to avoid division by zero
  if (divisions <= 0) {
    return `${duration}t`;
  }
  const quarterNotes = duration / divisions;

  // Use approxEquals for floating-point safe comparison
  if (approxEquals(quarterNotes, 4)) return 'w';
  if (approxEquals(quarterNotes, 2)) return 'h';
  if (approxEquals(quarterNotes, 1)) return 'q';
  if (approxEquals(quarterNotes, 0.5)) return 'e';
  if (approxEquals(quarterNotes, 0.25)) return 's';
  if (approxEquals(quarterNotes, 0.125)) return 't';

  // Dotted notes
  if (approxEquals(quarterNotes, 3)) return 'h.';
  if (approxEquals(quarterNotes, 1.5)) return 'q.';
  if (approxEquals(quarterNotes, 0.75)) return 'e.';

  // Default to ticks
  const ticks = Math.round(duration * (480 / divisions));
  return `${ticks}t`;
}

function sanitizeTrackName(name: string): string {
  // Convert to valid identifier
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'Part';
}

// CLI usage
export async function convertMusicXMLToMFS(inputPath: string, outputPath?: string): Promise<void> {
  const mfs = importMusicXMLFile(inputPath);

  if (outputPath) {
    fs.writeFileSync(outputPath, mfs, 'utf-8');
  } else {
    // Default output path
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outPath = path.join(path.dirname(inputPath), `${baseName}.mf`);
    fs.writeFileSync(outPath, mfs, 'utf-8');
  }
}
