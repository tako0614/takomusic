/**
 * MIDI Renderer Plugin Capabilities
 *
 * Follows the TakoMusic Renderer Plugin Protocol v1 as defined in RENDERING.md
 */

/**
 * Capabilities response schema from RENDERING.md
 */
export interface RendererCapabilities {
  /** Protocol version (must be 1) */
  protocolVersion: 1;

  /** Plugin identifier (must match profile.renderer) */
  id: string;

  /** Human-readable plugin name */
  name?: string;

  /** Plugin version */
  version?: string;

  /** Supported track roles */
  supportedRoles: Array<'Instrument' | 'Drums' | 'Vocal' | 'Automation'>;

  /** Supported event types */
  supportedEvents: Array<
    'note' | 'chord' | 'drumHit' | 'breath' | 'control' | 'automation' | 'marker'
  >;

  /** Lyric rendering support */
  lyricSupport?: {
    modes: Array<'text' | 'syllables' | 'phonemes'>;
    languages?: string[];
  };

  /** Supported automation parameter names */
  paramSupport?: string[];

  /** Supported technique IDs */
  techniqueSupport?: string[];

  /** Default degrade policies per category */
  degradeDefaults?: {
    unknownParam?: 'Error' | 'Drop' | 'Approx';
    unknownTechnique?: 'Error' | 'Drop' | 'Approx';
    unboundTrack?: 'Error' | 'Drop' | 'Approx';
  };
}

/**
 * MIDI renderer capabilities
 */
export const capabilities: RendererCapabilities = {
  protocolVersion: 1,
  id: 'midi.standard',
  name: 'Standard MIDI File Renderer',
  version: '1.0.0',

  supportedRoles: ['Instrument', 'Drums', 'Vocal'],

  supportedEvents: ['note', 'chord', 'drumHit', 'control', 'automation', 'marker'],

  lyricSupport: {
    modes: ['text', 'syllables'],
    // Languages not restricted for MIDI (just embeds text)
  },

  paramSupport: [
    // MIDI CC parameters
    'midi.cc.1', // Modulation
    'midi.cc.7', // Volume
    'midi.cc.10', // Pan
    'midi.cc.11', // Expression
    'midi.cc.64', // Sustain pedal
    'midi.cc.71', // Filter resonance
    'midi.cc.74', // Filter cutoff
    // Named parameters (aliases)
    'modulation',
    'volume',
    'pan',
    'expression',
    'sustain',
    'filterCutoff',
    'filterResonance',
    // Pitch bend
    'midi.pitchBend',
    'pitchBend',
    // Program change
    'midi.program',
  ],

  techniqueSupport: [
    'legato',
    'staccato',
    'accent',
    'tenuto',
    'marcato',
    // Note: Most techniques are best-effort in MIDI
  ],

  degradeDefaults: {
    unknownParam: 'Drop',
    unknownTechnique: 'Drop',
    unboundTrack: 'Approx',
  },
};

/**
 * Get capabilities as JSON string
 */
export function getCapabilitiesJson(): string {
  return JSON.stringify(capabilities, null, 2);
}
