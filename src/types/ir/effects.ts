// Audio Effects types

// Audio Effects
export interface AudioEffect {
  type: 'effect';
  effectType: EffectType;
  params: Record<string, number>;
  bypass?: boolean;
}

export type EffectType =
  | 'reverb' | 'delay' | 'chorus' | 'flanger' | 'phaser'
  | 'eq' | 'compressor' | 'limiter' | 'distortion' | 'filter'
  | 'maximizer' | 'multibandCompressor'
  | 'vocoder' | 'convolutionReverb' | 'ampSimulator' | 'cabinetSimulator'
  | 'tapeSaturation' | 'transientShaper' | 'deEsser' | 'exciter' | 'noiseReduction';

export interface PhaserEffect extends AudioEffect {
  effectType: 'phaser';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  feedback: number;         // 0-100
  stages: number;           // Number of stages (2, 4, 6, 8...)
}

export interface FlangerEffect extends AudioEffect {
  effectType: 'flanger';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  feedback: number;         // -100 to 100
  mix: number;              // 0-100
}

export interface ChorusEffect extends AudioEffect {
  effectType: 'chorus';
  rate: number;             // LFO rate (Hz)
  depth: number;            // 0-100
  voices: number;           // Number of chorus voices
  mix: number;              // 0-100
}

export interface DistortionEffect extends AudioEffect {
  effectType: 'distortion';
  drive: number;            // 0-100
  tone: number;             // 0-100 (dark to bright)
  mix: number;              // 0-100
  distortionType: 'overdrive' | 'distortion' | 'fuzz' | 'bitcrusher';
}

export interface FilterEffect extends AudioEffect {
  effectType: 'filter';
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  cutoff: number;           // Frequency in Hz
  resonance: number;        // 0-100 (Q factor)
  envelope?: {
    attack: number;
    decay: number;
    amount: number;
  };
}

export interface SidechainEvent {
  type: 'sidechain';
  tick: number;
  sourceTrack: string;      // Track ID to duck to
  threshold: number;        // -60 to 0 dB
  ratio: number;            // 1:1 to 20:1
  attack: number;           // ms
  release: number;          // ms
}

export interface LimiterEffect extends AudioEffect {
  effectType: 'limiter';
  threshold: number;          // dB
  release: number;            // ms
  ceiling: number;            // dB (max output)
  lookahead?: number;         // ms
}

export interface MaximizerEffect extends AudioEffect {
  effectType: 'maximizer';
  threshold: number;          // dB
  ceiling: number;            // dB
  release: number;            // ms
  character?: 'transparent' | 'warm' | 'aggressive';
}

export interface MultibandCompressor extends AudioEffect {
  effectType: 'multibandCompressor';
  bands: MultibandBand[];
}

export interface MultibandBand {
  lowFreq: number;            // Low cutoff
  highFreq: number;           // High cutoff
  threshold: number;          // dB
  ratio: number;
  attack: number;             // ms
  release: number;            // ms
  gain: number;               // dB (makeup gain)
}

export interface VocoderEffect extends AudioEffect {
  effectType: 'vocoder';
  carrierType: 'synth' | 'noise' | 'external';
  bands: number;                // Number of frequency bands (8-64)
  formantShift: number;         // -12 to +12 semitones
  attack: number;               // ms
  release: number;              // ms
  highFreqEmphasis: number;     // 0-100
}

export interface ConvolutionReverbEffect extends AudioEffect {
  effectType: 'convolutionReverb';
  irFile: string;               // Impulse response file path
  predelay: number;             // ms
  decay: number;                // 0-100 (IR length percentage)
  lowCut: number;               // Hz
  highCut: number;              // Hz
  mix: number;                  // 0-100
}

export interface AmpSimulator extends AudioEffect {
  effectType: 'ampSimulator';
  ampType: 'clean' | 'crunch' | 'high-gain' | 'bass' | 'acoustic';
  gain: number;                 // 0-100
  tone: {
    bass: number;               // -12 to +12 dB
    mid: number;
    treble: number;
    presence: number;
  };
  master: number;               // 0-100
}

export interface CabinetSimulator extends AudioEffect {
  effectType: 'cabinetSimulator';
  cabType: '1x12' | '2x12' | '4x12' | '1x15' | '8x10';
  micType: 'dynamic' | 'condenser' | 'ribbon';
  micPosition: 'on-axis' | 'off-axis' | 'edge';
  distance: number;             // 0-100 (close to far)
  roomMix: number;              // 0-100
}

export interface TapeSaturation extends AudioEffect {
  effectType: 'tapeSaturation';
  tapeType: '15ips' | '30ips' | 'cassette';
  inputGain: number;            // dB
  saturation: number;           // 0-100
  bias: number;                 // 0-100
  flutter: number;              // 0-100
  wowRate: number;              // Hz
  hiss: number;                 // 0-100
}

export interface TransientShaper extends AudioEffect {
  effectType: 'transientShaper';
  attack: number;               // -100 to +100
  sustain: number;              // -100 to +100
  outputGain: number;           // dB
}

export interface DeEsser extends AudioEffect {
  effectType: 'deEsser';
  frequency: number;            // Hz (typically 4000-10000)
  threshold: number;            // dB
  ratio: number;                // 1:1 to 10:1
  range: number;                // dB (max reduction)
  mode: 'wideband' | 'split';
}

export interface Exciter extends AudioEffect {
  effectType: 'exciter';
  frequency: number;            // Hz (harmonics start frequency)
  harmonics: number;            // 0-100
  mix: number;                  // 0-100
  mode: 'tape' | 'tube' | 'transistor';
}

export interface NoiseReduction extends AudioEffect {
  effectType: 'noiseReduction';
  threshold: number;            // dB
  reduction: number;            // dB
  attack: number;               // ms
  release: number;              // ms
  mode: 'broadband' | 'spectral' | 'adaptive';
}

export interface SpectralEdit {
  type: 'spectralEdit';
  tick: number;
  endTick: number;
  lowFreq: number;              // Hz
  highFreq: number;             // Hz
  operation: 'cut' | 'boost' | 'replace' | 'fill';
  gain?: number;                // dB for cut/boost
}
