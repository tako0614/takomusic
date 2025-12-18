// Automation and Modulation types

export type AutomationCurveType = 'linear' | 'exponential' | 'logarithmic' | 'bezier' | 'step' | 's-curve';

export interface AutomationPoint {
  tick: number;
  value: number;
  curve?: AutomationCurveType;
  bezierControlPoints?: [number, number, number, number];  // x1, y1, x2, y2 (normalized 0-1)
}

export interface AutomationLane {
  type: 'automationLane';
  parameter: string;
  points: AutomationPoint[];
}

export interface LFOModulation {
  type: 'lfoModulation';
  tick: number;
  target: string;             // Parameter to modulate
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square' | 'random' | 'sample-and-hold';
  rate: number;               // Hz or sync value
  rateSync?: boolean;         // Sync to tempo
  depth: number;              // 0-100
  phase: number;              // 0-360 degrees
  offset: number;             // DC offset
  retrigger?: boolean;
}

export interface EnvelopeFollower {
  type: 'envelopeFollower';
  tick: number;
  sourceTrack: string;        // Track ID to follow
  target: string;             // Parameter to modulate
  attack: number;             // ms
  release: number;            // ms
  gain: number;               // Input gain
  min: number;                // Minimum output value
  max: number;                // Maximum output value
}

export interface ModulationMatrixEntry {
  source: string;
  destination: string;
  amount: number;             // -100 to 100
  curve?: AutomationCurveType;
}

export interface ModulationMatrix {
  type: 'modulationMatrix';
  entries: ModulationMatrixEntry[];
}
