/**
 * Score IR to MIDI Renderer
 *
 * Converts TakoMusic ScoreIR to Standard MIDI File format.
 *
 * Features:
 * - Format 1 MIDI (multi-track synchronous)
 * - Conductor track with tempo/meter/markers
 * - Program Change and Bank Select
 * - Control Change and Pitch Bend from automation
 * - Lyric events embedded in tracks
 * - Optional humanization (timing/velocity variation)
 * - General MIDI drum mapping
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  writeMidiFile,
  bpmToMicroseconds,
  type MidiFile,
  type MidiTrack,
  type MidiEvent,
  type NoteOnEvent,
  type NoteOffEvent,
  type ControlChangeEvent,
  type ProgramChangeEvent,
  type PitchBendEvent,
  type TempoEvent,
  type TimeSignatureEvent,
  type TrackNameEvent,
  type EndOfTrackEvent,
  type TextEvent,
} from './midiWriter.js';
import { ratToTicks, type Rat } from './ratToTicks.js';
import type { RenderProfile, Diagnostic } from './validate.js';

// Re-export validate for backward compatibility
export { validate } from './validate.js';

// ScoreIR types matching ir.ts
interface ScoreIR {
  tako: {
    irVersion: number;
    sourceHash?: string;
    generator?: string;
  };
  meta: {
    title?: string;
    artist?: string;
    album?: string;
    copyright?: string;
    anacrusis?: Rat;
  };
  tempoMap: Array<{ at: Rat; bpm: number; unit: Rat }>;
  meterMap: Array<{ at: Rat; numerator: number; denominator: number }>;
  sounds: SoundDecl[];
  tracks: Track[];
  markers?: Array<{ type: 'marker'; pos: Rat; kind: string; label: string }>;
}

interface SoundDecl {
  id: string;
  kind: 'instrument' | 'drumKit' | 'vocal' | 'fx';
  label?: string;
  family?: string;
  tags?: string[];
  drumKeys?: Array<{ key: string; label?: string; group?: string; tags?: string[] }>;
}

interface Track {
  name: string;
  role: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
  sound: string;
  mix?: { gain?: number; pan?: number };
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

type Event =
  | NoteEvent
  | ChordEvent
  | DrumHitEvent
  | BreathEvent
  | ControlEvent
  | AutomationEvent;

interface Pitch {
  midi: number;
  cents: number;
}

interface NoteEvent {
  type: 'note';
  start: Rat;
  dur: Rat;
  pitch: Pitch;
  velocity?: number;
  voice?: number;
  techniques?: string[];
  lyric?: LyricSpan;
}

interface ChordEvent {
  type: 'chord';
  start: Rat;
  dur: Rat;
  pitches: Pitch[];
  velocity?: number;
  voice?: number;
  techniques?: string[];
}

interface DrumHitEvent {
  type: 'drumHit';
  start: Rat;
  dur: Rat;
  key: string;
  velocity?: number;
  techniques?: string[];
}

interface BreathEvent {
  type: 'breath';
  start: Rat;
  dur: Rat;
  intensity?: number;
}

interface ControlEvent {
  type: 'control';
  start: Rat;
  kind: string;
  data: Record<string, unknown>;
}

interface AutomationEvent {
  type: 'automation';
  param: string;
  start: Rat;
  end: Rat;
  curve: {
    kind: 'piecewiseLinear';
    points: Array<{ t: number; v: number }>;
  };
}

interface LyricSpan {
  kind: 'syllable' | 'extend';
  text?: string;
  wordPos?: 'single' | 'begin' | 'middle' | 'end';
}

interface RenderArtifact {
  kind: 'file' | 'dir' | 'bundle' | 'stream';
  path?: string;
  mediaType?: string;
  description?: string;
}

// Simple LCG random for deterministic humanization
class SimpleRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Random number between -range and +range
  range(range: number): number {
    return (this.next() - 0.5) * 2 * range;
  }
}

/**
 * Find binding config for a track using selector matching from RENDERING.md
 */
function findBinding(
  track: Track,
  bindings: RenderProfile['bindings']
): RenderProfile['bindings'][0]['config'] | null {
  for (const binding of bindings) {
    const sel = binding.selector;
    if (sel.trackName !== undefined && sel.trackName !== track.name) continue;
    if (sel.role !== undefined && sel.role !== track.role) continue;
    if (sel.sound !== undefined && sel.sound !== track.sound) continue;
    return binding.config;
  }
  return null;
}

/**
 * Default General MIDI drum key mapping
 */
function getDefaultDrumMap(): Record<string, number> {
  return {
    // Basic kit
    kick: 36, // Bass Drum 1
    snare: 38, // Acoustic Snare
    hhc: 42, // Closed Hi-Hat
    hho: 46, // Open Hi-Hat
    tom1: 50, // High Tom
    tom2: 48, // Hi-Mid Tom
    tom3: 45, // Low Tom
    tom4: 43, // High Floor Tom
    crash: 49, // Crash Cymbal 1
    ride: 51, // Ride Cymbal 1
    rimshot: 37, // Side Stick
    clap: 39, // Hand Clap

    // Extended mappings
    sidestick: 37,
    lowTom: 41, // Low Floor Tom
    midTom: 47, // Low-Mid Tom
    highTom: 50,
    openHat: 46,
    closedHat: 42,
    pedalHat: 44, // Pedal Hi-Hat
    crashCymbal: 49,
    rideCymbal: 51,
    splashCymbal: 55, // Splash Cymbal
    chinaCymbal: 52, // Chinese Cymbal
    cowbell: 56,
    tambourine: 54,
    woodblock: 76, // Hi Wood Block

    // Additional GM drums
    kick2: 35, // Acoustic Bass Drum
    snare2: 40, // Electric Snare
    rideBell: 53,
    vibraslap: 58,
    bongo_hi: 60,
    bongo_lo: 61,
    conga_hi: 62,
    conga_lo: 64,
    timbale_hi: 65,
    timbale_lo: 66,
  };
}

/**
 * Get default General MIDI program number based on sound kind
 */
function getDefaultProgram(soundId: string, soundKind: string): number {
  // Try to match by sound ID first
  const programs: Record<string, number> = {
    // Keyboards
    piano: 0,
    grandPiano: 0,
    electricPiano: 4,
    organ: 19,
    churchOrgan: 19,
    accordion: 21,

    // Guitars
    guitar: 25,
    acousticGuitar: 25,
    electricGuitar: 27,
    distortedGuitar: 30,
    overdrivenGuitar: 29,

    // Bass
    bass: 33,
    electricBass: 33,
    fingeredBass: 33,
    pickedBass: 34,
    fretlessBass: 35,
    slapBass: 36,
    synthBass: 38,
    sub: 38,

    // Strings
    strings: 48,
    ensemble: 48,
    violin: 40,
    viola: 41,
    cello: 42,
    contrabass: 43,
    pizzicato: 45,
    harp: 46,

    // Brass
    brass: 61,
    trumpet: 56,
    trombone: 57,
    tuba: 58,
    frenchHorn: 60,

    // Woodwinds
    flute: 73,
    clarinet: 71,
    oboe: 68,
    bassoon: 70,
    saxophone: 66,

    // Synths
    synth: 80,
    lead: 80,
    leadSynth: 80,
    pad: 88,
    synthPad: 88,
    arpSynth: 81,
    synthStrings: 50,

    // Vocals (best we can do with GM)
    vocal: 54, // Voice Oohs
    leadVocal: 54,
    choirAahs: 52,
  };

  const program = programs[soundId];
  if (program !== undefined) return program;

  // Fallback by kind
  switch (soundKind) {
    case 'instrument':
      return 0; // Acoustic Grand Piano
    case 'vocal':
      return 54; // Voice Oohs
    default:
      return 0;
  }
}

/**
 * Parse automation parameter to MIDI CC or pitch bend
 */
function parseAutomationParam(param: string): { type: 'cc' | 'pitchBend' | 'unknown'; cc?: number } {
  if (param === 'midi.pitchBend' || param === 'pitchBend') {
    return { type: 'pitchBend' };
  }

  // Parse midi.cc.N format
  const ccMatch = param.match(/^midi\.cc\.(\d+)$/);
  if (ccMatch) {
    return { type: 'cc', cc: parseInt(ccMatch[1], 10) };
  }

  // Named CC mappings
  const namedCCs: Record<string, number> = {
    modulation: 1,
    volume: 7,
    pan: 10,
    expression: 11,
    sustain: 64,
    filterCutoff: 74,
    filterResonance: 71,
  };

  const cc = namedCCs[param];
  if (cc !== undefined) {
    return { type: 'cc', cc };
  }

  return { type: 'unknown' };
}

/**
 * Evaluate piecewise linear curve at normalized position t (0-1)
 */
function evaluateCurve(curve: AutomationEvent['curve'], t: number): number {
  const points = curve.points;
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].v;

  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    if (t >= points[i].t && t <= points[i + 1].t) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const localT = (t - p0.t) / (p1.t - p0.t);
      return p0.v + (p1.v - p0.v) * localT;
    }
  }

  // Return last point if t > 1
  return points[points.length - 1].v;
}

/**
 * Generate MIDI events for automation curve
 */
function generateAutomationEvents(
  automation: AutomationEvent,
  channel: number,
  placementTick: number,
  ppq: number
): Array<{ tick: number; event: ControlChangeEvent | PitchBendEvent }> {
  const events: Array<{ tick: number; event: ControlChangeEvent | PitchBendEvent }> = [];

  const startTick = placementTick + ratToTicks(automation.start, ppq);
  const endTick = placementTick + ratToTicks(automation.end, ppq);
  const duration = endTick - startTick;

  if (duration <= 0) return events;

  const parsed = parseAutomationParam(automation.param);
  if (parsed.type === 'unknown') return events;

  // Generate interpolated values (every ~20 ticks or so)
  const step = Math.max(20, Math.floor(duration / 50));
  const numSteps = Math.ceil(duration / step);

  for (let i = 0; i <= numSteps; i++) {
    const t = Math.min(i * step, duration);
    const progress = duration > 0 ? t / duration : 0;
    const value = evaluateCurve(automation.curve, progress);
    const tick = startTick + t;

    if (parsed.type === 'cc') {
      const ccValue = Math.max(0, Math.min(127, Math.round(value)));
      events.push({
        tick,
        event: {
          type: 'controlChange',
          delta: 0,
          channel,
          controller: parsed.cc!,
          value: ccValue,
        },
      });
    } else if (parsed.type === 'pitchBend') {
      const pbValue = Math.max(-8192, Math.min(8191, Math.round(value)));
      events.push({
        tick,
        event: {
          type: 'pitchBend',
          delta: 0,
          channel,
          value: pbValue,
        },
      });
    }
  }

  return events;
}

/**
 * Render ScoreIR to MIDI file
 */
export function render(scorePath: string, profilePath: string): RenderArtifact[] {
  const scoreData = JSON.parse(fs.readFileSync(scorePath, 'utf-8')) as ScoreIR;
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as RenderProfile;

  const ppq = profileData.output.ppq ?? 480;
  let outputPath = profileData.output.path;

  // Make output path absolute if relative
  if (!path.isAbsolute(outputPath)) {
    outputPath = path.resolve(path.dirname(profilePath), outputPath);
  }

  // Humanization settings
  const humanize =
    profileData.humanize?.enabled !== false
      ? {
          timing: profileData.humanize?.timing ?? 0,
          velocity: profileData.humanize?.velocity ?? 0,
        }
      : { timing: 0, velocity: 0 };

  const random = new SimpleRandom(42); // Deterministic seed

  // Build sound map
  const soundMap = new Map<string, SoundDecl>();
  for (const sound of scoreData.sounds) {
    soundMap.set(sound.id, sound);
  }

  // Create conductor track (track 0 with tempo and meter)
  const conductorTrack: MidiTrack = {
    name: 'Conductor',
    events: [],
  };

  // Track name (use score title)
  conductorTrack.events.push({
    type: 'trackName',
    delta: 0,
    name: scoreData.meta.title ?? 'Untitled',
  } as TrackNameEvent);

  // Add copyright if present
  if (scoreData.meta.copyright) {
    conductorTrack.events.push({
      type: 'text',
      delta: 0,
      kind: 'copyright',
      text: scoreData.meta.copyright,
    } as TextEvent);
  }

  // Collect conductor events with absolute ticks
  const conductorEvents: Array<{ tick: number; event: MidiEvent }> = [];

  // Add tempo events
  if (scoreData.tempoMap.length === 0) {
    // Default tempo: 120 BPM
    conductorEvents.push({
      tick: 0,
      event: { type: 'tempo', delta: 0, microsecondsPerBeat: 500000 },
    });
  } else {
    for (const tempo of scoreData.tempoMap) {
      const tick = ratToTicks(tempo.at, ppq);
      const microsecondsPerBeat = bpmToMicroseconds(tempo.bpm);
      conductorEvents.push({
        tick,
        event: { type: 'tempo', delta: 0, microsecondsPerBeat },
      });
    }
  }

  // Add meter events
  if (scoreData.meterMap.length === 0) {
    // Default meter: 4/4
    conductorEvents.push({
      tick: 0,
      event: {
        type: 'timeSignature',
        delta: 0,
        numerator: 4,
        denominator: 4,
        clocksPerClick: 24,
        thirtySecondNotesPerQuarter: 8,
      },
    });
  } else {
    for (const meter of scoreData.meterMap) {
      const tick = ratToTicks(meter.at, ppq);
      conductorEvents.push({
        tick,
        event: {
          type: 'timeSignature',
          delta: 0,
          numerator: meter.numerator,
          denominator: meter.denominator,
          clocksPerClick: 24,
          thirtySecondNotesPerQuarter: 8,
        },
      });
    }
  }

  // Add marker events
  if (scoreData.markers) {
    for (const marker of scoreData.markers) {
      const tick = ratToTicks(marker.pos, ppq);
      conductorEvents.push({
        tick,
        event: {
          type: 'text',
          delta: 0,
          kind: 'marker',
          text: marker.label,
        } as TextEvent,
      });
    }
  }

  // Sort conductor events by tick
  conductorEvents.sort((a, b) => a.tick - b.tick);

  // Convert to delta times
  let lastTick = 0;
  for (const { tick, event } of conductorEvents) {
    event.delta = tick - lastTick;
    lastTick = tick;
    conductorTrack.events.push(event);
  }

  // End of track
  conductorTrack.events.push({ type: 'endOfTrack', delta: 0 } as EndOfTrackEvent);

  // Create MIDI tracks from score tracks
  const midiTracks: MidiTrack[] = [conductorTrack];
  const usedChannels = new Set<number>([9]); // Reserve channel 9 for drums
  let nextChannel = 0;

  function allocateChannel(preferDrums: boolean): number {
    if (preferDrums) return 9;

    // Find next available channel (skip 9 for drums)
    while (usedChannels.has(nextChannel)) {
      nextChannel++;
      if (nextChannel === 9) nextChannel++;
      if (nextChannel > 15) nextChannel = 0;
    }
    const ch = nextChannel;
    usedChannels.add(ch);
    nextChannel++;
    return ch;
  }

  for (const track of scoreData.tracks) {
    // Skip automation-only tracks
    if (track.role === 'Automation') continue;

    const config = findBinding(track, profileData.bindings) ?? {};
    const isDrums = track.role === 'Drums';
    const channel = config.channel ?? allocateChannel(isDrums);

    const sound = soundMap.get(track.sound);
    const drumMap = config.drumMap ?? (isDrums ? getDefaultDrumMap() : null);
    const program =
      config.program ?? (sound ? getDefaultProgram(track.sound, sound.kind) : 0);

    const midiTrack: MidiTrack = {
      name: track.name,
      events: [],
    };

    // Track name event
    midiTrack.events.push({
      type: 'trackName',
      delta: 0,
      name: track.name,
    } as TrackNameEvent);

    // Collect all events with absolute ticks and priority
    const trackEvents: Array<{ tick: number; event: MidiEvent; priority: number }> = [];

    // Add Bank Select and Program Change at start (not for drums)
    if (!isDrums) {
      if (config.bank !== undefined) {
        trackEvents.push({
          tick: 0,
          priority: 0,
          event: {
            type: 'controlChange',
            delta: 0,
            channel,
            controller: 0, // Bank Select MSB
            value: config.bank,
          } as ControlChangeEvent,
        });
      }

      trackEvents.push({
        tick: 0,
        priority: 1,
        event: {
          type: 'programChange',
          delta: 0,
          channel,
          program,
        } as ProgramChangeEvent,
      });
    }

    // Add initial pan if specified in mix
    if (track.mix?.pan !== undefined) {
      const panValue = Math.round((track.mix.pan + 1) * 63.5); // -1..1 to 0..127
      trackEvents.push({
        tick: 0,
        priority: 2,
        event: {
          type: 'controlChange',
          delta: 0,
          channel,
          controller: 10, // Pan
          value: Math.max(0, Math.min(127, panValue)),
        } as ControlChangeEvent,
      });
    }

    // Process placements
    for (const placement of track.placements) {
      const placementTick = ratToTicks(placement.at, ppq);

      for (const event of placement.clip.events) {
        if (event.type === 'note') {
          let startTick = placementTick + ratToTicks(event.start, ppq);
          let endTick = startTick + ratToTicks(event.dur, ppq);
          let velocity = Math.round((event.velocity ?? 0.8) * 127);
          const midiNote = event.pitch.midi; // Ignore cents for standard MIDI

          // Apply humanization
          if (humanize.timing > 0) {
            startTick = Math.max(0, startTick + Math.round(random.range(humanize.timing)));
            endTick = Math.max(startTick + 1, endTick + Math.round(random.range(humanize.timing)));
          }
          if (humanize.velocity > 0) {
            velocity = Math.max(1, Math.min(127, velocity + Math.round(random.range(humanize.velocity))));
          }

          trackEvents.push({
            tick: startTick,
            priority: 10,
            event: {
              type: 'noteOn',
              delta: 0,
              channel,
              note: midiNote,
              velocity,
            } as NoteOnEvent,
          });

          trackEvents.push({
            tick: endTick,
            priority: 5, // Note off before note on at same tick
            event: {
              type: 'noteOff',
              delta: 0,
              channel,
              note: midiNote,
              velocity: 0,
            } as NoteOffEvent,
          });

          // Add lyric if present
          if (event.lyric?.text) {
            trackEvents.push({
              tick: startTick,
              priority: 2,
              event: {
                type: 'text',
                delta: 0,
                kind: 'lyric',
                text: event.lyric.text,
              } as TextEvent,
            });
          }
        } else if (event.type === 'chord') {
          const baseStartTick = placementTick + ratToTicks(event.start, ppq);
          const baseEndTick = baseStartTick + ratToTicks(event.dur, ppq);
          const baseVelocity = Math.round((event.velocity ?? 0.8) * 127);

          for (let i = 0; i < event.pitches.length; i++) {
            const pitch = event.pitches[i];
            let startTick = baseStartTick;
            let endTick = baseEndTick;
            let velocity = baseVelocity;

            // Apply humanization (slightly different per note in chord for natural feel)
            if (humanize.timing > 0) {
              startTick = Math.max(0, startTick + Math.round(random.range(humanize.timing * 0.5)));
              endTick = Math.max(startTick + 1, endTick + Math.round(random.range(humanize.timing * 0.5)));
            }
            if (humanize.velocity > 0) {
              velocity = Math.max(1, Math.min(127, velocity + Math.round(random.range(humanize.velocity * 0.7))));
            }

            trackEvents.push({
              tick: startTick,
              priority: 10,
              event: {
                type: 'noteOn',
                delta: 0,
                channel,
                note: pitch.midi,
                velocity,
              } as NoteOnEvent,
            });

            trackEvents.push({
              tick: endTick,
              priority: 5,
              event: {
                type: 'noteOff',
                delta: 0,
                channel,
                note: pitch.midi,
                velocity: 0,
              } as NoteOffEvent,
            });
          }
        } else if (event.type === 'drumHit' && drumMap) {
          let startTick = placementTick + ratToTicks(event.start, ppq);
          let endTick = startTick + ratToTicks(event.dur, ppq);
          let velocity = Math.round((event.velocity ?? 0.8) * 127);
          const note = drumMap[event.key] ?? 36; // Default to kick

          // Apply humanization
          if (humanize.timing > 0) {
            startTick = Math.max(0, startTick + Math.round(random.range(humanize.timing)));
          }
          if (humanize.velocity > 0) {
            velocity = Math.max(1, Math.min(127, velocity + Math.round(random.range(humanize.velocity))));
          }

          trackEvents.push({
            tick: startTick,
            priority: 10,
            event: {
              type: 'noteOn',
              delta: 0,
              channel,
              note,
              velocity,
            } as NoteOnEvent,
          });

          trackEvents.push({
            tick: endTick,
            priority: 5,
            event: {
              type: 'noteOff',
              delta: 0,
              channel,
              note,
              velocity: 0,
            } as NoteOffEvent,
          });
        } else if (event.type === 'control') {
          const tick = placementTick + ratToTicks(event.start, ppq);

          if (event.kind === 'cc') {
            const cc = event.data.cc as number | undefined;
            const value = event.data.value as number | undefined;
            if (typeof cc === 'number' && typeof value === 'number') {
              trackEvents.push({
                tick,
                priority: 3,
                event: {
                  type: 'controlChange',
                  delta: 0,
                  channel,
                  controller: cc,
                  value: Math.max(0, Math.min(127, value)),
                } as ControlChangeEvent,
              });
            }
          }
        } else if (event.type === 'automation') {
          const automationEvents = generateAutomationEvents(event, channel, placementTick, ppq);
          for (const ae of automationEvents) {
            trackEvents.push({
              tick: ae.tick,
              priority: 3,
              event: ae.event,
            });
          }
        }
        // 'breath' events are ignored for MIDI
      }
    }

    // Sort events by tick, then by priority (lower = earlier)
    trackEvents.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      return a.priority - b.priority;
    });

    // Convert to delta times
    lastTick = 0;
    for (const { tick, event } of trackEvents) {
      event.delta = tick - lastTick;
      lastTick = tick;
      midiTrack.events.push(event);
    }

    // End of track
    midiTrack.events.push({ type: 'endOfTrack', delta: 0 } as EndOfTrackEvent);

    midiTracks.push(midiTrack);
  }

  // Build MIDI file
  const midiFile: MidiFile = {
    ppq,
    tracks: midiTracks,
  };

  // Write file
  const midiBytes = writeMidiFile(midiFile);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, midiBytes);

  return [
    {
      kind: 'file',
      path: outputPath,
      mediaType: 'audio/midi',
      description: `MIDI file with ${midiTracks.length} tracks (PPQ: ${ppq})`,
    },
  ];
}
