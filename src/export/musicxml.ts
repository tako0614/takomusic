/**
 * MusicXML Export - Convert TakoMusic Score IR to MusicXML
 */

import type {
  ScoreIR,
  Track,
  Event,
  NoteEvent,
  ChordEvent,
  GraceNoteEvent,
  GlissandoEvent,
  TempoEvent,
  MeterEvent,
  LyricSpan,
  PedalEvent,
} from '../ir.js';
import type { Rat } from '../rat.js';
import type { Pitch } from '../pitch.js';

export interface MusicXMLOptions {
  /** Include part-wise (true) or time-wise (false) format */
  partwise?: boolean;
  /** Divisions per quarter note (default: 480) */
  divisions?: number;
  /** Include copyright notice */
  includeCopyright?: boolean;
}

// XML escape helper
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert Rat to divisions
function ratToDivisions(rat: Rat, divisions: number): number {
  // Rat is in whole notes (1/4 = quarter note)
  // divisions is per quarter note
  return Math.round((rat.n / rat.d) * divisions * 4);
}

// Convert MIDI pitch to MusicXML pitch components
function midiToPitchXml(
  midiNote: number
): { step: string; octave: number; alter?: number } {
  const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return {
    step: noteNames[noteIndex],
    octave,
    alter: alters[noteIndex] !== 0 ? alters[noteIndex] : undefined,
  };
}

// Get note type from duration
function getDurationType(divisions: number, noteDivisions: number): string {
  const ratio = noteDivisions / divisions;

  // Map ratio to note type
  if (ratio >= 4) return 'whole';
  if (ratio >= 2) return 'half';
  if (ratio >= 1) return 'quarter';
  if (ratio >= 0.5) return 'eighth';
  if (ratio >= 0.25) return '16th';
  if (ratio >= 0.125) return '32nd';
  if (ratio >= 0.0625) return '64th';
  return '128th';
}

// Check if duration needs dots
function getDots(divisions: number, noteDivisions: number): number {
  const ratio = noteDivisions / divisions;

  // Check for dotted notes
  if (Math.abs(ratio - 1.5) < 0.01) return 1; // Dotted quarter
  if (Math.abs(ratio - 3) < 0.01) return 1; // Dotted half
  if (Math.abs(ratio - 0.75) < 0.01) return 1; // Dotted eighth
  if (Math.abs(ratio - 0.375) < 0.01) return 1; // Dotted 16th

  // Double dotted
  if (Math.abs(ratio - 1.75) < 0.01) return 2;
  if (Math.abs(ratio - 3.5) < 0.01) return 2;

  return 0;
}

// Convert velocity to dynamics name
function velocityToDynamics(velocity: number): string | null {
  if (velocity <= 0.08) return 'pppp';
  if (velocity <= 0.16) return 'ppp';
  if (velocity <= 0.25) return 'pp';
  if (velocity <= 0.37) return 'p';
  if (velocity <= 0.52) return 'mp';
  if (velocity <= 0.67) return 'mf';
  if (velocity <= 0.80) return 'f';
  if (velocity <= 0.92) return 'ff';
  if (velocity <= 0.97) return 'fff';
  return 'ffff';
}

// Generate XML for a note
function generateNoteXml(
  pitch: Pitch,
  duration: number,
  divisions: number,
  isChord: boolean,
  voice: number,
  isRest: boolean = false,
  techniques?: string[],
  isGrace?: boolean,
  velocity?: number,
  lyric?: LyricSpan
): string {
  const lines: string[] = [];
  lines.push('        <note>');

  if (isGrace) {
    lines.push('          <grace/>');
  }

  if (isChord) {
    lines.push('          <chord/>');
  }

  if (isRest) {
    lines.push('          <rest/>');
  } else {
    const pitchInfo = midiToPitchXml(pitch.midi);
    lines.push('          <pitch>');
    lines.push(`            <step>${pitchInfo.step}</step>`);
    if (pitchInfo.alter !== undefined) {
      lines.push(`            <alter>${pitchInfo.alter}</alter>`);
    }
    lines.push(`            <octave>${pitchInfo.octave}</octave>`);
    lines.push('          </pitch>');
  }

  if (!isGrace) {
    lines.push(`          <duration>${duration}</duration>`);
  }

  lines.push(`          <voice>${voice}</voice>`);

  const noteType = getDurationType(divisions, duration);
  lines.push(`          <type>${noteType}</type>`);

  const dots = getDots(divisions, duration);
  for (let i = 0; i < dots; i++) {
    lines.push('          <dot/>');
  }

  // Add articulations/techniques
  if (techniques && techniques.length > 0) {
    lines.push('          <notations>');

    // Articulations
    const articulations: string[] = [];
    const ornaments: string[] = [];
    const technicalElements: string[] = [];
    let hasFermata = false;

    for (const tech of techniques) {
      switch (tech) {
        // Articulations
        case 'staccato':
          articulations.push('              <staccato/>');
          break;
        case 'staccatissimo':
          articulations.push('              <staccatissimo/>');
          break;
        case 'accent':
          articulations.push('              <accent/>');
          break;
        case 'tenuto':
          articulations.push('              <tenuto/>');
          break;
        case 'marcato':
          articulations.push('              <strong-accent/>');
          break;
        case 'spiccato':
          articulations.push('              <spiccato/>');
          break;
        case 'detache':
          articulations.push('              <detached-legato/>');
          break;
        case 'breath':
          articulations.push('              <breath-mark/>');
          break;
        case 'caesura':
          articulations.push('              <caesura/>');
          break;

        // Ornaments
        case 'trill':
          ornaments.push('              <trill-mark/>');
          break;
        case 'mordent':
          ornaments.push('              <mordent/>');
          break;
        case 'upper_mordent':
          ornaments.push('              <inverted-mordent/>');
          break;
        case 'turn':
          ornaments.push('              <turn/>');
          break;
        case 'tremolo':
          ornaments.push('              <tremolo type="single">3</tremolo>');
          break;

        // Technical
        case 'pizz':
        case 'pizzicato':
          technicalElements.push('              <pluck/>');
          break;
        case 'arco':
          technicalElements.push('              <bow-direction>down</bow-direction>');
          break;
        case 'harmonics':
          technicalElements.push('              <harmonic/>');
          break;
        case 'sul_pont':
        case 'sul_ponticello':
          technicalElements.push('              <string-mute type="on"/>');
          break;
        case 'con_sord':
        case 'con_sordino':
          technicalElements.push('              <mute>on</mute>');
          break;
        case 'senza_sord':
        case 'senza_sordino':
          technicalElements.push('              <mute>off</mute>');
          break;

        // Fermata
        case 'fermata':
          hasFermata = true;
          break;

        case 'legato':
          // Legato is typically shown as slurs, handled separately
          break;
      }
    }

    if (articulations.length > 0) {
      lines.push('            <articulations>');
      for (const art of articulations) {
        lines.push(art);
      }
      lines.push('            </articulations>');
    }

    if (ornaments.length > 0) {
      lines.push('            <ornaments>');
      for (const orn of ornaments) {
        lines.push(orn);
      }
      lines.push('            </ornaments>');
    }

    if (technicalElements.length > 0) {
      lines.push('            <technical>');
      for (const tech of technicalElements) {
        lines.push(tech);
      }
      lines.push('            </technical>');
    }

    if (hasFermata) {
      lines.push('            <fermata/>');
    }

    lines.push('          </notations>');
  }

  // Add lyric if present
  if (lyric && !isChord) {
    lines.push('          <lyric number="1">');
    if (lyric.kind === 'extend') {
      lines.push('            <extend/>');
    } else {
      // Map wordPos to MusicXML syllabic
      const syllabic = lyric.wordPos ?? 'single';
      lines.push(`            <syllabic>${syllabic}</syllabic>`);
      if (lyric.text) {
        lines.push(`            <text>${escapeXml(lyric.text)}</text>`);
      }
    }
    lines.push('          </lyric>');
  }

  lines.push('        </note>');
  return lines.join('\n');
}

// Generate measure XML
interface MeasureEvent {
  tick: number;
  event: Event;
  trackIndex: number;
}

/**
 * Convert TakoMusic Score IR to MusicXML format
 */
export function scoreToMusicXML(
  score: ScoreIR,
  options: MusicXMLOptions = {}
): string {
  const divisions = options.divisions ?? 480;
  const partwise = options.partwise ?? true;
  const includeCopyright = options.includeCopyright ?? true;

  const lines: string[] = [];

  // XML declaration and DOCTYPE
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'
  );

  // Score-partwise root
  lines.push('<score-partwise version="4.0">');

  // Work information
  if (score.meta.title) {
    lines.push('  <work>');
    lines.push(`    <work-title>${escapeXml(score.meta.title)}</work-title>`);
    lines.push('  </work>');
  }

  // Identification
  lines.push('  <identification>');
  if (score.meta.artist) {
    lines.push('    <creator type="composer">' + escapeXml(score.meta.artist) + '</creator>');
  }
  if (includeCopyright && score.meta.copyright) {
    lines.push('    <rights>' + escapeXml(score.meta.copyright) + '</rights>');
  }
  lines.push('    <encoding>');
  lines.push('      <software>TakoMusic</software>');
  lines.push(`      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>`);
  lines.push('    </encoding>');
  lines.push('  </identification>');

  // Part list
  lines.push('  <part-list>');
  for (let i = 0; i < score.tracks.length; i++) {
    const track = score.tracks[i];
    const partId = `P${i + 1}`;
    lines.push(`    <score-part id="${partId}">`);
    lines.push(`      <part-name>${escapeXml(track.name)}</part-name>`);
    lines.push('    </score-part>');
  }
  lines.push('  </part-list>');

  // Calculate total duration and measure structure
  const meterMap = [...score.meterMap].sort(
    (a, b) => a.at.n / a.at.d - b.at.n / b.at.d
  );
  if (meterMap.length === 0) {
    meterMap.push({ at: { n: 0, d: 1 }, numerator: 4, denominator: 4 });
  }

  // Find total duration from all tracks
  let totalDuration = 0;
  for (const track of score.tracks) {
    for (const placement of track.placements) {
      const placementStart = ratToDivisions(placement.at, divisions);
      for (const event of placement.clip.events) {
        if ('start' in event && 'dur' in event) {
          const eventEnd =
            placementStart +
            ratToDivisions(event.start as Rat, divisions) +
            ratToDivisions(event.dur as Rat, divisions);
          totalDuration = Math.max(totalDuration, eventEnd);
        }
      }
    }
  }

  // Generate parts
  for (let trackIdx = 0; trackIdx < score.tracks.length; trackIdx++) {
    const track = score.tracks[trackIdx];
    const partId = `P${trackIdx + 1}`;

    lines.push(`  <part id="${partId}">`);

    // Collect all events for this track
    const allEvents: { tick: number; event: Event }[] = [];
    for (const placement of track.placements) {
      const placementStart = ratToDivisions(placement.at, divisions);
      for (const event of placement.clip.events) {
        if ('start' in event) {
          const eventTick =
            placementStart + ratToDivisions(event.start as Rat, divisions);
          allEvents.push({ tick: eventTick, event });
        }
      }
    }

    // Sort events by tick
    allEvents.sort((a, b) => a.tick - b.tick);

    // Calculate measures
    let currentMeterIdx = 0;
    let measureStart = 0;
    let measureNum = 1;
    let currentTick = 0;

    while (currentTick < totalDuration || measureNum === 1) {
      // Get current meter
      while (
        currentMeterIdx + 1 < meterMap.length &&
        ratToDivisions(meterMap[currentMeterIdx + 1].at, divisions) <= measureStart
      ) {
        currentMeterIdx++;
      }
      const meter = meterMap[currentMeterIdx];
      const measureLength = (meter.numerator / meter.denominator) * divisions * 4;

      lines.push(`    <measure number="${measureNum}">`);

      // Attributes (first measure or meter change)
      if (measureNum === 1 || currentMeterIdx > 0) {
        lines.push('      <attributes>');
        lines.push(`        <divisions>${divisions}</divisions>`);

        if (measureNum === 1) {
          // Key signature (C major default)
          lines.push('        <key>');
          lines.push('          <fifths>0</fifths>');
          lines.push('        </key>');
        }

        // Time signature
        lines.push('        <time>');
        lines.push(`          <beats>${meter.numerator}</beats>`);
        lines.push(`          <beat-type>${meter.denominator}</beat-type>`);
        lines.push('        </time>');

        if (measureNum === 1) {
          // Clef
          if (track.role === 'Drums') {
            lines.push('        <clef>');
            lines.push('          <sign>percussion</sign>');
            lines.push('        </clef>');
          } else {
            lines.push('        <clef>');
            lines.push('          <sign>G</sign>');
            lines.push('          <line>2</line>');
            lines.push('        </clef>');
          }
        }

        lines.push('      </attributes>');
      }

      // Tempo (if this measure has a tempo event)
      if (measureNum === 1 && score.tempoMap.length > 0) {
        const tempo = score.tempoMap[0];
        lines.push('      <direction placement="above">');
        lines.push('        <direction-type>');
        lines.push('          <metronome>');
        lines.push('            <beat-unit>quarter</beat-unit>');
        lines.push(`            <per-minute>${Math.round(tempo.bpm)}</per-minute>`);
        lines.push('          </metronome>');
        lines.push('        </direction-type>');
        lines.push('      </direction>');
      }

      // Get events in this measure
      const measureEnd = measureStart + measureLength;
      const measureEvents = allEvents.filter(
        (e) => e.tick >= measureStart && e.tick < measureEnd
      );

      // Sort by tick, then group simultaneous notes
      measureEvents.sort((a, b) => a.tick - b.tick);

      // Track forward position
      let forwardTick = measureStart;

      for (let i = 0; i < measureEvents.length; i++) {
        const { tick, event } = measureEvents[i];

        // Add forward if needed
        if (tick > forwardTick) {
          const forwardDur = tick - forwardTick;
          lines.push('      <forward>');
          lines.push(`        <duration>${forwardDur}</duration>`);
          lines.push('      </forward>');
          forwardTick = tick;
        }

        // Generate note XML based on event type
        if (event.type === 'note') {
          const noteEvent = event as NoteEvent;
          const duration = ratToDivisions(noteEvent.dur, divisions);
          const voice = noteEvent.voice ?? 1;

          lines.push(
            generateNoteXml(
              noteEvent.pitch,
              duration,
              divisions,
              false,
              voice,
              false,
              noteEvent.techniques,
              false,
              noteEvent.velocity,
              noteEvent.lyric
            )
          );

          forwardTick = tick + duration;
        } else if (event.type === 'chord') {
          const chordEvent = event as ChordEvent;
          const duration = ratToDivisions(chordEvent.dur, divisions);
          const voice = chordEvent.voice ?? 1;

          for (let j = 0; j < chordEvent.pitches.length; j++) {
            lines.push(
              generateNoteXml(
                chordEvent.pitches[j],
                duration,
                divisions,
                j > 0,
                voice,
                false,
                chordEvent.techniques,
                false,
                chordEvent.velocity
              )
            );
          }

          forwardTick = tick + duration;
        } else if (event.type === 'graceNote') {
          const graceEvent = event as GraceNoteEvent;
          const voice = 1;

          // Grace notes
          for (const grace of graceEvent.graces) {
            const graceDur = ratToDivisions(grace.dur, divisions);
            lines.push(
              generateNoteXml(
                grace.pitch,
                graceDur,
                divisions,
                false,
                voice,
                false,
                undefined,
                true
              )
            );
          }

          // Main note
          const mainDur = ratToDivisions(graceEvent.mainDur, divisions);
          lines.push(
            generateNoteXml(
              graceEvent.mainPitch,
              mainDur,
              divisions,
              false,
              voice
            )
          );

          forwardTick = tick + mainDur;
        } else if (event.type === 'glissando') {
          const glissEvent = event as GlissandoEvent;
          const endTick = ratToDivisions(glissEvent.end, divisions);
          const duration = endTick - tick;
          const voice = 1;

          // Start note with glissando notation
          lines.push('        <note>');
          const fromPitchInfo = midiToPitchXml(glissEvent.fromPitch.midi);
          lines.push('          <pitch>');
          lines.push(`            <step>${fromPitchInfo.step}</step>`);
          if (fromPitchInfo.alter) {
            lines.push(`            <alter>${fromPitchInfo.alter}</alter>`);
          }
          lines.push(`            <octave>${fromPitchInfo.octave}</octave>`);
          lines.push('          </pitch>');
          lines.push(`          <duration>${duration}</duration>`);
          lines.push(`          <voice>${voice}</voice>`);
          lines.push(`          <type>${getDurationType(divisions, duration)}</type>`);
          lines.push('          <notations>');
          lines.push(
            `            <glissando type="start" line-type="${glissEvent.style === 'continuous' ? 'wavy' : 'solid'}">gliss.</glissando>`
          );
          lines.push('          </notations>');
          lines.push('        </note>');

          forwardTick = tick + duration;
        } else if (event.type === 'pedal') {
          const pedalEvent = event as PedalEvent;

          // MusicXML uses direction for pedal markings
          lines.push('        <direction placement="below">');
          lines.push('          <direction-type>');

          // Determine pedal type attribute
          let pedalType: string;
          if (pedalEvent.action === 'down') {
            pedalType = 'start';
          } else if (pedalEvent.action === 'up') {
            pedalType = 'stop';
          } else {
            pedalType = 'change';
          }

          // Add line attribute for sustain pedal visual representation
          const lineAttr = pedalEvent.pedal === 'sustain' ? ' line="yes"' : '';
          lines.push(`            <pedal type="${pedalType}"${lineAttr}/>`);

          lines.push('          </direction-type>');
          lines.push('        </direction>');
        }
      }

      // Fill remaining measure with rest if needed
      if (forwardTick < measureEnd) {
        const restDur = measureEnd - forwardTick;
        lines.push('        <note>');
        lines.push('          <rest/>');
        lines.push(`          <duration>${restDur}</duration>`);
        lines.push('          <voice>1</voice>');
        lines.push(`          <type>${getDurationType(divisions, restDur)}</type>`);
        lines.push('        </note>');
      }

      lines.push('    </measure>');

      measureStart = measureEnd;
      currentTick = measureEnd;
      measureNum++;

      // Safety limit
      if (measureNum > 1000) break;
    }

    lines.push('  </part>');
  }

  lines.push('</score-partwise>');

  return lines.join('\n');
}

/**
 * Export Score IR to MusicXML file
 */
export async function exportMusicXMLFile(
  score: ScoreIR,
  filePath: string,
  options: MusicXMLOptions = {}
): Promise<void> {
  const fs = await import('node:fs/promises');
  const xml = scoreToMusicXML(score, options);
  await fs.writeFile(filePath, xml, 'utf-8');
}
