/**
 * MIDI Import - Convert Standard MIDI Files to TakoMusic Score IR
 */

import type { ScoreIR, Track, Clip, Event, NoteEvent, ChordEvent, DrumHitEvent, ControlEvent } from '../ir.js';
import type { Rat } from '../rat.js';
import type { Pitch } from '../pitch.js';

// MIDI parsing types
interface MidiHeader {
  format: number;
  numTracks: number;
  ticksPerQuarter: number;
}

interface MidiEvent {
  deltaTime: number;
  absoluteTime: number;
  type: string;
  channel?: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  tempo?: number;
  numerator?: number;
  denominator?: number;
  text?: string;
  data?: Uint8Array;
}

interface MidiTrack {
  name?: string;
  events: MidiEvent[];
}

interface ParsedMidi {
  header: MidiHeader;
  tracks: MidiTrack[];
}

// Read variable-length quantity
function readVLQ(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let bytes = 0;
  let byte: number;

  do {
    byte = data[offset + bytes];
    value = (value << 7) | (byte & 0x7f);
    bytes++;
  } while (byte & 0x80 && bytes < 4);

  return [value, bytes];
}

// Read big-endian 16-bit integer
function readUint16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

// Read big-endian 32-bit integer
function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  );
}

// Read big-endian 24-bit integer
function readUint24BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
}

// Parse MIDI file
function parseMidi(data: Uint8Array): ParsedMidi {
  let offset = 0;

  // Check MThd header
  const headerChunk = String.fromCharCode(
    data[0],
    data[1],
    data[2],
    data[3]
  );
  if (headerChunk !== 'MThd') {
    throw new Error('Invalid MIDI file: missing MThd header');
  }
  offset += 4;

  const headerLength = readUint32BE(data, offset);
  offset += 4;

  const format = readUint16BE(data, offset);
  offset += 2;

  const numTracks = readUint16BE(data, offset);
  offset += 2;

  const division = readUint16BE(data, offset);
  offset += 2;

  // Skip any extra header bytes
  offset += headerLength - 6;

  let ticksPerQuarter: number;
  if (division & 0x8000) {
    // SMPTE format - convert to approximate ticks per quarter
    const fps = -(((division >> 8) & 0xff) << 24 >> 24);
    const tpf = division & 0xff;
    ticksPerQuarter = fps * tpf; // Approximate
  } else {
    ticksPerQuarter = division;
  }

  const header: MidiHeader = {
    format,
    numTracks,
    ticksPerQuarter,
  };

  const tracks: MidiTrack[] = [];

  // Parse tracks
  for (let t = 0; t < numTracks; t++) {
    // Check MTrk header
    const trackChunk = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    );
    if (trackChunk !== 'MTrk') {
      throw new Error(`Invalid MIDI file: expected MTrk at track ${t}`);
    }
    offset += 4;

    const trackLength = readUint32BE(data, offset);
    offset += 4;

    const trackEnd = offset + trackLength;
    const events: MidiEvent[] = [];
    let absoluteTime = 0;
    let runningStatus = 0;
    let trackName: string | undefined;

    while (offset < trackEnd) {
      // Read delta time
      const [deltaTime, vlqBytes] = readVLQ(data, offset);
      offset += vlqBytes;
      absoluteTime += deltaTime;

      // Read status byte
      let status = data[offset];

      // Handle running status
      if (status < 0x80) {
        status = runningStatus;
      } else {
        offset++;
        if (status < 0xf0) {
          runningStatus = status;
        }
      }

      const eventType = status >> 4;
      const channel = status & 0x0f;

      const event: MidiEvent = {
        deltaTime,
        absoluteTime,
        type: 'unknown',
      };

      switch (eventType) {
        case 0x8: // Note Off
          event.type = 'noteOff';
          event.channel = channel;
          event.note = data[offset++];
          event.velocity = data[offset++];
          break;

        case 0x9: // Note On
          event.type = 'noteOn';
          event.channel = channel;
          event.note = data[offset++];
          event.velocity = data[offset++];
          // Note On with velocity 0 is Note Off
          if (event.velocity === 0) {
            event.type = 'noteOff';
          }
          break;

        case 0xa: // Polyphonic Key Pressure
          event.type = 'polyPressure';
          event.channel = channel;
          event.note = data[offset++];
          event.value = data[offset++];
          break;

        case 0xb: // Control Change
          event.type = 'controlChange';
          event.channel = channel;
          event.controller = data[offset++];
          event.value = data[offset++];
          break;

        case 0xc: // Program Change
          event.type = 'programChange';
          event.channel = channel;
          event.value = data[offset++];
          break;

        case 0xd: // Channel Pressure
          event.type = 'channelPressure';
          event.channel = channel;
          event.value = data[offset++];
          break;

        case 0xe: // Pitch Bend
          event.type = 'pitchBend';
          event.channel = channel;
          event.value = data[offset++] | (data[offset++] << 7);
          break;

        case 0xf: // System / Meta
          if (status === 0xff) {
            // Meta event
            const metaType = data[offset++];
            const [metaLength, metaVlqBytes] = readVLQ(data, offset);
            offset += metaVlqBytes;
            const metaData = data.slice(offset, offset + metaLength);
            offset += metaLength;

            switch (metaType) {
              case 0x00: // Sequence Number
                event.type = 'sequenceNumber';
                break;

              case 0x01: // Text Event
                event.type = 'text';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x02: // Copyright Notice
                event.type = 'copyright';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x03: // Track Name
                event.type = 'trackName';
                event.text = new TextDecoder().decode(metaData);
                trackName = event.text;
                break;

              case 0x04: // Instrument Name
                event.type = 'instrumentName';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x05: // Lyric
                event.type = 'lyric';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x06: // Marker
                event.type = 'marker';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x07: // Cue Point
                event.type = 'cuePoint';
                event.text = new TextDecoder().decode(metaData);
                break;

              case 0x20: // MIDI Channel Prefix
                event.type = 'channelPrefix';
                event.channel = metaData[0];
                break;

              case 0x2f: // End of Track
                event.type = 'endOfTrack';
                break;

              case 0x51: // Set Tempo
                event.type = 'setTempo';
                event.tempo = readUint24BE(metaData, 0);
                break;

              case 0x54: // SMPTE Offset
                event.type = 'smpteOffset';
                break;

              case 0x58: // Time Signature
                event.type = 'timeSignature';
                event.numerator = metaData[0];
                event.denominator = Math.pow(2, metaData[1]);
                break;

              case 0x59: // Key Signature
                event.type = 'keySignature';
                break;

              case 0x7f: // Sequencer-Specific
                event.type = 'sequencerSpecific';
                event.data = metaData;
                break;

              default:
                event.type = 'metaUnknown';
                event.data = metaData;
            }
          } else if (status === 0xf0 || status === 0xf7) {
            // SysEx
            const [sysexLength, sysexVlqBytes] = readVLQ(data, offset);
            offset += sysexVlqBytes;
            event.type = 'sysex';
            event.data = data.slice(offset, offset + sysexLength);
            offset += sysexLength;
          } else {
            // Other system message
            event.type = 'systemMessage';
          }
          break;
      }

      events.push(event);
    }

    tracks.push({
      name: trackName,
      events,
    });
  }

  return { header, tracks };
}

// Convert ticks to rational number (in quarter notes)
function ticksToRat(ticks: number, ppq: number): Rat {
  // Simplify the fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const n = ticks;
  const d = ppq;
  const g = gcd(Math.abs(n), d);
  return { n: n / g, d: d / g };
}

// Convert MIDI note number to Pitch
function midiToPitch(midiNote: number): Pitch {
  return { midi: midiNote, cents: 0 };
}

// Reverse drum map (MIDI note to key name)
const REVERSE_DRUM_MAP: Record<number, string> = {
  35: 'kick2',
  36: 'kick',
  37: 'rimshot',
  38: 'snare',
  39: 'clap',
  40: 'snare2',
  41: 'tom_floor_low',
  42: 'hhc',
  43: 'tom_floor_high',
  44: 'hihat_pedal',
  45: 'tom_low',
  46: 'hho',
  47: 'tom_mid_low',
  48: 'tom_mid',
  49: 'crash',
  50: 'tom_high',
  51: 'ride',
  52: 'china',
  53: 'ride_bell',
  54: 'tambourine',
  55: 'splash',
  56: 'cowbell',
  57: 'crash2',
  69: 'cabasa',
  70: 'maracas',
  75: 'clave',
  76: 'woodblock_high',
  77: 'woodblock_low',
  80: 'triangle_mute',
  81: 'triangle_open',
};

export interface MidiImportOptions {
  /** Quantize notes to nearest subdivision (e.g., 1/16 for sixteenth notes) */
  quantize?: Rat;
  /** Merge notes with same start and duration into chords */
  mergeChords?: boolean;
  /** Treat channel 10 (9 in 0-indexed) as drums */
  drumChannel?: number;
}

/**
 * Import a MIDI file and convert it to TakoMusic Score IR
 */
export function midiToScoreIR(
  midiData: Uint8Array,
  options: MidiImportOptions = {}
): ScoreIR {
  const parsed = parseMidi(midiData);
  const ppq = parsed.header.ticksPerQuarter;

  const drumChannel = options.drumChannel ?? 9; // MIDI channel 10 (0-indexed: 9)
  const mergeChords = options.mergeChords ?? true;

  // Extract tempo and meter events from track 0 (or first track with them)
  const tempoEvents: { at: Rat; bpm: number; unit: Rat }[] = [];
  const meterEvents: { at: Rat; numerator: number; denominator: number }[] = [];
  let title: string | undefined;
  let copyright: string | undefined;

  for (const track of parsed.tracks) {
    for (const event of track.events) {
      if (event.type === 'setTempo' && event.tempo !== undefined) {
        // Tempo in microseconds per quarter note
        const bpm = 60000000 / event.tempo;
        tempoEvents.push({
          at: ticksToRat(event.absoluteTime, ppq),
          bpm,
          unit: { n: 1, d: 4 }, // Quarter note
        });
      }
      if (event.type === 'timeSignature') {
        meterEvents.push({
          at: ticksToRat(event.absoluteTime, ppq),
          numerator: event.numerator!,
          denominator: event.denominator!,
        });
      }
      if (event.type === 'trackName' && !title && track === parsed.tracks[0]) {
        title = event.text;
      }
      if (event.type === 'copyright' && !copyright) {
        copyright = event.text;
      }
    }
  }

  // Default tempo if none specified
  if (tempoEvents.length === 0) {
    tempoEvents.push({
      at: { n: 0, d: 1 },
      bpm: 120,
      unit: { n: 1, d: 4 },
    });
  }

  // Default meter if none specified
  if (meterEvents.length === 0) {
    meterEvents.push({
      at: { n: 0, d: 1 },
      numerator: 4,
      denominator: 4,
    });
  }

  // Group note events by channel
  const channelNotes: Map<
    number,
    { start: number; end: number; note: number; velocity: number }[]
  > = new Map();

  for (const track of parsed.tracks) {
    const noteOns: Map<number, { time: number; velocity: number }[]> = new Map();

    for (const event of track.events) {
      if (event.type === 'noteOn' && event.channel !== undefined) {
        const key = event.channel * 128 + event.note!;
        if (!noteOns.has(key)) {
          noteOns.set(key, []);
        }
        noteOns.get(key)!.push({
          time: event.absoluteTime,
          velocity: event.velocity!,
        });
      } else if (event.type === 'noteOff' && event.channel !== undefined) {
        const key = event.channel * 128 + event.note!;
        const ons = noteOns.get(key);
        if (ons && ons.length > 0) {
          const on = ons.shift()!;
          if (!channelNotes.has(event.channel)) {
            channelNotes.set(event.channel, []);
          }
          channelNotes.get(event.channel)!.push({
            start: on.time,
            end: event.absoluteTime,
            note: event.note!,
            velocity: on.velocity,
          });
        }
      }
    }
  }

  // Create tracks
  const tracks: Track[] = [];
  const sounds: ScoreIR['sounds'] = [];

  for (const [channel, notes] of channelNotes.entries()) {
    if (notes.length === 0) continue;

    const isDrums = channel === drumChannel;
    const trackName = isDrums ? 'Drums' : `Channel ${channel + 1}`;
    const soundId = isDrums ? 'drums' : `ch${channel + 1}`;

    // Add sound declaration if not exists
    if (!sounds.find((s) => s.id === soundId)) {
      sounds.push({
        id: soundId,
        kind: isDrums ? 'drumKit' : 'instrument',
        label: trackName,
      });
    }

    // Sort notes by start time
    notes.sort((a, b) => a.start - b.start);

    // Convert to events
    const events: Event[] = [];

    if (mergeChords && !isDrums) {
      // Group simultaneous notes into chords
      const groups: Map<
        string,
        { start: number; dur: number; notes: number[]; velocity: number }
      > = new Map();

      for (const note of notes) {
        const dur = note.end - note.start;
        const key = `${note.start}:${dur}`;

        if (!groups.has(key)) {
          groups.set(key, {
            start: note.start,
            dur,
            notes: [],
            velocity: note.velocity,
          });
        }
        groups.get(key)!.notes.push(note.note);
        // Use max velocity
        groups.get(key)!.velocity = Math.max(
          groups.get(key)!.velocity,
          note.velocity
        );
      }

      // Convert groups to events
      for (const group of groups.values()) {
        const startRat = ticksToRat(group.start, ppq);
        const durRat = ticksToRat(group.dur, ppq);
        const velocity = group.velocity / 127;

        if (group.notes.length === 1) {
          events.push({
            type: 'note',
            start: startRat,
            dur: durRat,
            pitch: midiToPitch(group.notes[0]),
            velocity,
          } as NoteEvent);
        } else {
          events.push({
            type: 'chord',
            start: startRat,
            dur: durRat,
            pitches: group.notes.sort((a, b) => a - b).map(midiToPitch),
            velocity,
          } as ChordEvent);
        }
      }
    } else if (isDrums) {
      // Drum hits
      for (const note of notes) {
        const startRat = ticksToRat(note.start, ppq);
        const durRat = ticksToRat(note.end - note.start, ppq);
        const key = REVERSE_DRUM_MAP[note.note] || `note${note.note}`;

        events.push({
          type: 'drumHit',
          start: startRat,
          dur: durRat,
          key,
          velocity: note.velocity / 127,
        } as DrumHitEvent);
      }
    } else {
      // Individual notes
      for (const note of notes) {
        const startRat = ticksToRat(note.start, ppq);
        const durRat = ticksToRat(note.end - note.start, ppq);

        events.push({
          type: 'note',
          start: startRat,
          dur: durRat,
          pitch: midiToPitch(note.note),
          velocity: note.velocity / 127,
        } as NoteEvent);
      }
    }

    // Sort events by start time
    events.sort((a, b) => {
      const aStart = 'start' in a ? (a.start as Rat) : { n: 0, d: 1 };
      const bStart = 'start' in b ? (b.start as Rat) : { n: 0, d: 1 };
      return aStart.n / aStart.d - bStart.n / bStart.d;
    });

    // Create single placement at position 0
    const clip: Clip = {
      events,
    };

    tracks.push({
      name: trackName,
      role: isDrums ? 'Drums' : 'Instrument',
      sound: soundId,
      placements: [
        {
          at: { n: 0, d: 1 },
          clip,
        },
      ],
    });
  }

  // Build Score IR
  const score: ScoreIR = {
    tako: {
      irVersion: 4,
      generator: 'tako-midi-import',
    },
    meta: {
      title,
      copyright,
    },
    tempoMap: tempoEvents,
    meterMap: meterEvents,
    sounds,
    tracks,
  };

  return score;
}

/**
 * Import a MIDI file from a file path
 */
export async function importMidiFile(
  filePath: string,
  options: MidiImportOptions = {}
): Promise<ScoreIR> {
  const fs = await import('node:fs/promises');
  const data = await fs.readFile(filePath);
  return midiToScoreIR(new Uint8Array(data), options);
}
