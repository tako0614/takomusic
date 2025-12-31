/**
 * Convert TakoMusic ScoreIR to MusicXML
 */

import * as fs from 'fs';
import {
  writeMusicXML,
  midiToPitch,
  getDurationType,
  type MusicXMLScore,
  type MusicXMLPart,
  type MusicXMLMeasure,
  type MusicXMLNote,
} from './musicxml.js';

// ScoreIR types (simplified for renderer)
interface ScoreIR {
  meta: { title?: string; artist?: string };
  tempoMap: Array<{ at: Rat; bpm: number; unit: Rat }>;
  meterMap: Array<{ at: Rat; numerator: number; denominator: number }>;
  sounds: SoundDecl[];
  tracks: Track[];
  markers?: Array<{ pos: Rat; kind: string; label: string }>;
}

interface Rat {
  n: number;
  d: number;
}

interface SoundDecl {
  id: string;
  kind: 'instrument' | 'drumKit' | 'vocal' | 'fx';
  drumKeys?: Array<{ key: string }>;
}

interface Track {
  name: string;
  role: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
  sound: string;
  placements: Placement[];
}

interface Placement {
  at: Rat;
  clip: Clip;
}

interface Clip {
  length?: Rat;
  events: Event[];
}

type Event = NoteEvent | ChordEvent | DrumHitEvent | RestEvent;

interface NoteEvent {
  type: 'note';
  start: Rat;
  dur: Rat;
  pitch: number;
  velocity?: number;
  lyric?: { text?: string };
}

interface ChordEvent {
  type: 'chord';
  start: Rat;
  dur: Rat;
  pitches: number[];
  velocity?: number;
}

interface DrumHitEvent {
  type: 'drumHit';
  start: Rat;
  dur: Rat;
  key: string;
  velocity?: number;
}

interface RestEvent {
  type: 'rest';
  start: Rat;
  dur: Rat;
}

interface RenderProfile {
  output: { path: string; divisions?: number };
  bindings: Array<{
    selector: { trackName?: string; role?: string; sound?: string };
    config: { clef?: string; drumNotation?: boolean };
  }>;
}

interface RenderArtifact {
  kind: 'file';
  path: string;
  mediaType: string;
  description: string;
}

interface RendererDiagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Convert Rat (rational number) to divisions
 */
function ratToDivisions(rat: Rat, divisions: number): number {
  // rat represents duration in whole notes
  // divisions is divisions per quarter note
  // 1 whole note = 4 quarter notes
  return Math.round((rat.n / rat.d) * divisions * 4);
}

/**
 * Convert position (in whole notes) to measure/beat
 */
function positionToMeasure(
  pos: Rat,
  meterMap: Array<{ at: Rat; numerator: number; denominator: number }>
): { measure: number; beat: Rat } {
  // Find active meter at position
  let activeMeter = { numerator: 4, denominator: 4 };
  let meterStart: Rat = { n: 0, d: 1 };

  for (const meter of meterMap) {
    const meterPos = meter.at.n / meter.at.d;
    const queryPos = pos.n / pos.d;
    if (meterPos <= queryPos) {
      activeMeter = { numerator: meter.numerator, denominator: meter.denominator };
      meterStart = meter.at;
    }
  }

  // Calculate measure length in whole notes
  const measureLength = activeMeter.numerator / activeMeter.denominator;

  // Position relative to meter start
  const relPos = (pos.n / pos.d) - (meterStart.n / meterStart.d);

  // Calculate measure number (1-indexed)
  const measure = Math.floor(relPos / measureLength) + 1;

  // Calculate beat within measure
  const beatInMeasure = relPos - (measure - 1) * measureLength;

  return {
    measure,
    beat: { n: Math.round(beatInMeasure * 1000), d: 1000 },
  };
}

/**
 * Get clef for a track based on its role and pitch range
 */
function getClef(track: Track): { sign: string; line: number } {
  if (track.role === 'Drums') {
    return { sign: 'percussion', line: 2 };
  }

  // Analyze pitch range
  let minPitch = 127;
  let maxPitch = 0;

  for (const placement of track.placements) {
    for (const event of placement.clip.events) {
      if (event.type === 'note') {
        minPitch = Math.min(minPitch, event.pitch);
        maxPitch = Math.max(maxPitch, event.pitch);
      } else if (event.type === 'chord') {
        for (const p of event.pitches) {
          minPitch = Math.min(minPitch, p);
          maxPitch = Math.max(maxPitch, p);
        }
      }
    }
  }

  // Use bass clef if average pitch is below middle C (60)
  const avgPitch = (minPitch + maxPitch) / 2;
  if (avgPitch < 55) {
    return { sign: 'F', line: 4 }; // Bass clef
  }

  return { sign: 'G', line: 2 }; // Treble clef
}

/**
 * Validate ScoreIR
 */
export function validate(scorePath: string, profilePath: string): RendererDiagnostic[] {
  const diagnostics: RendererDiagnostic[] = [];

  try {
    const scoreData = JSON.parse(fs.readFileSync(scorePath, 'utf-8')) as ScoreIR;
    JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as RenderProfile;

    // Check for required fields
    if (!scoreData.tempoMap || scoreData.tempoMap.length === 0) {
      diagnostics.push({ level: 'warning', message: 'No tempo events found, using 120 BPM' });
    }

    if (!scoreData.meterMap || scoreData.meterMap.length === 0) {
      diagnostics.push({ level: 'warning', message: 'No meter events found, using 4/4' });
    }

    // Check for unsupported features
    for (const track of scoreData.tracks) {
      if (track.role === 'Automation') {
        diagnostics.push({
          level: 'info',
          message: `Automation track "${track.name}" will be skipped (not supported in MusicXML)`,
        });
      }
    }
  } catch (err) {
    diagnostics.push({
      level: 'error',
      message: `Failed to read files: ${(err as Error).message}`,
    });
  }

  return diagnostics;
}

/**
 * Render ScoreIR to MusicXML
 */
export function render(scorePath: string, profilePath: string): RenderArtifact[] {
  const scoreData = JSON.parse(fs.readFileSync(scorePath, 'utf-8')) as ScoreIR;
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as RenderProfile;

  const divisions = profileData.output.divisions ?? 4; // divisions per quarter note
  const outputPath = profileData.output.path;

  // Get initial tempo and meter
  const initialTempo = scoreData.tempoMap?.[0]?.bpm ?? 120;
  const initialMeter = scoreData.meterMap?.[0] ?? { numerator: 4, denominator: 4 };

  // Calculate total measures needed
  let maxEndPos = 0;
  for (const track of scoreData.tracks) {
    for (const placement of track.placements) {
      const placementPos = placement.at.n / placement.at.d;
      for (const event of placement.clip.events) {
        const eventEnd = placementPos + (event.start.n / event.start.d) + (event.dur.n / event.dur.d);
        maxEndPos = Math.max(maxEndPos, eventEnd);
      }
    }
  }

  const measureLength = initialMeter.numerator / initialMeter.denominator;
  const totalMeasures = Math.ceil(maxEndPos / measureLength) || 1;

  // Build MusicXML score
  const xmlScore: MusicXMLScore = {
    title: scoreData.meta.title ?? 'Untitled',
    composer: scoreData.meta.artist,
    parts: [],
  };

  // Create parts from tracks
  for (const track of scoreData.tracks) {
    // Skip automation tracks
    if (track.role === 'Automation') continue;

    const partId = `P${xmlScore.parts.length + 1}`;
    const clef = getClef(track);

    const part: MusicXMLPart = {
      id: partId,
      name: track.name,
      measures: [],
    };

    // Collect all events for this track, organized by measure
    const measureEvents: Map<number, Array<{
      startDivisions: number;
      event: Event;
      placementAt: Rat;
    }>> = new Map();

    for (const placement of track.placements) {
      for (const event of placement.clip.events) {
        // Calculate absolute position
        const absPos = {
          n: placement.at.n * event.start.d + event.start.n * placement.at.d,
          d: placement.at.d * event.start.d,
        };

        const { measure } = positionToMeasure(absPos, scoreData.meterMap);

        if (!measureEvents.has(measure)) {
          measureEvents.set(measure, []);
        }

        // Calculate position within measure in divisions
        const measureStart = (measure - 1) * measureLength;
        const posInMeasure = (absPos.n / absPos.d) - measureStart;
        const startDivisions = Math.round(posInMeasure * divisions * 4);

        measureEvents.get(measure)!.push({
          startDivisions,
          event,
          placementAt: placement.at,
        });
      }
    }

    // Create measures
    for (let m = 1; m <= totalMeasures; m++) {
      const measure: MusicXMLMeasure = {
        number: m,
        notes: [],
      };

      // Add attributes to first measure
      if (m === 1) {
        measure.attributes = {
          divisions,
          key: { fifths: 0, mode: 'major' },
          time: { beats: initialMeter.numerator, beatType: initialMeter.denominator },
          clef,
        };
        measure.direction = { tempo: initialTempo };
      }

      // Check for meter changes
      for (const meterChange of scoreData.meterMap) {
        const changePos = meterChange.at.n / meterChange.at.d;
        const measureStart = (m - 1) * measureLength;
        if (Math.abs(changePos - measureStart) < 0.001 && m > 1) {
          measure.attributes = {
            ...measure.attributes,
            time: { beats: meterChange.numerator, beatType: meterChange.denominator },
          };
        }
      }

      // Check for tempo changes
      for (const tempoChange of scoreData.tempoMap) {
        const changePos = tempoChange.at.n / tempoChange.at.d;
        const measureStart = (m - 1) * measureLength;
        if (Math.abs(changePos - measureStart) < 0.001 && m > 1) {
          measure.direction = { tempo: tempoChange.bpm };
        }
      }

      // Get events for this measure
      const events = measureEvents.get(m) ?? [];

      // Sort by start position
      events.sort((a, b) => a.startDivisions - b.startDivisions);

      // Convert events to notes
      let lastEndDivisions = 0;

      for (let i = 0; i < events.length; i++) {
        const { startDivisions, event } = events[i];

        // Add rest if there's a gap
        if (startDivisions > lastEndDivisions) {
          const restDuration = startDivisions - lastEndDivisions;
          const { type, dots } = getDurationType(restDuration, divisions);
          measure.notes.push({
            rest: true,
            duration: restDuration,
            type,
            dots,
            voice: 1,
          });
        }

        const duration = ratToDivisions(event.dur, divisions);
        const { type, dots } = getDurationType(duration, divisions);
        const velocity = Math.round(((event as NoteEvent).velocity ?? 0.8) * 127);

        if (event.type === 'note') {
          const pitch = midiToPitch(event.pitch);
          const note: MusicXMLNote = {
            pitch,
            duration,
            type,
            dots,
            voice: 1,
            dynamics: velocity,
          };

          if (event.lyric?.text) {
            note.lyric = { syllable: event.lyric.text };
          }

          measure.notes.push(note);
        } else if (event.type === 'chord') {
          // First note of chord
          const firstPitch = midiToPitch(event.pitches[0]);
          measure.notes.push({
            pitch: firstPitch,
            duration,
            type,
            dots,
            voice: 1,
            dynamics: velocity,
          });

          // Remaining notes marked as chord
          for (let j = 1; j < event.pitches.length; j++) {
            const chordPitch = midiToPitch(event.pitches[j]);
            measure.notes.push({
              chord: true,
              pitch: chordPitch,
              duration,
              type,
              dots,
              voice: 1,
            });
          }
        } else if (event.type === 'drumHit') {
          // For drums, use unpitched notes (percussion clef)
          // Map drum key to a pitch for display purposes
          const drumPitchMap: Record<string, number> = {
            kick: 36,
            snare: 38,
            hhc: 42,
            hho: 46,
            tom1: 50,
            tom2: 48,
            crash: 49,
            ride: 51,
          };
          const pitch = midiToPitch(drumPitchMap[event.key] ?? 38);
          measure.notes.push({
            pitch,
            duration,
            type,
            dots,
            voice: 1,
            dynamics: velocity,
          });
        } else if (event.type === 'rest') {
          measure.notes.push({
            rest: true,
            duration,
            type,
            dots,
            voice: 1,
          });
        }

        lastEndDivisions = startDivisions + duration;
      }

      // Fill remaining measure with rest if needed
      const measureDivisions = divisions * initialMeter.numerator * (4 / initialMeter.denominator);
      if (lastEndDivisions < measureDivisions && events.length > 0) {
        const restDuration = measureDivisions - lastEndDivisions;
        if (restDuration > 0) {
          const { type, dots } = getDurationType(restDuration, divisions);
          measure.notes.push({
            rest: true,
            duration: restDuration,
            type,
            dots,
            voice: 1,
          });
        }
      }

      // If measure is empty, add a whole rest
      if (measure.notes.length === 0) {
        measure.notes.push({
          rest: true,
          duration: measureDivisions,
          type: 'whole',
          voice: 1,
        });
      }

      part.measures.push(measure);
    }

    xmlScore.parts.push(part);
  }

  // Write file
  const xmlContent = writeMusicXML(xmlScore);
  fs.writeFileSync(outputPath, xmlContent, 'utf-8');

  return [
    {
      kind: 'file',
      path: outputPath,
      mediaType: 'application/vnd.recordare.musicxml+xml',
      description: `MusicXML file with ${xmlScore.parts.length} parts, ${totalMeasures} measures`,
    },
  ];
}
