// Core IR types - Basic events and tracks

export interface SongIR {
  schemaVersion: '0.1';
  title: string | null;
  ppq: number;
  tempos: TempoEvent[];
  timeSigs: TimeSigEvent[];
  tracks: Track[];
}

export interface TempoEvent {
  tick: number;
  bpm: number;
}

export interface TimeSigEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

export type Track = VocalTrack | MidiTrack;

export interface BaseTrack {
  id: string;
  kind: 'vocal' | 'midi';
  name: string;
  events: TrackEvent[];
}

export interface VocalTrack extends BaseTrack {
  kind: 'vocal';
  meta: {
    engine?: string;
    voice?: string;
  };
  // Vocaloid expression parameters
  vocaloidParams?: VocaloidParamEvent[];
}

export interface MidiTrack extends BaseTrack {
  kind: 'midi';
  channel: number;
  program: number;
  defaultVel: number;
}

export type TrackEvent = NoteEvent | RestEvent | CCEvent | PitchBendEvent | AftertouchEvent | PolyAftertouchEvent | NRPNEvent | SysExEvent;

export interface NoteEvent {
  type: 'note';
  tick: number;
  dur: number;
  key: number;
  vel?: number;
  lyric?: string;
  articulation?: Articulation;
}

export interface RestEvent {
  type: 'rest';
  tick: number;
  dur: number;
}

export interface CCEvent {
  type: 'cc';
  tick: number;
  controller: number;
  value: number;
}

export interface PitchBendEvent {
  type: 'pitchBend';
  tick: number;
  value: number; // -8192 to 8191
}

// Advanced MIDI event types
export interface AftertouchEvent {
  type: 'aftertouch';
  tick: number;
  value: number; // 0-127 (channel pressure)
}

export interface PolyAftertouchEvent {
  type: 'polyAftertouch';
  tick: number;
  key: number;   // 0-127 (note number)
  value: number; // 0-127 (pressure)
}

export interface NRPNEvent {
  type: 'nrpn';
  tick: number;
  paramMSB: number; // 0-127
  paramLSB: number; // 0-127
  valueMSB: number; // 0-127
  valueLSB?: number; // 0-127 (optional for 7-bit values)
}

export interface SysExEvent {
  type: 'sysex';
  tick: number;
  data: number[]; // Raw SysEx bytes (excluding F0 and F7)
}

// Articulation types
export type Articulation = 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato';

// Vocaloid parameter types
export type VocaloidParamType = 'PIT' | 'DYN' | 'BRE' | 'BRI' | 'CLE' | 'GEN' | 'POR' | 'OPE';

export interface VocaloidParamEvent {
  type: 'vocaloidParam';
  param: VocaloidParamType;
  tick: number;
  value: number;
}

export interface VocaloidVibratoEvent {
  type: 'vibrato';
  tick: number;
  dur: number;
  depth: number;    // 0-127
  rate: number;     // 0-127
  delay: number;    // 0-100 (% of note duration before vibrato starts)
}
