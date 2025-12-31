/**
 * IR Validation for MIDI Renderer
 *
 * Validates ScoreIR against render profile for MIDI output compatibility.
 */

import * as fs from 'node:fs';
import type { Rat } from './ratToTicks.js';

// Diagnostic types from RENDERING.md protocol
export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code?: string;
  message: string;
  location?: DiagnosticLocation;
  context?: Record<string, unknown>;
}

export interface DiagnosticLocation {
  trackName?: string;
  placementIndex?: number;
  eventIndex?: number;
  pos?: Rat;
}

// ScoreIR types (subset needed for validation)
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

interface NoteEvent {
  type: 'note';
  start: Rat;
  dur: Rat;
  pitch: { midi: number; cents: number };
  velocity?: number;
  techniques?: string[];
  lyric?: { kind: string; text?: string };
}

interface ChordEvent {
  type: 'chord';
  start: Rat;
  dur: Rat;
  pitches: Array<{ midi: number; cents: number }>;
  velocity?: number;
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
  curve: { kind: string; points: Array<{ t: number; v: number }> };
}

// Render profile types
export interface RenderProfile {
  tako?: {
    profileVersion: number;
  };
  profileName?: string;
  renderer: string;
  output: {
    path: string;
    ppq?: number;
  };
  degradePolicy?: 'Error' | 'Drop' | 'Approx';
  humanize?: {
    enabled?: boolean;
    timing?: number;
    velocity?: number;
  };
  bindings: Array<{
    selector: {
      trackName?: string;
      role?: string;
      sound?: string;
    };
    config: {
      channel?: number;
      program?: number;
      bank?: number;
      drumMap?: Record<string, number>;
    };
  }>;
}

// Binding selector matching (from RENDERING.md)
interface BindingSelector {
  trackName?: string;
  role?: string;
  sound?: string;
}

function matchesSelector(track: Track, selector: BindingSelector): boolean {
  if (selector.trackName !== undefined && track.name !== selector.trackName) {
    return false;
  }
  if (selector.role !== undefined && track.role !== selector.role) {
    return false;
  }
  if (selector.sound !== undefined && track.sound !== selector.sound) {
    return false;
  }
  return true;
}

function findBinding(
  track: Track,
  bindings: RenderProfile['bindings']
): RenderProfile['bindings'][0]['config'] | null {
  for (const binding of bindings) {
    if (matchesSelector(track, binding.selector)) {
      return binding.config;
    }
  }
  return null;
}

// Supported automation parameters
const SUPPORTED_PARAMS = new Set([
  'midi.pitchBend',
  'pitchBend',
  'modulation',
  'volume',
  'pan',
  'expression',
  'sustain',
  'filterCutoff',
  'filterResonance',
]);

// Check if param matches midi.cc.N pattern
function isSupportedParam(param: string): boolean {
  if (SUPPORTED_PARAMS.has(param)) return true;
  if (/^midi\.cc\.\d+$/.test(param)) return true;
  return false;
}

// Supported techniques (basic MIDI can handle)
const SUPPORTED_TECHNIQUES = new Set([
  'legato',
  'staccato',
  'accent',
  'tenuto',
  'marcato',
]);

// Default drum map for validation
const DEFAULT_DRUM_KEYS = new Set([
  'kick',
  'snare',
  'hhc',
  'hho',
  'tom1',
  'tom2',
  'tom3',
  'tom4',
  'crash',
  'ride',
  'rimshot',
  'clap',
  'sidestick',
  'lowTom',
  'midTom',
  'highTom',
  'openHat',
  'closedHat',
  'pedalHat',
  'crashCymbal',
  'rideCymbal',
  'splashCymbal',
  'chinaCymbal',
  'cowbell',
  'tambourine',
  'woodblock',
]);

/**
 * Validate ScoreIR against render profile
 */
export function validateScore(score: ScoreIR, profile: RenderProfile): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const degradePolicy = profile.degradePolicy ?? 'Error';

  // Check IR version
  if (score.tako?.irVersion !== 4) {
    diagnostics.push({
      level: 'error',
      code: 'UNSUPPORTED_IR_VERSION',
      message: `Unsupported IR version: ${score.tako?.irVersion}. Expected version 4.`,
    });
  }

  // Check tempo map
  if (!score.tempoMap || score.tempoMap.length === 0) {
    diagnostics.push({
      level: 'warning',
      code: 'NO_TEMPO',
      message: 'No tempo events found, using default 120 BPM',
    });
  }

  // Check meter map
  if (!score.meterMap || score.meterMap.length === 0) {
    diagnostics.push({
      level: 'warning',
      code: 'NO_METER',
      message: 'No meter events found, using default 4/4',
    });
  }

  // Build sound map for validation
  const soundMap = new Map<string, SoundDecl>();
  for (const sound of score.sounds) {
    soundMap.set(sound.id, sound);
  }

  // Check each track
  for (const track of score.tracks) {
    // Check binding
    const config = findBinding(track, profile.bindings);
    if (!config) {
      const level = degradePolicy === 'Error' ? 'error' : 'warning';
      diagnostics.push({
        level,
        code: 'UNBOUND_TRACK',
        message: `No binding found for track '${track.name}'`,
        location: { trackName: track.name },
      });
    }

    // Check sound reference
    const sound = soundMap.get(track.sound);
    if (!sound) {
      diagnostics.push({
        level: 'error',
        code: 'UNKNOWN_SOUND',
        message: `Track '${track.name}' references unknown sound '${track.sound}'`,
        location: { trackName: track.name },
      });
    }

    // Check role compatibility
    if (track.role === 'Vocal') {
      diagnostics.push({
        level: 'info',
        code: 'VOCAL_AS_NOTES',
        message: `Vocal track '${track.name}' will be rendered as MIDI notes (no synthesis)`,
        location: { trackName: track.name },
      });
    }

    if (track.role === 'Automation') {
      diagnostics.push({
        level: 'info',
        code: 'AUTOMATION_TRACK',
        message: `Automation track '${track.name}' will be skipped (automation embedded in target tracks)`,
        location: { trackName: track.name },
      });
      continue; // Skip further validation for automation tracks
    }

    // Validate events
    for (let pIdx = 0; pIdx < track.placements.length; pIdx++) {
      const placement = track.placements[pIdx];

      for (let eIdx = 0; eIdx < placement.clip.events.length; eIdx++) {
        const event = placement.clip.events[eIdx];

        // Check pitch range for notes
        if (event.type === 'note') {
          const midi = event.pitch.midi;
          if (midi < 0 || midi > 127) {
            diagnostics.push({
              level: 'error',
              code: 'PITCH_OUT_OF_RANGE',
              message: `Note pitch ${midi} is outside MIDI range (0-127)`,
              location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
            });
          }

          // Check microtonal
          if (event.pitch.cents !== 0) {
            diagnostics.push({
              level: degradePolicy === 'Error' ? 'error' : 'warning',
              code: 'MICROTONAL_UNSUPPORTED',
              message: `Microtonal pitch (${event.pitch.cents} cents) will be rounded to nearest semitone`,
              location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
            });
          }

          // Check techniques
          if (event.techniques) {
            for (const tech of event.techniques) {
              if (!SUPPORTED_TECHNIQUES.has(tech)) {
                diagnostics.push({
                  level: degradePolicy === 'Error' ? 'error' : 'warning',
                  code: 'UNSUPPORTED_TECHNIQUE',
                  message: `Technique '${tech}' is not supported, will be ignored`,
                  location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
                  context: { technique: tech },
                });
              }
            }
          }
        }

        // Check chord pitches
        if (event.type === 'chord') {
          for (const pitch of event.pitches) {
            if (pitch.midi < 0 || pitch.midi > 127) {
              diagnostics.push({
                level: 'error',
                code: 'PITCH_OUT_OF_RANGE',
                message: `Chord note pitch ${pitch.midi} is outside MIDI range (0-127)`,
                location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
              });
            }
          }
        }

        // Check drum keys
        if (event.type === 'drumHit') {
          const drumMap = config?.drumMap;
          const keyKnown = drumMap
            ? event.key in drumMap
            : DEFAULT_DRUM_KEYS.has(event.key);

          if (!keyKnown) {
            diagnostics.push({
              level: degradePolicy === 'Error' ? 'error' : 'warning',
              code: 'UNKNOWN_DRUM_KEY',
              message: `Unknown drum key '${event.key}', will use default mapping`,
              location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
              context: { key: event.key },
            });
          }
        }

        // Check breath events
        if (event.type === 'breath') {
          diagnostics.push({
            level: 'info',
            code: 'BREATH_IGNORED',
            message: 'Breath events are not rendered to MIDI',
            location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
          });
        }

        // Check automation params
        if (event.type === 'automation') {
          if (!isSupportedParam(event.param)) {
            diagnostics.push({
              level: degradePolicy === 'Error' ? 'error' : 'warning',
              code: 'UNSUPPORTED_PARAM',
              message: `Automation param '${event.param}' is not supported`,
              location: { trackName: track.name, placementIndex: pIdx, eventIndex: eIdx },
              context: { param: event.param },
            });
          }
        }
      }
    }
  }

  // Check humanization settings
  if (profile.humanize?.enabled) {
    diagnostics.push({
      level: 'info',
      code: 'HUMANIZE_ENABLED',
      message: `Humanization enabled: timing=${profile.humanize.timing ?? 5}, velocity=${profile.humanize.velocity ?? 5}`,
    });
  }

  return diagnostics;
}

/**
 * Validate from file paths (CLI entry point)
 */
export function validate(scorePath: string, profilePath: string): Diagnostic[] {
  try {
    const scoreData = JSON.parse(fs.readFileSync(scorePath, 'utf-8')) as ScoreIR;
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as RenderProfile;

    return validateScore(scoreData, profileData);
  } catch (err) {
    return [
      {
        level: 'error',
        code: 'FILE_READ_ERROR',
        message: `Failed to read files: ${(err as Error).message}`,
      },
    ];
  }
}
