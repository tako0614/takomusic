// Intermediate Representation (IR) types for Song IR

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
}

export interface MidiTrack extends BaseTrack {
  kind: 'midi';
  channel: number;
  program: number;
  defaultVel: number;
}

export type TrackEvent = NoteEvent | RestEvent | CCEvent | PitchBendEvent;

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

// Articulation types
export type Articulation = 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato';
