// MIDI file generator for band tracks (SMF format)

import type { SongIR, MidiTrack, NoteEvent, TempoEvent, TimeSigEvent } from '../types/ir.js';

// MIDI event types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const PROGRAM_CHANGE = 0xC0;
const META_EVENT = 0xFF;
const META_TEMPO = 0x51;
const META_TIME_SIG = 0x58;
const META_END_TRACK = 0x2F;

export function generateMidi(ir: SongIR): Buffer {
  const midiTracks = ir.tracks.filter((t): t is MidiTrack => t.kind === 'midi');

  // Build MIDI file
  const chunks: Buffer[] = [];

  // Header chunk
  chunks.push(buildHeaderChunk(midiTracks.length + 1, ir.ppq));

  // Tempo track (track 0)
  chunks.push(buildTempoTrack(ir));

  // Note tracks
  for (const track of midiTracks) {
    chunks.push(buildNoteTrack(track, ir));
  }

  return Buffer.concat(chunks);
}

function buildHeaderChunk(numTracks: number, ppq: number): Buffer {
  const header = Buffer.alloc(14);

  // "MThd"
  header.write('MThd', 0);

  // Chunk length (always 6)
  header.writeUInt32BE(6, 4);

  // Format (1 = multiple tracks, synchronous)
  header.writeUInt16BE(1, 8);

  // Number of tracks
  header.writeUInt16BE(numTracks, 10);

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
      // Convert BPM to microseconds per quarter note
      const uspq = Math.round(60000000 / tempo.bpm);
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

function buildNoteTrack(track: MidiTrack, ir: SongIR): Buffer {
  const events: Buffer[] = [];
  let lastTick = 0;

  // Program change at start
  events.push(buildProgramChange(0, track.channel, track.program));

  // Build note on/off events
  interface NoteOff {
    tick: number;
    key: number;
    channel: number;
  }

  const noteOffs: NoteOff[] = [];
  const noteEvents = track.events.filter((e): e is NoteEvent => e.type === 'note');

  // Sort notes by tick
  noteEvents.sort((a, b) => a.tick - b.tick);

  // Process notes
  for (const note of noteEvents) {
    // Insert any pending note offs before this note
    while (noteOffs.length > 0 && noteOffs[0].tick <= note.tick) {
      const off = noteOffs.shift()!;
      const delta = off.tick - lastTick;
      events.push(buildNoteOff(delta, off.channel, off.key));
      lastTick = off.tick;
    }

    // Note on
    const delta = note.tick - lastTick;
    const vel = note.vel ?? track.defaultVel;
    events.push(buildNoteOn(delta, track.channel, note.key, vel));
    lastTick = note.tick;

    // Schedule note off
    noteOffs.push({
      tick: note.tick + note.dur,
      key: note.key,
      channel: track.channel,
    });
    noteOffs.sort((a, b) => a.tick - b.tick);
  }

  // Process remaining note offs
  while (noteOffs.length > 0) {
    const off = noteOffs.shift()!;
    const delta = off.tick - lastTick;
    events.push(buildNoteOff(delta, off.channel, off.key));
    lastTick = off.tick;
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

  // Denominator as power of 2
  data[offset++] = Math.log2(den);

  // Clocks per metronome click (default 24)
  data[offset++] = 24;

  // 32nd notes per quarter note (default 8)
  data[offset++] = 8;

  return data;
}

function buildProgramChange(delta: number, channel: number, program: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 2);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = PROGRAM_CHANGE | (channel & 0x0F);
  data[deltaBytes.length + 1] = program & 0x7F;

  return data;
}

function buildNoteOn(delta: number, channel: number, key: number, velocity: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = NOTE_ON | (channel & 0x0F);
  data[deltaBytes.length + 1] = key & 0x7F;
  data[deltaBytes.length + 2] = velocity & 0x7F;

  return data;
}

function buildNoteOff(delta: number, channel: number, key: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = NOTE_OFF | (channel & 0x0F);
  data[deltaBytes.length + 1] = key & 0x7F;
  data[deltaBytes.length + 2] = 0; // velocity

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
