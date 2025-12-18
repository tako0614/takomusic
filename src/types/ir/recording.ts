// Recording types

import type { TrackEvent } from './core.js';

export interface TakeLane {
  type: 'takeLane';
  trackId: string;
  takes: Take[];
  activeTakeIndex: number;
}

export interface Take {
  id: string;
  name: string;
  startTick: number;
  endTick: number;
  events: TrackEvent[];
  muted: boolean;
  rating?: number;                 // 1-5 stars
}

export interface CompRegion {
  type: 'comp';
  trackId: string;
  startTick: number;
  endTick: number;
  sourceTakeId: string;
  crossfadeIn: number;             // Ticks
  crossfadeOut: number;
}

export interface PunchPoint {
  type: 'punch';
  mode: 'in' | 'out' | 'in-out';
  tick: number;
  endTick?: number;                // For in-out mode
  preroll: number;                 // Bars
  postroll: number;
}

export interface LoopRecording {
  type: 'loopRecording';
  startTick: number;
  endTick: number;
  mode: 'replace' | 'overdub' | 'takes';
  countIn: number;                 // Bars
  maxTakes?: number;
}

export interface AutomationRecording {
  type: 'automationRecording';
  parameter: string;
  mode: 'touch' | 'latch' | 'write' | 'trim';
  reduction: number;               // Point reduction percentage
}
