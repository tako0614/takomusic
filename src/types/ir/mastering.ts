// Mastering & Metadata types

// Mastering
export interface DitheringConfig {
  type: 'dithering';
  targetBitDepth: 16 | 24;
  noiseShaping: 'none' | 'hpf' | 'f-weighted' | 'modified-e-weighted' | 'pow-r';
  ditherType: 'rectangular' | 'triangular' | 'gaussian';
  autoblack: boolean;           // Auto-mute in silence
}

export interface LoudnessMatching {
  type: 'loudnessMatching';
  targetLUFS: number;
  maxTruePeak: number;          // dBTP
  tolerance: number;            // LUFS tolerance
  algorithm: 'peak' | 'rms' | 'lufs';
}

export interface ReferenceTrack {
  type: 'referenceTrack';
  filePath: string;
  gain: number;                 // dB offset
  active: boolean;
  loopStart?: number;           // Sample position
  loopEnd?: number;
}

// Metadata
export interface ID3Metadata {
  type: 'id3';
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  track?: number;
  genre?: string;
  comment?: string;
  composer?: string;
  albumArtist?: string;
  discNumber?: number;
  bpm?: number;
  key?: string;
  copyright?: string;
  encodedBy?: string;
  artwork?: string;             // File path to cover art
}

export interface ISRCCode {
  type: 'isrc';
  code: string;                 // Format: CC-XXX-YY-NNNNN
  trackId?: string;
}

export interface SongStructureMarker {
  type: 'songStructure';
  tick: number;
  section: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'post-chorus' |
           'bridge' | 'breakdown' | 'buildup' | 'drop' | 'outro' | 'solo' | 'custom';
  label?: string;
  color?: string;
}

// Export & Batch Processing
export interface StemExport {
  type: 'stemExport';
  name: string;
  trackIds: string[];
  format: 'wav' | 'aiff' | 'flac' | 'mp3';
  bitDepth: 16 | 24 | 32;
  sampleRate: 44100 | 48000 | 88200 | 96000;
  normalize: boolean;
  tailLength: number;              // ms
}

export interface BatchProcessing {
  type: 'batch';
  inputPattern: string;            // Glob pattern
  outputPattern: string;
  operations: BatchOperation[];
}

export interface BatchOperation {
  type: 'normalize' | 'convert' | 'trim' | 'fade' | 'loudness';
  params: Record<string, number | string | boolean>;
}

export interface ExportPreset {
  type: 'exportPreset';
  id: string;
  name: string;
  format: 'wav' | 'aiff' | 'flac' | 'mp3' | 'ogg' | 'aac';
  bitDepth?: 16 | 24 | 32;
  sampleRate: number;
  bitrate?: number;                // For lossy formats
  channels: 'mono' | 'stereo' | 'surround';
  dithering?: boolean;
  normalize?: boolean;
  targetLUFS?: number;
}
