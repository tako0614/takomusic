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

  // Header
  lines.push('// Generated from MusicXML');
  if (score.title) {
    lines.push(`title "${score.title}"`);
  }
  if (score.composer) {
    lines.push(`// Composer: ${score.composer}`);
  }
  lines.push('');

  // Default settings
  let currentDivisions = 1;
  let currentTempo = 120;

  // Generate tracks
  for (const part of score.parts) {
    const trackName = sanitizeTrackName(part.name);
    lines.push(`track ${trackName} {`);
    lines.push('  kind: midi');
    lines.push('  channel: 1');
    lines.push('  program: 0');
    lines.push('');

    let inSlur = false;

    for (const measure of part.measures) {
      // Handle attributes
      if (measure.attributes) {
        if (measure.attributes.divisions) {
          currentDivisions = measure.attributes.divisions;
        }
        if (measure.attributes.time) {
          lines.push(`  timeSig(${measure.attributes.time.beats}, ${measure.attributes.time.beatType})`);
        }
      }

      // Handle direction
      if (measure.direction) {
        if (measure.direction.tempo && measure.direction.tempo !== currentTempo) {
          currentTempo = measure.direction.tempo;
          lines.push(`  tempo(${currentTempo})`);
        }
        if (measure.direction.dynamics) {
          lines.push(`  ${measure.direction.dynamics}()`);
        }
      }

      // Handle notes
      const chordNotes: MusicXMLNote[] = [];

      for (const note of measure.notes) {
        if (note.chord) {
          chordNotes.push(note);
          continue;
        }

        // Flush previous chord if any
        if (chordNotes.length > 0) {
          const chordStr = generateChord(chordNotes, currentDivisions);
          lines.push(`  ${chordStr}`);
          chordNotes.length = 0;
        }

        // Handle slurs
        if (note.slur === 'start' && !inSlur) {
          lines.push('  slurStart()');
          inSlur = true;
        }

        // Generate note or rest
        if (note.rest) {
          const durStr = durationToMFS(note.duration, currentDivisions);
          lines.push(`  r(${durStr})`);
        } else if (note.grace) {
          if (note.pitch) {
            const pitchStr = pitchToMFS(note.pitch);
            lines.push(`  grace(${pitchStr})`);
          }
        } else if (note.pitch) {
          const pitchStr = pitchToMFS(note.pitch);
          const durStr = durationToMFS(note.duration, currentDivisions);

          let noteCall = '';
          if (note.lyrics) {
            noteCall = `n(${pitchStr}, ${durStr}, "${note.lyrics}")`;
          } else {
            noteCall = `n(${pitchStr}, ${durStr})`;
          }

          // Add articulations
          if (note.staccato) {
            noteCall = `staccato() ${noteCall}`;
          } else if (note.accent) {
            noteCall = `accent() ${noteCall}`;
          }

          if (note.fermata) {
            noteCall += ' fermata()';
          }

          lines.push(`  ${noteCall}`);

          // Add to chord collection for next iteration
          chordNotes.push(note);
        }

        // Handle slur end
        if (note.slur === 'stop' && inSlur) {
          lines.push('  slurEnd()');
          inSlur = false;
        }
      }

      // Flush remaining chord notes
      if (chordNotes.length > 1) {
        const chordStr = generateChord(chordNotes, currentDivisions);
        lines.push(`  ${chordStr}`);
      }

      // Add measure separator comment
      lines.push(`  // measure ${measure.number}`);
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function pitchToMFS(pitch: { step: string; octave: number; alter?: number }): string {
  const stepLower = pitch.step.toLowerCase();
  let accidental = '';
  if (pitch.alter === 1) {
    accidental = '#';
  } else if (pitch.alter === -1) {
    accidental = 'b';
  }
  return `${stepLower}${accidental}${pitch.octave}`;
}

function durationToMFS(duration: number, divisions: number): string {
  const quarterNotes = duration / divisions;

  if (quarterNotes === 4) return '1n';
  if (quarterNotes === 2) return '2n';
  if (quarterNotes === 1) return '4n';
  if (quarterNotes === 0.5) return '8n';
  if (quarterNotes === 0.25) return '16n';
  if (quarterNotes === 0.125) return '32n';

  // Dotted notes
  if (quarterNotes === 3) return '2n.';
  if (quarterNotes === 1.5) return '4n.';
  if (quarterNotes === 0.75) return '8n.';

  // Triplets
  if (Math.abs(quarterNotes - 2/3) < 0.01) return '4n/3';
  if (Math.abs(quarterNotes - 1/3) < 0.01) return '8n/3';

  // Default to ticks
  const ticks = Math.round(duration * (480 / divisions));
  return `${ticks}t`;
}

function generateChord(notes: MusicXMLNote[], divisions: number): string {
  if (notes.length === 0) return '';
  if (notes.length === 1 && notes[0].pitch) {
    const pitchStr = pitchToMFS(notes[0].pitch);
    const durStr = durationToMFS(notes[0].duration, divisions);
    return `n(${pitchStr}, ${durStr})`;
  }

  const pitches = notes
    .filter(n => n.pitch)
    .map(n => pitchToMFS(n.pitch!));

  const durStr = durationToMFS(notes[0].duration, divisions);
  return `chord([${pitches.join(', ')}], ${durStr})`;
}

function sanitizeTrackName(name: string): string {
  // Convert to valid MFS identifier
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();
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
