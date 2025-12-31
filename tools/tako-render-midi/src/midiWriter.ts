/**
 * Pure TypeScript Standard MIDI File Writer
 *
 * Produces Type 1 MIDI files (multi-track) without external dependencies.
 * All data is written using pure byte manipulation.
 */

export interface MidiFile {
  ppq: number;
  tracks: MidiTrack[];
}

export interface MidiTrack {
  name?: string;
  events: MidiEvent[];
}

export type MidiEvent =
  | NoteOnEvent
  | NoteOffEvent
  | ControlChangeEvent
  | ProgramChangeEvent
  | PitchBendEvent
  | TempoEvent
  | TimeSignatureEvent
  | KeySignatureEvent
  | TextEvent
  | TrackNameEvent
  | EndOfTrackEvent;

export interface NoteOnEvent {
  type: 'noteOn';
  delta: number;
  channel: number;
  note: number;
  velocity: number;
}

export interface NoteOffEvent {
  type: 'noteOff';
  delta: number;
  channel: number;
  note: number;
  velocity: number;
}

export interface ControlChangeEvent {
  type: 'controlChange';
  delta: number;
  channel: number;
  controller: number;
  value: number;
}

export interface ProgramChangeEvent {
  type: 'programChange';
  delta: number;
  channel: number;
  program: number;
}

export interface PitchBendEvent {
  type: 'pitchBend';
  delta: number;
  channel: number;
  value: number; // -8192 to 8191, 0 = center
}

export interface TempoEvent {
  type: 'tempo';
  delta: number;
  microsecondsPerBeat: number;
}

export interface TimeSignatureEvent {
  type: 'timeSignature';
  delta: number;
  numerator: number;
  denominator: number; // Actual value (4 for quarter note, 8 for eighth, etc.)
  clocksPerClick: number;
  thirtySecondNotesPerQuarter: number;
}

export interface KeySignatureEvent {
  type: 'keySignature';
  delta: number;
  sharpsFlats: number; // -7 to +7 (negative = flats, positive = sharps)
  mode: number; // 0 = major, 1 = minor
}

export interface TextEvent {
  type: 'text';
  delta: number;
  kind: 'text' | 'copyright' | 'trackName' | 'instrumentName' | 'lyric' | 'marker' | 'cue';
  text: string;
}

export interface TrackNameEvent {
  type: 'trackName';
  delta: number;
  name: string;
}

export interface EndOfTrackEvent {
  type: 'endOfTrack';
  delta: number;
}

/**
 * Write a MIDI file to a Uint8Array
 */
export function writeMidiFile(midi: MidiFile): Uint8Array {
  const chunks: Uint8Array[] = [];

  // Write header chunk
  chunks.push(writeHeaderChunk(midi.tracks.length, midi.ppq));

  // Write track chunks
  for (const track of midi.tracks) {
    chunks.push(writeTrackChunk(track));
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Write MIDI header chunk (MThd)
 */
function writeHeaderChunk(numTracks: number, ppq: number): Uint8Array {
  const data = new Uint8Array(14);
  const view = new DataView(data.buffer);

  // Chunk type: MThd (4D 54 68 64)
  data[0] = 0x4d; // M
  data[1] = 0x54; // T
  data[2] = 0x68; // h
  data[3] = 0x64; // d

  // Chunk length: 6 bytes
  view.setUint32(4, 6, false);

  // Format: 1 (multi-track synchronous)
  view.setUint16(8, 1, false);

  // Number of tracks
  view.setUint16(10, numTracks, false);

  // Division (ticks per quarter note / PPQ)
  // Bit 15 = 0 indicates PPQ format
  view.setUint16(12, ppq & 0x7fff, false);

  return data;
}

/**
 * Write MIDI track chunk (MTrk)
 */
function writeTrackChunk(track: MidiTrack): Uint8Array {
  // Encode all events
  const eventBytes: Uint8Array[] = [];

  for (const event of track.events) {
    eventBytes.push(encodeEvent(event));
  }

  // Calculate total event data length
  const dataLength = eventBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  // Create chunk: 8 bytes header + event data
  const chunk = new Uint8Array(8 + dataLength);
  const view = new DataView(chunk.buffer);

  // Chunk type: MTrk (4D 54 72 6B)
  chunk[0] = 0x4d; // M
  chunk[1] = 0x54; // T
  chunk[2] = 0x72; // r
  chunk[3] = 0x6b; // k

  // Chunk length
  view.setUint32(4, dataLength, false);

  // Copy event data
  let offset = 8;
  for (const bytes of eventBytes) {
    chunk.set(bytes, offset);
    offset += bytes.length;
  }

  return chunk;
}

/**
 * Encode a single MIDI event to bytes
 */
function encodeEvent(event: MidiEvent): Uint8Array {
  const deltaBytes = encodeVariableLength(event.delta);

  switch (event.type) {
    case 'noteOn': {
      const status = 0x90 | (event.channel & 0x0f);
      const note = clamp(event.note, 0, 127);
      const velocity = clamp(event.velocity, 0, 127);
      return concat(deltaBytes, new Uint8Array([status, note, velocity]));
    }

    case 'noteOff': {
      const status = 0x80 | (event.channel & 0x0f);
      const note = clamp(event.note, 0, 127);
      const velocity = clamp(event.velocity, 0, 127);
      return concat(deltaBytes, new Uint8Array([status, note, velocity]));
    }

    case 'controlChange': {
      const status = 0xb0 | (event.channel & 0x0f);
      const controller = clamp(event.controller, 0, 127);
      const value = clamp(event.value, 0, 127);
      return concat(deltaBytes, new Uint8Array([status, controller, value]));
    }

    case 'programChange': {
      const status = 0xc0 | (event.channel & 0x0f);
      const program = clamp(event.program, 0, 127);
      return concat(deltaBytes, new Uint8Array([status, program]));
    }

    case 'pitchBend': {
      const status = 0xe0 | (event.channel & 0x0f);
      // Convert from -8192..8191 to 0..16383
      const value = clamp(event.value + 8192, 0, 16383);
      const lsb = value & 0x7f;
      const msb = (value >> 7) & 0x7f;
      return concat(deltaBytes, new Uint8Array([status, lsb, msb]));
    }

    case 'tempo': {
      // Meta event: FF 51 03 tt tt tt
      const tempo = clamp(event.microsecondsPerBeat, 1, 0xffffff);
      return concat(
        deltaBytes,
        new Uint8Array([
          0xff,
          0x51,
          0x03,
          (tempo >> 16) & 0xff,
          (tempo >> 8) & 0xff,
          tempo & 0xff,
        ])
      );
    }

    case 'timeSignature': {
      // Meta event: FF 58 04 nn dd cc bb
      // dd = log2(denominator)
      const denom = Math.max(0, Math.round(Math.log2(event.denominator)));
      return concat(
        deltaBytes,
        new Uint8Array([
          0xff,
          0x58,
          0x04,
          event.numerator,
          denom,
          event.clocksPerClick,
          event.thirtySecondNotesPerQuarter,
        ])
      );
    }

    case 'keySignature': {
      // Meta event: FF 59 02 sf mi
      const sf = clamp(event.sharpsFlats, -7, 7);
      const mi = event.mode === 1 ? 1 : 0;
      // Convert signed to unsigned byte
      const sfByte = sf < 0 ? 256 + sf : sf;
      return concat(deltaBytes, new Uint8Array([0xff, 0x59, 0x02, sfByte, mi]));
    }

    case 'text': {
      // Meta event: FF tt len text
      const kindByte = getTextEventKind(event.kind);
      const textBytes = new TextEncoder().encode(event.text);
      return concat(
        deltaBytes,
        new Uint8Array([0xff, kindByte]),
        encodeVariableLength(textBytes.length),
        textBytes
      );
    }

    case 'trackName': {
      // Meta event: FF 03 len name
      const textBytes = new TextEncoder().encode(event.name);
      return concat(
        deltaBytes,
        new Uint8Array([0xff, 0x03]),
        encodeVariableLength(textBytes.length),
        textBytes
      );
    }

    case 'endOfTrack':
      // Meta event: FF 2F 00
      return concat(deltaBytes, new Uint8Array([0xff, 0x2f, 0x00]));
  }
}

/**
 * Get meta event type byte for text events
 */
function getTextEventKind(kind: TextEvent['kind']): number {
  switch (kind) {
    case 'text':
      return 0x01;
    case 'copyright':
      return 0x02;
    case 'trackName':
      return 0x03;
    case 'instrumentName':
      return 0x04;
    case 'lyric':
      return 0x05;
    case 'marker':
      return 0x06;
    case 'cue':
      return 0x07;
    default:
      return 0x01;
  }
}

/**
 * Encode a value as MIDI variable-length quantity
 *
 * Variable-length encoding uses 7 bits per byte, with bit 7
 * indicating continuation (1 = more bytes follow, 0 = last byte).
 */
function encodeVariableLength(value: number): Uint8Array {
  if (value < 0) {
    throw new Error('Variable length value must be non-negative');
  }

  // Fast path for common case
  if (value < 0x80) {
    return new Uint8Array([value]);
  }

  const bytes: number[] = [];
  let v = value;

  // Start with LSB (no continuation bit)
  bytes.unshift(v & 0x7f);
  v >>= 7;

  // Add remaining bytes with continuation bit
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }

  return new Uint8Array(bytes);
}

/**
 * Concatenate multiple Uint8Arrays
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Clamp a value to a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Convert BPM to microseconds per beat
 */
export function bpmToMicroseconds(bpm: number): number {
  return Math.round(60_000_000 / bpm);
}

/**
 * Convert microseconds per beat to BPM
 */
export function microsecondsToBpm(us: number): number {
  return 60_000_000 / us;
}
