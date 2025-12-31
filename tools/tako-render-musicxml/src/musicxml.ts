/**
 * Pure TypeScript MusicXML Writer
 * No external dependencies
 */

export interface MusicXMLScore {
  title: string;
  composer?: string;
  parts: MusicXMLPart[];
}

export interface MusicXMLPart {
  id: string;
  name: string;
  abbreviation?: string;
  measures: MusicXMLMeasure[];
}

export interface MusicXMLMeasure {
  number: number;
  attributes?: MusicXMLAttributes;
  direction?: MusicXMLDirection;
  notes: MusicXMLNote[];
}

export interface MusicXMLAttributes {
  divisions?: number;
  key?: { fifths: number; mode?: string };
  time?: { beats: number; beatType: number };
  clef?: { sign: string; line: number };
}

export interface MusicXMLDirection {
  tempo?: number;
  dynamics?: string;
}

export interface MusicXMLNote {
  pitch?: { step: string; octave: number; alter?: number };
  duration: number;
  type: string;
  rest?: boolean;
  chord?: boolean;
  voice?: number;
  staff?: number;
  lyric?: { syllable: string; syllabic?: string };
  dynamics?: number; // velocity 0-127
  dots?: number;
}

// Duration type to MusicXML type name mapping
const durationTypes: Record<number, string> = {
  1: 'whole',
  2: 'half',
  4: 'quarter',
  8: 'eighth',
  16: '16th',
  32: '32nd',
  64: '64th',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function indent(level: number): string {
  return '  '.repeat(level);
}

export function writeMusicXML(score: MusicXMLScore): string {
  const lines: string[] = [];

  // XML declaration and DOCTYPE
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  lines.push('<score-partwise version="4.0">');

  // Work
  lines.push(`${indent(1)}<work>`);
  lines.push(`${indent(2)}<work-title>${escapeXml(score.title)}</work-title>`);
  lines.push(`${indent(1)}</work>`);

  // Identification
  if (score.composer) {
    lines.push(`${indent(1)}<identification>`);
    lines.push(`${indent(2)}<creator type="composer">${escapeXml(score.composer)}</creator>`);
    lines.push(`${indent(2)}<encoding>`);
    lines.push(`${indent(3)}<software>TakoMusic MusicXML Renderer</software>`);
    lines.push(`${indent(3)}<encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>`);
    lines.push(`${indent(2)}</encoding>`);
    lines.push(`${indent(1)}</identification>`);
  }

  // Part list
  lines.push(`${indent(1)}<part-list>`);
  for (const part of score.parts) {
    lines.push(`${indent(2)}<score-part id="${escapeXml(part.id)}">`);
    lines.push(`${indent(3)}<part-name>${escapeXml(part.name)}</part-name>`);
    if (part.abbreviation) {
      lines.push(`${indent(3)}<part-abbreviation>${escapeXml(part.abbreviation)}</part-abbreviation>`);
    }
    lines.push(`${indent(2)}</score-part>`);
  }
  lines.push(`${indent(1)}</part-list>`);

  // Parts
  for (const part of score.parts) {
    lines.push(`${indent(1)}<part id="${escapeXml(part.id)}">`);

    for (const measure of part.measures) {
      lines.push(`${indent(2)}<measure number="${measure.number}">`);

      // Attributes
      if (measure.attributes) {
        lines.push(`${indent(3)}<attributes>`);
        if (measure.attributes.divisions !== undefined) {
          lines.push(`${indent(4)}<divisions>${measure.attributes.divisions}</divisions>`);
        }
        if (measure.attributes.key) {
          lines.push(`${indent(4)}<key>`);
          lines.push(`${indent(5)}<fifths>${measure.attributes.key.fifths}</fifths>`);
          if (measure.attributes.key.mode) {
            lines.push(`${indent(5)}<mode>${measure.attributes.key.mode}</mode>`);
          }
          lines.push(`${indent(4)}</key>`);
        }
        if (measure.attributes.time) {
          lines.push(`${indent(4)}<time>`);
          lines.push(`${indent(5)}<beats>${measure.attributes.time.beats}</beats>`);
          lines.push(`${indent(5)}<beat-type>${measure.attributes.time.beatType}</beat-type>`);
          lines.push(`${indent(4)}</time>`);
        }
        if (measure.attributes.clef) {
          lines.push(`${indent(4)}<clef>`);
          lines.push(`${indent(5)}<sign>${measure.attributes.clef.sign}</sign>`);
          lines.push(`${indent(5)}<line>${measure.attributes.clef.line}</line>`);
          lines.push(`${indent(4)}</clef>`);
        }
        lines.push(`${indent(3)}</attributes>`);
      }

      // Direction (tempo, dynamics)
      if (measure.direction) {
        if (measure.direction.tempo) {
          lines.push(`${indent(3)}<direction placement="above">`);
          lines.push(`${indent(4)}<direction-type>`);
          lines.push(`${indent(5)}<metronome>`);
          lines.push(`${indent(6)}<beat-unit>quarter</beat-unit>`);
          lines.push(`${indent(6)}<per-minute>${measure.direction.tempo}</per-minute>`);
          lines.push(`${indent(5)}</metronome>`);
          lines.push(`${indent(4)}</direction-type>`);
          lines.push(`${indent(4)}<sound tempo="${measure.direction.tempo}"/>`);
          lines.push(`${indent(3)}</direction>`);
        }
        if (measure.direction.dynamics) {
          lines.push(`${indent(3)}<direction placement="below">`);
          lines.push(`${indent(4)}<direction-type>`);
          lines.push(`${indent(5)}<dynamics>`);
          lines.push(`${indent(6)}<${measure.direction.dynamics}/>`);
          lines.push(`${indent(5)}</dynamics>`);
          lines.push(`${indent(4)}</direction-type>`);
          lines.push(`${indent(3)}</direction>`);
        }
      }

      // Notes
      for (const note of measure.notes) {
        lines.push(`${indent(3)}<note>`);

        if (note.chord) {
          lines.push(`${indent(4)}<chord/>`);
        }

        if (note.rest) {
          lines.push(`${indent(4)}<rest/>`);
        } else if (note.pitch) {
          lines.push(`${indent(4)}<pitch>`);
          lines.push(`${indent(5)}<step>${note.pitch.step}</step>`);
          if (note.pitch.alter !== undefined && note.pitch.alter !== 0) {
            lines.push(`${indent(5)}<alter>${note.pitch.alter}</alter>`);
          }
          lines.push(`${indent(5)}<octave>${note.pitch.octave}</octave>`);
          lines.push(`${indent(4)}</pitch>`);
        }

        lines.push(`${indent(4)}<duration>${note.duration}</duration>`);
        lines.push(`${indent(4)}<type>${note.type}</type>`);

        // Add dots
        if (note.dots) {
          for (let i = 0; i < note.dots; i++) {
            lines.push(`${indent(4)}<dot/>`);
          }
        }

        if (note.voice !== undefined) {
          lines.push(`${indent(4)}<voice>${note.voice}</voice>`);
        }

        if (note.staff !== undefined) {
          lines.push(`${indent(4)}<staff>${note.staff}</staff>`);
        }

        // Dynamics as notations
        if (note.dynamics !== undefined) {
          const dynamicsName = velocityToDynamics(note.dynamics);
          if (dynamicsName) {
            lines.push(`${indent(4)}<notations>`);
            lines.push(`${indent(5)}<dynamics>`);
            lines.push(`${indent(6)}<${dynamicsName}/>`);
            lines.push(`${indent(5)}</dynamics>`);
            lines.push(`${indent(4)}</notations>`);
          }
        }

        // Lyric
        if (note.lyric) {
          lines.push(`${indent(4)}<lyric>`);
          if (note.lyric.syllabic) {
            lines.push(`${indent(5)}<syllabic>${note.lyric.syllabic}</syllabic>`);
          }
          lines.push(`${indent(5)}<text>${escapeXml(note.lyric.syllable)}</text>`);
          lines.push(`${indent(4)}</lyric>`);
        }

        lines.push(`${indent(3)}</note>`);
      }

      lines.push(`${indent(2)}</measure>`);
    }

    lines.push(`${indent(1)}</part>`);
  }

  lines.push('</score-partwise>');

  return lines.join('\n');
}

function velocityToDynamics(velocity: number): string | null {
  if (velocity < 16) return 'pppp';
  if (velocity < 32) return 'ppp';
  if (velocity < 48) return 'pp';
  if (velocity < 64) return 'p';
  if (velocity < 80) return 'mp';
  if (velocity < 96) return 'mf';
  if (velocity < 112) return 'f';
  if (velocity < 127) return 'ff';
  return 'fff';
}

/**
 * Convert MIDI pitch to MusicXML pitch
 */
export function midiToPitch(midiPitch: number): { step: string; octave: number; alter: number } {
  const pitchClasses = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  const octave = Math.floor(midiPitch / 12) - 1;
  const pitchClass = midiPitch % 12;

  return {
    step: pitchClasses[pitchClass],
    octave,
    alter: alters[pitchClass],
  };
}

/**
 * Get MusicXML note type from duration in divisions
 */
export function getDurationType(duration: number, divisions: number): { type: string; dots: number } {
  // divisions is divisions per quarter note
  const quarterDuration = divisions;
  const wholeDuration = quarterDuration * 4;

  // Check for dotted notes
  // A dotted note is 1.5x the base duration
  // A double-dotted note is 1.75x the base duration

  // Try exact matches first
  const exactTypes: Array<[number, string, number]> = [
    [wholeDuration, 'whole', 0],
    [wholeDuration * 1.5, 'whole', 1],
    [wholeDuration * 1.75, 'whole', 2],
    [quarterDuration * 2, 'half', 0],
    [quarterDuration * 3, 'half', 1],
    [quarterDuration * 3.5, 'half', 2],
    [quarterDuration, 'quarter', 0],
    [quarterDuration * 1.5, 'quarter', 1],
    [quarterDuration * 1.75, 'quarter', 2],
    [quarterDuration / 2, 'eighth', 0],
    [quarterDuration * 0.75, 'eighth', 1],
    [quarterDuration / 4, '16th', 0],
    [quarterDuration * 0.375, '16th', 1],
    [quarterDuration / 8, '32nd', 0],
    [quarterDuration / 16, '64th', 0],
  ];

  for (const [dur, type, dots] of exactTypes) {
    if (Math.abs(duration - dur) < 0.001) {
      return { type, dots };
    }
  }

  // Default to quarter if no match
  return { type: 'quarter', dots: 0 };
}
