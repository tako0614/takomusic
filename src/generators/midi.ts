// MIDI file generator for band tracks (SMF format)

import type {
  SongIR,
  MidiTrack,
  NoteEvent,
  TempoEvent,
  TimeSigEvent,
  CCEvent,
  PitchBendEvent,
  AftertouchEvent,
  PolyAftertouchEvent,
  NRPNEvent,
  SysExEvent,
} from '../types/ir.js';

// MIDI event types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const POLY_AFTERTOUCH = 0xA0;
const CONTROL_CHANGE = 0xB0;
const PROGRAM_CHANGE = 0xC0;
const CHANNEL_AFTERTOUCH = 0xD0;
const PITCH_BEND = 0xE0;
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
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

function buildNoteTrack(track: MidiTrack, _ir: SongIR): Buffer {
  const events: Buffer[] = [];
  let lastTick = 0;

  // Program change at start
  events.push(buildProgramChange(0, track.channel, track.program));

  // Build all MIDI events (notes, CC, pitch bend, aftertouch, NRPN, SysEx)
  interface MidiEvent {
    tick: number;
    type: 'noteOn' | 'noteOff' | 'cc' | 'pitchBend' | 'aftertouch' | 'polyAftertouch' | 'nrpn' | 'sysex';
    key?: number;
    vel?: number;
    controller?: number;
    value?: number;
    paramMSB?: number;
    paramLSB?: number;
    valueMSB?: number;
    valueLSB?: number;
    data?: number[];
  }

  const midiEvents: MidiEvent[] = [];
  const noteEvents = track.events.filter((e): e is NoteEvent => e.type === 'note');
  const ccEvents = track.events.filter((e): e is CCEvent => e.type === 'cc');
  const pitchBendEvents = track.events.filter((e): e is PitchBendEvent => e.type === 'pitchBend');
  const aftertouchEvents = track.events.filter((e): e is AftertouchEvent => e.type === 'aftertouch');
  const polyAftertouchEvents = track.events.filter((e): e is PolyAftertouchEvent => e.type === 'polyAftertouch');
  const nrpnEvents = track.events.filter((e): e is NRPNEvent => e.type === 'nrpn');
  const sysexEvents = track.events.filter((e): e is SysExEvent => e.type === 'sysex');

  // Add note on/off events
  for (const note of noteEvents) {
    // Validate note key (0-127)
    if (note.key < 0 || note.key > 127) {
      throw new Error(`Invalid note key: ${note.key}. Must be 0-127.`);
    }
    const rawVel = note.vel ?? track.defaultVel;
    // Clamp velocity to valid MIDI range (0-127)
    const vel = Math.max(0, Math.min(127, rawVel));
    midiEvents.push({
      tick: note.tick,
      type: 'noteOn',
      key: note.key,
      vel: vel,
    });
    midiEvents.push({
      tick: note.tick + note.dur,
      type: 'noteOff',
      key: note.key,
    });
  }

  // Add CC events
  for (const cc of ccEvents) {
    // Validate CC values (0-127)
    if (cc.controller < 0 || cc.controller > 127) {
      throw new Error(`Invalid CC controller: ${cc.controller}. Must be 0-127.`);
    }
    if (cc.value < 0 || cc.value > 127) {
      throw new Error(`Invalid CC value: ${cc.value}. Must be 0-127.`);
    }
    midiEvents.push({
      tick: cc.tick,
      type: 'cc',
      controller: cc.controller,
      value: cc.value,
    });
  }

  // Add pitch bend events
  for (const pb of pitchBendEvents) {
    // Validate pitch bend (-8192 to 8191)
    if (pb.value < -8192 || pb.value > 8191) {
      throw new Error(`Invalid pitch bend value: ${pb.value}. Must be -8192 to 8191.`);
    }
    midiEvents.push({
      tick: pb.tick,
      type: 'pitchBend',
      value: pb.value,
    });
  }

  // Add aftertouch events
  for (const at of aftertouchEvents) {
    // Validate aftertouch (0-127)
    if (at.value < 0 || at.value > 127) {
      throw new Error(`Invalid aftertouch value: ${at.value}. Must be 0-127.`);
    }
    midiEvents.push({
      tick: at.tick,
      type: 'aftertouch',
      value: at.value,
    });
  }

  // Add polyphonic aftertouch events
  for (const pat of polyAftertouchEvents) {
    // Validate poly aftertouch (0-127)
    if (pat.key < 0 || pat.key > 127) {
      throw new Error(`Invalid poly aftertouch key: ${pat.key}. Must be 0-127.`);
    }
    if (pat.value < 0 || pat.value > 127) {
      throw new Error(`Invalid poly aftertouch value: ${pat.value}. Must be 0-127.`);
    }
    midiEvents.push({
      tick: pat.tick,
      type: 'polyAftertouch',
      key: pat.key,
      value: pat.value,
    });
  }

  // Add NRPN events
  for (const nrpn of nrpnEvents) {
    // Validate NRPN values (7-bit: 0-127)
    if (nrpn.paramMSB < 0 || nrpn.paramMSB > 127) {
      throw new Error(`Invalid NRPN paramMSB: ${nrpn.paramMSB}. Must be 0-127.`);
    }
    if (nrpn.paramLSB < 0 || nrpn.paramLSB > 127) {
      throw new Error(`Invalid NRPN paramLSB: ${nrpn.paramLSB}. Must be 0-127.`);
    }
    if (nrpn.valueMSB < 0 || nrpn.valueMSB > 127) {
      throw new Error(`Invalid NRPN valueMSB: ${nrpn.valueMSB}. Must be 0-127.`);
    }
    if (nrpn.valueLSB !== undefined && (nrpn.valueLSB < 0 || nrpn.valueLSB > 127)) {
      throw new Error(`Invalid NRPN valueLSB: ${nrpn.valueLSB}. Must be 0-127.`);
    }
    midiEvents.push({
      tick: nrpn.tick,
      type: 'nrpn',
      paramMSB: nrpn.paramMSB,
      paramLSB: nrpn.paramLSB,
      valueMSB: nrpn.valueMSB,
      valueLSB: nrpn.valueLSB,
    });
  }

  // Add SysEx events
  for (const sysex of sysexEvents) {
    midiEvents.push({
      tick: sysex.tick,
      type: 'sysex',
      data: sysex.data,
    });
  }

  // Sort all events by tick, then by type (noteOff before noteOn at same tick)
  // Pre-compute type order outside the sort function for performance
  const typeOrder: Record<string, number> = { noteOff: 0, cc: 1, aftertouch: 2, polyAftertouch: 3, pitchBend: 4, nrpn: 5, sysex: 6, noteOn: 7 };
  midiEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    // At same tick: noteOff < cc < aftertouch < pitchBend < nrpn < sysex < noteOn
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Process all events
  for (const event of midiEvents) {
    const delta = event.tick - lastTick;
    lastTick = event.tick;

    switch (event.type) {
      case 'noteOn':
        if (event.key === undefined || event.vel === undefined) {
          throw new Error('noteOn event missing key or velocity');
        }
        events.push(buildNoteOn(delta, track.channel, event.key, event.vel));
        break;
      case 'noteOff':
        if (event.key === undefined) {
          throw new Error('noteOff event missing key');
        }
        events.push(buildNoteOff(delta, track.channel, event.key));
        break;
      case 'cc':
        if (event.controller === undefined || event.value === undefined) {
          throw new Error('CC event missing controller or value');
        }
        events.push(buildControlChange(delta, track.channel, event.controller, event.value));
        break;
      case 'pitchBend':
        if (event.value === undefined) {
          throw new Error('pitchBend event missing value');
        }
        events.push(buildPitchBendEvent(delta, track.channel, event.value));
        break;
      case 'aftertouch':
        if (event.value === undefined) {
          throw new Error('aftertouch event missing value');
        }
        events.push(buildAftertouch(delta, track.channel, event.value));
        break;
      case 'polyAftertouch':
        if (event.key === undefined || event.value === undefined) {
          throw new Error('polyAftertouch event missing key or value');
        }
        events.push(buildPolyAftertouch(delta, track.channel, event.key, event.value));
        break;
      case 'nrpn':
        if (event.paramMSB === undefined || event.paramLSB === undefined || event.valueMSB === undefined) {
          throw new Error('NRPN event missing required parameters');
        }
        events.push(buildNRPN(delta, track.channel, event.paramMSB, event.paramLSB, event.valueMSB, event.valueLSB));
        break;
      case 'sysex':
        if (event.data === undefined) {
          throw new Error('SysEx event missing data');
        }
        events.push(buildSysEx(delta, event.data));
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

function buildAftertouch(delta: number, channel: number, value: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 2);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = CHANNEL_AFTERTOUCH | (channel & 0x0F);
  data[deltaBytes.length + 1] = value & 0x7F;

  return data;
}

function buildPolyAftertouch(delta: number, channel: number, key: number, value: number): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const data = Buffer.alloc(deltaBytes.length + 3);

  deltaBytes.copy(data, 0);
  data[deltaBytes.length] = POLY_AFTERTOUCH | (channel & 0x0F);
  data[deltaBytes.length + 1] = key & 0x7F;
  data[deltaBytes.length + 2] = value & 0x7F;

  return data;
}

function buildNRPN(delta: number, channel: number, paramMSB: number, paramLSB: number, valueMSB: number, valueLSB?: number): Buffer {
  // Check if this is RPN (high bit set) or NRPN
  const isRPN = (paramMSB & 0x80) !== 0;
  const actualParamMSB = paramMSB & 0x7F;

  // NRPN/RPN requires multiple CC messages:
  // CC 99/101 = Param MSB, CC 98/100 = Param LSB, CC 6 = Value MSB, CC 38 = Value LSB (optional)
  const paramMSBCC = isRPN ? 101 : 99;
  const paramLSBCC = isRPN ? 100 : 98;

  const events: Buffer[] = [];

  // First event has the delta, rest have delta 0
  events.push(buildControlChange(delta, channel, paramMSBCC, actualParamMSB));
  events.push(buildControlChange(0, channel, paramLSBCC, paramLSB));
  events.push(buildControlChange(0, channel, 6, valueMSB)); // Data Entry MSB

  if (valueLSB !== undefined) {
    events.push(buildControlChange(0, channel, 38, valueLSB)); // Data Entry LSB
  }

  return Buffer.concat(events);
}

function buildSysEx(delta: number, data: number[]): Buffer {
  const deltaBytes = encodeVarLen(delta);
  const lengthBytes = encodeVarLen(data.length + 1); // +1 for F7 end marker
  const buffer = Buffer.alloc(deltaBytes.length + 1 + lengthBytes.length + data.length + 1);

  let offset = 0;
  deltaBytes.copy(buffer, offset);
  offset += deltaBytes.length;

  buffer[offset++] = SYSEX_START;
  lengthBytes.copy(buffer, offset);
  offset += lengthBytes.length;

  for (const byte of data) {
    buffer[offset++] = byte & 0x7F;
  }
  buffer[offset] = SYSEX_END;

  return buffer;
}
