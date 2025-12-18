// MIDI Extensions types

import type { NoteEvent } from './core.js';

// MIDI Mapping
export interface MIDIMapping {
  type: 'midiMapping';
  ccNumber: number;
  target: string;           // Parameter to control
  min: number;
  max: number;
  curve?: 'linear' | 'exponential' | 'logarithmic';
}

// MPE (MIDI Polyphonic Expression)
export interface MPEZone {
  masterChannel: number;      // 1 or 16
  memberChannels: number;     // 2-15
  pitchBendRange: number;     // Semitones
}

export interface MPENoteEvent extends NoteEvent {
  channel: number;            // Per-note channel
  slide?: number;             // CC74 (Y-axis) 0-127
  pressure?: number;          // Aftertouch
  pitchBend?: number;         // Per-note pitch bend
}

export interface MPEConfig {
  type: 'mpeConfig';
  zones: MPEZone[];
  enabled: boolean;
}

// Arpeggiator
export interface ArpeggiatorPattern {
  type: 'arpeggiator';
  tick: number;
  mode: 'up' | 'down' | 'up-down' | 'down-up' | 'random' | 'order' | 'chord';
  rate: string;               // Duration like '16n'
  octaves: number;            // 1-4
  gate: number;               // 0-100 (note length percentage)
  swing?: number;             // 0-100
  pattern?: number[];         // Custom step pattern
  hold?: boolean;
  ratchet?: number[];         // Ratchet per step
}

// Chord features
export interface ChordMemory {
  type: 'chordMemory';
  tick: number;
  triggerNote: number;        // MIDI note that triggers
  chord: number[];            // Notes to play
  velocity?: 'fixed' | 'scaled' | 'layer';
  velocityValue?: number;
}

export interface ChordTrigger {
  type: 'chordTrigger';
  tick: number;
  root: number;               // Root note
  chordType: string;          // 'major', 'minor', 'dim', etc.
  voicing?: 'close' | 'open' | 'drop2' | 'drop3' | 'spread';
  inversion?: number;
}

// MIDI Learn
export interface MIDILearnMapping {
  type: 'midiLearn';
  id: string;
  channel: number;
  controlType: 'cc' | 'note' | 'pitchbend' | 'aftertouch';
  controlNumber?: number;          // For CC/note
  targetParameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'logarithmic' | 'exponential';
}

// Macro Control
export interface MacroControl {
  type: 'macro';
  id: string;
  name: string;
  value: number;                   // 0-127
  mappings: MacroMapping[];
}

export interface MacroMapping {
  targetParameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'logarithmic' | 'exponential' | 'step';
  steps?: number[];                // For step curve
}
