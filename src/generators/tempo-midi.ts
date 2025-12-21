// Tempo MIDI generator - contains only tempo and time signature events

import type { SongIR, TempoEvent, TimeSigEvent } from '../types/ir.js';

// MIDI event types
const META_EVENT = 0xFF;
const META_TEMPO = 0x51;
const META_TIME_SIG = 0x58;
const META_END_TRACK = 0x2F;

export function generateTempoMidi(ir: SongIR): Buffer {
  const chunks: Buffer[] = [];

  // Header chunk
  chunks.push(buildHeaderChunk(ir.ppq));

  // Single tempo track
  chunks.push(buildTempoTrack(ir));

  return Buffer.concat(chunks);
}

function buildHeaderChunk(ppq: number): Buffer {
  const header = Buffer.alloc(14);

  // "MThd"
  header.write('MThd', 0);

  // Chunk length (always 6)
  header.writeUInt32BE(6, 4);

  // Format (0 = single track)
  header.writeUInt16BE(0, 8);

  // Number of tracks (1)
  header.writeUInt16BE(1, 10);

  // Division (ticks per quarter note)
  header.writeUInt16BE(ppq, 12);

  return header;
}

function buildTempoTrack(ir: SongIR): Buffer {
  const events: Buffer[] = [];
  let lastTick = 0;

  // Sort tempo events by tick
  const tempos = [...ir.tempos].sort((a, b) => a.tick - b.tick);
  const timeSigs = [...ir.timeSigs].sort((a, b) => a.tick - b.tick);

  // Merge tempo and time signature events
  interface MetaEvent {
    tick: number;
    type: 'tempo' | 'timesig';
    data: TempoEvent | TimeSigEvent;
  }

  const metaEvents: MetaEvent[] = [
    ...tempos.map((t) => ({ tick: t.tick, type: 'tempo' as const, data: t })),
    ...timeSigs.map((t) => ({ tick: t.tick, type: 'timesig' as const, data: t })),
  ];
  metaEvents.sort((a, b) => a.tick - b.tick);

  for (const event of metaEvents) {
    const delta = event.tick - lastTick;
    lastTick = event.tick;

    if (event.type === 'tempo') {
      const tempo = event.data as TempoEvent;
      // Validate BPM
      if (tempo.bpm <= 0 || !Number.isFinite(tempo.bpm)) {
        throw new Error(`Invalid tempo: BPM must be a positive number, got ${tempo.bpm}`);
      }
      // Convert BPM to microseconds per quarter note
      const uspq = Math.round(60000000 / tempo.bpm);
      // MIDI tempo is a 24-bit value (0-16777215 microseconds)
      if (uspq > 0xFFFFFF) {
        throw new Error(`Tempo too slow: BPM ${tempo.bpm} results in invalid MIDI data`);
      }
      events.push(buildTempoEvent(delta, uspq));
    } else {
      const ts = event.data as TimeSigEvent;
      events.push(buildTimeSigEvent(delta, ts.numerator, ts.denominator));
    }
  }

  // End of track
  events.push(buildEndOfTrack(0));

  return buildTrackChunk(events);
}

function buildTrackChunk(events: Buffer[]): Buffer {
  const trackData = Buffer.concat(events);
  const header = Buffer.alloc(8);

  // "MTrk"
  header.write('MTrk', 0);

  // Chunk length
  header.writeUInt32BE(trackData.length, 4);

  return Buffer.concat([header, trackData]);
}

function buildTempoEvent(delta: number, uspq: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 6);

  let offset = 0;
  deltaBytes.copy(data, offset);
  offset += deltaBytes.length;

  data[offset++] = META_EVENT;
  data[offset++] = META_TEMPO;
  data[offset++] = 3; // length

  // Microseconds per quarter note (24-bit big endian)
  data[offset++] = (uspq >> 16) & 0xFF;
  data[offset++] = (uspq >> 8) & 0xFF;
  data[offset++] = uspq & 0xFF;

  return data;
}

function buildTimeSigEvent(delta: number, num: number, den: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 7);

  let offset = 0;
  deltaBytes.copy(data, offset);
  offset += deltaBytes.length;

  data[offset++] = META_EVENT;
  data[offset++] = META_TIME_SIG;
  data[offset++] = 4; // length

  // Numerator
  data[offset++] = num;

  // Denominator as power of 2 (validate it's a power of 2)
  const log2Den = Math.log2(den);
  if (!Number.isInteger(log2Den) || log2Den < 0 || log2Den > 6) {
    throw new Error(`Invalid time signature denominator: ${den}. Must be a power of 2 (1, 2, 4, 8, 16, 32, 64).`);
  }
  data[offset++] = log2Den;

  // Clocks per metronome click (default 24)
  data[offset++] = 24;

  // 32nd notes per quarter note (default 8)
  data[offset++] = 8;

  return data;
}

function buildEndOfTrack(delta: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = META_EVENT;
  data[deltaBytes.length + 1] = META_END_TRACK;
  data[deltaBytes.length + 2] = 0; // length

  return data;
}

function encodeVarLen(value: number): Buffer {
  if (value < 0) value = 0;

  const bytes: number[] = [];
  bytes.push(value & 0x7F);
  value >>= 7;

  while (value > 0) {
    bytes.push((value & 0x7F) | 0x80);
    value >>= 7;
  }

  bytes.reverse();
  return Buffer.from(bytes);
}
