// Sampling types

export interface MultiSampleInstrument {
  type: 'multiSample';
  id: string;
  name: string;
  samples: SampleZone[];
  globalParams?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    filterCutoff?: number;
    filterResonance?: number;
  };
}

export interface SampleZone {
  filePath: string;
  rootNote: number;           // MIDI note
  lowNote: number;            // Range start
  highNote: number;           // Range end
  lowVelocity: number;        // Velocity range start (1-127)
  highVelocity: number;       // Velocity range end (1-127)
  loopStart?: number;         // Sample frames
  loopEnd?: number;
  loopMode?: 'none' | 'forward' | 'pingpong' | 'reverse';
  tune?: number;              // Cents
  volume?: number;            // dB
  pan?: number;               // -100 to 100
}

export interface RoundRobinGroup {
  type: 'roundRobin';
  zones: SampleZone[];
  mode: 'cycle' | 'random' | 'random-no-repeat';
}

export interface VelocityLayer {
  type: 'velocityLayer';
  lowVelocity: number;
  highVelocity: number;
  zones: SampleZone[];
  crossfade?: number;         // Velocity crossfade range
}

export interface KeySwitch {
  type: 'keySwitch';
  triggerNote: number;        // Note that triggers articulation
  articulation: string;       // Articulation name
  samples: SampleZone[];
  latching?: boolean;         // Stays active until another keyswitch
}

export interface SamplerInstrument {
  type: 'sampler';
  id: string;
  name: string;
  zones: SampleZone[];
  roundRobins?: RoundRobinGroup[];
  velocityLayers?: VelocityLayer[];
  keySwitches?: KeySwitch[];
  releaseMode?: 'normal' | 'release-trigger';
  releaseSamples?: SampleZone[];
}
