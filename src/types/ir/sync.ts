// Sync & Communication types

export interface OSCConfig {
  type: 'oscConfig';
  enabled: boolean;
  sendPort: number;
  receivePort: number;
  sendHost: string;
}

export interface OSCMapping {
  type: 'oscMapping';
  address: string;              // OSC address pattern
  target: string;               // Parameter to control
  min: number;
  max: number;
}

export interface NetworkMIDIConfig {
  type: 'networkMidi';
  enabled: boolean;
  sessionName: string;
  port: number;
  protocol: 'rtp-midi' | 'ipMIDI';
}

export interface MIDIClockConfig {
  type: 'midiClock';
  mode: 'master' | 'slave';
  sendStart: boolean;
  sendContinue: boolean;
  sendStop: boolean;
  outputPort?: string;
  inputPort?: string;
}

export interface TimecodeConfig {
  type: 'timecode';
  format: 'mtc' | 'smpte';
  frameRate: 24 | 25 | 29.97 | 30;
  dropFrame: boolean;
  offset: string;               // HH:MM:SS:FF
  mode: 'generate' | 'chase';
}
