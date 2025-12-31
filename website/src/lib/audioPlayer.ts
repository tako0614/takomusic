/**
 * TakoMusic Web Audio Player
 *
 * Plays Score IR using the Web Audio API with synthesized sounds.
 * Supports instrument notes, drum hits, and basic automation.
 */

// Use the real ScoreIR type from the compiler
import type { ScoreIR } from './compiler';

interface Rat {
  n: number;
  d: number;
}

// General MIDI drum mapping
const GM_DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hhc: 42,
  hho: 46,
  crash: 49,
  ride: 51,
  tom1: 50,
  tom2: 48,
  tom3: 45,
  clap: 39,
  rimshot: 37,
  cowbell: 56,
};

// Convert MIDI pitch to frequency
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert rational number to seconds at given BPM
function ratToSeconds(rat: Rat, bpm: number, beatUnit: Rat = { n: 1, d: 4 }): number {
  const beats = (rat.n / rat.d) / (beatUnit.n / beatUnit.d);
  return (beats * 60) / bpm;
}

// Extract pitch from various IR event formats
function extractPitch(event: any): number | undefined {
  // Direct pitch field (MIDI number)
  if (typeof event.pitch === 'number') {
    return event.pitch;
  }
  // Pitch object with midi field
  if (event.pitch && typeof event.pitch.midi === 'number') {
    return event.pitch.midi;
  }
  return undefined;
}

// Extract pitches array for chords
function extractPitches(event: any): number[] | undefined {
  if (!event.pitches || !Array.isArray(event.pitches)) {
    return undefined;
  }
  return event.pitches.map((p: any) => {
    if (typeof p === 'number') return p;
    if (p && typeof p.midi === 'number') return p.midi;
    return 60; // fallback
  });
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private scheduledNodes: AudioScheduledSourceNode[] = [];
  private onPlaybackEnd: (() => void) | null = null;
  private playbackEndTimeout: number | null = null;

  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
  }

  async play(ir: ScoreIR, onEnd?: () => void): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.masterGain) return;

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stop();
    this.isPlaying = true;
    this.onPlaybackEnd = onEnd || null;

    const bpm = ir.tempoMap[0]?.bpm || 120;
    const beatUnit = ir.tempoMap[0]?.unit || { n: 1, d: 4 };
    const startTime = this.audioContext.currentTime + 0.1;
    let maxEndTime = startTime;

    // Build sound lookup
    const soundMap = new Map<string, any>();
    for (const sound of ir.sounds) {
      soundMap.set(sound.id, sound);
    }

    // Schedule all events
    for (const track of ir.tracks) {
      const sound = soundMap.get(track.sound);
      if (!sound) continue;

      for (const placement of track.placements) {
        const placementTime = ratToSeconds(placement.at, bpm, beatUnit);

        for (const rawEvent of placement.clip.events) {
          // Cast to any for flexible property access across different event types
          const event = rawEvent as any;

          // Handle different event types
          const eventType = event.type || event.kind;
          const eventAt = event.start || event.at || { n: 0, d: 1 };
          const eventDur = event.dur || { n: 1, d: 4 };

          const eventTime = startTime + placementTime + ratToSeconds(eventAt, bpm, beatUnit);
          const duration = ratToSeconds(eventDur, bpm, beatUnit);
          const velocity = event.velocity ?? event.vel ?? 0.8;

          if (eventType === 'rest') continue;

          if (eventType === 'note') {
            const pitch = extractPitch(event);
            if (pitch !== undefined) {
              this.scheduleNote(eventTime, duration, pitch, velocity, sound.kind);
              maxEndTime = Math.max(maxEndTime, eventTime + duration);
            }
          } else if (eventType === 'chord') {
            const pitches = extractPitches(event);
            if (pitches) {
              for (const pitch of pitches) {
                this.scheduleNote(eventTime, duration, pitch, velocity * 0.8, sound.kind);
              }
              maxEndTime = Math.max(maxEndTime, eventTime + duration);
            }
          } else if (eventType === 'drumHit' || eventType === 'hit') {
            const drumKey = event.key || event.drumKey;
            if (drumKey) {
              this.scheduleDrumHit(eventTime, drumKey, velocity);
              maxEndTime = Math.max(maxEndTime, eventTime + 0.5);
            }
          }
        }
      }
    }

    // Set up playback end callback
    const totalDuration = (maxEndTime - startTime) * 1000 + 100;
    this.playbackEndTimeout = window.setTimeout(() => {
      this.isPlaying = false;
      if (this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
    }, totalDuration);
  }

  private scheduleNote(
    time: number,
    duration: number,
    pitch: number,
    velocity: number,
    soundKind: string
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    const freq = midiToFreq(pitch);

    // Create oscillator with ADSR envelope
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Choose waveform based on sound kind
    if (soundKind === 'vocal') {
      osc.type = 'sawtooth';
    } else {
      osc.type = 'triangle';
    }

    osc.frequency.value = freq;
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    // ADSR envelope
    const attack = 0.02;
    const decay = 0.1;
    const sustain = 0.6;
    const release = 0.1;

    const maxGain = velocity * 0.3;
    const sustainGain = maxGain * sustain;

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(maxGain, time + attack);
    gainNode.gain.linearRampToValueAtTime(sustainGain, time + attack + decay);
    gainNode.gain.setValueAtTime(sustainGain, time + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.01);

    this.scheduledNodes.push(osc);
  }

  private scheduleDrumHit(time: number, drumKey: string, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const midiNote = GM_DRUM_MAP[drumKey] || 36;

    if (drumKey === 'kick') {
      this.scheduleKick(time, velocity);
    } else if (drumKey === 'snare') {
      this.scheduleSnare(time, velocity);
    } else if (drumKey === 'hhc' || drumKey === 'hho') {
      this.scheduleHihat(time, velocity, drumKey === 'hho');
    } else if (drumKey === 'crash' || drumKey === 'ride') {
      this.scheduleCymbal(time, velocity);
    } else {
      // Generic tom/percussion sound
      this.scheduleTom(time, velocity, midiNote);
    }
  }

  private scheduleKick(time: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(velocity * 0.8, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.3);

    this.scheduledNodes.push(osc);
  }

  private scheduleSnare(time: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Noise for snare
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180;

    oscGain.gain.setValueAtTime(velocity * 0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.1);

    this.scheduledNodes.push(noise);
    this.scheduledNodes.push(osc);
  }

  private scheduleHihat(time: number, velocity: number, open: boolean): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * (open ? 0.3 : 0.1);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gainNode = this.audioContext.createGain();
    const duration = open ? 0.25 : 0.08;
    gainNode.gain.setValueAtTime(velocity * 0.25, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration + 0.05);

    this.scheduledNodes.push(noise);
  }

  private scheduleCymbal(time: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * 0.8;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5000;
    filter.Q.value = 1;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(velocity * 0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.7);

    this.scheduledNodes.push(noise);
  }

  private scheduleTom(time: number, velocity: number, midiNote: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const freq = midiToFreq(midiNote);

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(velocity * 0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.25);

    this.scheduledNodes.push(osc);
  }

  stop(): void {
    // Stop all scheduled nodes
    for (const node of this.scheduledNodes) {
      try {
        node.stop();
      } catch {
        // Already stopped
      }
    }
    this.scheduledNodes = [];
    this.isPlaying = false;

    if (this.playbackEndTimeout !== null) {
      clearTimeout(this.playbackEndTimeout);
      this.playbackEndTimeout = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }
}

// Singleton instance for easy use
let playerInstance: AudioPlayer | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!playerInstance) {
    playerInstance = new AudioPlayer();
  }
  return playerInstance;
}

// Re-export ScoreIR for convenience
export type { ScoreIR };
