// Analysis types

export interface SpectrumAnalyzerConfig {
  type: 'spectrumAnalyzer';
  fftSize: 512 | 1024 | 2048 | 4096 | 8192 | 16384;
  windowType: 'hanning' | 'hamming' | 'blackman' | 'rectangular';
  overlap: number;            // 0-0.99
  minFreq: number;            // Hz
  maxFreq: number;            // Hz
  minDb: number;              // Minimum dB to display
  maxDb: number;              // Maximum dB to display
  scale: 'linear' | 'logarithmic' | 'mel';
  smoothing: number;          // 0-1
}

export interface LoudnessMeter {
  type: 'loudnessMeter';
  standard: 'EBU-R128' | 'ATSC-A85' | 'BS.1770';
  targetLUFS: number;
  truePeak: boolean;
  shortTermWindow?: number;   // Seconds (default 3)
  momentaryWindow?: number;   // ms (default 400)
}

export interface PhaseCorrelationMeter {
  type: 'phaseCorrelation';
  windowSize: number;         // ms
  displayMode: 'numeric' | 'goniometer' | 'vectorscope';
}

export interface AnalyzerSnapshot {
  type: 'analyzerSnapshot';
  tick: number;
  lufs?: number;
  truePeak?: number;
  phaseCorrelation?: number;  // -1 to 1
  spectrum?: number[];        // Frequency bins
}
