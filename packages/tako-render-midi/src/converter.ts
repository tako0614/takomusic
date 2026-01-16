import MidiWriter from 'midi-writer-js';
import type {
  ScoreIR,
  Track,
  Placement,
  Event,
  NoteEvent,
  ChordEvent,
  DrumHitEvent,
  ControlEvent,
  AutomationEvent,
  GraceNoteEvent,
  GlissandoEvent,
  Rat,
  Pitch,
  TempoEvent,
  MeterEvent,
  RenderProfile,
  Binding,
  BindingConfig,
  Diagnostic,
} from './types.js';

// Standard GM drum map
const GM_DRUM_MAP: Record<string, number> = {
  kick: 36,
  bass: 36,
  snare: 38,
  rimshot: 37,
  clap: 39,
  hhc: 42,
  hihat_closed: 42,
  hho: 46,
  hihat_open: 46,
  hihat_pedal: 44,
  tom_low: 45,
  tom_mid: 47,
  tom_high: 50,
  crash: 49,
  crash2: 57,
  ride: 51,
  ride_bell: 53,
  china: 52,
  splash: 55,
  cowbell: 56,
  tambourine: 54,
  clave: 75,
  woodblock_high: 76,
  woodblock_low: 77,
  shaker: 70,
  cabasa: 69,
  maracas: 70,
  triangle_open: 81,
  triangle_mute: 80,
};

// Convert rational number to ticks (based on PPQ)
function ratToTicks(rat: Rat, ppq: number): number {
  // Rational is in beats (quarter notes)
  // ticks = rat * ppq * 4 (because rat is in whole notes / 4)
  // Actually, rat is typically expressed as n/d where 1/4 = quarter note
  // So ticks = (n/d) * ppq
  return Math.round((rat.n / rat.d) * ppq * 4);
}

// Convert velocity (0-1) to MIDI velocity (1-127)
function velocityToMidi(vel?: number): number {
  const v = vel ?? 0.75;
  return Math.max(1, Math.min(127, Math.round(v * 127)));
}

// Convert pitch to MIDI note number, applying cents if possible
function pitchToMidi(pitch: Pitch): number {
  // Basic MIDI pitch
  let midi = pitch.midi;

  // For standard MIDI, we can't represent microtones directly
  // Apply cents as pitch bend would require per-note channel allocation
  // For now, round to nearest semitone
  if (pitch.cents && Math.abs(pitch.cents) >= 50) {
    midi += Math.round(pitch.cents / 100);
  }

  return Math.max(0, Math.min(127, midi));
}

// Resolve binding for a track
function resolveBinding(
  track: Track,
  bindings: Binding[]
): BindingConfig | null {
  for (const binding of bindings) {
    const sel = binding.selector;
    if (sel.trackName !== undefined && sel.trackName !== track.name) continue;
    if (sel.sound !== undefined && sel.sound !== track.sound) continue;
    if (sel.role !== undefined && sel.role !== track.role) continue;
    return binding.config;
  }
  return null;
}

// Get drum MIDI note from key
function getDrumNote(
  key: string,
  drumMap?: Record<string, number>
): number {
  // Check custom drum map first
  if (drumMap && drumMap[key] !== undefined) {
    return drumMap[key];
  }
  // Fall back to GM drum map
  if (GM_DRUM_MAP[key] !== undefined) {
    return GM_DRUM_MAP[key];
  }
  // Default to kick if unknown
  return 36;
}

// Build tempo map for time calculations
interface TempoMapEntry {
  tickStart: number;
  beatStart: number;
  bpm: number;
  ticksPerBeat: number;
}

function buildTempoMap(
  tempoEvents: TempoEvent[],
  ppq: number
): TempoMapEntry[] {
  const entries: TempoMapEntry[] = [];

  // Sort by position
  const sorted = [...tempoEvents].sort((a, b) => {
    return a.at.n / a.at.d - b.at.n / b.at.d;
  });

  let currentTick = 0;
  let currentBeat = 0;

  for (const event of sorted) {
    const eventBeat = (event.at.n / event.at.d) * 4; // Convert to quarter notes

    if (entries.length > 0) {
      // Calculate ticks from last entry
      const last = entries[entries.length - 1];
      const beatDelta = eventBeat - last.beatStart;
      currentTick = last.tickStart + Math.round(beatDelta * ppq);
    }

    // Calculate effective BPM (normalize to quarter note)
    const unitBeats = (event.unit.n / event.unit.d) * 4;
    const effectiveBpm = event.bpm * unitBeats;

    entries.push({
      tickStart: currentTick,
      beatStart: eventBeat,
      bpm: effectiveBpm,
      ticksPerBeat: ppq,
    });

    currentBeat = eventBeat;
  }

  // If no tempo events, add default
  if (entries.length === 0) {
    entries.push({
      tickStart: 0,
      beatStart: 0,
      bpm: 120,
      ticksPerBeat: ppq,
    });
  }

  return entries;
}

// Convert beat position to tick
function beatToTick(
  beat: number,
  tempoMap: TempoMapEntry[],
  ppq: number
): number {
  // Find the tempo entry that applies
  let entry = tempoMap[0];
  for (const e of tempoMap) {
    if (e.beatStart <= beat) {
      entry = e;
    } else {
      break;
    }
  }

  const beatDelta = beat - entry.beatStart;
  return entry.tickStart + Math.round(beatDelta * ppq);
}

export interface ConversionResult {
  midi: Uint8Array;
  diagnostics: Diagnostic[];
}

export function convertToMidi(
  score: ScoreIR,
  profile: RenderProfile
): ConversionResult {
  const diagnostics: Diagnostic[] = [];
  const ppq = 480; // Pulses per quarter note

  // Build tempo map
  const tempoMap = buildTempoMap(score.tempoMap, ppq);

  // Create MIDI tracks
  const midiTracks: MidiWriter.Track[] = [];

  // Track 0: Tempo and meta events
  const metaTrack = new MidiWriter.Track();

  // Set track name
  if (score.meta.title) {
    metaTrack.addTrackName(score.meta.title);
  }

  // Add tempo events
  for (const tempo of tempoMap) {
    metaTrack.setTempo(tempo.bpm, tempo.tickStart);
  }

  // Add time signature events
  for (const meter of score.meterMap) {
    const tick = ratToTicks(meter.at, ppq);
    metaTrack.setTimeSignature(
      meter.numerator,
      meter.denominator,
      undefined,
      tick
    );
  }

  midiTracks.push(metaTrack);

  // Process each track
  let channelCounter = 0;
  const usedChannels = new Set<number>();

  for (const track of score.tracks) {
    // Resolve binding
    const config = resolveBinding(track, profile.bindings);

    if (!config) {
      const degradePolicy = profile.degradePolicy ?? 'Error';
      const diagnostic: Diagnostic = {
        level: degradePolicy === 'Error' ? 'error' : 'warning',
        code: 'UNBOUND_TRACK',
        message: `No binding found for track '${track.name}'`,
        location: { trackName: track.name },
      };
      diagnostics.push(diagnostic);

      if (degradePolicy === 'Error') {
        continue;
      }
      if (degradePolicy === 'Drop') {
        continue;
      }
      // Approx: use defaults
    }

    // Determine channel
    let channel: number;
    if (config?.channel !== undefined) {
      channel = config.channel;
    } else if (track.role === 'Drums') {
      channel = 10; // GM drum channel
    } else {
      // Find next available channel (skip 10 for drums)
      channel = channelCounter;
      while (channel === 9 || usedChannels.has(channel)) {
        channel++;
        if (channel > 15) channel = 0;
      }
      channelCounter = channel + 1;
    }
    usedChannels.add(channel);

    // Create MIDI track
    const midiTrack = new MidiWriter.Track();
    midiTrack.addTrackName(track.name);

    // Set program change if specified
    if (config?.program !== undefined && track.role !== 'Drums') {
      midiTrack.addEvent(
        new MidiWriter.ProgramChangeEvent({
          instrument: config.program,
          channel: channel + 1, // midi-writer-js uses 1-16
        })
      );
    }

    // Process placements
    for (let pIdx = 0; pIdx < track.placements.length; pIdx++) {
      const placement = track.placements[pIdx];
      const placementOffset = (placement.at.n / placement.at.d) * 4; // In quarter notes

      // Process events
      for (let eIdx = 0; eIdx < placement.clip.events.length; eIdx++) {
        const event = placement.clip.events[eIdx];

        try {
          processEvent(
            event,
            midiTrack,
            channel,
            placementOffset,
            tempoMap,
            ppq,
            track,
            config,
            diagnostics,
            pIdx,
            eIdx
          );
        } catch (err) {
          diagnostics.push({
            level: 'warning',
            code: 'EVENT_CONVERSION_ERROR',
            message: `Failed to convert event: ${err}`,
            location: {
              trackName: track.name,
              placementIndex: pIdx,
              eventIndex: eIdx,
            },
          });
        }
      }
    }

    midiTracks.push(midiTrack);
  }

  // Create MIDI writer and build file
  const writer = new MidiWriter.Writer(midiTracks);

  return {
    midi: writer.buildFile(),
    diagnostics,
  };
}

function processEvent(
  event: Event,
  midiTrack: MidiWriter.Track,
  channel: number,
  placementOffset: number,
  tempoMap: TempoMapEntry[],
  ppq: number,
  track: Track,
  config: BindingConfig | null,
  diagnostics: Diagnostic[],
  pIdx: number,
  eIdx: number
): void {
  const ch = channel + 1; // midi-writer-js uses 1-16

  switch (event.type) {
    case 'note': {
      const noteEvent = event as NoteEvent;
      const startBeat =
        placementOffset + (noteEvent.start.n / noteEvent.start.d) * 4;
      const durTicks = ratToTicks(noteEvent.dur, ppq);
      const startTick = beatToTick(startBeat, tempoMap, ppq);

      midiTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [pitchToMidi(noteEvent.pitch)],
          duration: `T${durTicks}`,
          velocity: velocityToMidi(noteEvent.velocity),
          channel: ch,
          startTick: startTick,
        })
      );
      break;
    }

    case 'chord': {
      const chordEvent = event as ChordEvent;
      const startBeat =
        placementOffset + (chordEvent.start.n / chordEvent.start.d) * 4;
      const durTicks = ratToTicks(chordEvent.dur, ppq);
      const startTick = beatToTick(startBeat, tempoMap, ppq);

      const pitches = chordEvent.pitches.map(pitchToMidi);

      midiTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: pitches,
          duration: `T${durTicks}`,
          velocity: velocityToMidi(chordEvent.velocity),
          channel: ch,
          startTick: startTick,
        })
      );
      break;
    }

    case 'drumHit': {
      const drumEvent = event as DrumHitEvent;
      const startBeat =
        placementOffset + (drumEvent.start.n / drumEvent.start.d) * 4;
      const durTicks = ratToTicks(drumEvent.dur, ppq);
      const startTick = beatToTick(startBeat, tempoMap, ppq);

      const note = getDrumNote(drumEvent.key, config?.drumMap);

      midiTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [note],
          duration: `T${durTicks}`,
          velocity: velocityToMidi(drumEvent.velocity),
          channel: ch,
          startTick: startTick,
        })
      );
      break;
    }

    case 'control': {
      const ctrlEvent = event as ControlEvent;
      if (ctrlEvent.kind === 'cc') {
        const startBeat =
          placementOffset + (ctrlEvent.start.n / ctrlEvent.start.d) * 4;
        const startTick = beatToTick(startBeat, tempoMap, ppq);

        const ccNum = ctrlEvent.data.number as number;
        const ccVal = Math.round((ctrlEvent.data.value as number) * 127);

        midiTrack.addEvent(
          new MidiWriter.ControllerChangeEvent({
            controllerNumber: ccNum,
            controllerValue: ccVal,
            channel: ch,
            tick: startTick,
          })
        );
      }
      break;
    }

    case 'automation': {
      const autoEvent = event as AutomationEvent;
      // Generate CC messages for automation curves
      // For now, only support common params mapped to CC
      const paramToCc: Record<string, number> = {
        volume: 7,
        pan: 10,
        expression: 11,
        modulation: 1,
        sustain: 64,
        brightness: 74,
      };

      const ccNum = paramToCc[autoEvent.param];
      if (ccNum === undefined) {
        diagnostics.push({
          level: 'warning',
          code: 'UNSUPPORTED_PARAM',
          message: `Automation param '${autoEvent.param}' not mapped to CC`,
          location: {
            trackName: track.name,
            placementIndex: pIdx,
            eventIndex: eIdx,
          },
        });
        break;
      }

      // Interpolate curve points
      const startBeat =
        placementOffset + (autoEvent.start.n / autoEvent.start.d) * 4;
      const endBeat =
        placementOffset + (autoEvent.end.n / autoEvent.end.d) * 4;
      const beatRange = endBeat - startBeat;

      for (const point of autoEvent.curve.points) {
        const beat = startBeat + point.t * beatRange;
        const tick = beatToTick(beat, tempoMap, ppq);
        const value = Math.round(Math.max(0, Math.min(1, point.v)) * 127);

        midiTrack.addEvent(
          new MidiWriter.ControllerChangeEvent({
            controllerNumber: ccNum,
            controllerValue: value,
            channel: ch,
            tick: tick,
          })
        );
      }
      break;
    }

    case 'graceNote': {
      const graceEvent = event as GraceNoteEvent;
      const startBeat =
        placementOffset + (graceEvent.start.n / graceEvent.start.d) * 4;

      // Calculate grace note timing
      // Default: each grace note gets 1/16 of a beat
      const graceDur = 1 / 16;
      let currentBeat = startBeat;

      if (graceEvent.stealFrom === 'main') {
        // Grace notes come at the start, main note duration is reduced
        for (const grace of graceEvent.graces) {
          const tick = beatToTick(currentBeat, tempoMap, ppq);
          const durTicks = Math.round(graceDur * ppq);

          midiTrack.addEvent(
            new MidiWriter.NoteEvent({
              pitch: [pitchToMidi(grace.pitch)],
              duration: `T${durTicks}`,
              velocity: velocityToMidi(graceEvent.velocity),
              channel: ch,
              startTick: tick,
            })
          );

          currentBeat += graceDur;
        }

        // Main note
        const mainStartTick = beatToTick(currentBeat, tempoMap, ppq);
        const mainDurBeats = (graceEvent.mainDur.n / graceEvent.mainDur.d) * 4;
        const adjustedDur = mainDurBeats - graceEvent.graces.length * graceDur;
        const mainDurTicks = Math.round(adjustedDur * ppq);

        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [pitchToMidi(graceEvent.mainPitch)],
            duration: `T${mainDurTicks}`,
            velocity: velocityToMidi(graceEvent.velocity),
            channel: ch,
            startTick: mainStartTick,
          })
        );
      } else {
        // stealFrom === 'previous': grace notes before the beat
        currentBeat = startBeat - graceEvent.graces.length * graceDur;

        for (const grace of graceEvent.graces) {
          const tick = beatToTick(currentBeat, tempoMap, ppq);
          const durTicks = Math.round(graceDur * ppq);

          midiTrack.addEvent(
            new MidiWriter.NoteEvent({
              pitch: [pitchToMidi(grace.pitch)],
              duration: `T${durTicks}`,
              velocity: velocityToMidi(graceEvent.velocity),
              channel: ch,
              startTick: tick,
            })
          );

          currentBeat += graceDur;
        }

        // Main note at original position
        const mainStartTick = beatToTick(startBeat, tempoMap, ppq);
        const mainDurTicks = ratToTicks(graceEvent.mainDur, ppq);

        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [pitchToMidi(graceEvent.mainPitch)],
            duration: `T${mainDurTicks}`,
            velocity: velocityToMidi(graceEvent.velocity),
            channel: ch,
            startTick: mainStartTick,
          })
        );
      }
      break;
    }

    case 'glissando': {
      const glissEvent = event as GlissandoEvent;
      const startBeat =
        placementOffset + (glissEvent.start.n / glissEvent.start.d) * 4;
      const endBeat =
        placementOffset + (glissEvent.end.n / glissEvent.end.d) * 4;
      const durBeats = endBeat - startBeat;

      const fromMidi = pitchToMidi(glissEvent.fromPitch);
      const toMidi = pitchToMidi(glissEvent.toPitch);

      if (glissEvent.style === 'discrete') {
        // Discrete: play individual chromatic notes
        const steps = Math.abs(toMidi - fromMidi);
        const direction = toMidi > fromMidi ? 1 : -1;
        const noteDur = durBeats / (steps + 1);

        for (let i = 0; i <= steps; i++) {
          const pitch = fromMidi + i * direction;
          const beat = startBeat + i * noteDur;
          const tick = beatToTick(beat, tempoMap, ppq);
          const durTicks = Math.round(noteDur * ppq);

          midiTrack.addEvent(
            new MidiWriter.NoteEvent({
              pitch: [pitch],
              duration: `T${durTicks}`,
              velocity: velocityToMidi(glissEvent.velocity),
              channel: ch,
              startTick: tick,
            })
          );
        }
      } else {
        // Continuous: use pitch bend
        // This is more complex - play a single note with pitch bend automation
        const startTick = beatToTick(startBeat, tempoMap, ppq);
        const durTicks = Math.round(durBeats * ppq);

        // Start note
        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [fromMidi],
            duration: `T${durTicks}`,
            velocity: velocityToMidi(glissEvent.velocity),
            channel: ch,
            startTick: startTick,
          })
        );

        // Add pitch bend events
        const bendRange = 2; // semitones (standard pitch bend range)
        const semitoneDiff = toMidi - fromMidi;
        const bendSteps = Math.ceil(durTicks / 20); // Bend event every ~20 ticks

        for (let i = 0; i <= bendSteps; i++) {
          const t = i / bendSteps;
          const currentSemitones = semitoneDiff * t;
          // Convert to pitch bend value: 0 = -2 semitones, 8192 = center, 16383 = +2 semitones
          const bendValue = Math.round(
            8192 + (currentSemitones / bendRange) * 8191
          );
          const clampedBend = Math.max(0, Math.min(16383, bendValue));

          // midi-writer-js doesn't have direct pitch bend support
          // We'll add a diagnostic for now
          if (i === 0) {
            diagnostics.push({
              level: 'info',
              code: 'PITCH_BEND_APPROXIMATION',
              message: `Continuous glissando approximated; pitch bend not fully supported`,
              location: {
                trackName: track.name,
                placementIndex: pIdx,
                eventIndex: eIdx,
              },
            });
          }
        }
      }
      break;
    }

    case 'marker':
      // Markers are meta events, could add as text events
      // For now, skip
      break;

    case 'breath':
      // Breath events are vocal-specific, no direct MIDI equivalent
      // Could map to expression CC
      break;

    default:
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_EVENT',
        message: `Event type '${(event as Event).type}' not supported`,
        location: {
          trackName: track.name,
          placementIndex: pIdx,
          eventIndex: eIdx,
        },
      });
  }
}
