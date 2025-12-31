/**
 * MusicXML Renderer Plugin Capabilities
 */

export interface RendererCapabilities {
  protocolVersion: number;
  id: string;
  version: string;
  supportedRoles: string[];
  supportedEvents: string[];
  lyricSupport?: {
    text: boolean;
    syllables: boolean;
    phonemes: boolean;
  };
  paramSupport?: {
    namespaces: string[];
    patterns: string[];
  };
  degradeDefaults: string;
}

export const capabilities: RendererCapabilities = {
  protocolVersion: 1,
  id: 'musicxml.standard',
  version: '1.0.0',
  supportedRoles: ['Instrument', 'Drums', 'Vocal'],
  supportedEvents: ['note', 'chord', 'drumHit', 'rest'],
  lyricSupport: {
    text: true,
    syllables: true,
    phonemes: false,
  },
  paramSupport: {
    namespaces: ['dynamics'],
    patterns: ['dynamics.*'],
  },
  degradeDefaults: 'Drop',
};
