// MIDI file generator for band tracks (SMF format)

import type { SongIR, MidiTrack, NoteEvent, TempoEvent, TimeSigEvent, CCEvent, PitchBendEvent } from '../types/ir.js';

// MIDI event types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xB0;
const PROGRAM_CHANGE = 0xC0;
const PITCH_BEND = 0xE0;
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

  // Build all MIDI events (notes, CC, pitch bend)
  interface NoteOff {
    tick: number;
    key: number;
    channel: number;
  }

  interface MidiEvent {
    tick: number;
    type: 'noteOn' | 'noteOff' | 'cc' | 'pitchBend';
    key?: number;
    vel?: number;
    controller?: number;
    value?: number;
  }

  const midiEvents: MidiEvent[] = [];
  const noteEvents = track.events.filter((e): e is NoteEvent => e.type === 'note');
  const ccEvents = track.events.filter((e): e is CCEvent => e.type === 'cc');
  const pitchBendEvents = track.events.filter((e): e is PitchBendEvent => e.type === 'pitchBend');

  // Add note on/off events
  for (const note of noteEvents) {
    midiEvents.push({
      tick: note.tick,
      type: 'noteOn',
      key: note.key,
      vel: note.vel ?? track.defaultVel,
    });
    midiEvents.push({
      tick: note.tick + note.dur,
      type: 'noteOff',
      key: note.key,
    });
  }

  // Add CC events
  for (const cc of ccEvents) {
    midiEvents.push({
      tick: cc.tick,
      type: 'cc',
      controller: cc.controller,
      value: cc.value,
    });
  }

  // Add pitch bend events
  for (const pb of pitchBendEvents) {
    midiEvents.push({
      tick: pb.tick,
      type: 'pitchBend',
      value: pb.value,
    });
  }

  // Sort all events by tick, then by type (noteOff before noteOn at same tick)
  midiEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    // At same tick: noteOff < cc < pitchBend < noteOn
    const typeOrder = { noteOff: 0, cc: 1, pitchBend: 2, noteOn: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Process all events
  for (const event of midiEvents) {
    const delta = event.tick - lastTick;
    lastTick = event.tick;

    switch (event.type) {
      case 'noteOn':
        events.push(buildNoteOn(delta, track.channel, event.key!, event.vel!));
        break;
      case 'noteOff':
        events.push(buildNoteOff(delta, track.channel, event.key!));
        break;
      case 'cc':
        events.push(buildControlChange(delta, track.channel, event.controller!, event.value!));
        break;
      case 'pitchBend':
        events.push(buildPitchBendEvent(delta, track.channel, event.value!));
        break;
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

function buildControlChange(delta: number, channel: number, controller: number, value: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = CONTROL_CHANGE | (channel & 0x0F);
  data[deltaBytes.length + 1] = controller & 0x7F;
  data[deltaBytes.length + 2] = value & 0x7F;

  return data;
}

function buildPitchBendEvent(delta: number, channel: number, value: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  // Convert -8192..8191 to 0..16383 (center = 8192)
  const pitchBendValue = value + 8192;
  const lsb = pitchBendValue & 0x7F;
  const msb = (pitchBendValue >> 7) & 0x7F;

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = PITCH_BEND | (channel & 0x0F);
  data[deltaBytes.length + 1] = lsb;
  data[deltaBytes.length + 2] = msb;

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
